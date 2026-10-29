import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { applyRuleset, rulesetPayload } from '../../lib/quality/ruleset.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));

test('the ruleset protects the branches of the gates: no deletion or force push, a PR with one fresh approval, the CI jobs', () => {
  const payload = rulesetPayload(gates);
  assert.equal(payload.name, 'ao-protected');
  assert.equal(payload.target, 'branch');
  assert.equal(payload.enforcement, 'active');
  // Nobody bypasses it, the ao-dev App included: merge-gate only merges what meets the gates anyway.
  assert.deepEqual(payload.bypass_actors, []);
  assert.deepEqual(payload.conditions, { ref_name: { include: ['refs/heads/develop', 'refs/heads/main', 'refs/heads/release/*'], exclude: [] } });
  assert.deepEqual(payload.rules.map(({ type }) => type), ['deletion', 'non_fast_forward', 'pull_request', 'required_status_checks']);
  const [, , pullRequest, statusChecks] = payload.rules;
  assert.equal(pullRequest.parameters.required_approving_review_count, 1);
  assert.equal(pullRequest.parameters.dismiss_stale_reviews_on_push, true);
  assert.deepEqual(statusChecks.parameters.required_status_checks, [{ context: 'policy' }, { context: 'build-test' }, { context: 'secrets' }, { context: 'sast' }]);
  // A new release branch is pushed before any check has run on it.
  assert.equal(statusChecks.parameters.do_not_enforce_on_create, true);
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
  const result = await applyRuleset(github, gates, (line) => lines.push(line));
  return { result, lines };
};

test('a repository without rulesets answers 403: soft mode, and nothing is sent', async () => {
  const github = fakeGitHub({ status: 403 });
  assert.deepEqual(await apply(github), { result: { mode: 'soft' }, lines: ['soft mode: merge-gate and audit enforce the gates'] });
  assert.deepEqual(github.sent, []);
});

test('the ruleset is created once, then updated in place by name', async () => {
  const fresh = fakeGitHub({ rulesets: [{ id: 7, name: 'other' }] });
  assert.deepEqual(await apply(fresh), { result: { mode: 'created', id: 42 }, lines: ['created ruleset ao-protected (id 42)'] });
  assert.deepEqual(fresh.sent, [{ method: 'POST', path: '/rulesets', body: rulesetPayload(gates) }]);
  const again = fakeGitHub({ rulesets: [{ id: 7, name: 'other' }, { id: 42, name: 'ao-protected' }] });
  assert.deepEqual(await apply(again), { result: { mode: 'updated', id: 42 }, lines: ['updated ruleset ao-protected (id 42)'] });
  assert.deepEqual(again.sent, [{ method: 'PUT', path: '/rulesets/42', body: rulesetPayload(gates) }]);
});

test('any other error stops the run', async () => {
  await assert.rejects(apply(fakeGitHub({ status: 500 })), /returned 500/);
});

test('npm run gh:protect runs the script, which needs --repo <owner>/<name>', () => {
  assert.equal(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts['gh:protect'], 'node scripts/gh-protect.mjs');
  const result = spawnSync(process.execPath, [join(ROOT, 'scripts', 'gh-protect.mjs')], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim(), 'usage: npm run gh:protect -- --repo <owner>/<name>');
});
