// Facts for the guards whose evidence is in Jira (tracker-integration spec section 2.8). Every function takes a client
// (lib/tracker/jira-client.mjs, or a fake in tests) and does no other I/O.
import { expectedOptions } from './expected.mjs';

const ITEM_FIELDS = ['issuetype', 'status', 'labels', 'description', 'parent', 'subtasks'];
// dor-met as automation checks it (contract note on `refine`): a Story or Task under an Epic whose plan is approved,
// that is an Epic in progress, and with a description.
const DOR_TYPES = ['story', 'task'];
const JIRA_GUARDS = ['dor-met', 'wip-available', 'subtasks-done', 'qa-report-failed', 'qa-report-passed'];
const BLOCKS = new Set(['paragraph', 'heading', 'listItem', 'codeBlock', 'blockquote', 'tableRow', 'rule', 'mediaSingle', 'panel']);

export async function readItem(client, key) {
  const { key: found, fields } = await client.get(`/rest/api/3/issue/${encodeURIComponent(key)}`, { fields: ITEM_FIELDS.join(',') });
  return {
    key: found,
    type: fields.issuetype.name,
    status: fields.status.name,
    labels: fields.labels ?? [],
    description: adfText(fields.description).trim(),
    parent: fields.parent ? { key: fields.parent.key, type: fields.parent.fields.issuetype.name, status: fields.parent.fields.status.name } : null,
    subtasks: (fields.subtasks ?? []).map(({ key: sub, fields: { status } }) => ({ key: sub, status: status.name, done: status.statusCategory?.key === 'done' })),
  };
}

// The ids among `needed` of the Jira guards that hold for the item, in the order asked. Guards with evidence elsewhere
// (GitHub, or you) are left out. Pass `item` when it is already read.
export async function jiraGuards(client, { key, item, actor, needed, contract, mapping }) {
  const current = item ?? (await readItem(client, key));
  // Both QA guards read the same comments, once.
  let qaResult;
  const latestQaResult = () => (qaResult ??= readLatestQaResult(client, current.key));
  const check = {
    'dor-met': () => dorMet(current, contract, mapping),
    'wip-available': () => wipAvailable(client, current, actor, contract, mapping),
    'subtasks-done': () => current.subtasks.every(({ done }) => done),
    'qa-report-failed': async () => (await latestQaResult()) === 'FAIL',
    'qa-report-passed': async () => (await latestQaResult()) === 'PASS',
  };
  const holds = [];
  for (const guard of needed.filter((id) => JIRA_GUARDS.includes(id))) if (await check[guard]()) holds.push(guard);
  return holds;
}

function dorMet(item, contract, mapping) {
  const typeOf = (id) => contract.work_types.find((type) => type.id === id).jira_issue_type;
  const epicWorkflow = Object.keys(contract.workflows).find((w) => contract.workflows[w].applies_to.includes('epic'));
  return (
    DOR_TYPES.map(typeOf).includes(item.type) &&
    item.description !== '' &&
    item.parent?.type === typeOf('epic') &&
    item.parent.status === mapping.workflows[epicWorkflow].states['in-progress'].status
  );
}

// The agent's in-progress work, counted by Sub-task when a Story has Sub-tasks, else by item (contract wip_limits).
async function wipAvailable(client, item, actor, contract, mapping) {
  const field = contract.work_item_fields.find(({ id }) => id === 'agent');
  const index = field.values.findIndex(({ id }) => id === actor);
  if (index === -1) throw new Error(`No Agent value for role '${actor}'`);
  const agent = expectedOptions(contract, mapping, 'agent')[index];
  const workflows = Object.entries(contract.workflows).filter(([, w]) => w.applies_to.some((type) => field.applies_to.includes(type)));
  const statuses = [...new Set(workflows.map(([id]) => mapping.workflows[id].states['in-progress']?.status).filter(Boolean))];
  const space = item.key.slice(0, item.key.lastIndexOf('-'));
  const jql = `project = "${space}" AND "${mapping.fields.agent.jira_field}" = "${agent}" AND status in (${statuses.map((s) => `"${s}"`).join(', ')})`;
  const busy = (await client.searchAll(jql, ['subtasks'])).filter(({ fields }) => (fields.subtasks ?? []).length === 0);
  return busy.length < contract.wip_limits.find(({ id }) => id === 'dev-agent').limit;
}

async function readLatestQaResult(client, key) {
  const comments = await client.getAll(`/rest/api/3/issue/${encodeURIComponent(key)}/comment`, { orderBy: '-created' }, 'comments');
  const time = (created) => Date.parse(String(created).replace(/([+-]\d\d)(\d\d)$/, '$1:$2'));
  const reports = comments
    .map(({ body, created }) => ({ result: qaReportResult(body), at: time(created) }))
    .filter(({ result }) => result)
    .sort((a, b) => b.at - a.at);
  return reports[0]?.result ?? null;
}

// PASS or FAIL from a comment written with templates/qa-report.md, as ADF or as markdown text; null for any other
// comment, or a report whose Result is not filled in.
export function qaReportResult(body) {
  const lines = (typeof body === 'string' ? body : adfText(body)).split('\n').map((line) => line.replace(/^#+\s*/, '').trim());
  if (!lines.some((line) => /^QA report\b/i.test(line))) return null;
  const at = lines.findIndex((line) => /^Result$/i.test(line));
  const result = lines.slice(at + 1).find((line) => line !== '');
  return at !== -1 && /^(PASS|FAIL)$/.test(result ?? '') ? result : null;
}

// Plain text of an Atlassian Document Format node, one line per block.
export function adfText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  const inner = (node.content ?? []).map(adfText).join(node.type === 'tableRow' ? ' | ' : '');
  return BLOCKS.has(node.type) ? `${inner}\n` : inner;
}
