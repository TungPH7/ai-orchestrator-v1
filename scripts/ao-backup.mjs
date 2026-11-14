// ao-backup.mjs (project-scaffold part 3, spec 2.4; docs/vps-setup.md): the daily dump of each running database of the
// VPS, kept 48 hours, 7 days and 4 weeks, and the check that the newest dump of one restores. ao-backup.service runs `run` as root;
// the decisions are in lib/release/backup.mjs. A dump is written to <name>.part, readable by root only, and renamed once
// pg_dump succeeded, so a half dump never counts.
//   node /opt/ao/kit/scripts/ao-backup.mjs run
//   node /opt/ao/kit/scripts/ao-backup.mjs restore-check <project> <environment>
import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { LIST_DATABASES, backupFile, backupTime, backupsToKeep, dumpArgs, parseDatabases, restoreCheck } from '../lib/release/backup.mjs';

const ROOT_DIR = process.env.AO_BACKUP_DIR ?? '/var/backups/ao';
const USAGE = 'usage: node ao-backup.mjs run | restore-check <project> <environment>';

function docker(args, options = {}) {
  const done = spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  if (done.error) throw done.error;
  if (done.status !== 0) throw new Error(`docker ${args[0]} ${args[1] ?? ''}: ${`${done.stderr ?? ''}`.trim().split('\n').at(-1)}`);
  return done.stdout ?? '';
}
const run = async (args) => docker(args);
async function input(args, file) {
  const fd = openSync(file, 'r');
  try {
    return docker(args, { stdio: [fd, 'pipe', 'pipe'] });
  } finally {
    closeSync(fd);
  }
}
const dumpsIn = (dir) => (existsSync(dir) ? readdirSync(dir).filter((name) => backupTime(name)) : []);

async function backupAll() {
  const databases = parseDatabases(docker(LIST_DATABASES));
  if (databases.length === 0) console.log('ao-backup: no database runs');
  let failed = 0;
  for (const { container, project, env } of databases) {
    const dir = join(ROOT_DIR, project, env);
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const name = backupFile(project, env, new Date());
    const part = join(dir, `${name}.part`);
    const fd = openSync(part, 'wx', 0o600);
    let done;
    try {
      done = spawnSync('docker', dumpArgs(container), { stdio: ['ignore', fd, 'pipe'], encoding: 'utf8' });
    } finally {
      closeSync(fd);
    }
    if (done.error || done.status !== 0) {
      rmSync(part, { force: true });
      console.error(`ao-backup: ${project}/${env}: pg_dump failed: ${`${done.stderr ?? done.error?.message ?? ''}`.trim().split('\n').at(-1)}`);
      failed++;
      continue;
    }
    renameSync(part, join(dir, name));
    console.log(`ao-backup: ${project}/${env}: ${name}, ${statSync(join(dir, name)).size} bytes`);
    const keep = backupsToKeep(dumpsIn(dir));
    for (const old of dumpsIn(dir).filter((file) => !keep.has(file))) {
      rmSync(join(dir, old));
      console.log(`ao-backup: ${project}/${env}: removed ${old}`);
    }
  }
  return failed === 0 ? 0 : 1;
}

async function check(project, env) {
  const dir = join(ROOT_DIR, project, env);
  const newest = dumpsIn(dir).sort((a, b) => backupTime(b) - backupTime(a))[0];
  if (!newest) {
    console.error(`ao-backup: no dump in ${dir}`);
    return 1;
  }
  const result = await restoreCheck({ run, input, project, env, dump: join(dir, newest) });
  console.log(`ao-backup: ${newest} restored: ${result.restored.tables} tables, ${result.restored.rows} rows; ${result.database} now: ${result.live.tables} tables, ${result.live.rows} rows${result.same ? '' : ' (they differ: rows written since the dump, or a dump that does not restore)'}`);
  return result.same ? 0 : 1;
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'run' && rest.length === 0) process.exitCode = await backupAll();
  else if (command === 'restore-check' && rest.length === 2) process.exitCode = await check(...rest);
  else {
    console.error(USAGE);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`ao-backup: ${error.message}`);
  process.exitCode = 1;
}
