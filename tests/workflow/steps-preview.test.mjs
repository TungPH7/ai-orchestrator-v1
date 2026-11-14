import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { matchesGlob } from '../../lib/quality/glob.mjs';
import { readFileSync } from 'node:fs';
import { readProjectConfig } from '../../lib/scaffold/project-config.mjs';
import { lockHash, needsInstall, PREVIEW_SAMPLE, previewApps, previewEnv } from '../../lib/workflow/preview.mjs';
import { formatDecision } from '../../lib/workflow/runner.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkArgument, previewFirst } from '../../scripts/ao-step.mjs';

// /ao-preview (human-loop spec 4.3), with the apps of project.yaml (project-scaffold spec 2.1).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const HEAD = 'd1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4';
const SAMPLE = readProjectConfig(readFileSync(join(ROOT, 'tests/fixtures/scaffold/sample/project.yaml'), 'utf8')).config;
const APPS = previewApps(SAMPLE);

const facts = (preview = {}, pr = {}, item = {}) => ({
  command: 'preview',
  arg: 'DEMO-21',
  space: 'DEMO',
  item: { key: 'DEMO-21', type: 'Story', workType: 'story', state: 'in-progress', status: 'In Progress', summary: 'Xóa một dòng', labels: [], role: null, roles: [], subtasks: [], flagged: false, requests: [], ...item },
  pr: { number: 15, state: 'open', merged: false, draft: true, headRef: 'feature/DEMO-21-remove-line', headSha: HEAD, base: 'develop', protectedPaths: [], ci: { green: true, failed: false, pending: false }, ...pr },
  preview: { stop: false, config: APPS, configError: null, active: null, agentRunning: null, dirty: 0, busy: [], install: false, ...preview },
});
const decide = (f) => decideStep('preview', f, { roster, contract });

test('the apps of project.yaml, in order: the dev command, a URL on this machine from the port and the health path, and the port in its variable', () => {
  assert.deepEqual(APPS, [
    { name: 'web', command: 'npm run dev -w apps/web', argv: ['npm', 'run', 'dev', '-w', 'apps/web'], url: 'http://localhost:3000/notes', port: 3000, env: { PORT: '3000' } },
    { name: 'api', command: 'npm run start:dev -w apps/api', argv: ['npm', 'run', 'start:dev', '-w', 'apps/api'], url: 'http://localhost:3001/health', port: 3001, env: { PORT: '3001' } },
  ]);
  const own = previewApps({ ...SAMPLE, apps: { web: { ...SAMPLE.apps.web, port: { env: 'WEB_PORT', default: 4000 }, env: { API_URL: 'http://localhost:3001', WEB_PORT: '9' } } } });
  assert.deepEqual(own[0].env, { API_URL: 'http://localhost:3001', WEB_PORT: '4000' }, 'the port of project.yaml wins');
});

test('the sample /ao-preview prints when the project has no project.yaml is valid apps of that file', () => {
  const sample = readProjectConfig(`${PREVIEW_SAMPLE}\n${['name: shop', 'jira: { space: SHOP }', 'github: { repo: acme/shop, approvers: [owner], apps: { dev: a-dev, dev_id: 1, review: a-review, review_id: 2 } }', 'repos: [{ name: shop, path: . }]'].join('\n')}`);
  assert.deepEqual(sample.errors, []);
});

test('project.yaml belongs to the project: no list of kit_copy holds it, so a kit copy that changes it is reviewed as usual', () => {
  const gates = readGates(join(ROOT, 'quality'));
  const lists = [...gates.kit_copy.same, ...gates.kit_copy.same_when_changed, ...gates.kit_copy.rendered];
  assert.equal(lists.some((glob) => matchesGlob(glob, '.ai-orchestrator/project.yaml')), false);
});

test('npm ci runs when the lockfile of the head differs from the one installed, or none is on record', () => {
  assert.equal(needsInstall('lock A', null), true);
  assert.equal(needsInstall('lock A', { lock: lockHash('lock A') }), false);
  assert.equal(needsInstall('lock B', { lock: lockHash('lock A') }), true);
});

