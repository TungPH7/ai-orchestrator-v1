import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupGithub } from '../../lib/scaffold/setup-github.mjs';

// ao-kit setup github (project-scaffold spec 2.4; plan, decision 8), with a fake GitHub that keeps its state: what a
// first run sets, a second run finds set.
const REPO = 'acme/shop';
const TOKEN = 'jira-ci-token-value-1234567890';
const KEY = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----\n';
function github({ develop = true, isPublic = false } = {}) {
  const state = { default_branch: 'main', delete_branch_on_merge: false, alerts: false, autofix: false, envs: [], policies: [], secrets: [], envSecrets: [], ...(isPublic && { limits: 0, forkApproval: 'first_time_contributors' }) };
  const calls = [];
  const ok = (body = '') => ({ status: 0, stdout: typeof body === 'string' ? body : JSON.stringify(body), stderr: '' });
  const missing = { status: 1, stdout: '', stderr: 'gh: Not Found (HTTP 404)' };
  const gh = (args, { input } = {}) => {
    calls.push({ args: [...args], input });
    const line = args.join(' ');
    if (line === `api repos/${REPO}`) return ok({ default_branch: state.default_branch, delete_branch_on_merge: state.delete_branch_on_merge, private: !isPublic });
    if (line === `api -X PUT repos/${REPO}/interaction-limits --input -`) return (state.limits += 1, ok({ limit: JSON.parse(input).limit, origin: 'repository', expires_at: '2027-05-14T10:00:00Z' }));
    if (line === `api repos/${REPO}/actions/permissions/fork-pr-contributor-approval`) return ok({ approval_policy: state.forkApproval });
    if (line === `api -X PUT repos/${REPO}/actions/permissions/fork-pr-contributor-approval -f approval_policy=all_external_contributors`) return (state.forkApproval = 'all_external_contributors', ok());
    if (line === `api repos/${REPO}/branches/develop`) return develop ? ok({ name: 'develop' }) : missing;
    if (line === `api -X PATCH repos/${REPO} -f default_branch=develop`) return (state.default_branch = 'develop', ok({}));
    if (line === `api -X PATCH repos/${REPO} -F delete_branch_on_merge=true`) return (state.delete_branch_on_merge = true, ok({}));
    if (line === `api repos/${REPO}/vulnerability-alerts`) return state.alerts ? ok() : missing;
    if (line === `api -X PUT repos/${REPO}/vulnerability-alerts`) return (state.alerts = true, ok());
    if (line === `api repos/${REPO}/automated-security-fixes`) return ok({ enabled: state.autofix });
    if (line === `api -X PUT repos/${REPO}/automated-security-fixes`) return (state.autofix = true, ok());
    if (line === `api repos/${REPO}/environments`) return ok({ environments: state.envs.map((name) => ({ name })) });
    const env = line.match(new RegExp(`^api -X PUT repos/${REPO}/environments/([\\w-]+)`));
    if (env) return (state.envs.push(env[1]), ok({}));
    if (line === `api repos/${REPO}/environments/merge-gate/deployment-branch-policies`) return ok({ branch_policies: state.policies.map((name) => ({ name })) });
    if (line === `api -X POST repos/${REPO}/environments/merge-gate/deployment-branch-policies -f name=develop -f type=branch`) return (state.policies.push('develop'), ok({}));
    if (line === `secret list --repo ${REPO} --json name`) return ok(state.secrets.map((name) => ({ name })));
    if (line === `secret list --env merge-gate --repo ${REPO} --json name`) return ok(state.envSecrets.map((name) => ({ name })));
    if (line === `secret set JIRA_CI_TOKEN --repo ${REPO}`) return (state.secrets.push('JIRA_CI_TOKEN'), ok());
    if (line === `secret set AO_DEV_APP_KEY --env merge-gate --repo ${REPO}`) return (state.envSecrets.push('AO_DEV_APP_KEY'), ok());
    throw new Error(`unexpected gh ${line}`);
  };
  const runs = [];
  const run = (argv) => (runs.push(argv.join(' ')), { status: 0, stdout: 'Soft mode: the repository is private on the Free plan\n', stderr: '' });
  return { state, calls, gh, run, runs };
}
const setup = (fake, more = {}) => setupGithub({ kitDir: '/kit', repo: REPO, devAppId: 5514949, devAppKeyFile: '/keys/ao-dev-2.pem', secret: (name) => (name === 'JIRA_CI_TOKEN' ? TOKEN : null), readFile: () => KEY, gh: fake.gh, run: fake.run, ...more });
const writes = (calls) => calls.filter(({ args }) => args.includes('-X') || args[1] === 'set').map(({ args }) => args.join(' '));

