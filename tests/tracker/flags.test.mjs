import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { ciAccount, clearsMergeGateFlag, latestFlagComment, needsYouMarker } from '../../lib/tracker/flags.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { runSync, syncEvent } from '../../lib/tracker/sync.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const adf = (text) => ({ type: 'doc', version: 1, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] });
// The CI token's account writes the kit's comments (tracker/jira.yaml); agents share another account.
const CI = mapping.identities.find(({ id }) => id === 'automation').account_id;
const comment = (hour, text, by = CI) => ({ created: `2026-11-02T${String(hour).padStart(2, '0')}:00:00.000+0700`, body: adf(text), author: { accountId: by } });
const flagSet = (hour) => ({ created: `2026-11-02T${String(hour).padStart(2, '0')}:00:00.000+0700`, items: [{ field: 'Flagged', fromString: null, toString: 'Impediment' }] });
const MERGE_GATE_16 = `${needsYouMarker('5f9327b0'.padEnd(40, '0'), 16)}. It changes .github/workflows/deploy.yml, which only you merge.`;
const AUDIT = 'audit: e1e2e3e on develop was not deployed. PR #11 was merged without: approval on head a1b2c3d.';
const REWORK = 'jira-sync: DEMO-16 went back 3 times, the limit in policies.yaml. It is flagged with the label needs-you and waits for you.';

test('the marker of merge-gate names the head and the PR', () => {
  assert.equal(needsYouMarker('a1b2c3d4e5f60718293a4b5c6d7e8f9012345678', 12), 'merge-gate: needs you at a1b2c3d on PR #12');
});

test('the newest flag comment of the kit: merge-gate, audit or the rework limit; other comments do not count', () => {
  const comments = [comment(8, REWORK), comment(9, MERGE_GATE_16), comment(10, 'Developer: đã sửa timeout.')];
  assert.deepEqual(latestFlagComment(comments), { kind: 'merge-gate', at: Date.parse('2026-11-02T02:00:00Z'), sha: '5f9327b', pr: 16 });
  assert.equal(latestFlagComment([comment(9, MERGE_GATE_16), comment(11, AUDIT)]).kind, 'audit');
  assert.equal(latestFlagComment([comment(9, MERGE_GATE_16), comment(11, REWORK)]).kind, 'rework');
  assert.equal(latestFlagComment([comment(9, 'merge-gate is slow today')]), null);
});

test('jira-sync clears the flag only when merge-gate raised it for this PR and nobody flagged the item since', () => {
  const flagged = { labels: ['needs-you'] };
  const decide = (comments, histories = [flagSet(9)], item = flagged, number = 16) => clearsMergeGateFlag({ comments, histories, item, number, mapping });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16)]), { clear: true });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16), comment(11, AUDIT)]), { clear: false, reason: 'its newest flag comment is from audit, not from merge-gate for PR #16' });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16), comment(11, REWORK)]), { clear: false, reason: 'its newest flag comment is from the rework limit, not from merge-gate for PR #16' });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16)], [flagSet(9), flagSet(12)]), { clear: false, reason: 'it was flagged again after merge-gate flagged it' });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16)], [flagSet(9)], flagged, 17), { clear: false, reason: 'its newest flag comment is from merge-gate for PR #16, not for PR #17' });
  assert.deepEqual(decide([], []), { clear: false, reason: 'no flag comment of the kit' });
  assert.deepEqual(decide([comment(9, MERGE_GATE_16)], [flagSet(9)], { labels: [] }), { clear: false, reason: 'it is not flagged' });
});

// The pull_request event of PR #16 closing, and a Jira client with one item flagged by merge-gate.
const closed = (merged = true) => ({
  action: 'closed',
  number: 16,
  pull_request: { number: 16, state: 'closed', merged, title: 'ci(deploy): set timeout-minutes on the deploy job (DEMO-16)', head: { ref: 'feature/DEMO-16-deploy-timeout', sha: '5f9327b0'.padEnd(40, '0') }, base: { ref: 'develop' } },
  repository: { full_name: 'TungPH7/ao-pilot' },
});
function jiraWith(comments, histories = [flagSet(9)], labels = ['needs-you']) {
  const writes = [];
  return {
    writes,
    get: async (path) => (path === '/rest/api/3/field' ? [{ id: 'customfield_10021', name: 'Flagged' }] : { key: 'DEMO-16', fields: { labels, status: { name: 'In Review' }, issuetype: { name: 'Task' } } }),
    getAll: async (path) => (path.endsWith('/comment') ? comments : histories),
    searchAll: async () => [],
    transition: async (key, name) => writes.push(['transition', key, name]),
    editItem: async (key, changes) => writes.push(['edit', key, changes]),
    comment: async (key, text) => writes.push(['comment', key, text]),
  };
}
const github = { get: async () => assert.fail('a closed PR is not reconciled'), getAll: async () => assert.fail('a closed PR is not reconciled') };

