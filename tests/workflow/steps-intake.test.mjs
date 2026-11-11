import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { readIntake } from '../../lib/workflow/facts.mjs';
import { decideStep } from '../../lib/workflow/steps.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';
import { checkArgument } from '../../scripts/ao-step.mjs';

// /ao-intake: the check prints what the main session needs for the interview and runs nothing (human-loop spec 3.1).
const contract = readContract(CONTRACT_DIR);
const roster = readRoster(join(ROOT, 'agents'));

const facts = (more = {}) => ({
  command: 'intake',
  space: 'DEMO',
  item: null,
  intake: {
    epics: [
      { key: 'DEMO-20', summary: 'Xóa sản phẩm khỏi giỏ hàng', status: 'In Progress' },
      { key: 'DEMO-30', summary: 'Mã giảm giá', status: 'Specifying' },
    ],
    epicShaping: { used: 1, limit: 1 },
    bugFields: { 'found-in': 'customfield_10040', severity: 'customfield_10041' },
    ...more,
  },
});

test('the check of /ao-intake prints the open Epics, the WIP of epic-shaping, the rule to pick a type and the Bug fields, and runs nothing', () => {
  const decision = decideStep('intake', facts(), { roster, contract });
  assert.equal(decision.status, true);
  assert.equal(decision.go, undefined);
  const text = decision.lines.join('\n');
  assert.match(text, /^Space DEMO\. Epics not done: 2$/m);
  assert.match(text, /^ {2}DEMO-20 "Xóa sản phẩm khỏi giỏ hàng": In Progress$/m);
  assert.match(text, /^WIP epic-shaping: 1 of 1 Epics in Specifying or Planning; Start spec on a new Epic waits until one leaves them$/m);
  assert.ok(text.includes(contract.work_type_selection));
  for (const rule of contract.work_item_conventions) assert.ok(text.includes(rule));
  assert.match(text, /^Intake makes an Epic, a Task or a Bug, never a Story/m);
  assert.match(text, /^Bug fields: Found in = customfield_10040 \(Development, Staging, Production\); Severity = customfield_10041 \(Critical, High, Medium, Low\)$/m);
  assert.equal(decision.next, 'Interview the human, write the draft in .ai/intake/, and create the item once they say OK');
});

test('with room under epic-shaping the WIP line says so; with no Epic it says none', () => {
  const text = decideStep('intake', facts({ epics: [], epicShaping: { used: 0, limit: 1 } }), { roster, contract }).lines.join('\n');
  assert.match(text, /^Space DEMO\. Epics not done: none$/m);
  assert.match(text, /^WIP epic-shaping: 0 of 1 Epics in Specifying or Planning$/m);
});

test('readIntake reads the Epics not done of the space, counts those in Specifying or Planning, and finds the Bug fields by name', async () => {
  const mapping = readMapping(join(ROOT, 'tracker'));
  const asked = [];
  const jira = {
    searchAll: async (jql, fields) => {
      asked.push({ jql, fields });
      return [
        { key: 'DEMO-30', fields: { summary: 'Mã giảm giá', status: { name: 'Specifying' } } },
        { key: 'DEMO-20', fields: { summary: 'Xóa sản phẩm', status: { name: 'In Progress' } } },
      ];
    },
    get: async (path) => (path === '/rest/api/3/field' ? [{ id: 'customfield_10040', name: 'Found in' }, { id: 'customfield_10041', name: 'Severity' }, { id: 'summary', name: 'Summary' }] : null),
  };
  const read = await readIntake({ jira, contract, mapping, space: 'DEMO' });
  assert.deepEqual(asked, [{ jql: 'project = "DEMO" AND issuetype = "Epic" AND statusCategory != Done ORDER BY created DESC', fields: ['summary', 'status'] }]);
  assert.deepEqual(read, {
    epics: [{ key: 'DEMO-30', summary: 'Mã giảm giá', status: 'Specifying' }, { key: 'DEMO-20', summary: 'Xóa sản phẩm', status: 'In Progress' }],
    epicShaping: { used: 1, limit: 1 },
    bugFields: { 'found-in': 'customfield_10040', severity: 'customfield_10041' },
  });
});

test('/ao-intake takes no argument on its check line: the description stays in the chat', () => {
  assert.equal(checkArgument('intake', undefined, 'DEMO'), null);
  assert.match(checkArgument('intake', 'DEMO-1', 'DEMO'), /\/ao-intake takes no argument/);
});
