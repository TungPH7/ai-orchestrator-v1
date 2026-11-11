import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readRoster } from '../lib/agents/roster.mjs';
import { readGates } from '../lib/quality/gates.mjs';
import { ROOT } from './helpers/kit.mjs';

const WORKFLOW = join(ROOT, '.github', 'workflows', 'contract.yml');
const COMMANDS = ['npm run validate', 'npm test', 'npm run render:check', 'npm run jira:checklist:check', 'npm run agents:check'];

function readme() {
  return readFileSync(join(ROOT, 'README.md'), 'utf8');
}

test('CI runs on every PR and on every push to main', () => {
  assert.ok(existsSync(WORKFLOW), '.github/workflows/contract.yml exists');
  const { on } = parse(readFileSync(WORKFLOW, 'utf8'));

  assert.ok('pull_request' in on);
  assert.deepEqual(on.push.branches, ['main']);
});

test('CI installs from the lockfile on Node 24, then runs the same checks as locally', () => {
  const { jobs } = parse(readFileSync(WORKFLOW, 'utf8'));
  const steps = Object.values(jobs).flatMap((job) => job.steps);

  assert.equal(steps.find((step) => step.uses?.startsWith('actions/setup-node@'))?.with['node-version'], 24);
  assert.deepEqual(steps.filter((step) => step.run).map((step) => step.run), ['npm ci', ...COMMANDS]);
});

test('README lists the commands and points to the specs and the generated docs', () => {
  for (const text of ['npm install', 'npm run render', ...COMMANDS, '(SPEC.md)', '(SPEC-sdlc-contract.md)', '(docs/sdlc.md)']) {
    assert.ok(readme().includes(text), text);
  }
});

test('README shows the folder layout and says docs/sdlc.md is never edited by hand', () => {
  for (const folder of ['contract/', 'templates/', 'lib/', 'scripts/', 'docs/', 'tests/']) assert.ok(readme().includes(folder), folder);
  assert.match(readme(), /docs\/sdlc\.md.*không sửa tay/i);
});

test('README covers the tracker: commands, folders, how to install kit/ and every environment variable', () => {
  const texts = ['npm run jira:check', 'jira-sync.mjs --dry-run', '(SPEC-tracker-integration.md)', '(docs/jira-setup.md)'];
  for (const text of [...texts, 'tracker/', 'lib/tracker/', 'kit/', '.ai-orchestrator/']) assert.ok(readme().includes(text), text);

  const { env } = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  const tokens = ['ATLASSIAN_AGENT_TOKEN', 'JIRA_CI_TOKEN', 'JIRA_ADMIN_EMAIL', 'JIRA_ADMIN_TOKEN', 'GITHUB_TOKEN'];
  for (const name of [...Object.keys(env), ...tokens]) assert.ok(readme().includes(`\`${name}\``), name);
});

test('README covers the quality gates: the layers, the docs, the commands, the folders, the workflows and the new keys', () => {
  const texts = ['## Quality gates', '(SPEC-quality-gates.md)', '(docs/quality-gates.md)', '(docs/github-apps-setup.md)', 'npm run gh:protect'];
  const commands = ['install-hooks.mjs', 'coverage-diff.mjs --base', 'merge-gate.mjs --dry-run', 'audit.mjs --sha'];
  for (const text of [...texts, ...commands, 'quality/', 'lib/quality/', '.githooks/']) assert.ok(readme().includes(text), text);

  const { checks } = readGates(join(ROOT, 'quality'));
  const workflows = readdirSync(join(ROOT, 'kit', '.github', 'workflows'));
  for (const name of [...checks, ...workflows, 'AO_DEV_APP_KEY', 'AO_DEV_APP_KEY_FILE', 'AO_REVIEW_APP_KEY_FILE']) {
    assert.ok(readme().includes(`\`${name}\``), name);
  }
});

test('docs/quality-gates.md covers every check of CI, the git hooks, merge-gate, audit and gh-guard', () => {
  const doc = readFileSync(join(ROOT, 'docs', 'quality-gates.md'), 'utf8');
  const { checks } = readGates(join(ROOT, 'quality'));
  for (const name of [...checks, 'pre-commit', 'commit-msg', 'pre-push', 'merge-gate', 'audit', 'gh-guard', 'AO_DEV_APP_KEY']) {
    assert.ok(doc.includes(`\`${name}\``), name);
  }
});

