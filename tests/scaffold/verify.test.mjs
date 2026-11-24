import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VERIFY_LABEL, verifyProject, verifyReport } from '../../lib/scaffold/verify.mjs';

// ao-kit verify (SPEC-guided-setup.md section 5) with every platform given as a fake: what it writes, what it cleans up,
// and what a row says when a platform refuses.
const NOW = new Date('2026-11-24T19:30:00Z');
const CONFIG = {
  name: 'du-an-1',
  jira: { space: 'DA1' },
  github: { repo: 'acme/du-an-1' },
  apps: {
    web: { public: true, health: '/en', hosts: { development: 'du-an-1-dev.example.com' } },
    admin: { public: true, health: '/', hosts: { development: 'du-an-1-admin-dev.example.com' } },
    api: { health: '/actuator/health' },
  },
};

// A Jira that keeps what the CI token made, and your site that cancels.
function fakeJira({ refuse = {} } = {}) {
  const calls = [];
  const items = {};
  const jira = {
    request: async (method, path, query, body) => {
      calls.push([method, path, body]);
      if (refuse.create) throw new Error('Jira POST /rest/api/3/issue returned 403: no permission');
      items['DA1-1'] = { fields: { labels: body.fields.labels, summary: body.fields.summary } };
      return { key: 'DA1-1' };
    },
    get: async (path) => (calls.push(['GET', path]), items[decodeURIComponent(path.split('/').pop())]),
    comment: async (key, text) => {
      calls.push(['COMMENT', key, text]);
      if (refuse.comment) throw new Error('Jira POST comment returned 403');
    },
  };
  const admin = async (method, path, body) => {
    calls.push([`admin ${method}`, path, body]);
    if (method === 'GET') return { status: 200, json: { transitions: refuse.cancel ? [] : [{ id: '91', name: 'Cancel' }] } };
    return { status: 204, json: null };
  };
  return { jira, admin, calls };
}

// GitHub with one branch develop; a ref made, read and deleted.
function fakeGithub({ refuseBranch = false } = {}) {
  const calls = [];
  const refs = { develop: 'abc123' };
  const github = async (method, path, token, body) => {
    calls.push([method, path, token, body]);
    const ref = decodeURIComponent(path.replace(/^repos\/acme\/du-an-1\/git\/refs?\/(heads\/)?/, ''));
    if (method === 'GET') return refs[ref] ? { status: 200, json: { object: { sha: refs[ref] } } } : { status: 404, json: null };
    if (method === 'POST') {
      if (refuseBranch) return { status: 403, json: null };
      refs[body.ref.replace('refs/heads/', '')] = body.sha;
      return { status: 201, json: {} };
    }
    delete refs[ref];
    return { status: 204, json: null };
  };
  return { github, calls, refs };
}

const appToken = async (kind, permissions) => `token-of-${kind}-${Object.keys(permissions).join('-')}`;
// Each host answers 200 with basic auth and 401 without.
const hosts = (status = { with: 200, without: 401 }) => {
  const seen = [];
  return {
    seen,
    fetch: async (url, init) => (seen.push([url, Boolean(init.headers?.Authorization), init.redirect]), { status: init.headers?.Authorization ? status.with : status.without }),
  };
};

test('verify writes on Jira, GitHub and the VPS, cleans up after itself, and every row passes', async () => {
  const j = fakeJira();
  const g = fakeGithub();
  const h = hosts();
  const result = await verifyProject({ config: CONFIG, now: NOW, jira: j.jira, admin: j.admin, appToken, github: g.github, fetch: h.fetch, envAuth: 'ao:secret-pass' });
  assert.deepEqual(result.rows.filter(({ ok }) => ok !== true), []);
  assert.equal(result.item, 'DA1-1');
  assert.equal(result.branch, 'ao-kit-verify-20261124-1930');

  // Jira: a Task with the label, read back, a comment, then Cancel with a resolution by your token.
  const [create] = j.calls;
  assert.deepEqual([create[0], create[1]], ['POST', '/rest/api/3/issue']);
  assert.deepEqual(create[2].fields.project, { key: 'DA1' });
  assert.deepEqual(create[2].fields.issuetype, { name: 'Task' });
  assert.deepEqual(create[2].fields.labels, [VERIFY_LABEL]);
  assert.ok(j.calls.some(([kind, key]) => kind === 'COMMENT' && key === 'DA1-1'));
  const cancel = j.calls.find(([kind]) => kind === 'admin POST');
  assert.equal(cancel[1], '/rest/api/3/issue/DA1-1/transitions');
  assert.deepEqual(cancel[2], { transition: { id: '91' }, fields: { resolution: { name: "Won't Do" } } });

  // GitHub: the branch is made at the head of develop with the token of ao-dev, and gone at the end.
  assert.deepEqual(g.refs, { develop: 'abc123' });
  const made = g.calls.find(([method]) => method === 'POST');
  assert.deepEqual(made[3], { ref: 'refs/heads/ao-kit-verify-20261124-1930', sha: 'abc123' });
  assert.equal(made[2], 'token-of-dev-contents-pull_requests');
  assert.ok(g.calls.some(([method, path]) => method === 'DELETE' && path.endsWith('/git/refs/heads/ao-kit-verify-20261124-1930')));

  // VPS: the two public apps, each with and without basic auth, no redirect followed; the api has no public host.
  assert.deepEqual(h.seen, [
    ['https://du-an-1-dev.example.com/en', true, 'manual'],
    ['https://du-an-1-dev.example.com/en', false, 'manual'],
    ['https://du-an-1-admin-dev.example.com/', true, 'manual'],
    ['https://du-an-1-admin-dev.example.com/', false, 'manual'],
  ]);

  // The report names the item and the MCP check, and holds no secret.
  const report = verifyReport({ ...result, now: NOW });
  assert.match(report, /^Ran 2026-11-24T19:30:00\.000Z\.$/m);
  assert.match(report, /read DA1-1 through the atlassian server/);
  assert.doesNotMatch(report, /secret-pass|token-of/);
});

