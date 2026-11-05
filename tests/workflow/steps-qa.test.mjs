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
  const inReview = decide(qaFacts({ item: { state: 'in-review', status: 'In Review' } }));
  assert.equal(inReview.go, false);
  assert.equal(inReview.reason, 'DEMO-21 is In Review, not Ready for QA');
  assert.equal(inReview.next, '/ao-review 15 or /ao-fix 15');
  assert.equal(decide(qaFacts({ item: { workType: 'epic', type: 'Epic', state: 'in-progress', status: 'In Progress' } })).reason, 'DEMO-21 is an Epic: /ao-qa takes a Story, Task or Bug');
  assert.match(decide(qaFacts({ item: { flagged: true, flag: 'audit' } })).reason, /flagged Needs you by audit/);
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
