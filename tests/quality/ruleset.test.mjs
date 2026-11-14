import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { applyRulesets, rulesetPayloads } from '../../lib/quality/ruleset.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));

const MERGE_APP_ID = 5756976;

// Pilot 3, review of shop PR #13 (spec 2.9, approved in Phiên 31 · Lượt 2 and Lượt 5): the App the rulesets let through
// must not be the agents' App, an approval must be yours, and only you make release branches and v* tags. Every role with
// git: write holds a token of ao-dev, the key of ao-review lies on the same machine, and gh-guard stops mistakes, not an
// agent set on getting round it. Round 1 of the review: the bypass of ao-dev (Phiên 30 · Lượt 9) let an agent merge a PR
// nobody approved. Round 2: one App could approve the PR of the other; an agent could cut release/v9.9.9 at a commit
// nobody reviewed, or tag one.
const ADMIN = { actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'always' };
const BRANCHES = ['refs/heads/develop', 'refs/heads/main', 'refs/heads/release/*'];
const refsOf = (include) => ({ ref_name: { include, exclude: [] } });

test('five rulesets: PR, approval of a code owner and CI everywhere; only ao-merge bypasses them, on develop and release/*, to merge a PR', () => {
  const [merge, main, creation, tags, base] = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID });
  for (const payload of [merge, main, creation, tags, base]) assert.equal(payload.enforcement, 'active');
  for (const payload of [merge, main]) {
    assert.equal(payload.target, 'branch');
    assert.deepEqual(payload.rules.map(({ type }) => type), ['pull_request', 'required_status_checks']);
    const [pullRequest, statusChecks] = payload.rules;
    assert.equal(pullRequest.parameters.required_approving_review_count, 1);
    assert.equal(pullRequest.parameters.dismiss_stale_reviews_on_push, true);
    // Only the approval of a code owner counts: .github/CODEOWNERS names your logins, so no App approves in your place.
    assert.equal(pullRequest.parameters.require_code_owner_review, true);
    // You push the PRs the main session makes and approve them: the push need not be someone else's (a new push
    // dismisses an approval anyway).
    assert.equal(pullRequest.parameters.require_last_push_approval, false);
    assert.deepEqual(statusChecks.parameters.required_status_checks, [{ context: 'policy' }, { context: 'build-test' }, { context: 'secrets' }, { context: 'sast' }]);
    // A new release branch is pushed before any check has run on it.
    assert.equal(statusChecks.parameters.do_not_enforce_on_create, true);
  }
  assert.equal(merge.name, 'ao-protected-merge');
  assert.deepEqual(merge.conditions, refsOf(['refs/heads/develop', 'refs/heads/release/*']));
  assert.deepEqual(merge.bypass_actors, [{ actor_id: MERGE_APP_ID, actor_type: 'Integration', bypass_mode: 'pull_request' }]);
  // Every PR into main is a release or a hotfix you approved: nobody bypasses.
  assert.equal(main.name, 'ao-protected-main');
  assert.deepEqual(main.conditions, refsOf(['refs/heads/main']));
  assert.deepEqual(main.bypass_actors, []);
});

test('only you make a release branch, and only you and ao-merge make, move or delete a v* tag', () => {
  const [, , creation, tags] = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID });
  assert.equal(creation.name, 'ao-release-branches');
  assert.equal(creation.target, 'branch');
  assert.deepEqual(creation.conditions, refsOf(['refs/heads/release/*']));
  assert.deepEqual(creation.rules, [{ type: 'creation' }]);
  // RepositoryRole 5 is the admin role: checked live on TungPH7/test, where it let your login make a release branch and
  // a tag that the same ruleset with no bypass refused (Phiên 31 · Lượt 5).
  assert.deepEqual(creation.bypass_actors, [ADMIN]);
  assert.equal(tags.name, 'ao-release-tags');
  assert.equal(tags.target, 'tag');
  assert.deepEqual(tags.conditions, refsOf(['refs/tags/v*']));
  assert.deepEqual(tags.rules, [{ type: 'creation' }, { type: 'update' }, { type: 'deletion' }]);
  // merge-gate tags the merge of a release PR; the hotfix step of ao-step tags with your gh login.
  assert.deepEqual(tags.bypass_actors, [{ actor_id: MERGE_APP_ID, actor_type: 'Integration', bypass_mode: 'always' }, ADMIN]);
});