// Spec agent-roster 2.7, checked in T2: a pinned server, a temporary Chrome profile, nothing sent to Google; no file: URLs
// since the T15 security review.
test('the kit declares Chrome DevTools MCP pinned, isolated, without usage statistics, CrUX, update checks or file: URLs', () => {
  const { mcpServers } = JSON.parse(readFileSync(join(ROOT, 'kit', '.mcp.json'), 'utf8'));
  const server = mcpServers['chrome-devtools'];

  assert.ok(server, 'chrome-devtools is declared');
  assert.equal(server.type, 'stdio');
  assert.equal(server.command, 'npx');
  assert.deepEqual(server.args, ['-y', 'chrome-devtools-mcp@1.12.0', '--isolated', '--no-usage-statistics', '--no-performance-crux', '--no-file-navigations']);
  assert.deepEqual(server.env, { CHROME_DEVTOOLS_MCP_NO_UPDATE_CHECKS: '1' });
});

// playwright-cli asks the npm registry for a newer version on every run unless NO_UPDATE_NOTIFIER or CI is set (T2).
test('the kit settings turn off the update check of playwright-cli', () => {
  const { env } = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  assert.equal(env.NO_UPDATE_NOTIFIER, '1');
});

test('README covers the agents: the section, the spec, the docs, the commands and what installing the kit adds', () => {
  const texts = ['## Agent', '(SPEC-agent-roster.md)', '(docs/agents.md)', 'npm run agents', 'roster.local.yaml'];
  const commands = ['ao-agent.mjs <role> -p', 'render-agents.mjs --project .', 'check-design.mjs <design.md>'];
  const install = ['`agents/`', '`templates/`', '.ai-orchestrator/docs/sdlc.md', '`.ai/`', '`.playwright-cli/`', '`chrome-devtools`'];
  for (const text of [...texts, ...commands, ...install, 'lib/agents/']) assert.ok(readme().includes(text), text);
});

const AO_COMMANDS = ['ao-status', 'ao-intake', 'ao-spec', 'ao-plan', 'ao-request', 'ao-build', 'ao-preview', 'ao-review', 'ao-fix'];

test('README covers the commands of the inner loop: the modules, the section, the specs, the docs and ao-step.mjs', () => {
  const texts = ['**`dev-workflow`**', '**`human-loop`**', '## Các lệnh `/ao-*` của vòng trong', '(SPEC-dev-workflow.md)', '(SPEC-human-loop.md)', '(docs/dev-workflow.md)', 'ao-step.mjs <status|intake|preview|spec|plan|request|build|review|fix|qa|release|ship|rollback>', '.ai/runs/<KEY>/'];
  for (const text of [...texts, ...AO_COMMANDS.map((command) => `\`/${command}`)]) assert.ok(readme().includes(text), text);
});

test('docs/dev-workflow.md covers each command, an Epic round, .ai/runs, the stops, resuming, Git Bash and the costs', () => {
  const doc = readFileSync(join(ROOT, 'docs', 'dev-workflow.md'), 'utf8');
  for (const command of AO_COMMANDS) {
    assert.ok(doc.split('\n').some((line) => line.startsWith(`| \`/${command}\` |`)), command);
    assert.ok(existsSync(join(ROOT, 'kit', '.claude', 'skills', command, 'SKILL.md')), `${command} is a skill of the kit`);
  }
  const headings = ['## Một vòng Epic từ đầu tới cuối', '## Đọc `.ai/runs/`', '## Khi nào lệnh dừng', '## Chạy tiếp sau khi bị ngắt', '## Chi phí đo được'];
  const texts = ['state.json', 'last.md', 'answers.md', 'note.md', 'active.json', '--answers', '--note', 'usage-limit', 'MSYS_NO_PATHCONV=1 claude -p "/ao-spec', 'AO_KIT_DIR', 'CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP=1'];
  for (const text of [...headings, ...texts]) assert.ok(doc.includes(text), text);
});

test('docs/agents.md lists every role with the model, effort and maxTurns of the roster, and covers running, effort, skills, design.md, Figma and LFS', () => {
  const doc = readFileSync(join(ROOT, 'docs', 'agents.md'), 'utf8');
  const { roles } = readRoster(join(ROOT, 'agents'));
  const models = { opus: 'Opus', sonnet: 'Sonnet' };
  for (const [role, { model, effort, max_turns: turns }] of Object.entries(roles)) {
    const row = doc.split('\n').find((line) => line.startsWith(`| \`${role}\` |`));
    assert.ok(row, role);
    assert.deepEqual(row.split('|').map((cell) => cell.trim()).slice(3, 6), [models[model], `\`${effort}\``, String(turns)], role);
  }
  const texts = ['ao-agent.mjs', 'CLAUDE_CODE_EFFORT_LEVEL', '--effort max', 'roster.local.yaml', 'check-design.mjs', '.ai/design-inbox/'];
  for (const text of [...texts, 'Save to version history', 'git count-objects -vH', 'git lfs track', '.playwright-cli/']) assert.ok(doc.includes(text), text);
});
