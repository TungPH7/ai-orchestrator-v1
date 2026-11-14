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

// project-scaffold part 2, spec 2.4: hosts app by app give each public app its own site.
test('two public apps: a site for each host, each to its own app, and 503 for an app that runs nowhere yet', () => {
  const shop = { name: 'shop', repo: 'TungPH7/shop', space: 'SHOP', hosts: {
    user: { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' },
    admin: { development: 'shop-admin-dev.ao.t2g.io.vn', staging: 'shop-admin-staging.ao.t2g.io.vn', production: 'shop-admin.ao.t2g.io.vn' },
  } };
  const state = emptyState();
  state.environments.development.current = { sha: 'c'.repeat(40), tree: 'f'.repeat(40), branch: 'develop', public: [{ app: 'user', port: 3000 }, { app: 'admin', port: 5173 }] };
  state.environments.staging.current = { sha: 'c'.repeat(40), tree: 'f'.repeat(40), branch: 'release/v0.1.0', public: [{ app: 'user', port: 3000 }] };
  const sites = caddySites({ ...example, projects: [shop] }, { shop: state });
  assert.deepEqual(sites.map(({ host, upstream, auth }) => `${host} ${upstream ?? '503'} ${auth ? 'auth' : 'open'}`), [
    'shop-dev.ao.t2g.io.vn ao-shop-development-user:3000 auth',
    'shop-admin-dev.ao.t2g.io.vn ao-shop-development-admin:5173 auth',
    'shop-staging.ao.t2g.io.vn ao-shop-staging-user:3000 auth',
    'shop-admin-staging.ao.t2g.io.vn 503 auth',
    'shop.ao.t2g.io.vn 503 open',
    'shop-admin.ao.t2g.io.vn 503 open',
  ]);
});

test('a record from before part 2, with one public app as an object, still reaches its site', () => {
  const pilot = emptyState();
  pilot.environments.development.current = { sha: 'c'.repeat(40), tree: 'f'.repeat(40), branch: 'develop', public: { app: 'web', port: 3000 } };
  const listed = emptyState();
  listed.environments.development.current = { ...pilot.environments.development.current, public: [{ app: 'web', port: 3000 }] };
  const project = { ...example, projects: [example.projects[0]] };
  assert.equal(caddyfile({ sites: caddySites(project, { pilot }), credentials: CREDENTIALS }), caddyfile({ sites: caddySites(project, { pilot: listed }), credentials: CREDENTIALS }));
});

test('production_auth: Production of that project asks for basic auth too, and the other projects stay as they were (Pilot 3, spec 2.2)', () => {
  const before = caddyfile({ sites: caddySites(example, states()), credentials: CREDENTIALS });
  const config = { ...example, projects: example.projects.map((project) => (project.name === 'sample' ? { ...project, production_auth: true } : project)) };
  const sites = caddySites(config, states());
  assert.deepEqual(sites.map(({ host, auth }) => `${host} ${auth ? 'auth' : 'open'}`), [
    'pilot-dev.ao.t2g.io.vn auth',
    'pilot-staging.ao.t2g.io.vn auth',
    'pilot.ao.t2g.io.vn open',
    'sample-dev.ao.t2g.io.vn auth',
    'sample-staging.ao.t2g.io.vn auth',
    'sample.ao.t2g.io.vn auth',
  ]);
  const text = caddyfile({ sites, credentials: CREDENTIALS });
  assert.equal(text.match(/basic_auth \{/g).length, 5);
  // The pilot sites are the same text as before.
  const pilot = (body) => body.split('\n\n').filter((block) => block.startsWith('pilot')).join('\n\n');
  assert.equal(pilot(text), pilot(before));
  // false is the same as no key.
  const off = { ...example, projects: example.projects.map((project) => ({ ...project, production_auth: false })) };
  assert.equal(caddyfile({ sites: caddySites(off, states()), credentials: CREDENTIALS }), before);
});
