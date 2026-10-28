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
    'git config core.hooksPath .nohooks',
    'git config --unset core.hooksPath',
  ]) {
    denied(bash(command), /hook/, command);
  }
  for (const command of ['git commit -m "-n"', 'git commit -am "fix(cli): handle the -n flag (DEMO-1)"', 'git config user.name tester']) {
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
  ]) {
    denied(bash(command), /pull request/, command);
  }
  for (const command of ['git push origin feature/DEMO-1-x', 'git push -u origin feature/DEMO-1-x', 'git push', 'git push origin HEAD:feature/DEMO-2-y']) {
    allowed(bash(command), command);
  }
});

test('working on a PR with your account is refused, and the refusal names ao-pr.mjs', () => {
  for (const command of ['gh pr merge 12 --squash', 'gh pr review 12 --approve', 'gh pr create --title x --body y', 'gh pr edit 12 --title x', 'gh pr close 12', 'gh pr ready 12', 'gh pr comment 12 -b hi']) {
    denied(bash(command), /ao-pr\.mjs/, command);
  }
  for (const command of ['gh pr view 12', 'gh pr list --state open', 'gh pr checks 12', 'gh pr diff 12']) allowed(bash(command), command);
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
    'cat "C:\\Users\\Huu Tung\\ao-keys\\tungph7-ao-dev.pem"',
    'cat $AO_DEV_APP_KEY_FILE',
    'gh secret set JIRA_CI_TOKEN',
    'gh variable delete X',
    'gh repo edit --visibility public',
  ]) {
    denied(bash(command), /token|key|repository settings|secret|variable/, command);
  }
  allowed(bash('gh auth status'), 'gh auth status');
  denied(call('fe-dev', 'Read', { file_path: 'C:\\Users\\Huu Tung\\ao-keys\\tungph7-ao-review.pem' }), /key/, 'Read of a key');
  allowed(call('fe-dev', 'Read', { file_path: `${PROJECT}\\src\\a.ts` }), 'Read of code');
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
