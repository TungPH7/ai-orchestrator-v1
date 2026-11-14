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

// Pilot 3, review of shop PR #13 (spec 2.9, approved in Phiên 31 · Lượt 2): the App the rulesets let through must not
// be the agents' App. Every role with git: write holds a token of ao-dev, and gh-guard stops mistakes, not an agent set on
// getting round it, so the bypass of ao-dev (Phiên 30 · Lượt 9) let an agent merge a PR nobody approved. Now two
// rulesets: the first holds the protected branches against deletion and force push, with no bypass; the second asks
// for a PR with one fresh approval and the CI jobs on every protected branch, which only ao-merge bypasses, and only to
// merge a PR. The key of ao-merge lives only in the merge-gate environment.
test('two rulesets: no deletion or force push for anyone; PR, approval and CI on every protected branch, which only ao-merge bypasses, to merge a PR', () => {
  const [merge, base] = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID });
  for (const payload of [merge, base]) {
    assert.equal(payload.target, 'branch');
    assert.equal(payload.enforcement, 'active');
    assert.deepEqual(payload.conditions, { ref_name: { include: ['refs/heads/develop', 'refs/heads/main', 'refs/heads/release/*'], exclude: [] } });
  }
  assert.equal(base.name, 'ao-protected');
  assert.deepEqual(base.bypass_actors, []);
  assert.deepEqual(base.rules.map(({ type }) => type), ['deletion', 'non_fast_forward']);

  assert.equal(merge.name, 'ao-protected-merge');
  assert.deepEqual(merge.bypass_actors, [{ actor_id: MERGE_APP_ID, actor_type: 'Integration', bypass_mode: 'pull_request' }]);
  assert.deepEqual(merge.rules.map(({ type }) => type), ['pull_request', 'required_status_checks']);
  const [pullRequest, statusChecks] = merge.rules;
  assert.equal(pullRequest.parameters.required_approving_review_count, 1);
  assert.equal(pullRequest.parameters.dismiss_stale_reviews_on_push, true);
  assert.deepEqual(statusChecks.parameters.required_status_checks, [{ context: 'policy' }, { context: 'build-test' }, { context: 'secrets' }, { context: 'sast' }]);
  // A new release branch is pushed before any check has run on it.
  assert.equal(statusChecks.parameters.do_not_enforce_on_create, true);

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
const [MERGE, BASE] = rulesetPayloads(gates, { mergeAppId: MERGE_APP_ID });

test('a repository without rulesets answers 403: soft mode, and nothing is sent', async () => {
  const github = fakeGitHub({ status: 403 });
  assert.deepEqual(await apply(github), { result: { mode: 'soft' }, lines: ['soft mode: merge-gate and audit enforce the gates'] });
  assert.deepEqual(github.sent, []);
});

test('the ruleset of PRs is written before ao-protected narrows, so the branches are never less protected; a second run updates in place', async () => {
  // The repo of B2–B3: one ruleset ao-protected with every rule.
  const first = fakeGitHub({ rulesets: [{ id: 7, name: 'other' }, { id: 27, name: 'ao-protected' }] });
  assert.deepEqual(await apply(first), {
    result: { mode: 'applied', ids: { 'ao-protected-merge': 42, 'ao-protected': 27 } },
    lines: ['created ruleset ao-protected-merge (id 42)', 'updated ruleset ao-protected (id 27)'],
  });
  assert.deepEqual(first.sent, [
    { method: 'POST', path: '/rulesets', body: MERGE },
    { method: 'PUT', path: '/rulesets/27', body: BASE },
  ]);
  const again = fakeGitHub({ rulesets: [{ id: 27, name: 'ao-protected' }, { id: 28, name: 'ao-protected-merge' }] });
  assert.deepEqual((await apply(again)).lines, ['updated ruleset ao-protected-merge (id 28)', 'updated ruleset ao-protected (id 27)']);
  assert.deepEqual(again.sent.map(({ method, path }) => `${method} ${path}`), ['PUT /rulesets/28', 'PUT /rulesets/27']);
});

test('the ruleset ao-protected-release of Pilot 3, T9 goes, once ao-protected-merge holds release/* too', async () => {
  const github = fakeGitHub({ rulesets: [{ id: 27, name: 'ao-protected' }, { id: 28, name: 'ao-protected-merge' }, { id: 29, name: 'ao-protected-release' }] });
  assert.deepEqual(await apply(github), {
    result: { mode: 'applied', ids: { 'ao-protected-merge': 28, 'ao-protected': 27 } },
    lines: ['updated ruleset ao-protected-merge (id 28)', 'updated ruleset ao-protected (id 27)', 'deleted ruleset ao-protected-release (id 29): ao-protected-merge holds release/* now'],
  });
  assert.deepEqual(github.sent.map(({ method, path }) => `${method} ${path}`), ['PUT /rulesets/28', 'PUT /rulesets/27', 'DELETE /rulesets/29']);
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