test('a PR that closes clears the flag merge-gate raised for it, and moves no item', async () => {
  const jira = jiraWith([comment(9, MERGE_GATE_16)]);
  const lines = [];
  const { failures } = await runSync({ event: 'pull_request', payload: closed(), jira, github, contract, mapping, space: 'DEMO', log: (line) => lines.push(line) });
  assert.deepEqual(failures, []);
  assert.deepEqual(lines, ['pull_request: DEMO-16', 'Made DEMO-16: clear-needs-you (PR #16 merged)']);
  assert.deepEqual(jira.writes, [
    ['edit', 'DEMO-16', { fields: { customfield_10021: null }, update: { labels: [{ remove: 'needs-you' }] } }],
    ['comment', 'DEMO-16', 'jira-sync: PR #16 was merged, so the Needs you flag merge-gate raised for it is cleared.'],
  ]);
});

test('a PR closed without merging clears it too; a flag of audit or the rework limit stays, and says why', async () => {
  const unmerged = jiraWith([comment(9, MERGE_GATE_16)]);
  const { actions } = await syncEvent({ event: 'pull_request', payload: closed(false), jira: unmerged, github, contract, mapping, space: 'DEMO' });
  assert.deepEqual(actions, [{ key: 'DEMO-16', effect: 'clear-needs-you', pr: 16, merged: false }]);

  const audited = jiraWith([comment(9, MERGE_GATE_16), comment(11, AUDIT)]);
  const lines = [];
  await runSync({ event: 'pull_request', payload: closed(), jira: audited, github, contract, mapping, space: 'DEMO', log: (line) => lines.push(line) });
  assert.deepEqual(lines, ['pull_request: DEMO-16', 'Kept DEMO-16 flagged: its newest flag comment is from audit, not from merge-gate for PR #16', 'No change']);
  assert.deepEqual(audited.writes, []);
});

test('an item that is not flagged is left alone without a word', async () => {
  const lines = [];
  await runSync({ event: 'pull_request', payload: closed(), jira: jiraWith([], [], []), github, contract, mapping, space: 'DEMO', log: (line) => lines.push(line) });
  assert.deepEqual(lines, ['pull_request: DEMO-16', 'No change']);
});

test('only comments of the CI account carry the markers of the kit: one an agent writes is ignored (T15a)', async () => {
  assert.equal(CI, '712020:14a4a21d-167e-4ee7-87cb-386edf298b62', 'the account id of orchestratorci');
  assert.equal(latestFlagComment([comment(9, MERGE_GATE_16, 'agent')], { author: CI }), null);
  assert.equal(latestFlagComment([comment(9, AUDIT), comment(11, MERGE_GATE_16, 'agent')], { author: CI }).kind, 'audit');
  assert.throws(() => ciAccount({ identities: [] }), /no account_id for the automation identity/);
  const flagged = { labels: ['needs-you'] };
  const spoofed = [comment(9, AUDIT), comment(11, MERGE_GATE_16, 'agent')];
  assert.deepEqual(clearsMergeGateFlag({ comments: spoofed, histories: [flagSet(9)], item: flagged, number: 16, mapping, author: CI }), { clear: false, reason: 'its newest flag comment is from audit, not from merge-gate for PR #16' });
  const jira = jiraWith(spoofed);
  const lines = [];
  await runSync({ event: 'pull_request', payload: closed(), jira, github, contract, mapping, space: 'DEMO', log: (line) => lines.push(line) });
  assert.deepEqual(jira.writes, [], 'the flag of audit stays');
  assert.match(lines[1], /^Kept DEMO-16 flagged: its newest flag comment is from audit/);
});
