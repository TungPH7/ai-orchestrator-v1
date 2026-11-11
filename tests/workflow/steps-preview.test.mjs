import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { matchesGlob } from '../../lib/quality/glob.mjs';
import { lockHash, needsInstall, PREVIEW_SAMPLE, readPreviewConfig } from '../../lib/workflow/preview.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// /ao-preview (human-loop spec 4.3).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const HEAD = 'd1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4';
const APPS = readPreviewConfig(PREVIEW_SAMPLE);

const facts = (preview = {}, pr = {}, item = {}) => ({
  command: 'preview',
  arg: 'DEMO-21',
  space: 'DEMO',
  item: { key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa một dòng', labels: [], role: null, roles: [], subtasks: [], flagged: false, requests: [], ...item },
  pr: { number: 15, state: 'open', merged: false, draft: true, headRef: 'feature/DEMO-21-remove-line', headSha: HEAD, base: 'develop', protectedPaths: [], ci: { green: true, failed: false, pending: false }, ...pr },
  preview: { stop: false, config: APPS, configError: null, active: null, agentRunning: null, dirty: 0, busy: [], install: false, ...preview },
});
const decide = (f) => decideStep('preview', f, { roster, contract });

test('preview.yaml: the apps in order, each with its command, its local URL and port, and its variables', () => {
  assert.deepEqual(APPS, [
    { name: 'api', command: 'npm run start:dev -w apps/api', url: 'http://localhost:3001/health', port: 3001, env: {} },
    { name: 'web', command: 'npm run dev -w apps/web', url: 'http://localhost:3000/', port: 3000, env: { API_URL: 'http://localhost:3001' } },
  ]);
});

test('a wrong preview.yaml says every problem', () => {
  assert.throws(() => readPreviewConfig('apps: {}'), /it lists no app under apps/);
  assert.throws(() => readPreviewConfig('apps:\n  Web:\n    command: "a\\nb"\n    url: https://example.com/\n    env: [1]'), (error) => {
    assert.match(error.message, /apps\.Web: a name is lower-case/);
    assert.match(error.message, /apps\.Web\.command: one line/);
    assert.match(error.message, /apps\.Web\.url: http:\/\/localhost with a port, not https:\/\/example\.com\//);
    assert.match(error.message, /apps\.Web\.env: names and text values/);
    return true;
  });
  assert.throws(() => readPreviewConfig('apps: ['), /is not YAML/);
});

test('preview.yaml belongs to the project: no list of kit_copy holds it, so a kit copy that changes it is reviewed as usual', () => {
  const gates = readGates(join(ROOT, 'quality'));
  const lists = [...gates.kit_copy.same, ...gates.kit_copy.same_when_changed, ...gates.kit_copy.rendered];
  assert.equal(lists.some((glob) => matchesGlob(glob, '.ai-orchestrator/preview.yaml')), false);
});

test('npm ci runs when the lockfile of the head differs from the one installed, or none is on record', () => {
  assert.equal(needsInstall('lock A', null), true);
  assert.equal(needsInstall('lock A', { lock: lockHash('lock A') }), false);
  assert.equal(needsInstall('lock B', { lock: lockHash('lock A') }), true);
});

test('/ao-preview starts the apps on the PR branch: a script step, with or without npm ci', () => {
  const decision = decide(facts({ install: true }));
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs, [{ action: 'preview-start', key: 'DEMO-21', number: 15, branch: 'feature/DEMO-21-remove-line', head: HEAD, install: true }]);
  assert.match(decision.lines.at(-1), /^Preview of PR #15 \(draft\): feature\/DEMO-21-remove-line at d1d2d3d4; npm ci first, since package-lock\.json differs from the one installed; apps api http:\/\/localhost:3001\/health, web http:\/\/localhost:3000\/$/);
});

test('/ao-preview stops: no open PR, a PR on protected paths, an agent running, changes not committed, no or a wrong config, a busy port, a preview running', () => {
  const cases = [
    [facts({}, { state: 'closed' }), /DEMO-21 has no open PR to preview/],
    [facts({}, { protectedPaths: ['.ai-orchestrator/lib/workflow/steps.mjs'] }), /PR #15 changes \.ai-orchestrator\/lib\/workflow\/steps\.mjs, which steer the kit and the agents/],
    [facts({ agentRunning: { command: 'build', arg: 'DEMO-30' } }), /ao-step is running build DEMO-30: the project folder is busy/],
    [facts({ dirty: 2 }), /the project folder has changes not committed \(2 files\)/],
    [facts({ config: null }), /the project has no \.ai-orchestrator\/preview\.yaml/],
    [facts({ config: null, configError: '.ai-orchestrator/preview.yaml: it lists no app under apps' }), /it lists no app under apps/],
    [facts({ busy: [3000] }), /port 3000 is in use/],
    [facts({ active: { key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', apps: [{ name: 'web', url: 'http://localhost:3000/' }] } }), /the preview of DEMO-21 runs already: web http:\/\/localhost:3000\//],
    [facts({}, {}, { type: 'Epic', workType: 'epic' }), /DEMO-21 is an Epic/],
  ];
  for (const [f, reason] of cases) {
    const decision = decide(f);
    assert.equal(decision.go, false, String(reason));
    assert.match(decision.reason, reason);
  }
  const sample = decide(facts({ config: null }));
  assert.ok(sample.lines.includes('apps:'), 'the sample goes with the stop');
});

test('/ao-preview --stop stops the preview that runs, whatever the key; with none it says so', () => {
  const active = { key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', apps: [{ name: 'web', url: 'http://localhost:3000/', pid: 4242 }] };
  assert.deepEqual(decide(facts({ stop: true, active })).runs, [{ action: 'preview-stop', key: 'DEMO-21' }]);
  const none = decide(facts({ stop: true }));
  assert.deepEqual([none.go, none.reason], [false, 'no preview runs']);
});
