import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setupGithub } from '../../lib/scaffold/setup-github.mjs';

// ao-kit setup github (project-scaffold spec 2.4; plan, decision 8), with a fake GitHub that keeps its state: what a
// first run sets, a second run finds set.
const REPO = 'acme/shop';
const TOKEN = 'jira-ci-token-value-1234567890';
const KEY = '-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----\n';
function github({ develop = true, isPublic = false, secrets = [] } = {}) {
  const state = {
    default_branch: 'main',
    delete_branch_on_merge: false,
    alerts: false,
    autofix: false,
    envs: [],
    policies: { 'merge-gate': [], 'jira-sync': [] },
    secrets: [...secrets],
    envSecrets: { 'merge-gate': [], 'jira-sync': [] },
    ...(isPublic && { limits: 0, forkApproval: 'first_time_contributors' }),
  };
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
    const policies = line.match(new RegExp(`^api repos/${REPO}/environments/([\\w-]+)/deployment-branch-policies$`));
    if (policies) return ok({ branch_policies: state.policies[policies[1]].map((rule) => ({ type: rule.split(':')[0], name: rule.split(':')[1] })) });
    const policy = line.match(new RegExp(`^api -X POST repos/${REPO}/environments/([\\w-]+)/deployment-branch-policies -f name=(\\S+) -f type=(branch|tag)$`));
    if (policy) return (state.policies[policy[1]].push(`${policy[3]}:${policy[2]}`), ok({}));
    if (line === `secret list --repo ${REPO} --json name`) return ok(state.secrets.map((name) => ({ name })));
    const envList = line.match(new RegExp(`^secret list --env ([\\w-]+) --repo ${REPO} --json name$`));
    if (envList) return ok(state.envSecrets[envList[1]].map((name) => ({ name })));
    const envSet = line.match(new RegExp(`^secret set (\\w+) --env ([\\w-]+) --repo ${REPO}$`));
    if (envSet) return (state.envSecrets[envSet[2]].push(envSet[1]), ok());
    throw new Error(`unexpected gh ${line}`);
  };
  const runs = [];
  const run = (argv) => (runs.push(argv.join(' ')), { status: 0, stdout: 'Soft mode: the repository is private on the Free plan\n', stderr: '' });
  return { state, calls, gh, run, runs };
}
const setup = (fake, more = {}) => setupGithub({ kitDir: '/kit', repo: REPO, mergeAppId: 5756976, mergeAppKeyFile: '/keys/acme-ao-merge.pem', secret: (name) => (name === 'JIRA_CI_TOKEN' ? TOKEN : null), readFile: () => KEY, gh: fake.gh, run: fake.run, ...more });
const writes = (calls) => calls.filter(({ args }) => args.includes('-X') || args[1] === 'set').map(({ args }) => args.join(' '));

test('a new repo gets develop as its default branch, branch deletion, Dependabot, five environments, their secrets and the rulesets', () => {
  const fake = github();
  const { ok, notes } = setup(fake);
  assert.equal(ok, true, notes.join('\n'));
  // Review of shop PR #21: the CI token is a secret of the environments jira-sync and merge-gate, which only the
  // protected branches and v* tags may use, never of the repository, which every workflow of a PR can read.
  assert.deepEqual(fake.state, {
    default_branch: 'develop',
    delete_branch_on_merge: true,
    alerts: true,
    autofix: true,
    envs: ['development', 'staging', 'production', 'merge-gate', 'jira-sync'],
    policies: { 'merge-gate': ['branch:develop'], 'jira-sync': ['branch:develop', 'branch:main', 'branch:release/*', 'tag:v*'] },
    secrets: [],
    envSecrets: { 'merge-gate': ['JIRA_CI_TOKEN', 'AO_MERGE_APP_KEY'], 'jira-sync': ['JIRA_CI_TOKEN'] },
  });
  for (const name of ['merge-gate', 'jira-sync']) {
    const made = fake.calls.find(({ args }) => args.join(' ') === `api -X PUT repos/${REPO}/environments/${name} --input -`);
    assert.deepEqual(JSON.parse(made.input), { deployment_branch_policy: { protected_branches: false, custom_branch_policies: true } }, name);
  }
  assert.deepEqual(fake.runs, [`node /kit/scripts/gh-protect.mjs --repo ${REPO} --merge-app-id 5756976`]);
  const text = notes.join('\n');
  assert.match(text, /Delete \/keys\/acme-ao-merge\.pem now: GitHub holds the key of ao-merge, and no machine an agent uses should/);
  assert.match(text, /By hand: add acme\/shop to the three GitHub Apps \(ao-dev, ao-review, ao-merge\): on GitHub, Settings → Applications → Installed GitHub Apps/);
  assert.match(text, /GitHub for Atlassian/);
});

