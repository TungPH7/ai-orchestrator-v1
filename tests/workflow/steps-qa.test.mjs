import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { decideStep, nextFor } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

// release-workflow spec 2.2, 2.5: /ao-qa <KEY>.
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));
const options = { roster, contract, gates: readGates(join(ROOT, 'quality')), mapping: readMapping(join(ROOT, 'tracker')) };
const MERGE = 'b'.repeat(40);
const RUNNING = 'c'.repeat(40);
const URL = 'https://pilot-dev.ao.t2g.io.vn';

// Story DEMO-21 in Ready for QA: its PR #15 was merged as MERGE, and Development runs RUNNING, which holds it.
function qaFacts({ item = {}, pr = {}, qa = {}, ...rest } = {}) {
  return {
    command: 'qa',
    arg: 'DEMO-21',
    space: 'DEMO',
    item: { key: 'DEMO-21', type: 'Story', workType: 'story', state: 'ready-for-qa', status: 'Ready for QA', summary: 'Xóa sản phẩm khỏi giỏ hàng', labels: [], role: null, roles: [], effort: null, agent: null, rework: 0, flagged: false, flag: null, parent: { key: 'DEMO-20', type: 'Epic', status: 'In Progress' }, subtasks: [], blockedBy: [], requests: [], ...item },
    epic: null,
    docs: null,
    pr: { number: 15, title: 'feat(cart): remove a line from the cart (DEMO-21)', state: 'closed', merged: true, mergeCommit: MERGE, base: 'develop', headRef: 'feature/DEMO-21-remove-line', ci: { green: true, failed: false, pending: false }, ...pr },
    qa: { environment: 'development', running: { sha: RUNNING, deployment: 7, url: URL }, contains: true, ...qa },
    ledger: false,
    run: null,
    ...rest,
  };
}
const decide = (facts, more = {}) => decideStep('qa', facts, { ...options, ...more });