test('a new repo gets develop as its default branch, branch deletion, Dependabot, four environments, two secrets and the ruleset check', () => {
  const fake = github();
  const { ok, notes } = setup(fake);
  assert.equal(ok, true, notes.join('\n'));
  assert.deepEqual(fake.state, { default_branch: 'develop', delete_branch_on_merge: true, alerts: true, autofix: true, envs: ['development', 'staging', 'production', 'merge-gate'], policies: ['develop'], secrets: ['JIRA_CI_TOKEN'], envSecrets: ['AO_DEV_APP_KEY'] });
  const mergeGate = fake.calls.find(({ args }) => args.join(' ') === `api -X PUT repos/${REPO}/environments/merge-gate --input -`);
  assert.deepEqual(JSON.parse(mergeGate.input), { deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } });
  assert.deepEqual(fake.runs, [`node /kit/scripts/gh-protect.mjs --repo ${REPO} --dev-app-id 5514949`]);
  const text = notes.join('\n');
  assert.match(text, /Delete \/keys\/ao-dev-2\.pem now/);
  assert.match(text, /By hand: add acme\/shop to the two GitHub Apps: on GitHub, Settings → Applications → Installed GitHub Apps/);
  assert.match(text, /GitHub for Atlassian/);
});

test('no secret reaches an argument: the token and the key go through stdin only', () => {
  const fake = github();
  setup(fake);
  for (const { args } of fake.calls) assert.ok(!args.some((arg) => arg.includes(TOKEN) || arg.includes('PRIVATE KEY')), args.join(' '));
  assert.equal(fake.calls.find(({ args }) => args.join(' ') === `secret set JIRA_CI_TOKEN --repo ${REPO}`).input, TOKEN);
  assert.equal(fake.calls.find(({ args }) => args.includes('AO_DEV_APP_KEY')).input, KEY);
});

test('a second run finds everything set, changes nothing, and says so', () => {
  const fake = github();
  setup(fake);
  const before = fake.calls.length;
  const { ok, notes } = setup(fake);
  assert.equal(ok, true);
  assert.deepEqual(writes(fake.calls.slice(before)), []);
  assert.match(notes.join('\n'), /Already set: default branch develop, branch deletion, Dependabot security updates, environments, the branch rule of merge-gate, JIRA_CI_TOKEN, AO_DEV_APP_KEY/);
});

test('with no develop on GitHub, no token and no key file, it sets the rest and says what is left', () => {
  const fake = github({ develop: false });
  const { ok, notes } = setup(fake, { secret: () => null, devAppKeyFile: undefined });
  assert.equal(ok, false);
  const text = notes.join('\n');
  assert.match(text, /develop is not on GitHub yet: push it, then run ao-kit setup github again/);
  assert.match(text, /JIRA_CI_TOKEN is not set on this machine/);
  assert.match(text, /AO_DEV_APP_KEY: give the second private key of ao-dev with --dev-app-key-file <path>/);
  assert.equal(fake.state.default_branch, 'main');
  assert.equal(fake.state.alerts, true, 'what does not wait on develop is done');
});

// A public repo (SPEC-project-scaffold-2.md, section 9, question 1), as the three repos made public on 2026-11-13.
test('a public repo gets an interaction limit of six months and approval of the workflows of fork PRs; a second run renews the limit only', () => {
  const fake = github({ isPublic: true });
  const first = setup(fake);
  assert.equal(first.ok, true, first.notes.join('\n'));
  const limit = fake.calls.find(({ args }) => args.join(' ') === `api -X PUT repos/${REPO}/interaction-limits --input -`);
  assert.deepEqual(JSON.parse(limit.input), { limit: 'collaborators_only', expiry: 'six_months' });
  assert.equal(fake.state.forkApproval, 'all_external_contributors');
  assert.match(first.notes.join('\n'), /Set the interaction limit of a public repo: collaborators only, until 2027-05-14T10:00:00Z\. Run ao-kit setup github again before then to renew it/);
  const before = fake.calls.length;
  const second = setup(fake);
  assert.deepEqual(writes(fake.calls.slice(before)), [`api -X PUT repos/${REPO}/interaction-limits --input -`]);
  assert.equal(fake.state.limits, 2);
  assert.match(second.notes.join('\n'), /approval of the workflows of every PR from a fork/);
});

test('a private repo gets no interaction limit, and says why', () => {
  const fake = github();
  const { notes } = setup(fake);
  assert.ok(!fake.calls.some(({ args }) => args.join(' ').includes('interaction-limits') || args.join(' ').includes('fork-pr')));
  assert.match(notes.join('\n'), /acme\/shop is private: it needs no interaction limit and no approval of the workflows of forks/);
});
