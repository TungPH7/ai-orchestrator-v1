import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COUNT_SQL, LIST_DATABASES, backupFile, backupTime, backupsToKeep, dumpArgs, parseDatabases, restoreCheck } from '../../lib/release/backup.mjs';
import { ROOT } from '../helpers/kit.mjs';

// The backups of the databases (project-scaffold part 3, spec 2.4; plan, decision 8): a dump a day of each running
// database, 7 daily and 4 weekly kept, and a check that the newest one restores.

test('a dump is named by project, environment and UTC time, and read back', () => {
  const name = backupFile('shop', 'production', new Date('2026-11-14T19:30:05Z'));
  assert.equal(name, 'shop-production-20261114T193005Z.dump');
  assert.equal(backupTime(name).toISOString(), '2026-11-14T19:30:05.000Z');
  assert.equal(backupTime('notes.txt'), null);
});

test('the newest dump of each of the 7 newest days and of the 4 newest weeks stay; the rest go', () => {
  // One dump a day for 40 days, and a second one on the newest day.
  const names = Array.from({ length: 40 }, (_, i) => backupFile('shop', 'production', new Date(Date.UTC(2026, 10, 14 - i, 19, 30))));
  names.push(backupFile('shop', 'production', new Date(Date.UTC(2026, 10, 14, 21, 0))));
  const keep = backupsToKeep(names);
  const days = [...keep].map((name) => backupTime(name).toISOString().slice(0, 10)).sort().reverse();
  // 7 days in a row, then the newest of each older week.
  assert.deepEqual([...new Set(days)].slice(0, 7), ['2026-11-14', '2026-11-13', '2026-11-12', '2026-11-11', '2026-11-10', '2026-11-09', '2026-11-08']);
  assert.ok(keep.has('shop-production-20261114T210000Z.dump'), 'the newest of a day');
  assert.ok(keep.has('shop-production-20261114T193000Z.dump'), 'an older one of the same day stays while it is within 48 hours');
  assert.ok(keep.size <= 13 && keep.size >= 9, `kept ${keep.size}`);
  assert.ok(days.at(-1) >= '2026-10-12', 'nothing older than four weeks');
  assert.deepEqual(backupsToKeep([]), new Set());
});

// T22 on the VPS: a backup run by hand at 04:55 removed the dump of 04:49, the one the restore was to use, since only
// the newest of a day stayed. A hand run before a restore, as docs/vps-setup.md section 15 advises for Production,
// must not remove the night's dump of the same day.
test('every dump of the 48 hours before the newest stays; an older day keeps its newest only', () => {
  const at = (iso) => backupFile('shop', 'development', new Date(iso));
  const names = [at('2026-11-14T04:49:11Z'), at('2026-11-14T04:55:36Z'), at('2026-11-12T19:30:00Z'), at('2026-11-10T19:30:00Z'), at('2026-11-10T21:00:00Z')];
  const keep = backupsToKeep(names);
  assert.ok(keep.has(at('2026-11-14T04:49:11Z')) && keep.has(at('2026-11-14T04:55:36Z')), 'both runs of today');
  assert.ok(keep.has(at('2026-11-12T19:30:00Z')), 'the newest of an older day');
  assert.ok(keep.has(at('2026-11-10T21:00:00Z')) && !keep.has(at('2026-11-10T19:30:00Z')), 'an older day past 48 hours keeps its newest only');
});

test('the databases come from docker by their label, with the project and environment of each', () => {
  assert.deepEqual(LIST_DATABASES, ['ps', '--filter', 'label=ao.role=database', '--filter', 'status=running', '--format', '{{.Names}}\t{{.Label "ao.project"}}\t{{.Label "ao.env"}}']);
  assert.deepEqual(parseDatabases('ao-shop-production-db\tshop\tproduction\nao-shop-development-db\tshop\tdevelopment\n'), [
    { container: 'ao-shop-production-db', project: 'shop', env: 'production' },
    { container: 'ao-shop-development-db', project: 'shop', env: 'development' },
  ]);
  // A container someone else labelled oddly is not dumped.
  assert.deepEqual(parseDatabases('x\tShop;rm\tproduction\n'), []);
});

