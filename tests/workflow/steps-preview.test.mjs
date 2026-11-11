import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { matchesGlob } from '../../lib/quality/glob.mjs';
import { lockHash, needsInstall, PREVIEW_SAMPLE, previewEnv, readPreviewConfig } from '../../lib/workflow/preview.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkArgument, previewFirst } from '../../scripts/ao-step.mjs';

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
    { name: 'api', command: 'npm run start:dev -w apps/api', argv: ['npm', 'run', 'start:dev', '-w', 'apps/api'], url: 'http://localhost:3001/health', port: 3001, env: {} },
    { name: 'web', command: 'npm run dev -w apps/web', argv: ['npm', 'run', 'dev', '-w', 'apps/web'], url: 'http://localhost:3000/', port: 3000, env: { API_URL: 'http://localhost:3001' } },
  ]);
});

test('a command is npm or node and plain words, since ao-step runs it with no shell (sast of ao-sample PR #21)', () => {
  const app = (command) => `apps:\n  web:\n    command: ${JSON.stringify(command)}\n    url: http://localhost:3000/`;
  assert.deepEqual(readPreviewConfig(app('node scripts/dev.mjs --port 3000'))[0].argv, ['node', 'scripts/dev.mjs', '--port', '3000']);
  for (const command of ['next dev', 'npm run dev && rm -rf .', 'npm run dev | tee log', 'npm run dev > log', 'node -e "x"', 'npm run $SCRIPT', 'npm run dev; curl x']) {
    assert.throws(() => readPreviewConfig(app(command)), /command: npm or node and plain words, run with no shell/, command);
  }
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

test('a command that runs agents stops a preview first, once; the others leave it running', () => {
  for (const command of ['spec', 'plan', 'request', 'build', 'review', 'fix', 'qa', 'release', 'ship', 'rollback']) {
    assert.equal(previewFirst(command, true, false), 'stop', command);
    assert.equal(previewFirst(command, true, true), 'refuse', command);
    assert.equal(previewFirst(command, false, false), null, command);
  }
  // /ao-ship runs devops in the project folder (review of ao-sample PR #21), so the release commands stop it too.
  for (const command of ['status', 'intake', 'preview']) assert.equal(previewFirst(command, true, false), null, command);
  assert.equal(checkArgument('preview', 'DEMO-21', 'DEMO'), null);
});

test('/ao-preview refuses instruction files at any depth, a protected path in another case, a fork, and CI not green (review of ao-sample PR #21)', () => {
  const gates = readGates(join(ROOT, 'quality'));
  const preview = (pr) => decideStep('preview', facts({}, pr), { roster, contract, gates });
  for (const files of [['apps/web/AGENTS.md'], ['CLAUDE.md'], ['apps/api/claude.local.md'], ['apps/web/.claude/rules/x.md'], ['.Claude/rules/x.md'], ['.GITHOOKS/pre-push']]) {
    const decision = preview({ files });
    assert.equal(decision.go, false, files[0]);
    assert.match(decision.reason, /which steer the kit and the agents: during a preview every \/ao-\* command, and your own session, would load them/, files[0]);
  }
  assert.equal(preview({ files: ['apps/web/src/app/page.tsx', 'docs/agents-guide.md'] }).go, true);
  assert.match(preview({ fromFork: true }).reason, /comes from another repository/);
  assert.match(preview({ ci: { green: false, failed: false, pending: true } }).reason, /CI is still running on the head of PR #15/);
  const red = preview({ ci: { green: false, failed: true, pending: false } });
  assert.deepEqual([red.reason, red.next], ['CI is red on the head of PR #15', '/ao-fix 15']);
});

test('the apps of a preview get no secret variable of your session', () => {
  const env = { PATH: 'p', SystemRoot: 'C:\\Windows', ATLASSIAN_AGENT_TOKEN: 't', GH_TOKEN: 'g', JIRA_CI_TOKEN: 'j', AO_ENV_AUTH: 'a:b', AO_DEV_APP_KEY_FILE: 'k', AO_DEV_APP: 'tungph7-ao-dev', NPM_CONFIG_PASSWORD: 'x', GIT_ASKPASS: 'y', SOME_CLIENT_SECRET: 's' };
  assert.deepEqual(previewEnv(env, ['GIT_ASKPASS']), { PATH: 'p', SystemRoot: 'C:\\Windows', AO_DEV_APP: 'tungph7-ao-dev' });
});

test('/ao-status says when a preview runs, as the first thing that waits for you', () => {
  const running = { key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', apps: [{ name: 'web', url: 'http://localhost:3000/' }] };
  const space = decideStep('status', { command: 'status', space: 'DEMO', item: null, items: [], pulls: [], runs: [], previewRunning: running }, { roster, contract });
  assert.deepEqual(space.lines.slice(0, 2), ['Waiting for you:', '  the preview of DEMO-21 runs on feature/DEMO-21-remove-line: web http://localhost:3000/ → /ao-preview DEMO-21 --stop']);
  const stopped = decideStep('status', { command: 'status', space: 'DEMO', item: null, items: [], pulls: [], runs: [], previewRunning: { ...running, apps: [] } }, { roster, contract });
  assert.match(stopped.lines[1], /runs on feature\/DEMO-21-remove-line, its apps stopped → \/ao-preview DEMO-21 --stop/);
});

test('/ao-preview --stop stops the preview that runs, whatever the key; with none it says so', () => {
  const active = { key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', apps: [{ name: 'web', url: 'http://localhost:3000/', pid: 4242 }] };
  assert.deepEqual(decide(facts({ stop: true, active })).runs, [{ action: 'preview-stop', key: 'DEMO-21' }]);
  const none = decide(facts({ stop: true }));
  assert.deepEqual([none.go, none.reason], [false, 'no preview runs']);
});
