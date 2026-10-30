import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readContract } from '../../lib/contract.mjs';
import { checkAgentCall } from '../../lib/quality/commands.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const gates = readGates(join(ROOT, 'quality'));
const PROJECT = 'D:\\work\\shop';

const call = (agent, tool_name, tool_input) => checkAgentCall({ agent_type: agent, tool_name, tool_input }, { gates, contract, projectDir: PROJECT });
const bash = (command, agent = 'fe-dev') => call(agent, 'Bash', { command });
const denied = (result, pattern, label) => {
  assert.equal(result.allow, false, `${label} should be refused`);
  assert.match(result.reason, pattern, label);
};
const allowed = (result, label) => assert.deepEqual(result, { allow: true }, label);

test('skipping the git hooks is refused, while a message that only looks like a flag is not', () => {
  for (const command of [
    'git commit --no-verify -m "feat(api): x (DEMO-1)"',
    'git commit -nm "feat(api): x (DEMO-1)"',
    'git commit -am "feat(api): x (DEMO-1)" -n',
    'git push --no-verify origin feature/DEMO-1-x',
    'git -c core.hooksPath=/dev/null commit -m "feat(api): x (DEMO-1)"',
    'git --config-env=core.hooksPath=NO_HOOKS commit -m "feat(api): x (DEMO-1)"',
    'git --config-env core.hooksPath=NO_HOOKS commit -m "feat(api): x (DEMO-1)"',
    'git --namespace log push --no-verify origin feature/DEMO-1-x',
    'git --git-dir .git commit -nm "feat(api): x (DEMO-1)"',
    'git config core.hooksPath .nohooks',
    'git config --unset core.hooksPath',
  ]) {
    denied(bash(command), /hook/, command);
  }
  // Reading where the hooks are is not moving them (security review of ao-pilot PR #8).
  for (const command of ['git commit -m "-n"', 'git commit -am "fix(cli): handle the -n flag (DEMO-1)"', 'git config user.name tester', 'git config --get core.hooksPath', 'git config core.hooksPath', 'git config --show-origin --get core.hooksPath']) {
    allowed(bash(command), command);
  }
});

test('pushing to a protected branch is refused; pushing a work branch is not', () => {
  for (const command of [
    'git push origin develop',
    'git push origin HEAD:main',
    'git push origin feature/DEMO-1-x:refs/heads/release/v1.0.0',
    'git push --force origin +develop',
    'git push origin --delete develop',
    'git push --all origin',
    'cd /repo && git push origin main',
    // Options of git itself whose value is the next word, as git reads them.
    'git --namespace x push origin HEAD:develop',
    'git --work-tree status push origin main',
    'git --git-dir .git --work-tree . push origin develop',
    'git --attr-source HEAD push origin develop',
  ]) {
    denied(bash(command), /pull request/, command);
  }
  for (const command of ['git push origin feature/DEMO-1-x', 'git push -u origin feature/DEMO-1-x', 'git push', 'git push origin HEAD:feature/DEMO-2-y', 'git --git-dir=.git push origin feature/DEMO-1-x']) {
    allowed(bash(command), command);
  }
});

test('working on a PR with your account is refused, and the refusal names ao-pr.mjs', () => {
  for (const command of [
    'gh pr merge 12 --squash',
    'gh pr review 12 --approve',
    'gh pr create --title x --body y',
    'gh pr edit 12 --title x',
    'gh pr close 12',
    'gh pr ready 12',
    'gh pr comment 12 -b hi',
    'gh pr revert 12',
    'gh pr update-branch 12 --rebase',
    'gh pr -R o/r merge 12',
    'gh pr --repo o/r review 12 --approve',
  ]) {
    denied(bash(command), /ao-pr\.mjs/, command);
  }
  for (const command of ['gh pr view 12', 'gh pr list --state open', 'gh pr checks 12', 'gh pr diff 12', 'gh pr -R o/r view 12']) {
    allowed(bash(command), command);
  }
});

test('gh api may read but not write', () => {
  for (const command of [
    'gh api -X PUT repos/o/r/pulls/12/merge',
    'gh api repos/o/r/pulls/12/reviews -f event=APPROVE',
    'gh api --method POST repos/o/r/issues/1/comments --input body.json',
    'gh api repos/o/r/pulls/12/reviews -F event=APPROVE',
  ]) {
    denied(bash(command), /gh api/, command);
  }
  for (const command of ['gh api repos/o/r/pulls/12', 'gh api -X GET repos/o/r/pulls --paginate']) allowed(bash(command), command);
});

