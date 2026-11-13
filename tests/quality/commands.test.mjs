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
const TEMP = 'C:\\Users\\me\\AppData\\Local\\Temp';

const call = (agent, tool_name, tool_input) => checkAgentCall({ agent_type: agent, tool_name, tool_input }, { gates, contract, projectDir: PROJECT, tempDir: TEMP });
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

// A run by hand of CI skips the checks of a PR, and disabling a workflow stops its gates (review of ao-sample PR #30).
test('starting, enabling or disabling a workflow is refused; reading workflows is not', () => {
  for (const command of ['gh workflow run CI --ref feature/SMP-1-x', 'gh workflow run ci.yml', 'gh -R o/r workflow run CI', 'gh workflow disable merge-gate', 'gh workflow enable CI']) {
    denied(bash(command), /workflow/, command);
  }
  for (const command of ['gh workflow list', 'gh workflow view CI', 'gh run rerun 123 --failed']) allowed(bash(command), command);
});

test('each role runs ao-pr.mjs only with its own App', () => {
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title "feat(api): x (DEMO-1)" --body-file pr.md'), 'fe-dev create');
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs review 12 --event REQUEST_CHANGES --body-file r.md', 'reviewer'), 'reviewer review');
  allowed(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title "docs(spec): x (DEMO-1)" --body-file pr.md', 'ba'), 'ba create');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs review 12 --event COMMENT --body-file r.md'), /fe-dev.*review/, 'fe-dev review');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title x --body-file pr.md', 'security'), /security.*create/, 'security create');
  denied(bash('node .ai-orchestrator/scripts/ao-pr.mjs merge 12', 'devops'), /merge/, 'devops merge');
  denied(bash('node --no-warnings .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title x --body-file pr.md', 'qa'), /qa has no GitHub App/, 'node option first');
  // Reading the script is not running it (reviews of ao-pilot PR #8 and #9).
  for (const command of ['grep -n review .ai-orchestrator/scripts/ao-pr.mjs', 'cat .ai-orchestrator/scripts/ao-pr.mjs', 'git log -1 -- .ai-orchestrator/scripts/ao-pr.mjs']) {
    allowed(bash(command, 'reviewer'), command);
  }
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
  // Outside the project only the temp folder is open: a user setting such as ~/.gitconfig could move the hooks.
  denied(edit('fe-dev', 'D:\\elsewhere\\.claude\\settings.json'), /outside the project/, 'outside the project');
  denied(edit('fe-dev', 'C:\\Users\\me\\.gitconfig'), /outside the project/, 'a user setting');
  allowed(edit('fe-dev', `${TEMP}\\notes.md`), 'the temp folder');
  // The long path prefix and another letter case name the same file on Windows (second security review of PR #8).
  denied(edit('fe-dev', `\\\\?\\${PROJECT}\\.claude\\settings.json`), /\.claude/, 'long path prefix');
  denied(edit('fe-dev', `${PROJECT}\\.Claude\\hooks\\gh-guard.mjs`), /\.claude/, 'letter case');
  denied(edit('fe-dev', `${PROJECT}\\.github\\Workflows\\ci.yml`), /\.github\/workflows/, 'letter case of a folder');
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

// The ways around gh-guard that the second reviews of ao-pilot PR #8 found (agent-roster T15).
test('git settings from the environment, aliases, credentials and more wrappers are refused', () => {
  for (const [command, reason] of [
    ['GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/x git push', /hook/],
    ['GIT_CONFIG_PARAMETERS="\'core.hooksPath\'=\'/x\'" git commit -m x', /hook/],
    ['env GIT_CONFIG_GLOBAL=/tmp/x.gitconfig git commit -m x', /hook/],
    ['git -c include.path=/tmp/x.gitconfig commit -m x', /hook/],
    ['git -c includeIf.gitdir:/repo/.path=/tmp/x.gitconfig push', /hook/],
    ['git -c alias.p="!git push --no-verify" p', /alias/],
    ['printf "protocol=https\\nhost=github.com\\n" | gh auth git-credential get', /token/],
    ['git credential fill', /token/],
    ['git credential-manager get', /token/],
    ['gh alias set ap "pr review --approve"', /alias/],
    ['gh alias import aliases.yml', /alias/],
    ['timeout 60 git push --no-verify origin HEAD:develop', /hook/],
    ['timeout -k 5 -s KILL 60 git push origin develop', /pull request/],
    ['time git push origin develop', /pull request/],
    ['nohup git push origin main', /pull request/],
    ['nice -n 5 git push origin develop', /pull request/],
    ['env -C . git push --no-verify origin HEAD:main', /hook/],
    ["env -S 'git push origin develop'", /pull request/],
    ["eval 'git push origin develop'", /pull request/],
    ["bash -c -- 'git push origin develop'", /pull request/],
    ['git push --no-veri origin feature/DEMO-1-x', /hook/],
    ['git commit --no-verif -m x', /hook/],
    ['xargs git push origin develop < /dev/null', /pull request/],
  ]) {
    denied(bash(command), reason, command);
  }
  for (const command of ['timeout 60 npm test', 'time npm run build', 'gh alias list', 'git config --get alias.co', 'git push --verbose origin feature/DEMO-1-x', 'echo "git is installed"']) {
    allowed(bash(command), command);
  }
});

// The session of an agent gets its token from ao-git-credential.mjs through GIT_CONFIG_* (dev-workflow spec 2.3, plan
// decision 5). An agent may not call the helper with another role, set a helper of its own, or start agents.
test('agents do not run ao-step.mjs, ao-agent.mjs or ao-git-credential.mjs, nor set a git credential helper', () => {
  for (const [command, reason] of [
    ['node .ai-orchestrator/scripts/ao-git-credential.mjs devops TungPH7/ao-pilot get', /ao-git-credential\.mjs.*human/],
    ['printf "protocol=https\\nhost=github.com\\npath=TungPH7/ao-pilot\\n" | node .ai-orchestrator/scripts/ao-git-credential.mjs devops TungPH7/ao-pilot get', /human/],
    ['node .ai-orchestrator/scripts/ao-step.mjs build DEMO-21 --go', /ao-step\.mjs.*human/],
    ['node .ai-orchestrator/scripts/ao-agent.mjs reviewer -p "Review PR #12."', /ao-agent\.mjs.*human/],
    ['node --no-warnings D:\\work\\shop\\.ai-orchestrator\\scripts\\ao-agent.mjs fe-dev', /human/],
    ['node "D:\\work\\shop\\.ai-orchestrator\\scripts\\ao-agent.mjs" fe-dev', /human/],
    ["sh -c 'node .ai-orchestrator/scripts/ao-step.mjs status'", /human/],
    ['env AO_KIT_DIR=. node .ai-orchestrator/scripts/ao-agent.mjs ba', /human/],
    ['timeout 60 node .ai-orchestrator/scripts/ao-step.mjs status', /human/],
    ['echo DEMO-1 | xargs node .ai-orchestrator/scripts/ao-step.mjs build', /human/],
    ['git -c credential.helper="!node .ai-orchestrator/scripts/ao-git-credential.mjs devops TungPH7/ao-pilot" push origin feature/DEMO-1-x', /credential helper/],
    ['git -c credential.https://github.com.helper=store push origin feature/DEMO-1-x', /credential helper/],
    ['git --config-env=credential.helper=HELPER push origin feature/DEMO-1-x', /credential helper/],
    ['git config credential.helper "!f() { cat >> /tmp/c; }; f"', /credential helper/],
    ['git config --global --add credential.helper store', /credential helper/],
    ['git config --unset-all credential.helper', /credential helper/],
  ]) {
    for (const role of ['fe-dev', 'reviewer']) denied(bash(command, role), reason, `${role}: ${command}`);
  }
  // Reading the scripts or the settings is not running or changing them.
  for (const command of ['cat .ai-orchestrator/scripts/ao-step.mjs', 'grep -n credential .ai-orchestrator/scripts/ao-git-credential.mjs', 'git config --get-all credential.helper', 'git config --show-origin credential.helper', 'node --version']) {
    allowed(bash(command), command);
  }
});

test('agents do not edit the files of git itself, where the hooks and the credential helper are set', () => {
  for (const file of [`${PROJECT}\\.git\\config`, '.git/hooks/pre-push', `${PROJECT}\\.GIT\\info\\exclude`]) {
    denied(call('fe-dev', 'Write', { file_path: file }), /\.git\/ holds git's own settings/, file);
  }
  allowed(call('fe-dev', 'Edit', { file_path: `${PROJECT}\\.gitignore` }), '.gitignore is a project file');
  allowed(call('fe-dev', 'Edit', { file_path: `${PROJECT}\\.github\\pull_request_template.md` }), '.github is not .git');
});

test('the main session and agents outside the contract are not checked by this hook', () => {
  allowed(checkAgentCall({ tool_name: 'Bash', tool_input: { command: 'gh pr merge 12' } }, { gates, contract, projectDir: PROJECT }), 'main session');
  allowed(checkAgentCall({ tool_name: 'Bash', tool_input: { command: 'node .ai-orchestrator/scripts/ao-step.mjs build DEMO-21 --go' } }, { gates, contract, projectDir: PROJECT }), 'your session runs ao-step.mjs');
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

// The ways around gh-guard that the reviews of ao-pilot PR #14 found (dev-workflow T15b). The session of an agent holds
// its GitHub identity in its environment (lib/agents/launch.mjs): an agent may not set, export or clear those variables.
test('the variables of the session identity cannot be set, exported or cleared, in any shell', () => {
  for (const command of [
    'export GIT_CONFIG_COUNT=6 GIT_CONFIG_KEY_5=core.hooksPath GIT_CONFIG_VALUE_5=/dev/null; git commit -m x',
    'export GIT_CONFIG_VALUE_1',
    'GIT_CONFIG_VALUE_1="!node x.mjs devops o/r"; git push origin feature/DEMO-1-x',
    'declare -x GIT_CONFIG_COUNT=0',
    'typeset -x GH_TOKEN=x',
    'readonly GIT_ASKPASS=/tmp/x',
    'unset GIT_CONFIG_COUNT && git push origin feature/DEMO-1-x',
    'unset -v GH_TOKEN; gh api user',
    'set -a; GIT_CONFIG_COUNT=0; git push',
    'env -i PATH=/usr/bin git push origin feature/DEMO-1-x',
    'env --ignore-environment git push',
    'env - git push',
    'env -u GIT_CONFIG_COUNT git push origin feature/DEMO-1-x',
    'env --unset=GH_TOKEN gh api user',
    'GH_TOKEN= node .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title x --body-file pr.md',
    'GIT_ASKPASS=/tmp/x npm run deploy',
    'powershell -Command "$env:GIT_CONFIG_COUNT = 0; git push"',
    'pwsh -c "Remove-Item Env:GIT_CONFIG_COUNT; git push"',
    'powershell -c "[Environment]::SetEnvironmentVariable(\'GH_TOKEN\', $null)"',
    'cmd /c "set GIT_CONFIG_COUNT=0 && git push"',
  ]) {
    denied(bash(command), /session|hooks/, command);
  }
  for (const command of ['export NODE_ENV=test', 'FOO=1; npm test', 'unset FOO', 'env -u NODE_ENV npm test', 'echo $GIT_CONFIG_COUNT', 'printenv GH_PROMPT_DISABLED', 'GIT_PAGER=cat git log -1']) {
    allowed(bash(command), command);
  }
});

test('a command inside powershell, pwsh or cmd is checked like the command itself; an encoded one is refused', () => {
  for (const [command, reason] of [
    ['powershell -Command "git push --no-verify origin feature/DEMO-1-x"', /hook/],
    ['powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "git push origin develop"', /pull request/],
    ['PowerShell -c "gh pr merge 8"', /ao-pr\.mjs/],
    ['pwsh -NoLogo -Command git push origin main', /pull request/],
    ['powershell "git push origin develop"', /pull request/],
    ['cmd /c "git push --no-verify origin feature/DEMO-1-x"', /hook/],
    ['cmd //c git push origin develop', /pull request/],
    ['cmd.exe /S /C "gh auth token"', /token/],
    ['powershell -EncodedCommand ZwBpAHQA', /encoded/],
    ['pwsh -enc ZwBpAHQA', /encoded/],
  ]) {
    denied(bash(command), reason, command);
  }
  for (const command of ['powershell -NoProfile -Command "Get-ChildItem"', 'cmd /c dir', 'pwsh -File scripts/build.ps1', 'powershell -Command "git push origin feature/DEMO-1-x"']) {
    allowed(bash(command), command);
  }
});

test('a shell that reads its commands from stdin is refused; a shell running a script file or -c is not', () => {
  for (const command of [
    "echo 'git push --no-verify origin feature/DEMO-1-x' | bash",
    'printf "git push origin develop" | sh -s',
    'cat cmds.txt | zsh',
    'echo "git push" | powershell -Command -',
    'echo "git push" | powershell',
    'echo "git push" | cmd',
  ]) {
    denied(bash(command), /stdin/, command);
  }
  for (const command of ['bash scripts/build.sh', "bash -c 'npm test'", 'bash --version', 'sh ./x.sh arg']) allowed(bash(command), command);
});

test('git credential programs and the orchestration scripts in any letter case are refused', () => {
  for (const [command, reason] of [
    ['git-credential-manager get', /token/],
    ['printf "protocol=https\\nhost=github.com\\n" | git-credential-manager.exe get', /token/],
    ['"C:/Program Files/Git/mingw64/bin/git-credential-manager.exe" get', /token/],
    ['echo x | xargs git-credential-wincred get', /token/],
    ['node .ai-orchestrator/scripts/AO-GIT-CREDENTIAL.MJS devops TungPH7/ao-pilot get', /human/],
    ['NODE .ai-orchestrator/scripts/Ao-Step.mjs build DEMO-1 --go', /human/],
  ]) {
    denied(bash(command), reason, command);
  }
});

test('the options of node that take a value are skipped when ao-pr.mjs is looked for', () => {
  for (const command of [
    'node -r ./x.cjs .ai-orchestrator/scripts/ao-pr.mjs review 14 --event COMMENT --body-file f',
    'node --require ./x.cjs .ai-orchestrator/scripts/ao-pr.mjs review 14 --event COMMENT --body-file f',
    'node --import ./x.mjs .ai-orchestrator/scripts/ao-pr.mjs review 14 --event COMMENT --body-file f',
    'node --loader ./x.mjs .ai-orchestrator/scripts/ao-pr.mjs review 14 --event COMMENT --body-file f',
    'node -C dev .ai-orchestrator/scripts/ao-pr.mjs review 14 --event COMMENT --body-file f',
  ]) {
    denied(bash(command, 'be-dev'), /be-dev uses the dev App/, command);
  }
  allowed(bash('node --require=./x.cjs .ai-orchestrator/scripts/ao-pr.mjs create --base develop --title x --body-file pr.md', 'be-dev'), 'an option with = keeps its value');
});

test('the temp folder counts by its short (8.3) name and its long name alike', () => {
  const check = (file) => checkAgentCall({ agent_type: 'reviewer', tool_name: 'Write', tool_input: { file_path: file } }, { gates, contract, projectDir: PROJECT, tempDir: ['C:\\Users\\HUUTUN~1\\AppData\\Local\\Temp', 'C:\\Users\\Huu Tung\\AppData\\Local\\Temp'] });
  allowed(check('C:\\Users\\Huu Tung\\AppData\\Local\\Temp\\probe\\x.md'), 'long name');
  allowed(check('C:/Users/HUUTUN~1/AppData/Local/Temp/probe/x.md'), 'short name');
  denied(check('C:\\Users\\Huu Tung\\.gitconfig'), /outside the project/, 'the home folder');
});

// ba on DEMO-20 (dev-workflow T17) ran ao-pr.mjs with 2>&1 to read its usage, and gh-guard took 2> for its command.
test('a redirection is not a word of the command, and ao-pr.mjs with no command only prints its usage', () => {
  for (const command of [
    'node .ai-orchestrator/scripts/ao-pr.mjs 2>&1 | head -20',
    'node .ai-orchestrator/scripts/ao-pr.mjs --help',
    'node .ai-orchestrator/scripts/ao-pr.mjs edit 15 --body-file pr.md 2>&1',
    'node .ai-orchestrator/scripts/ao-pr.mjs comment 15 --body-file c.md >/tmp/out.txt 2>/dev/null',
  ]) {
    allowed(bash(command, 'ba'), command);
  }
  for (const [command, reason, role] of [
    ['node .ai-orchestrator/scripts/ao-pr.mjs review 15 --event COMMENT --body-file r.md 2>&1', /ba uses the dev App/, 'ba'],
    ['git push origin develop 2>&1 | tail -1', /pull request/, 'fe-dev'],
    ['git push origin feature/DEMO-1-x --no-verify >/dev/null 2>&1', /hook/, 'fe-dev'],
    ['git log -1 >out.txt; git push origin main', /pull request/, 'fe-dev'],
  ]) {
    denied(bash(command, role), reason, command);
  }
});

// Without it, Claude Code tells agents to end their commits with a Co-Authored-By trailer (seen in T18).
test('the kit settings hide the attribution Claude Code adds to commits and PRs', async () => {
  const { default: settings } = await import('../../kit/.claude/settings.json', { with: { type: 'json' } });
  assert.deepEqual(settings.attribution, { commit: '', pr: '' });
});

// qa ran curl -u with the basic auth of Development (Pilot 2, T6): any process on the machine can read that command line.
test('the basic auth password stays off command lines: only printf, a builtin of the shell, may name it', () => {
  for (const command of [
    'curl -u "$E2E_HTTP_USER:$E2E_HTTP_PASSWORD" "$E2E_BASE_URL/api/notes"',
    'curl --user "${E2E_HTTP_USER}:${E2E_HTTP_PASSWORD}" https://sample-dev.example/api/notes',
    'curl "https://$E2E_HTTP_USER:$E2E_HTTP_PASSWORD@sample-dev.example/notes"',
    'node e2e/login.mjs "$E2E_HTTP_PASSWORD"',
    'echo "$E2E_HTTP_PASSWORD"',
    '/usr/bin/printf %s "$E2E_HTTP_PASSWORD"',
    'timeout 30 curl -u "ao:$E2E_HTTP_PASSWORD" https://sample-dev.example',
    'bash -c \'curl -u "ao:$E2E_HTTP_PASSWORD" https://sample-dev.example\'',
    'powershell -Command "curl.exe -u ao:$env:E2E_HTTP_PASSWORD https://sample-dev.example"',
    'cmd /c curl -u ao:%E2E_HTTP_PASSWORD% https://sample-dev.example',
    'curl -u "$AO_ENV_AUTH" https://sample-dev.example',
  ]) {
    denied(bash(command, 'qa'), /password on a command line/, command);
  }
  for (const command of [
    'printf \'user = "%s:%s"\n\' "$E2E_HTTP_USER" "$E2E_HTTP_PASSWORD" | curl -K - "$E2E_BASE_URL/api/notes"',
    'E2E_BASE_URL=https://sample-dev.example npx playwright test e2e/notes',
    'node -e "console.log(Boolean(process.env.E2E_HTTP_PASSWORD))"',
    'curl -s "$E2E_BASE_URL/notes" -o /dev/null -w "%{http_code}"',
  ]) {
    allowed(bash(command, 'qa'), command);
  }
});
