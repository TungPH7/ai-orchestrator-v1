import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { setupJira } from '../../lib/scaffold/setup-jira.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { ROOT } from '../helpers/kit.mjs';

// ao-kit setup jira (project-scaffold spec 2.4, as T2 found it): a company-managed space with the schemes of a sample
// space, its board and the board filter, then jira:check. A fake Jira keeps its state.
const mapping = readMapping(join(ROOT, 'tracker'));
const JQL = 'project = SHOP AND issuetype != Epic ORDER BY Rank ASC';
function jira({ space = false, board = null, signedIn = true } = {}) {
  const state = { space, board, filter: board ? { id: 501, jql: board.jql } : null, created: null };
  const writes = [];
  const call = async (method, path, body) => {
    if (method !== 'GET') writes.push(`${method} ${path}`);
    if (path === '/rest/api/3/myself') return signedIn ? { status: 200, json: { accountId: 'acc-1' } } : { status: 401, json: null };
    if (method === 'GET' && path === '/rest/api/3/project/SHOP') return state.space ? { status: 200, json: { id: '10050', key: 'SHOP' } } : { status: 404, json: null };
    if (method === 'GET' && path === '/rest/api/3/project/DEMO') return { status: 200, json: { id: '10001', key: 'DEMO', style: 'classic' } };
    if (path === '/rest/api/3/workflowscheme/project?projectId=10001') return { status: 200, json: { values: [{ workflowScheme: { id: 10002 } }] } };
    if (path === '/rest/api/3/issuetypescheme/project?projectId=10001') return { status: 200, json: { values: [{ issueTypeScheme: { id: '10149' } }] } };
    if (path === '/rest/api/3/issuetypescreenscheme/project?projectId=10001') return { status: 200, json: { values: [{ issueTypeScreenScheme: { id: '10001' } }] } };
    if (path === '/rest/api/3/project/DEMO/notificationscheme') return { status: 200, json: { id: 10000 } };
    if (method === 'POST' && path === '/rest/api/3/project') return (state.space = true, state.created = body, { status: 201, json: { id: '10050', key: 'SHOP' } });
    if (method === 'GET' && path === '/rest/agile/1.0/board?projectKeyOrId=SHOP') return { status: 200, json: { values: state.board ? [{ id: 36, type: 'kanban' }] : [] } };
    if (path === '/rest/agile/1.0/board/36/configuration') return { status: 200, json: { filter: { id: String(state.filter.id) } } };
    if (method === 'GET' && path === `/rest/api/3/filter/${state.filter?.id}`) return { status: 200, json: { id: String(state.filter.id), jql: state.filter.jql } };
    if (method === 'PUT' && path === `/rest/api/3/filter/${state.filter?.id}`) return (state.filter.jql = body.jql, { status: 200, json: {} });
    if (method === 'POST' && path === '/rest/api/3/filter') return (state.filter = { id: 501, jql: body.jql, share: body.sharePermissions }, { status: 200, json: { id: '501' } });
    if (method === 'POST' && path === '/rest/agile/1.0/board') return (state.board = { ...body }, { status: 201, json: { id: 36, type: body.type } });
    throw new Error(`unexpected ${method} ${path}`);
  };
  const runs = [];
  const run = (argv) => (runs.push(argv.join(' ')), { status: 1, stdout: 'SHOP: the board columns are "Backlog", "To Do"\n5 difference(s) between Jira and tracker/jira.yaml\n', stderr: '' });
  return { state, writes, call, run, runs };
}
const setup = (fake, more = {}) => setupJira({ kitDir: '/kit', space: 'SHOP', name: 'Shop', template: 'DEMO', mapping, jira: fake.call, run: fake.run, ...more });

test('a new space gets the schemes of the sample space, with no permission scheme, then its filter and kanban board', async () => {
  const fake = jira();
  const { notes } = await setup(fake);
  assert.deepEqual(fake.state.created, { key: 'SHOP', name: 'Shop', projectTypeKey: 'software', leadAccountId: 'acc-1', assigneeType: 'UNASSIGNED', workflowScheme: 10002, issueTypeScheme: 10149, issueTypeScreenScheme: 10001, notificationScheme: 10000 });
  assert.equal('permissionScheme' in fake.state.created, false, 'the Free plan refuses it (T2)');
  assert.equal(fake.state.filter.jql, JQL);
  assert.deepEqual(fake.state.filter.share, [{ type: 'project', project: { id: '10050' } }]);
  assert.deepEqual(fake.state.board, { name: 'SHOP board', type: 'kanban', filterId: 501, location: { type: 'project', projectKeyOrId: 'SHOP' } });
  assert.deepEqual(fake.runs, ['node /kit/scripts/jira-check.mjs --space SHOP']);
  const text = notes.join('\n');
  assert.match(text, /Created the space SHOP/);
  assert.match(text, /jira:check: 5 difference\(s\)/);
  assert.match(text, /By hand: the columns of the board and its Kanban backlog/);
});

test('a space and board that exist keep them; a board filter with the wrong JQL is set right; a second run writes nothing', async () => {
  const fake = jira({ space: true, board: { jql: 'project = SHOP ORDER BY Rank ASC' } });
  const { notes } = await setup(fake);
  assert.deepEqual(fake.writes, ['PUT /rest/api/3/filter/501']);
  assert.equal(fake.state.filter.jql, JQL);
  assert.match(notes.join('\n'), /The space SHOP exists/);
  const before = fake.writes.length;
  await setup(fake);
  assert.equal(fake.writes.length, before);
});

test('a token that cannot sign in stops before anything is written', async () => {
  const fake = jira({ signedIn: false });
  const { ok, notes } = await setup(fake);
  assert.equal(ok, false);
  assert.match(notes[0], /cannot sign in with JIRA_ADMIN_EMAIL and JIRA_ADMIN_CLASSIC_TOKEN \(401\)/);
  assert.deepEqual(fake.writes, []);
});