test('/ao-qa runs qa on the release of the QA environment, in a worktree at the commit that runs there, with the URL to test', () => {
  const decision = decide(qaFacts());
  assert.equal(decision.go, true);
  const [run] = decision.runs;
  assert.deepEqual({ role: run.role, key: run.key, effort: run.effort, purpose: run.purpose }, { role: 'qa', key: 'DEMO-21', effort: roster.roles.qa.effort, purpose: 'qa' });
  assert.deepEqual(run.worktree, { kind: 'qa', name: 'DEMO-21-qa', sha: RUNNING, install: true });
  assert.deepEqual(run.env, { E2E_BASE_URL: URL });
  assert.deepEqual(run.qa, { environment: 'development', sha: RUNNING, auth: true });
  assert.equal(
    run.prompt,
    `QA Story DEMO-21 on Development. Development runs cccccccc at ${URL}, which holds the merge of PR #15. Check DEMO-21 against its acceptance criteria there, and run the E2E of the repo with E2E_BASE_URL, E2E_HTTP_USER and E2E_HTTP_PASSWORD, which are set. Save your screenshots in .ai/qa/DEMO-21/. Write your QA report on DEMO-21, then move it as your definition says.`,
  );
  assert.match(decision.lines.join('\n'), /Development runs cccccccc, which holds the merge of PR #15/);
});

test('on Production qa gets no basic auth: Production is open', () => {
  const [run] = decide(qaFacts({ qa: { environment: 'production', running: { sha: RUNNING, deployment: 9, url: 'https://pilot.ao.t2g.io.vn' } } })).runs;
  assert.equal(run.qa.auth, false);
  assert.doesNotMatch(run.prompt, /E2E_HTTP_USER/);
});

test('/ao-qa stops while the item is not in Ready for QA, and says what comes instead', () => {
  const inReview = decide(qaFacts({ item: { state: 'in-review', status: 'In Review' }, pr: { state: 'open', merged: false, mergeCommit: null } }));
  assert.equal(inReview.go, false);
  assert.equal(inReview.reason, 'DEMO-21 is In Review, not Ready for QA');
  assert.equal(inReview.next, '/ao-review 15 or /ao-fix 15');
  assert.equal(decide(qaFacts({ item: { workType: 'epic', type: 'Epic', state: 'in-progress', status: 'In Progress' } })).reason, 'DEMO-21 is an Epic: /ao-qa takes a Story, Task or Bug');
  assert.match(decide(qaFacts({ item: { flagged: true, flag: 'audit' } })).reason, /flagged Needs you by audit/);
});

test('a qa run stopped by the usage limit goes on in its session with its worktree, URL and basic auth, even once qa picked the item up', () => {
  const stopped = { key: 'DEMO-21', runs: [{ n: 1, command: 'qa', role: 'qa', purpose: 'qa', effort: 'high', session: 's-qa-1', outcome: 'usage-limit', qa: { environment: 'development', sha: RUNNING } }] };
  for (const item of [{}, { state: 'in-qa', status: 'In QA' }]) {
    const decision = decide(qaFacts({ item, run: stopped }));
    assert.equal(decision.go, true, item.state ?? 'ready-for-qa');
    const [run] = decision.runs;
    assert.equal(run.resume, 's-qa-1');
    assert.equal(run.prompt, 'Your run stopped before it ended. Read .ai/ledger/DEMO-21.md and go on from where you stopped.');
    assert.deepEqual(run.worktree, { kind: 'qa', name: 'DEMO-21-qa', sha: RUNNING, install: true });
    assert.deepEqual(run.env, { E2E_BASE_URL: URL });
    assert.deepEqual(run.qa, { environment: 'development', sha: RUNNING, auth: true });
  }
  // Medium of reviewer on ao-pilot PR #23: killed before the first line of its log, it has no session; it starts afresh
  // with its URL and basic auth.
  const killed = decide(qaFacts({ run: { key: 'DEMO-21', runs: [{ ...stopped.runs[0], session: null, outcome: 'unfinished' }] } })).runs[0];
  assert.deepEqual([killed.resume, killed.env, killed.qa.auth], [undefined, { E2E_BASE_URL: URL }, true]);
  assert.match(killed.prompt, /^QA /);
  const finished = { key: 'DEMO-21', runs: [{ ...stopped.runs[0], outcome: 'done' }] };
  assert.equal(decide(qaFacts({ item: { state: 'in-qa', status: 'In QA' }, run: finished })).reason, 'DEMO-21 is In QA, not Ready for QA');
});

test('a qa run stopped because another deploy came during it is made afresh on the version that runs now, from In QA too', () => {
  // parallel-runs spec 5.1: it reported nothing, so the item stays In QA with no report.
  const superseded = { key: 'DEMO-21', runs: [{ n: 1, command: 'qa', role: 'qa', purpose: 'qa', effort: 'high', session: 's-qa-1', outcome: 'superseded', qa: { environment: 'development', sha: 'a'.repeat(40) } }] };
  for (const item of [{}, { state: 'in-qa', status: 'In QA' }]) {
    const decision = decide(qaFacts({ item, run: superseded }));
    assert.equal(decision.go, true, item.state ?? 'ready-for-qa');
    const [run] = decision.runs;
    assert.equal(run.resume, undefined, 'a fresh run, not the session of the old version');
    assert.match(run.prompt, /^QA /);
    assert.deepEqual(run.qa, { environment: 'development', sha: RUNNING, auth: true });
  }
});

test('--retest runs the whole QA again from In QA after a NOT TESTED report, as a fresh qa run, not a defect (SHOP-20)', () => {
  // Pilot 3, SHOP-20: a Bug of the environment (SHOP-56) made the report NOT TESTED; once it was fixed and the flag
  // cleared, /ao-qa stopped "is In QA, not Ready for QA", and the only way on was --note, the road of a defect you found.
  const inQa = { state: 'in-qa', status: 'In QA' };
  const decision = decide(qaFacts({ item: inQa, qaReport: { result: 'NOT TESTED', at: '2026-11-16T10:00:00.000Z' } }), { retest: true });
  assert.equal(decision.go, true);
  const [run] = decision.runs;
  assert.equal(run.purpose, 'qa', 'the whole QA, not the reproduction of a defect');
  assert.equal(run.resume, undefined);
  assert.equal(run.note, undefined);
  assert.match(run.prompt, /^QA /);
  assert.deepEqual(run.qa, { environment: 'development', sha: RUNNING, auth: true });

  // Without --retest the item In QA still stops, and only a NOT TESTED report opens the way.
  assert.equal(decide(qaFacts({ item: inQa, qaReport: { result: 'NOT TESTED', at: '2026-11-16T10:00:00.000Z' } })).go, false);
  for (const qaReport of [{ result: 'FAIL', at: '2026-11-16T10:00:00.000Z' }, { result: 'PASS', at: '2026-11-16T10:00:00.000Z' }, null]) {
    const stopped = decide(qaFacts({ item: inQa, qaReport }), { retest: true });
    assert.equal(stopped.go, false, JSON.stringify(qaReport));
    assert.match(stopped.reason, /--retest .*NOT TESTED/);
  }
  // A flag still on the item stops first: you clear it once the cause is fixed.
  const flagged = decide(qaFacts({ item: { ...inQa, flagged: true, flag: 'needs-you' }, qaReport: { result: 'NOT TESTED', at: '2026-11-16T10:00:00.000Z' } }), { retest: true });
  assert.equal(flagged.go, false);
});

test('/ao-qa stops while the QA environment does not run a release that holds the merge of the item', () => {
  const none = decide(qaFacts({ qa: { running: null, contains: false } }));
  assert.deepEqual([none.go, none.reason], [false, 'Development runs no release yet']);
  const older = decide(qaFacts({ qa: { contains: false } }));
  assert.equal(older.reason, 'Development runs cccccccc, which does not hold the merge of PR #15 (bbbbbbbb) yet');
  assert.match(older.next, /deployer/);
  const unmerged = decide(qaFacts({ pr: { state: 'open', merged: false, mergeCommit: null } }));
  assert.equal(unmerged.reason, 'PR #15 of DEMO-21 is not merged');
});

test('Next of an item in Ready for QA is /ao-qa', () => {
  assert.equal(nextFor({ key: 'DEMO-21', workType: 'story', state: 'ready-for-qa', flagged: false }), '/ao-qa DEMO-21');
});

// After QA fail the item is In Progress and its PR is merged: the fix is a rebuild on a new branch (live-run-fixes 2.4).
test('after QA fail, /ao-qa says /ao-build, not the review of the merged PR', () => {
  const failed = decide(qaFacts({ item: { state: 'in-progress', status: 'In Progress' } }));
  assert.equal(failed.reason, 'DEMO-21 is In Progress, not Ready for QA');
  assert.equal(failed.next, '/ao-build DEMO-21');
  const item = { key: 'DEMO-21', workType: 'story', state: 'in-progress', flagged: false };
  assert.equal(nextFor(item, { number: 15, state: 'closed', merged: true, draft: false }), '/ao-build DEMO-21');
  assert.equal(nextFor(item, { number: 15, state: 'closed', merged: false, draft: false }), '/ao-build DEMO-21');
  assert.equal(nextFor(item, { number: 15, state: 'open', merged: false, draft: false }), '/ao-review 15');
});

test('/ao-qa stops when the deployment that runs has no URL: a deploy by another tool, such as the old fake deploy.yml', () => {
  const decision = decide(qaFacts({ qa: { running: { sha: RUNNING, deployment: 7, url: null } } }));
  assert.equal(decision.reason, 'the deployment of cccccccc on Development has no URL: only the deployer of the kit deploys there with one (spec 2.3)');
});

// project-scaffold part 2, spec 2.4: two public apps, each on its own host of project.yaml at the commit that runs.
const SHOP = [
  'apps:',
  '  user: { repo: shop, path: apps/user, profile: nextjs, dev: x, port: { env: PORT, default: 3000 }, health: /, public: true, hosts: { development: shop-dev.ao.t2g.io.vn, staging: shop-staging.ao.t2g.io.vn, production: shop.ao.t2g.io.vn } }',
  '  shop-admin: { repo: shop, path: apps/shop-admin, profile: react, dev: x, port: { env: PORT, default: 5173 }, health: /, public: true, hosts: { development: shop-admin-dev.ao.t2g.io.vn, staging: shop-admin-staging.ao.t2g.io.vn, production: shop-admin.ao.t2g.io.vn } }',
  '  api: { repo: shop, path: apps/api, profile: nestjs, dev: x, port: { env: PORT, default: 3001 }, health: /health }',
].join('\n');

test('/ao-qa with two public apps: qa gets the URL of each, and the prompt names them', () => {
  const running = { sha: RUNNING, deployment: 7, url: 'https://shop-dev.ao.t2g.io.vn', projectText: SHOP };
  const [run] = decide(qaFacts({ qa: { running } })).runs;
  assert.deepEqual(run.env, { E2E_BASE_URL: 'https://shop-dev.ao.t2g.io.vn', E2E_USER_URL: 'https://shop-dev.ao.t2g.io.vn', E2E_SHOP_ADMIN_URL: 'https://shop-admin-dev.ao.t2g.io.vn' });
  assert.match(run.prompt, /Its public apps answer at: user https:\/\/shop-dev\.ao\.t2g\.io\.vn, shop-admin https:\/\/shop-admin-dev\.ao\.t2g\.io\.vn\. Check DEMO-21/);
  assert.match(run.prompt, /run the E2E of the repo with E2E_BASE_URL, the E2E_<APP>_URL of each app, E2E_HTTP_USER and E2E_HTTP_PASSWORD, which are set/);
});

test('/ao-qa stops when the deployment answers on a host project.yaml does not name: the two files differ', () => {
  const running = { sha: RUNNING, deployment: 7, url: 'https://elsewhere.ao.t2g.io.vn', projectText: SHOP };
  const decision = decide(qaFacts({ qa: { running } }));
  assert.equal(decision.go, false);
  assert.match(decision.reason, /^development answers at https:\/\/elsewhere\.ao\.t2g\.io\.vn, which is the host of no public app in \.ai-orchestrator\/project\.yaml: the hosts there and in \/etc\/ao\/deployer\.yaml differ/);
});

// Kit followups, batch 4 item 14: an ops Task (label ao-ops) has no PR and no deploy. qa checks its Verification on the
// environments it names, from the evidence of devops, with the basic auth of Development and Staging, and no worktree.
test('/ao-qa of an ops Task: no PR and no deploy, qa checks its Verification with the basic auth, in no worktree', () => {
  const ops = qaFacts({ item: { type: 'Task', workType: 'task', labels: ['ao-ops', 'ao-devops'], ops: true }, pr: null, qa: null });
  const decision = decide(ops);
  assert.equal(decision.go, true, decision.reason);
  const [run] = decision.runs;
  assert.deepEqual([run.role, run.purpose, run.worktree, run.qa], ['qa', 'qa-ops', undefined, { environment: null, sha: null, auth: true }]);
  assert.match(run.prompt, /^QA ops Task DEMO-21\. It has no PR and no deploy: devops did its work on the environments its Verification names, and left its evidence in a comment with the heading Ops evidence\./);
  assert.match(run.prompt, /Pick it up, then check each line of its Verification on those environments yourself, without changing their data/);
  const early = decide(qaFacts({ item: { type: 'Task', workType: 'task', labels: ['ao-ops'], ops: true, state: 'in-progress', status: 'In Progress' }, pr: null, qa: null }));
  assert.match(early.reason, /^DEMO-21 is In Progress, not Ready for QA/);
});

// C1 spec section 2: an item of level light has no qa run. ao-step picks it up with the CI token, prints what to check,
// and posts the report the main session writes; the guards stay, so the human still Accepts on a PASS.
const LIGHT_TASK = { key: 'DEMO-30', type: 'Task', workType: 'task', summary: 'Hướng dẫn xóa sản phẩm', level: 'light' };
const DESCRIPTION = 'Goal\nViết hướng dẫn.\nVerification\nChữ trên nút khớp file i18n.\nMở S1 trên Development: ảnh khớp màn hình.\nDefinition of Ready\nCó plan.\n';
const REPORT = '# QA report: DEMO-30 Hướng dẫn xóa sản phẩm\n\n## Result\n\nPASS\n\n## Acceptance Criteria\n\n| Acceptance criterion | Result | Evidence |\n|---|---|---|\n| Chữ trên nút khớp file i18n | PASS | so với vi.json |\n';

test('/ao-qa of a light item: picked up by a script, then the lines to check, then the report of the main session', () => {
  const start = decide(qaFacts({ item: LIGHT_TASK }));
  assert.deepEqual(start.runs, [{ action: 'qa-light-start', key: 'DEMO-30', continue: true }]);
  const picked = decide(qaFacts({ item: { ...LIGHT_TASK, state: 'in-qa', status: 'In QA' }, description: DESCRIPTION }));
  assert.equal(picked.go, false);
  assert.match(picked.reason, /^DEMO-30 is at level light: no qa run\. Check each line below on Development/);
  assert.match(picked.next, /--light-report \.ai\/runs\/DEMO-30\/light-report\.md$/);
  assert.deepEqual(picked.lines.slice(-3), ['To check:', '  Verification: Chữ trên nút khớp file i18n.', '  Verification: Mở S1 trên Development: ảnh khớp màn hình.']);
  const posted = decide(qaFacts({ item: { ...LIGHT_TASK, state: 'in-qa', status: 'In QA' } }), { lightReport: REPORT });
  assert.deepEqual(posted.runs, [{ action: 'qa-light-report', key: 'DEMO-30', result: 'PASS', body: REPORT }]);
  const passed = decide(qaFacts({ item: { ...LIGHT_TASK, state: 'in-qa', status: 'In QA' }, qaReport: { result: 'PASS', at: '2026-11-20T08:00:00.000Z', id: '10700', failed: [] } }));
  assert.match(passed.next, /click Accept on DEMO-30/);
});

test('a light report that is not about the item, or has no result, is refused', () => {
  const inQa = qaFacts({ item: { ...LIGHT_TASK, state: 'in-qa', status: 'In QA' } });
  assert.match(decide(inQa, { lightReport: REPORT.replace('DEMO-30', 'DEMO-31') }).reason, /not about DEMO-30/);
  assert.match(decide(inQa, { lightReport: REPORT.replace('PASS\n\n## Acceptance', 'OK\n\n## Acceptance') }).reason, /no PASS, FAIL or NOT TESTED/);
});

test('a light item whose PR touches a critical path is QA-ed by qa as before; one that failed QA stays light', () => {
  assert.equal(decide(qaFacts({ item: LIGHT_TASK, pr: { tier: 'critical' } })).runs[0].role, 'qa');
  assert.deepEqual(decide(qaFacts({ item: { ...LIGHT_TASK, rework: 1 } })).runs, [{ action: 'qa-light-start', key: 'DEMO-30', continue: true }], 'a QA fail keeps it light: the main session checks it again');
  assert.equal(decide(qaFacts({ item: { ...LIGHT_TASK, ops: true } })).runs[0].purpose, 'qa-ops', 'an ops Task keeps its road');
});

test('QA again at level standard checks only the criteria that failed, with the whole E2E suite; at heavy, every one', () => {
  const failed = { result: 'FAIL', at: '2026-11-20T08:00:00.000Z', id: '10592', failed: ['AC2: Given giỏ có 2 dòng, When xóa một dòng, Then còn một dòng', 'AC4: Given …'] };
  const again = decide(qaFacts({ item: { rework: 1 }, qaReport: failed }));
  const { prompt } = again.runs[0];
  assert.match(prompt, /This is QA again: your report 10592 of 2026-11-20 failed 2 criteria/);
  assert.match(prompt, /- AC2: Given giỏ có 2 dòng/);
  assert.match(prompt, /PASS ở báo cáo 10592/);
  assert.match(prompt, /Run the whole E2E suite as always/);
  assert.doesNotMatch(decide(qaFacts({ item: { rework: 1, level: 'heavy' }, qaReport: failed })).runs[0].prompt, /QA again/, 'heavy: every criterion');
  assert.doesNotMatch(decide(qaFacts({ qaReport: { ...failed, result: 'NOT TESTED' } })).runs[0].prompt, /QA again/, 'not after a NOT TESTED');
  assert.doesNotMatch(decide(qaFacts()).runs[0].prompt, /QA again/, 'not on a first QA');
});