test('pg_dump runs inside the container on its own database, in the custom format, with no value in the arguments', () => {
  assert.deepEqual(dumpArgs('ao-shop-production-db'), ['exec', 'ao-shop-production-db', 'sh', '-c', 'exec pg_dump -U postgres -Fc -d "$POSTGRES_DB"']);
  assert.throws(() => dumpArgs('--privileged'), /not allowed/);
});

// A docker that answers from a table, and records every call; input(args, file) stands for a call fed from a file.
function fakeDocker(answers) {
  const calls = [];
  const answer = (line) => {
    const value = typeof answers === 'function' ? answers(line) : answers[line];
    if (value instanceof Error) throw value;
    return value ?? '';
  };
  return {
    calls,
    run: async (args) => (calls.push(args.join(' ')), answer(args.join(' '))),
    input: async (args, file) => (calls.push(`${args.join(' ')} < ${file}`), answer(args.join(' '))),
  };
}
const DB = 'ao-shop-development-db';
const TMP = 'ao-restore-check-shop-development';
const IMAGE = `postgres:17-alpine@sha256:${'d'.repeat(64)}`;

test('the restore check restores the newest dump into a container with no network, and compares tables and rows with the database', async () => {
  const d = fakeDocker({
    [`exec ${DB} printenv POSTGRES_DB`]: 'shop\n',
    [`container inspect --format {{.Config.Image}} ${DB}`]: `${IMAGE}\n`,
    [`exec ${TMP} psql -U postgres -d shop -tAc ${COUNT_SQL}`]: '6|42\n',
    [`exec ${DB} psql -U postgres -d shop -tAc ${COUNT_SQL}`]: '6|42\n',
  });
  const result = await restoreCheck({ run: d.run, input: d.input, project: 'shop', env: 'development', dump: '/var/backups/ao/shop/development/x.dump', sleep: async () => {} });
  assert.deepEqual(result, { database: 'shop', restored: { tables: 6, rows: 42 }, live: { tables: 6, rows: 42 }, same: true });
  const run = d.calls.find((line) => line.startsWith('run '));
  assert.equal(run, `run --detach --name ${TMP} --network none --user postgres --cap-drop ALL --security-opt no-new-privileges --memory 256m --memory-swap 256m --env POSTGRES_HOST_AUTH_METHOD=trust ${IMAGE}`);
  assert.ok(d.calls.includes(`exec -i ${TMP} pg_restore -U postgres --no-owner --no-privileges --create -d postgres < /var/backups/ao/shop/development/x.dump`));
  assert.equal(d.calls.at(-1), `rm --force ${TMP}`);
});

test('a restore that differs is reported, and the temporary container still goes', async () => {
  const d = fakeDocker((line) => {
    if (line === `exec ${DB} printenv POSTGRES_DB`) return 'shop\n';
    if (line.startsWith('container inspect')) return `${IMAGE}\n`;
    if (line.startsWith(`exec ${TMP} psql`)) return '6|40\n';
    if (line.startsWith(`exec ${DB} psql`)) return '6|42\n';
    return '';
  });
  const result = await restoreCheck({ run: d.run, input: d.input, project: 'shop', env: 'development', dump: '/x.dump', sleep: async () => {} });
  assert.equal(result.same, false);
  assert.equal(d.calls.at(-1), `rm --force ${TMP}`);
});

test('the backup runs as root once a day, after Docker, with files only root reads', () => {
  const service = readFileSync(join(ROOT, 'vps/ao-backup.service'), 'utf8');
  const timer = readFileSync(join(ROOT, 'vps/ao-backup.timer'), 'utf8');
  assert.match(service, /^User=root$/m);
  assert.match(service, /^UMask=0077$/m);
  assert.match(service, /^ExecStart=\/usr\/bin\/node \/opt\/ao\/kit\/scripts\/ao-backup\.mjs run$/m);
  assert.match(service, /^After=docker\.service$/m);
  assert.match(timer, /^OnCalendar=\*-\*-\* 19:30:00 UTC$/m);
  assert.match(timer, /^Persistent=true$/m);
});

test('ao-backup.mjs says how to call it, and exits 2, on a wrong command line', async () => {
  const { spawnSync } = await import('node:child_process');
  for (const args of [[], ['restore-check', 'shop'], ['delete']]) {
    const done = spawnSync(process.execPath, [join(ROOT, 'scripts/ao-backup.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(done.status, 2, args.join(' '));
    assert.match(done.stderr, /usage: node ao-backup\.mjs run \| restore-check <project> <environment>/);
  }
});