test('verify says what to do when a platform refuses, and still cleans up what it made', async () => {
  // No CI token: no Task, and the GitHub rows still run.
  const g = fakeGithub();
  let result = await verifyProject({ config: { ...CONFIG, apps: {} }, now: NOW, jira: null, admin: null, appToken, github: g.github, fetch: hosts().fetch, envAuth: 'ao:x' });
  assert.equal(result.item, null);
  assert.match(result.rows.find(({ group }) => group === 'Jira').fix, /Set JIRA_CI_TOKEN/);
  assert.deepEqual(result.notes, ['No public app has a Development host in project.yaml: the VPS is not checked']);
  assert.ok(result.rows.filter(({ group }) => group === 'GitHub').every(({ ok }) => ok));

  // The CI token cannot comment, Cancel is missing: the Task is named so you cancel it by hand.
  const j = fakeJira({ refuse: { comment: true, cancel: true } });
  result = await verifyProject({ config: CONFIG, now: NOW, jira: j.jira, admin: j.admin, appToken, github: fakeGithub().github, fetch: hosts().fetch, envAuth: 'ao:x' });
  assert.match(result.rows.find(({ name }) => name.startsWith('the CI token comments')).fix, /Add comments in DA1/);
  assert.match(result.rows.find(({ name }) => name.startsWith('your token cancels')).fix, /no transition Cancel .* cancel DA1-1 by hand/);

  // No classic token: cancel by hand.
  result = await verifyProject({ config: CONFIG, now: NOW, jira: fakeJira().jira, admin: null, appToken, github: fakeGithub().github, fetch: hosts().fetch, envAuth: 'ao:x' });
  assert.match(result.rows.find(({ name }) => name.startsWith('your token cancels')).fix, /cancel DA1-1 on Jira by hand: Cancel, resolution Won't Do/);

  // A ruleset stops the branch; an App lacks a permission; a host is not deployed; no AO_ENV_AUTH.
  const refusing = async (kind) => {
    if (kind === 'review') throw new Error('App 12 on acme/du-an-1 lacks a permission of {"pull_requests":"write"}');
    return 't';
  };
  result = await verifyProject({ config: CONFIG, now: NOW, jira: fakeJira().jira, admin: fakeJira().admin, appToken: refusing, github: fakeGithub({ refuseBranch: true }).github, fetch: hosts({ with: 503, without: 401 }).fetch, envAuth: 'ao:x' });
  const fix = (start) => result.rows.find(({ name }) => name.startsWith(start)).fix;
  assert.match(fix('ao-dev makes the branch'), /GitHub answered 403: ao-dev needs Contents read and write/);
  assert.match(fix('ao-review gets'), /lacks a permission .* \(docs\/github-apps-setup\.md\)/);
  assert.match(fix('Development of web'), /with basic auth 503, without 401: deploy Development first/);
  result = await verifyProject({ config: CONFIG, now: NOW, jira: fakeJira().jira, admin: fakeJira().admin, appToken, github: fakeGithub().github, fetch: hosts().fetch, envAuth: undefined });
  assert.match(result.rows.find(({ name }) => name.startsWith('Development of admin')).fix, /Set AO_ENV_AUTH/);

  // GitHub has no develop yet.
  const empty = fakeGithub();
  delete empty.refs.develop;
  result = await verifyProject({ config: CONFIG, now: NOW, jira: fakeJira().jira, admin: fakeJira().admin, appToken, github: empty.github, fetch: hosts().fetch, envAuth: 'ao:x' });
  assert.match(result.rows.find(({ name }) => name === 'ao-dev reads the head of develop').fix, /push develop first/);
  assert.ok(!empty.calls.some(([method]) => method === 'POST'));
});