test('no secret reaches an argument: the token and the key go through stdin only', () => {
  const fake = github();
  setup(fake);
  for (const { args } of fake.calls) assert.ok(!args.some((arg) => arg.includes(TOKEN) || arg.includes('PRIVATE KEY')), args.join(' '));
  for (const env of ['jira-sync', 'merge-gate']) assert.equal(fake.calls.find(({ args }) => args.join(' ') === `secret set JIRA_CI_TOKEN --env ${env} --repo ${REPO}`).input, TOKEN, env);
  assert.equal(fake.calls.find(({ args }) => args.includes('AO_MERGE_APP_KEY')).input, KEY);
});

// Review of shop PR #21: a repo set up before keeps its repository secret until you delete it; setup never deletes.
test('a repository secret JIRA_CI_TOKEN is left for you to delete, with the command, once the environments hold it', () => {
  const fake = github({ secrets: ['JIRA_CI_TOKEN'] });
  const { ok, notes } = setup(fake);
  assert.equal(ok, false);
  assert.deepEqual(fake.state.envSecrets['jira-sync'], ['JIRA_CI_TOKEN']);
  assert.deepEqual(fake.state.secrets, ['JIRA_CI_TOKEN']);
  assert.ok(!fake.calls.some(({ args }) => args.includes('delete')), 'setup deletes nothing');
  const text = notes.join('\n');
  assert.match(text, /Delete the repository secret JIRA_CI_TOKEN: gh secret delete JIRA_CI_TOKEN --repo acme\/shop/);
  assert.match(text, /Settings → Secrets and variables → Actions/);
  assert.match(text, /every workflow of a PR/);
});

test('a second run finds everything set, changes nothing, and says so', () => {
  const fake = github();
  setup(fake);
  const before = fake.calls.length;
  const { ok, notes } = setup(fake);
  assert.equal(ok, true);
  assert.deepEqual(writes(fake.calls.slice(before)), []);
  assert.match(notes.join('\n'), /Already set: default branch develop, branch deletion, Dependabot security updates, environments, the branch rules of merge-gate, the branch rules of jira-sync, JIRA_CI_TOKEN, AO_MERGE_APP_KEY/);
});

test('with no develop on GitHub, no token and no key file, it sets the rest and says what is left', () => {
  const fake = github({ develop: false });
  const { ok, notes } = setup(fake, { secret: () => null, mergeAppKeyFile: undefined });
  assert.equal(ok, false);
  const text = notes.join('\n');
  assert.match(text, /develop is not on GitHub yet: push it, then run ao-kit setup github again/);
  assert.match(text, /JIRA_CI_TOKEN is not set on this machine/);
  assert.match(text, /AO_MERGE_APP_KEY: give the private key of ao-merge with --merge-app-key-file <path>/);
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

// Pilot 3, review of shop PR #13 (spec 2.9): only ao-merge bypasses the ruleset of PRs, so the rulesets wait for its id.
test('with no ao-merge App in project.yaml, it applies no ruleset and says how to make the App', () => {
  const fake = github();
  const { ok, notes } = setup(fake, { mergeAppId: undefined });
  assert.equal(ok, false);
  assert.deepEqual(fake.runs, []);
  assert.match(notes.join('\n'), /github\.apps\.merge and merge_id are not in project\.yaml: create the ao-merge App with node <kit>\/scripts\/github-app-create\.mjs --apps merge/);
});

test('a private repo gets no interaction limit, and says why', () => {
  const fake = github();
  const { notes } = setup(fake);
  assert.ok(!fake.calls.some(({ args }) => args.join(' ').includes('interaction-limits') || args.join(' ').includes('fork-pr')));
  assert.match(notes.join('\n'), /acme\/shop is private: it needs no interaction limit and no approval of the workflows of forks/);
});
