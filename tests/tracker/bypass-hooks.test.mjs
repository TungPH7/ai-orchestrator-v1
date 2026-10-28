import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

const HOOKS = join(ROOT, 'kit', '.claude', 'hooks');
// The hooks load the kit from AO_KIT_DIR; no Jira token, so nothing here reaches Jira.
const { ATLASSIAN_AGENT_TOKEN, AO_JIRA_SPACE, ...env } = process.env;
const run = (hook, input, extraEnv = {}) =>
  spawnSync(process.execPath, [join(HOOKS, hook)], { input: JSON.stringify(input), encoding: 'utf8', env: { ...env, AO_KIT_DIR: ROOT, CLAUDE_PROJECT_DIR: ROOT, ...extraEnv } });
const reason = (result) => JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason;
const pre = (tool_name, tool_input) => ({ hook_event_name: 'PreToolUse', tool_name, tool_input });

test('block-atlassian refuses Bash calls to Atlassian and generic writes, and lets the rest through', () => {
  assert.equal(reason(run('block-atlassian.mjs', pre('Bash', { command: 'curl https://api.atlassian.com/ex/jira' }))), 'jira: do not call Atlassian from Bash; use the tools of the atlassian MCP server');
  assert.match(reason(run('block-atlassian.mjs', pre('mcp__atlassian__executeWrite', { name: 'x' }))), /^jira: executeWrite can run any write/);
  for (const input of [pre('Bash', { command: 'npm test' }), pre('mcp__atlassian__executeRead', { name: 'x' }), pre('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'SCRUM-1' })]) {
    const result = run('block-atlassian.mjs', input);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
  }
});

test('block-atlassian keeps writes in AO_JIRA_SPACE, and refuses them while it is not set', () => {
  const edit = (key) => pre('mcp__atlassian__editJiraIssue', { issueIdOrKey: key, fields: {} });
  assert.equal(run('block-atlassian.mjs', edit('DEMO-12'), { AO_JIRA_SPACE: 'DEMO' }).stdout, '');
  assert.equal(reason(run('block-atlassian.mjs', edit('SCRUM-3'), { AO_JIRA_SPACE: 'DEMO' })), 'jira: SCRUM-3 is outside the project space DEMO');
  for (const space of [undefined, '<KEY>']) {
    assert.equal(reason(run('block-atlassian.mjs', edit('DEMO-12'), space ? { AO_JIRA_SPACE: space } : {})), 'jira: set AO_JIRA_SPACE to the project space key in .claude/settings.json');
  }
});

test('block-atlassian without the kit refuses only what touches Atlassian', () => {
  const missing = { AO_KIT_DIR: join(ROOT, 'no-such-kit') };
  assert.equal(run('block-atlassian.mjs', pre('Bash', { command: 'npm test' }), missing).stdout, '');
  assert.match(reason(run('block-atlassian.mjs', pre('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'DEMO-1' }), missing)), /^jira: /);
});

test('jira-rework asks to check by hand when it cannot read the history, and says nothing about other tools', () => {
  const after = (tool_name) => ({ hook_event_name: 'PostToolUse', tool_name, tool_input: { issueIdOrKey: 'DEMO-12', transitionName: 'Request changes' }, tool_response: {} });
  const result = run('jira-rework.mjs', after('mcp__atlassian__transitionJiraIssue'));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    decision: 'block',
    reason: 'jira-rework: could not count the rework of DEMO-12: ATLASSIAN_AGENT_TOKEN is not set. Check the rework count before going on.',
  });
  assert.equal(run('jira-rework.mjs', after('mcp__atlassian__editJiraIssue')).stdout, '');
});

test('the kit declares each hook once, with the project space to fill in', () => {
  const settings = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  const declared = (event) => settings.hooks[event].flatMap(({ matcher, hooks }) => hooks.map(({ command }) => [matcher, command]));
  assert.deepEqual(declared('PreToolUse'), [
    ['mcp__atlassian__transitionJiraIssue', 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/jira-guard.mjs"'],
    ['Bash|mcp__.*', 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/block-atlassian.mjs"'],
    // quality-gates spec section 2.7.
    ['Bash|Read|Edit|Write|NotebookEdit', 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/gh-guard.mjs"'],
  ]);
  assert.deepEqual(declared('PostToolUse'), [['mcp__atlassian__transitionJiraIssue', 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/jira-rework.mjs"']]);
  assert.equal(settings.env.AO_JIRA_SPACE, '<KEY>');
});

test('the Jira hooks work with the copy a project has: contract, lib and tracker, without templates', (t) => {
  // Inside the repo, so the copied lib still finds node_modules.
  const copy = mkdtempSync(join(ROOT, '.tmp-kit-'));
  t.after(() => rmSync(copy, { recursive: true, force: true }));
  for (const dir of ['contract', 'lib', 'tracker']) cpSync(join(ROOT, dir), join(copy, dir), { recursive: true });
  const input = { hook_event_name: 'PreToolUse', tool_name: 'mcp__atlassian__transitionJiraIssue', agent_type: 'fe-dev', tool_input: { issueIdOrKey: 'DEMO-12', transitionName: 'Start' } };

  const guard = run('jira-guard.mjs', input, { AO_KIT_DIR: copy });
  assert.equal(reason(guard), 'jira-guard: could not check DEMO-12: ATLASSIAN_AGENT_TOKEN is not set');
  const rework = run('jira-rework.mjs', { ...input, hook_event_name: 'PostToolUse', tool_response: {} }, { AO_KIT_DIR: copy });
  assert.match(JSON.parse(rework.stdout).reason, /ATLASSIAN_AGENT_TOKEN is not set/);
});
