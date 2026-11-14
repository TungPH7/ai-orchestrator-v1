import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appManifest, installUrl, registrationPage } from '../../lib/quality/app-manifest.mjs';

const BASE = 'http://127.0.0.1:47100';

test('the ao-dev manifest writes contents, pull requests and workflows, and reads Actions and checks, nothing else', () => {
  const manifest = appManifest('dev', { owner: 'TungPH7', baseUrl: BASE });
  assert.equal(manifest.name, 'tungph7-ao-dev');
  assert.deepEqual(manifest.default_permissions, { contents: 'write', pull_requests: 'write', workflows: 'write', actions: 'read', checks: 'read' });
  assert.deepEqual(manifest.default_events, []);
});

test('the ao-review manifest reads contents, Actions and checks, and writes pull requests', () => {
  const manifest = appManifest('review', { owner: 'TungPH7', baseUrl: BASE });
  assert.equal(manifest.name, 'tungph7-ao-review');
  assert.deepEqual(manifest.default_permissions, { contents: 'read', pull_requests: 'write', actions: 'read', checks: 'read' });
});

test('the ao-deploy manifest only reads code, pull requests, checks, commit statuses and Actions, and writes deployments', () => {
  const manifest = appManifest('deploy', { owner: 'TungPH7', baseUrl: BASE });
  assert.equal(manifest.name, 'tungph7-ao-deploy');
  assert.deepEqual(manifest.default_permissions, { contents: 'read', pull_requests: 'read', checks: 'read', statuses: 'read', actions: 'read', deployments: 'write' });
  assert.deepEqual(manifest.default_events, []);
});

test('the ao-merge manifest writes contents, pull requests and workflows, and reads nothing more: merge-gate reads with the workflow token', () => {
  const manifest = appManifest('merge', { owner: 'TungPH7', baseUrl: BASE });
  assert.equal(manifest.name, 'tungph7-ao-merge');
  assert.deepEqual(manifest.default_permissions, { contents: 'write', pull_requests: 'write', workflows: 'write' });
  assert.deepEqual(manifest.default_events, []);
});

test('every App is private, has no webhook and no user sign-in, and comes back to the local server', () => {
  for (const kind of ['dev', 'review', 'deploy', 'merge']) {
    const manifest = appManifest(kind, { owner: 'TungPH7', baseUrl: BASE });
    assert.equal(manifest.public, false, kind);
    assert.equal(manifest.hook_attributes.active, false, kind);
    assert.match(manifest.hook_attributes.url, /^https:\/\//, kind);
    assert.equal(manifest.request_oauth_on_install, false, kind);
    assert.equal(manifest.redirect_url, `${BASE}/created/${kind}`);
    assert.equal(manifest.setup_url, `${BASE}/installed/${kind}`);
  }
});

test('an unknown kind of App is refused', () => {
  assert.throws(() => appManifest('admin', { owner: 'TungPH7', baseUrl: BASE }), /unknown App kind 'admin'/);
});

test('the install link points at the App and suggests the repository when its ids are known', () => {
  assert.equal(installUrl('tungph7-ao-dev'), 'https://github.com/apps/tungph7-ao-dev/installations/new');
  assert.equal(
    installUrl('tungph7-ao-dev', { ownerId: 11, repoId: 22 }),
    'https://github.com/apps/tungph7-ao-dev/installations/new/permissions?suggested_target_id=11&repository_ids%5B%5D=22',
  );
});

test('the registration page posts each manifest to GitHub with the state, escaped inside the form', () => {
  const page = registrationPage({
    owner: 'TungPH7',
    repo: 'ao-pilot',
    state: 'abc123',
    apps: [{ kind: 'dev', manifest: appManifest('dev', { owner: 'TungPH7', baseUrl: BASE }) }],
  });
  assert.match(page, /<form action="https:\/\/github\.com\/settings\/apps\/new\?state=abc123" method="post">/);
  const value = page.match(/name="manifest" value="([^"]*)"/)[1];
  assert.ok(!value.includes('<') && !value.includes('>'), 'no raw angle brackets in the attribute');
  const manifest = JSON.parse(value.replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
  assert.equal(manifest.name, 'tungph7-ao-dev');
});

test('the registration page shows the next step of each App: create, install, or done', () => {
  const page = registrationPage({
    owner: 'TungPH7',
    repo: 'ao-pilot',
    state: 'abc123',
    apps: [
      { kind: 'dev', manifest: appManifest('dev', { owner: 'TungPH7', baseUrl: BASE }), created: { slug: 'tungph7-ao-dev' }, installed: true },
      { kind: 'review', manifest: appManifest('review', { owner: 'TungPH7', baseUrl: BASE }), created: { slug: 'tungph7-ao-review' } },
    ],
  });
  assert.match(page, /tungph7-ao-dev[^]*Đã tạo và đã cài/);
  assert.match(page, /href="https:\/\/github\.com\/apps\/tungph7-ao-review\/installations\/new"/);
  assert.ok(!page.includes('name="manifest"'), 'no create button for Apps already created');
});