test('no deletion or force push of a protected branch for anyone; the id of ao-merge is needed', () => {
  const base = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID }).at(-1);
  assert.equal(base.name, 'ao-protected');
  assert.equal(base.target, 'branch');
  assert.deepEqual(base.conditions, refsOf(BRANCHES));
  assert.deepEqual(base.bypass_actors, []);
  assert.deepEqual(base.rules.map(({ type }) => type), ['deletion', 'non_fast_forward']);
  assert.throws(() => rulesetPayloads(gates, {}), /id of the ao-merge App/);
  assert.throws(() => rulesetPayloads(gates, { mergeAppId: 'abc' }), /id of the ao-merge App/);
  // The id of the agents' App is not taken in its place.
  assert.throws(() => rulesetPayloads(gates, { devAppId: 5514949 }), /id of the ao-merge App/);
});

// A GitHub client that answers the list of rulesets, or fails it with `status`, and records the writes.
function fakeGitHub({ rulesets = [], status } = {}) {
  const sent = [];
  return {
    sent,
    getAll: async (path) => {
      assert.equal(path, '/rulesets');
      if (status) throw Object.assign(new Error(`GitHub GET /rulesets returned ${status}: {"message":"Upgrade to GitHub Pro or make this repository public to enable this feature."}`), { status });
      return rulesets;
    },
    request: async (method, path, query, body) => {
      sent.push({ method, path, body });
      return { id: 42 };
    },
  };
}
const apply = async (github) => {
  const lines = [];
  const result = await applyRulesets(github, gates, { mergeAppId: MERGE_APP_ID }, (line) => lines.push(line));
  return { result, lines };
};
const PAYLOADS = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID });
const NAMES = ['ao-protected-merge', 'ao-protected-main', 'ao-release-branches', 'ao-release-tags', 'ao-protected'];

test('a repository without rulesets answers 403: soft mode, and nothing is sent', async () => {
  const github = fakeGitHub({ status: 403 });
  assert.deepEqual(await apply(github), { result: { mode: 'soft' }, lines: ['soft mode: merge-gate and audit enforce the gates'] });
  assert.deepEqual(github.sent, []);
});

test('the rulesets of PRs, release branches and tags are written before ao-protected narrows, so nothing is less protected in between; a second run updates in place', async () => {
  assert.deepEqual(PAYLOADS.map(({ name }) => name), NAMES);
  // The repo of B2–B3: one ruleset ao-protected with every rule.
  const first = fakeGitHub({ rulesets: [{ id: 7, name: 'other' }, { id: 27, name: 'ao-protected' }] });
  assert.deepEqual(await apply(first), {
    result: { mode: 'applied', ids: { 'ao-protected-merge': 42, 'ao-protected-main': 42, 'ao-release-branches': 42, 'ao-release-tags': 42, 'ao-protected': 27 } },
    lines: [...NAMES.slice(0, 4).map((name) => `created ruleset ${name} (id 42)`), 'updated ruleset ao-protected (id 27)'],
  });
  assert.deepEqual(first.sent, [...PAYLOADS.slice(0, 4).map((body) => ({ method: 'POST', path: '/rulesets', body })), { method: 'PUT', path: '/rulesets/27', body: PAYLOADS[4] }]);
  const again = fakeGitHub({ rulesets: NAMES.map((name, index) => ({ id: 30 + index, name })) });
  assert.deepEqual((await apply(again)).lines, NAMES.map((name, index) => `updated ruleset ${name} (id ${30 + index})`));
  assert.deepEqual(again.sent.map(({ method, path }) => `${method} ${path}`), NAMES.map((name, index) => `PUT /rulesets/${30 + index}`));
});

test('the ruleset ao-protected-release of Pilot 3, T9 goes, once ao-protected-merge holds release/* too', async () => {
  const github = fakeGitHub({ rulesets: [{ id: 27, name: 'ao-protected' }, { id: 28, name: 'ao-protected-merge' }, { id: 29, name: 'ao-protected-release' }] });
  const { lines } = await apply(github);
  assert.equal(lines.at(-1), 'deleted ruleset ao-protected-release (id 29): ao-protected-merge holds release/* now');
  assert.deepEqual(github.sent.at(-1), { method: 'DELETE', path: '/rulesets/29', body: undefined });
});

test('any other error stops the run', async () => {
  await assert.rejects(apply(fakeGitHub({ status: 500 })), /returned 500/);
});

test('npm run gh:protect runs the script, which needs --repo <owner>/<name> and the id of the ao-merge App', () => {
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts['gh:protect'], 'node scripts/gh-protect.mjs');
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'gh-protect.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'usage: npm run gh:protect -- --repo <owner>/<name> --merge-app-id <id of the ao-merge App>');
});