test('taking your token, an App key, or changing the repository settings is refused', () => {
  for (const command of [
    'gh auth token',
    'echo $(gh auth token)',
    'gh auth switch',
    'gh auth status -t',
    'gh auth status --show-token',
    'gh auth status -h github.com -at',
    'cat "$APPDATA/GitHub CLI/hosts.yml"',
    'cat ~/.config/gh/hosts.yml',
    'cat "C:\\Users\\Huu Tung\\ao-keys\\tungph7-ao-dev.pem"',
    'cat $AO_DEV_APP_KEY_FILE',
    'gh secret set JIRA_CI_TOKEN',
    'gh variable delete X',
    'gh repo edit --visibility public',
    'gh repo autolink create TICKET- "https://example.com/t/<num>"',
    'gh repo autolink delete 3 --yes',
    // Quotes and backslashes the shell removes (security review of ao-pilot PR #8).
    'gh auth "token"',
    'gh auth to\\ken',
    'gh auth status "--show-token"',
    "gh auth status '-t'",
  ]) {
    denied(bash(command), /token|key|repository settings|secret|variable/, command);
  }
  for (const command of ['gh auth status', 'gh auth status -h github.com', 'gh auth status --active', 'gh repo autolink list']) {
    allowed(bash(command), command);
  }
  denied(call('fe-dev', 'Read', { file_path: 'C:\\Users\\Huu Tung\\ao-keys\\tungph7-ao-review.pem' }), /key/, 'Read of a key');
  denied(call('fe-dev', 'Read', { file_path: 'C:\\Users\\Huu Tung\\AppData\\Roaming\\GitHub CLI\\hosts.yml' }), /token/, 'Read of the gh hosts file');
  allowed(call('fe-dev', 'Read', { file_path: `${PROJECT}\\src\\a.ts` }), 'Read of code');
  allowed(call('fe-dev', 'Read', { file_path: `${PROJECT}\\deploy\\hosts.yml` }), 'Read of a hosts.yml of the project');
});

test('deleting a workflow run is refused; reading runs is not', () => {
  denied(bash('gh run delete 123'), /workflow runs/, 'gh run delete');
  for (const command of ['gh run view 123 --log-failed', 'gh run list --workflow CI']) allowed(bash(command), command);
});

test('each role runs ao-pr.mjs only with its own App', () => {
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title "feat(api): x (DEMO-1)" --body-file pr.md'), 'fe-dev create');
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs review 12 --event REQUEST_CHANGES --body-file r.md', 'reviewer'), 'reviewer review');
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title "docs(spec): x (DEMO-1)" --body-file pr.md', 'ba'), 'ba create');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs review 12 --event COMMENT --body-file r.md'), /fe-dev.*review/, 'fe-dev review');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title x --body-file pr.md', 'security'), /security.*create/, 'security create');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs merge 12', 'devops'), /merge/, 'devops merge');
});

test('agents do not edit protected paths, except devops on workflows', () => {
  const edit = (agent, file, tool = 'Edit') => call(agent, tool, tool === 'NotebookEdit' ? { notebook_path: file } : { file_path: file });
  denied(edit('fe-dev', `${PROJECT}\\.github\\workflows\\ci.yml`), /\.github\/workflows/, 'fe-dev workflow');
  allowed(edit('devops', `${PROJECT}\\.github\\workflows\\deploy.yml`), 'devops workflow');
  denied(edit('devops', `${PROJECT}\\.claude\\settings.json`, 'Write'), /\.claude/, 'devops settings');
  denied(edit('be-dev', '.ai-orchestrator/quality/gates.yaml'), /\.ai-orchestrator/, 'relative kit path');
  denied(edit('fe-dev', 'D:/work/shop/.githooks/pre-push'), /\.githooks/, 'forward slashes');
  allowed(edit('fe-dev', `${PROJECT}\\src\\app.ts`), 'code');
  allowed(edit('fe-dev', `${PROJECT}\\docs\\github-workflows.md`), 'a doc that only mentions workflows');
  allowed(edit('fe-dev', 'D:\\elsewhere\\.claude\\settings.json'), 'outside the project');
  // A path with .. is read where it leads (security review of ao-pilot PR #8).
  denied(edit('fe-dev', `${PROJECT}\\src\\..\\.claude\\settings.json`), /\.claude/, 'absolute path through ..');
  denied(edit('fe-dev', 'src/../.githooks/pre-push'), /\.githooks/, 'relative path through ..');
  denied(edit('fe-dev', 'D:\\work\\other\\..\\shop\\.claude\\settings.json'), /\.claude/, 'into the project through ..');
});

