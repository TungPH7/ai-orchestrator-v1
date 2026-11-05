import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { caddySites, caddyfile, updateCaddy } from '../../lib/release/caddy.mjs';
import { emptyState } from '../../lib/release/record.mjs';
import { ROOT } from '../helpers/kit.mjs';

const example = parse(readFileSync(join(ROOT, 'vps/deployer.example.yaml'), 'utf8'));
const HASH = `$2a$14$${'a'.repeat(53)}`;
const CREDENTIALS = `ao ${HASH}`;
// pilot runs on Development with its public app web on port 3000; nothing else runs yet.
function states() {
  const pilot = emptyState();
  pilot.environments.development.current = { sha: 'c'.repeat(40), tree: 'f'.repeat(40), branch: 'develop', public: { app: 'web', port: 3000 } };
  return { pilot, sample: emptyState() };
}

test('the Caddyfile has a site for each of the six hosts, with basic auth on Development and Staging only (spec 2.3, 2.11)', () => {
  const sites = caddySites(example, states());
  assert.deepEqual(sites.map(({ host, auth }) => `${host} ${auth ? 'auth' : 'open'}`), [
    'pilot-dev.ao.t2g.io.vn auth',
    'pilot-staging.ao.t2g.io.vn auth',
    'pilot.ao.t2g.io.vn open',
    'sample-dev.ao.t2g.io.vn auth',
    'sample-staging.ao.t2g.io.vn auth',
    'sample.ao.t2g.io.vn open',
  ]);
  const text = caddyfile({ sites, credentials: CREDENTIALS });
  assert.equal(text.match(/^\S+\.ao\.t2g\.io\.vn \{$/gm).length, 6);
  assert.equal(text.match(/basic_auth \{/g).length, 4);
});

test('a site proxies to the public app of the release that runs there, and answers 503 before the first deploy', () => {
  const text = caddyfile({ sites: caddySites({ ...example, projects: [{ ...example.projects[0] }] }, states()), credentials: CREDENTIALS });
  assert.equal(
    text,
    [
      '# Written by the ai-orchestrator deployer from /etc/ao/deployer.yaml and the release running in each environment.',
      '# Any edit here is overwritten at the next deploy.',
      ':80 {',
      '\trespond 404',
      '}',
      '',
      'pilot-dev.ao.t2g.io.vn {',
      '\tbasic_auth {',
      `\t\tao ${HASH}`,
      '\t}',
      '\treverse_proxy ao-pilot-development-web:3000',
      '}',
      '',
      'pilot-staging.ao.t2g.io.vn {',
      '\tbasic_auth {',
      `\t\tao ${HASH}`,
      '\t}',
      '\trespond "Not deployed yet" 503',
      '}',
      '',
      'pilot.ao.t2g.io.vn {',
      '\trespond "Not deployed yet" 503',
      '}',
      '',
    ].join('\n'),
  );
});

test('the basic auth line must be a user and a bcrypt hash: nothing else reaches the Caddyfile', () => {
  for (const bad of ['ao', `ao ${HASH} extra`, 'ao plaintext-password', `ao ${HASH}\n}`, `a{ ${HASH}`]) {
    assert.throws(() => caddyfile({ sites: [], credentials: bad }), /basic auth file/, JSON.stringify(bad));
  }
});

function fakeFiles(initial) {
  let text = initial;
  const writes = [];
  const docker = [];
  return {
    writes,
    docker,
    read: async () => text,
    write: async (next) => {
      writes.push(next);
      text = next;
    },
    run: async (args) => docker.push(args.join(' ')),
  };
}

test('the deployer writes the Caddyfile and reloads Caddy only when it changed; a dry run only says so', async () => {
  const f = fakeFiles(':80 {\n\trespond 404\n}\n');
  const options = { config: example, states: states(), credentials: CREDENTIALS, read: f.read, write: f.write, docker: f.run, log: () => {} };
  assert.equal(await updateCaddy(options), true);
  assert.deepEqual(f.docker, ['exec caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile']);
  assert.equal(await updateCaddy(options), false, 'the same sites: no write, no reload');
  assert.equal(f.writes.length, 1);
  const lines = [];
  const dry = fakeFiles('');
  assert.equal(await updateCaddy({ ...options, read: dry.read, write: dry.write, docker: dry.run, dryRun: true, log: (line) => lines.push(line) }), true);
  assert.deepEqual([dry.writes, dry.docker], [[], []]);
  assert.match(lines.join('\n'), /would write .*Caddyfile and reload Caddy/);
});