test('/ao-preview starts the apps on the PR branch: a script step, with or without npm ci', () => {
  const decision = decide(facts({ install: true }));
  assert.equal(decision.go, true);
  assert.deepEqual(decision.runs, [{ action: 'preview-start', key: 'DEMO-21', number: 15, branch: 'feature/DEMO-21-remove-line', head: HEAD, install: true, protected: [] }]);
  assert.match(decision.lines.at(-1), /^Preview of PR #15 \(draft\): feature\/DEMO-21-remove-line at d1d2d3d4; npm ci first, since package-lock\.json differs from the one installed; apps web http:\/\/localhost:3000\/notes, api http:\/\/localhost:3001\/health$/);
  // A pnpm project (project-scaffold part 2, spec 2.1).
  const pnpm = decide(facts({ install: true, manager: 'pnpm' }));
  assert.match(pnpm.lines.at(-1), /; pnpm install first, since pnpm-lock\.yaml differs from the one installed; /);
});

test('/ao-preview stops: no open PR, a PR on protected paths, an agent running, changes not committed, no or a wrong config, a busy port, a preview running', () => {
  const cases = [
    [facts({}, { state: 'closed' }), /DEMO-21 has no open PR to preview/],
    [facts({}, { protectedPaths: ['.ai-orchestrator/lib/workflow/steps.mjs'] }), /PR #15 changes \.ai-orchestrator\/lib\/workflow\/steps\.mjs, which steer the kit and the agents/],
    [facts({ agentRunning: { command: 'build', arg: 'DEMO-30' } }), /ao-step is running build DEMO-30: the project folder is busy/],
    [facts({ dirty: 2 }), /the project folder has changes not committed \(2 files\)/],
    [facts({ config: null }), /the project has no \.ai-orchestrator\/project\.yaml, which says the apps to start/],
    [facts({ config: null, configError: 'P6 apps.web.dev: next dev: npm or node and plain words, run with no shell' }), /P6 apps\.web\.dev/],
    [facts({ busy: [3000] }), /port 3000 is in use/],
    [facts({ active: { key: 'DEMO-30', branch: 'feature/DEMO-30-other', apps: [{ name: 'web', url: 'http://localhost:3000/' }] } }), /the preview of DEMO-30 runs/],
    [facts({}, {}, { type: 'Epic', workType: 'epic' }), /DEMO-21 is an Epic/],
  ];
  for (const [f, reason] of cases) {
    const decision = decide(f);
    assert.equal(decision.go, false, String(reason));
    assert.match(decision.reason, reason);
  }
  const sample = decide(facts({ config: null }));
  assert.ok(sample.lines.includes('apps:'), 'the sample goes with the stop');
  // A kit copy brings it: ao-kit sync makes project.yaml from the preview.yaml the project had (project-scaffold spec 2.1).
  assert.match(sample.next, /ao-kit sync/);
  assert.match(decide(facts({ config: null, configError: 'P6 apps.web.dev: x' })).next, /^Fix \.ai-orchestrator\/project\.yaml, then \/ao-preview DEMO-21$/);
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

// Medium of security on ao-sample PR #21 (T19): GitHub lists at most 3000 files of a PR, so a file past them, such as
// apps/web/AGENTS.md, was never checked (live-run-fixes spec 2.7).
test('/ao-preview refuses a PR GitHub lists only in part, since the files past the list are not checked', () => {
  const gates = readGates(join(ROOT, 'quality'));
  const preview = (pr) => decideStep('preview', facts({}, pr), { roster, contract, gates });
  const cut = preview({ files: ['apps/web/src/a.ts'], filesRead: 3000, changedFiles: 3004 });
  assert.equal(cut.go, false);
  assert.equal(cut.reason, 'GitHub lists 3000 of the 3004 files of PR #15, so /ao-preview cannot check each one for a file that steers the agents');
  assert.equal(cut.next, '/ao-review 15');
  assert.equal(preview({ files: ['apps/web/src/a.ts'], filesRead: 1, changedFiles: 1 }).go, true);
});

test('/ao-preview refuses the other files that steer a session: plugins, MCP servers at any depth, submodules, git attributes and LFS', () => {
  const gates = readGates(join(ROOT, 'quality'));
  const preview = (pr) => decideStep('preview', facts({}, pr), { roster, contract, gates });
  for (const file of ['.claude-plugin/plugin.json', 'apps/web/.claude-plugin/marketplace.json', 'apps/api/.mcp.json', '.MCP.json', '.gitmodules', 'apps/web/.gitattributes', '.lfsconfig']) {
    assert.match(preview({ files: [file] }).reason ?? 'GO', /which steer the kit and the agents/, file);
  }
  // The step carries the protected paths: ao-step checks them again on the list of files it reads itself.
  assert.deepEqual(preview({ files: ['apps/web/src/a.ts'] }).runs[0].protected, gates.protected_paths.map(({ path }) => path));
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
  // What --stop ends on, and --stop with nothing running: a state, not a STOP line that reads like an error (Pilot 3, T4).
  const none = decide(facts({ stop: true }));
  assert.deepEqual([none.status, none.go, none.lines, none.next], [true, undefined, ['No preview runs.'], '/ao-status']);
  assert.equal(formatDecision(none), 'No preview runs.\nNext: /ao-status');
});

test('/ao-preview of the item whose preview runs, as --go ends: the state and how to stop it, with no STOP line (Pilot 3, T4)', () => {
  const running = decide(facts({ active: { key: 'DEMO-21', branch: 'feature/DEMO-21-remove-line', apps: [{ name: 'web', url: 'http://localhost:3000/' }] } }));
  assert.equal(running.status, true);
  assert.equal(running.lines.at(-1), 'The preview of DEMO-21 runs on feature/DEMO-21-remove-line: web http://localhost:3000/');
  assert.equal(running.next, '/ao-preview DEMO-21 --stop, when you are done with it');
  assert.doesNotMatch(formatDecision(running), /STOP/);
});