test('a command inside sh -c, bash -c, env, command or exec is checked like the command itself', () => {
  for (const [command, reason] of [
    ["sh -c 'git push origin develop'", /pull request/],
    ['bash -c "git commit --no-verify -m x"', /hook/],
    ["bash -lc 'gh pr merge 8 --admin'", /ao-pr\.mjs/],
    ['env git push origin HEAD:main', /pull request/],
    ['env -u HOME GIT_TRACE=1 git push --no-verify origin feature/DEMO-1-x', /hook/],
    ['command gh auth token', /token/],
    ['exec git push origin develop', /pull request/],
    ["sh -c \"sh -c 'git push origin develop'\"", /pull request/],
  ]) {
    denied(bash(command), reason, command);
  }
  for (const command of ["sh -c 'npm test'", 'env NODE_ENV=test npm test', "bash -c 'git push origin feature/DEMO-1-x'"]) allowed(bash(command), command);
});

test('the main session and agents outside the contract are not checked by this hook', () => {
  allowed(checkAgentCall({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 12' } }, { gates, contract, projectDir: PROJECT }), 'main session');
  allowed(call('Explore', 'Bash', { command: 'gh pr merge 12' }), 'plugin agent');
  allowed(call('fe-dev', 'Glob', { pattern: '**/*.ts' }), 'other tool');
});

// The hook script loads the kit from AO_KIT_DIR, like the hooks of tracker-integration.
const HOOK = join(ROOT, 'kit', '.claude', 'hooks', 'gh-guard.mjs');
const runHook = (input, env = {}) =>
  spawnSync(process.execPath, [HOOK], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, AO_KIT_DIR: ROOT, CLAUDE_PROJECT_DIR: ROOT, ...env } });

test('the gh-guard hook denies with the reason, and prints nothing to allow', () => {
  const deny = runHook({ hook_event_name: 'PreToolUse', agent_type: 'fe-dev', tool_name: 'Bash', tool_input: { command: 'gh pr merge 12' } });
  assert.equal(deny.status, 0, deny.stderr);
  const output = JSON.parse(deny.stdout).hookSpecificOutput;
  assert.equal(output.permissionDecision, 'deny');
  assert.match(output.permissionDecisionReason, /^gh-guard: .*ao-pr\.mjs/);
  assert.equal(runHook({ hook_event_name: 'PreToolUse', agent_type: 'fe-dev', tool_name: 'Bash', tool_input: { command: 'npm test' } }).stdout, '');
});

test('without the kit the hook refuses git and gh commands of agents, and lets the rest through', () => {
  const missing = { AO_KIT_DIR: join(ROOT, 'no-such-kit') };
  const agent = (command) => runHook({ hook_event_name: 'PreToolUse', agent_type: 'fe-dev', tool_name: 'Bash', tool_input: { command } }, missing);
  assert.match(JSON.parse(agent('git push origin develop').stdout).hookSpecificOutput.permissionDecisionReason, /^gh-guard: /);
  assert.equal(agent('npm test').stdout, '');
});

test('the kit settings run gh-guard before Bash, Read, Edit, Write and NotebookEdit', async () => {
  const { default: settings } = await import('../../kit/.claude/settings.json', { with: { type: 'json' } });
  const entry = settings.hooks.PreToolUse.find(({ hooks }) => hooks.some(({ command }) => command.includes('gh-guard.mjs')));
  assert.ok(entry, 'gh-guard is declared');
  assert.deepEqual(entry.matcher.split('|').sort(), ['Bash', 'Edit', 'NotebookEdit', 'Read', 'Write']);
});

// Without it, Claude Code tells agents to end their commits with a Co-Authored-By trailer (seen in T18).
test('the kit settings hide the attribution Claude Code adds to commits and PRs', async () => {
  const { default: settings } = await import('../../kit/.claude/settings.json', { with: { type: 'json' } });
  assert.deepEqual(settings.attribution, { commit: '', pr: '' });
});
