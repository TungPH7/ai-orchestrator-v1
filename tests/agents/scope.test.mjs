import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { gitRefusal, writeRefusal } from '../../lib/agents/scope.mjs';
import { readContract } from '../../lib/contract.mjs';
import { checkAgentCall } from '../../lib/quality/commands.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = readContract(CONTRACT_DIR);
const gates = readGates(join(ROOT, 'quality'));
const roster = readRoster(join(ROOT, 'agents'));
const PROJECT = 'D:\\work\\shop';

const call = (agent, tool_name, tool_input, options = { roster }) =>
  checkAgentCall({ agent_type: agent, tool_name, tool_input }, { gates, contract, projectDir: PROJECT, ...options });
const write = (agent, path) => call(agent, 'Write', { file_path: `${PROJECT}\\${path.replaceAll('/', '\\')}` });
const bash = (agent, command) => call(agent, 'Bash', { command });
const allowed = (result, label) => assert.deepEqual(result, { allow: true }, label);
const denied = (result, pattern, label) => {
  assert.equal(result.allow, false, `${label} should be refused`);
  assert.match(result.reason, pattern, label);
};

// Spec 2.3, column "Ghi được": a file inside the role's paths, and one outside them.
const SCOPES = {
  pm: ['.ai/reports/2026-11-02.md', 'docs/specs/DEMO-20/spec.md'],
  ba: ['docs/specs/DEMO-20/spec.md', 'src/cart.ts'],
  ux: ['docs/specs/DEMO-20/design/S1-desktop.png', 'docs/adr/0001-database.md'],
  sa: ['docs/adr/0001-database.md', 'CHANGELOG.md'],
  reviewer: ['.ai/reviews/12.md', 'src/cart.ts'],
  security: ['.ai/reviews/12-security.md', 'package.json'],
  qa: ['.ai/qa/DEMO-12/ac1-cart.png', 'e2e/cart.spec.ts'],
};

test('each role writes inside the paths of its roster entry, and is refused outside them, naming the role and the rule', () => {
  for (const [role, [inside, outside]] of Object.entries(SCOPES)) {
    allowed(write(role, inside), `${role} writes ${inside}`);
    denied(write(role, outside), new RegExp(`^gh-guard: ${role} may write only .* \\(agents/roster\\.yaml\\), not ${outside.replaceAll('.', '\\.')}$`), `${role} writes ${outside}`);
  }
  denied(call('reviewer', 'Edit', { file_path: `${PROJECT}\\src\\cart.ts` }), /reviewer may write only \.ai\/\*\*/, 'Edit');
  denied(call('pm', 'NotebookEdit', { notebook_path: `${PROJECT}\\notebooks\\a.ipynb` }), /pm may write only/, 'NotebookEdit');
});

test('dev roles and devops write anywhere but the protected paths, and only devops edits workflows', () => {
  for (const role of ['fe-dev', 'be-dev', 'devops']) allowed(write(role, 'apps/web/app/cart/page.tsx'), role);
  allowed(write('devops', '.github/workflows/ci.yml'), 'devops edits a workflow');
  denied(write('fe-dev', '.github/workflows/ci.yml'), /\.github\/workflows\/\*\* is protected: only devops/, 'fe-dev edits a workflow');
  denied(write('fe-dev', '.claude/settings.json'), /\.claude\/\*\* is protected/, 'fe-dev edits the settings');
});

test('a file outside the project is not the roster\'s concern', () => {
  allowed(call('reviewer', 'Write', { file_path: 'C:\\Users\\me\\AppData\\Local\\Temp\\notes.md' }), 'temp file');
});

