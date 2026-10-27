import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

const HOOK = join(ROOT, 'kit', '.claude', 'hooks', 'jira-guard.mjs');
// The hook loads the kit from AO_KIT_DIR; no Jira token, so a test that reached Jira would fail.
const { ATLASSIAN_AGENT_TOKEN, ...env } = process.env;
const run = (input) =>
  spawnSync(process.execPath, [HOOK], { input: JSON.stringify(input), encoding: 'utf8', env: { ...env, AO_KIT_DIR: ROOT, CLAUDE_PROJECT_DIR: ROOT } });
const transition = (extra) => ({
  hook_event_name: 'PreToolUse',
  tool_name: 'mcp__atlassian__transitionJiraIssue',
  tool_input: { issueIdOrKey: 'DEMO-12', transitionName: 'Accept' },
  ...extra,
});

test('refuses a transition from the main session with the reason, as a PreToolUse decision', () => {
  const result = run(transition({}));
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'jira-guard: only an agent may move a Jira item; this call does not come from a subagent named after a role of the contract',
    },
  });
});

test('refuses when the agent token is missing, instead of letting the call through', () => {
  const result = run(transition({ agent_type: 'fe-dev' }));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecisionReason, 'jira-guard: could not check DEMO-12: ATLASSIAN_AGENT_TOKEN is not set');
});

test('says nothing about other tools', () => {
  const result = run({ hook_event_name: 'PreToolUse', tool_name: 'mcp__atlassian__getJiraIssue', tool_input: { issueIdOrKey: 'DEMO-12' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, '');
});

test('the kit declares the hook once, in the project settings, for transitionJiraIssue only', () => {
  const settings = JSON.parse(readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  const guards = settings.hooks.PreToolUse.filter(({ hooks }) => hooks.some(({ command }) => command.includes('jira-guard.mjs')));
  assert.equal(guards.length, 1);
  assert.equal(guards[0].matcher, 'mcp__atlassian__transitionJiraIssue');
  assert.equal(guards[0].hooks[0].command, 'node "$CLAUDE_PROJECT_DIR/.claude/hooks/jira-guard.mjs"');
  assert.ok(existsSync(HOOK));
});