const READS = [
  'git status',
  'git --no-pager diff --stat origin/develop...HEAD',
  'git show origin/feature/DEMO-12-cart:src/cart.ts',
  'git fetch origin',
  'git log --oneline --grep=commit',
  'git -C D:\\work\\shop log -5',
  'git rev-parse HEAD',
  'git ls-files src',
  'git ls-tree -r HEAD',
  'git cat-file -p HEAD',
  'git merge-base HEAD origin/develop',
  'git blame src/cart.ts',
  'git grep -n total',
  'git describe --tags',
  'git shortlog -sn',
  'git for-each-ref refs/heads',
  'git branch -a',
  'git branch --list "feature/*"',
  'git branch --contains 3f2a9c1',
  'git branch --show-current',
  'git remote -v',
  'git remote get-url origin',
  'git config --get remote.origin.url',
  'git config user.name',
  'git config --list',
  'npm test && git diff',
];
const CHANGES = [
  ['git checkout feature/DEMO-12-cart', 'checkout'],
  ['git switch -c review', 'switch'],
  ['git commit -m "notes"', 'commit'],
  ['git push origin feature/DEMO-12-cart', 'push'],
  ['git stash', 'stash'],
  ['git reset --hard HEAD~1', 'reset'],
  ['git pull', 'pull'],
  ['git restore src/cart.ts', 'restore'],
  ['git branch review-12', 'branch'],
  ['git branch -D feature/old', 'branch'],
  ['git remote add mirror https://example.com/shop.git', 'remote'],
  ['git config user.name reviewer', 'config'],
  ['git config --unset user.name', 'config'],
  ['npm test && git checkout -- src', 'checkout'],
];

test('read-only roles run the git commands that read, and are refused the ones that change the checkout or the repository', () => {
  for (const role of ['pm', 'reviewer', 'security', 'qa']) {
    for (const command of READS) allowed(bash(role, command), `${role}: ${command}`);
    for (const [command, sub] of CHANGES) {
      denied(bash(role, command), new RegExp(`^gh-guard: ${role} has read-only git \\(agents/roster\\.yaml\\): git ${sub} `), `${role}: ${command}`);
    }
  }
});

test('roles with git write keep their git commands; the quality-gates rules still apply to them', () => {
  for (const command of ['git checkout -b feature/DEMO-12-cart origin/develop', 'git commit -m "feat(cart): add total (DEMO-12)"', 'git push -u origin feature/DEMO-12-cart', 'git stash']) {
    allowed(bash('fe-dev', command), command);
  }
  denied(bash('fe-dev', 'git push origin develop'), /develop is protected/, 'push to develop');
});

test('without a roster, gh-guard checks only the quality-gates rules', () => {
  allowed(call('reviewer', 'Bash', { command: 'git checkout main' }, {}), 'git checkout');
  allowed(call('reviewer', 'Write', { file_path: `${PROJECT}\\src\\cart.ts` }, {}), 'write');
});

test('the pure rules: writeRefusal and gitRefusal', () => {
  assert.equal(writeRefusal(roster, 'reviewer', '.ai/reviews/1.md'), null);
  assert.match(writeRefusal(roster, 'reviewer', 'src/a.ts'), /^reviewer may write only/);
  assert.equal(writeRefusal(roster, 'not-a-role', 'src/a.ts'), null);
  assert.equal(gitRefusal(roster, 'reviewer', ['git', 'log', '--grep=commit']), null);
  assert.equal(gitRefusal(roster, 'fe-dev', ['git', 'checkout', 'x']), null);
  assert.match(gitRefusal(roster, 'qa', ['git', 'checkout', 'x']), /^qa has read-only git/);
});

// The hook script loads the roster of the kit copy, here AO_KIT_DIR.
test('the gh-guard hook refuses a read-only role a git checkout', () => {
  const result = spawnSync(process.execPath, [join(ROOT, 'kit', '.claude', 'hooks', 'gh-guard.mjs')], {
    input: JSON.stringify({ hook_event_name: 'PreToolUse', agent_type: 'reviewer', tool_name: 'Bash', tool_input: { command: 'git checkout feature/DEMO-12-cart' } }),
    encoding: 'utf8',
    env: { ...process.env, AO_KIT_DIR: ROOT, CLAUDE_PROJECT_DIR: ROOT },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason, /^gh-guard: reviewer has read-only git/);
});
