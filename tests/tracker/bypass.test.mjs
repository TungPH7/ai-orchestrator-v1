import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { loadContract } from '../../lib/contract.mjs';
import { readMapping } from '../../lib/tracker/mapping.mjs';
import { checkToolCall, reworkDecision } from '../../lib/tracker/guard.mjs';
import { CONTRACT_DIR, ROOT } from '../helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);
const mapping = readMapping(join(ROOT, 'tracker'));
const check = (tool_name, tool_input, space = 'DEMO') => checkToolCall({ hook_event_name: 'PreToolUse', tool_name, tool_input }, { mapping, space });
const ALLOW = { allow: true };

test('a Bash command that reaches Atlassian is refused; other commands pass', () => {
  assert.deepEqual(check('Bash', { command: 'curl -s https://api.atlassian.com/ex/jira/x/rest/api/3/issue/DEMO-1' }), {
    allow: false,
    reason: 'jira: do not call Atlassian from Bash; use the tools of the atlassian MCP server',
  });
  assert.equal(check('Bash', { command: 'node -e "fetch(\'https://PHUNGHUUTUNG12B4.Atlassian.net\')"' }).allow, false);
  assert.deepEqual(check('Bash', { command: 'npm test' }), ALLOW);
});

// Four of the five commands block-atlassian refused in Pilot 1 (SMP-2, SMP-5, SMP-6), trimmed: each writes text to a
// file with cat and a quoted heredoc, which the shell does not expand, so its body is data. A link to one work item is
// data too, outside a command that reaches the network.
test('a Bash command that only writes text with a work item link or the word Atlassian passes (Pilot 1)', () => {
  const writes = [
    "cat > .ai/pr/SMP-2-spec-body.md <<'EOF'\n# docs(spec): spec and design of SMP-2\n\n[SMP-2](https://example.atlassian.net/browse/SMP-2): Ghi chú: tạo và xem danh sách.\nEOF",
    "cat > .ai/pr/SMP-5-body.md <<'EOF'\n# feat(api): share the note rules\n\n[SMP-5](https://example.atlassian.net/browse/SMP-5): Quy tắc ghi chú dùng chung cho form và API.\nEOF",
    "cd /work/ao-sample && mkdir -p .ai/pr && cat > .ai/pr/SMP-6-body.md <<'EOF'\nSee https://example.atlassian.net/browse/SMP-6, the Task of Epic SMP-2.\nEOF",
    "cat > .ai/ledger/SMP-5.md <<'EOF'\n- Hook chặn lệnh Bash có URL Atlassian trong nội dung.\n- Không gọi https://example.atlassian.net/rest/api/3/issue từ Bash.\nEOF",
    "cat <<'EOF' > .ai/pr/SMP-7-body.md\nSee [SMP-7](https://example.atlassian.net/browse/SMP-7).\nEOF",
    'tee -a .ai/ledger/SMP-7.md <<"END" >/dev/null\n- ATLASSIAN_AGENT_TOKEN is never printed.\nEND',
    'echo "- [SMP-1](https://example.atlassian.net/browse/SMP-1) đã xong." >> .ai/ledger/SMP-1.md',
  ];
  for (const command of writes) assert.deepEqual(check('Bash', { command }), ALLOW, command);
});

// The High of reviewer on ao-sample PR #13: the hook of kit PR #162 cut work item links out before it looked for a
// network client, and let through what names the token.
test('a link that goes on past the work item key, a network call with a link, code, and anything that names the token are refused', () => {
  const calls = [
    'curl https://example.atlassian.net/browse/SMP-1/../../rest/api/3/issue/SMP-1',
    'curl --path-as-is "https://example.atlassian.net/browse/SMP-1?jql=project=SMP"',
    'curl https://example.atlassian.net/browse/SMP-1.json',
    'curl https://u:t@example.atlassian.net/browse/SMP-1',
    'curl -s https://example.atlassian.net/browse/SMP-1',
    "curl -X POST 'https://example.atlassian.net/browse/SMP-1;/../../rest/api/3/issue/SMP-1/transitions'",
    'echo "see https://example.atlassian.net/browse/SMP-1;/../../rest/api/3/myself" > .ai/notes.md',
    'echo "site: example.atlassian.net" > .ai/notes.md',
    'curl -H "Authorization: Bearer $ATLASSIAN_AGENT_TOKEN" "$SITE/rest/api/3/issue/SMP-1"',
    'wget --header="Authorization: Basic $ATLASSIAN_BASIC" "$JIRA/rest/api/3/myself"',
    'Invoke-RestMethod -Uri "$env:SITE/rest/api/3/issue" -Headers @{ Authorization = "Bearer $env:ATLASSIAN_AGENT_TOKEN" }',
    'node -e "fetch(process.env.ATLASSIAN_SITE + \'/rest/api/3/myself\')"',
    'printenv ATLASSIAN_AGENT_TOKEN',
    'echo "$ATLASSIAN_AGENT_TOKEN"',
    'env | grep -i atlassian',
    'echo "$(printenv ATLASSIAN_AGENT_TOKEN)" > .ai/notes.md',
    // A heredoc that is code, expanded, piped, followed by more, or never closed is not data.
    "node - <<'EOF'\nconst fs = require('fs');\nfs.appendFileSync('.ai/ledger/SMP-2.md', 'hook PreToolUse từ chối lệnh (\"jira: do not call Atlassian from Bash\")\\n');\nEOF",
    'cat > .ai/notes.md <<EOF\n$ATLASSIAN_AGENT_TOKEN\nEOF',
    "cat <<'EOF' | sh\nprintenv ATLASSIAN_AGENT_TOKEN\nEOF",
    "cat > .ai/run.sh <<'EOF' && sh .ai/run.sh\nprintenv ATLASSIAN_AGENT_TOKEN\nEOF",
    "x=$(cat <<'EOF'\nprintenv ATLASSIAN_AGENT_TOKEN\nEOF\n)",
    "cat > .ai/notes.md <<'EOF'\nok\nEOF\nprintenv ATLASSIAN_AGENT_TOKEN",
    "cat > .ai/notes.md <<'EOF'\nprintenv ATLASSIAN_AGENT_TOKEN",
    "bash -c \"$(cat <<'EOF'\ncurl https://example.atlassian.net/rest/api/3/myself\nEOF\n)\"",
  ];
  for (const command of calls) assert.equal(check('Bash', { command }).allow, false, command);
});

test('executeWrite and executeDestructive are refused; executeRead passes', () => {
  for (const tool of ['executeWrite', 'executeDestructive']) {
    assert.deepEqual(check(`mcp__atlassian__${tool}`, { name: 'TransitionIssue', inputs: {} }), {
      allow: false,
      reason: `jira: ${tool} can run any write; use createJiraIssue, editJiraIssue, addOrEditJiraIssueComment or transitionJiraIssue`,
    });
  }
  assert.deepEqual(check('mcp__atlassian__executeRead', { name: 'listJiraIssueTransitions', inputs: { issueIdOrKey: 'DEMO-1' } }), ALLOW);
});

// As Claude made it on SMP with the agent token (Pilot 1, T10): inwardIssue blocks outwardIssue.
const link = (inputs, more = {}) => check('mcp__atlassian__executeWrite', { cloudId: mapping.cloud_id, name: 'createJiraIssueLink', inputs: { cloudId: mapping.cloud_id, linkType: 'Blocks', inwardIssue: 'DEMO-21', outwardIssue: 'DEMO-23', ...inputs }, ...more });

test('executeWrite may make a Blocks link between two items of the project space, and nothing else', () => {
  assert.deepEqual(link({}), ALLOW);
  assert.deepEqual(link({ cloudId: undefined }), ALLOW, 'the cloudId of the inputs may be left out');
  assert.deepEqual(check('mcp__atlassian__executeWrite', { cloudId: mapping.site, name: 'createJiraIssueLink', inputs: { linkType: 'blocks', inwardIssue: 'DEMO-21', outwardIssue: 'DEMO-23' } }), ALLOW);
  const refused = [
    [link({ linkType: 'Duplicate' }), 'jira: createJiraIssueLink may only make a Blocks link, not Duplicate'],
    [link({ outwardIssue: 'SCRUM-3' }), 'jira: SCRUM-3 is not a work item key of the project space DEMO'],
    [link({ inwardIssue: '10021' }), 'jira: 10021 is not a work item key of the project space DEMO'],
    [link({ inwardIssue: 'DEMO-21 OR 1=1' }), 'jira: DEMO-21 OR 1=1 is not a work item key of the project space DEMO'],
    [link({ outwardIssue: 'DEMO-21' }), 'jira: DEMO-21 cannot block itself'],
    [link({ comment: 'x' }), 'jira: createJiraIssueLink takes only cloudId, linkType, inwardIssue, outwardIssue, not comment'],
    [link({}, { cloudId: 'other-site.atlassian.net' }), 'jira: other-site.atlassian.net is not the Jira site of the project'],
    [link({ cloudId: 'other-cloud' }), 'jira: other-cloud is not the Jira site of the project'],
    [link({}, { cloudId: undefined }), 'jira: no cloudId is not the Jira site of the project'],
    // Low of reviewer on ao-sample PR #13: a URL that only holds the site's name in its query is another site.
    [link({}, { cloudId: `https://other.atlassian.net/?${mapping.site}` }), `jira: https://other.atlassian.net/?${mapping.site} is not the Jira site of the project`],
    [check('mcp__atlassian__editJiraIssue', { cloudId: `https://other.atlassian.net/?${mapping.site}`, issueIdOrKey: 'DEMO-12', fields: {} }), `jira: https://other.atlassian.net/?${mapping.site} is not the Jira site of the project`],
    [check('mcp__atlassian__executeWrite', { cloudId: mapping.cloud_id, name: 'deleteJiraIssueLink', inputs: { linkId: '10005' } }), 'jira: executeWrite can run any write; use createJiraIssue, editJiraIssue, addOrEditJiraIssueComment or transitionJiraIssue'],
    [check('mcp__atlassian__executeDestructive', { cloudId: mapping.cloud_id, name: 'createJiraIssueLink', inputs: { linkType: 'Blocks', inwardIssue: 'DEMO-21', outwardIssue: 'DEMO-23' } }), 'jira: executeDestructive can run any write; use createJiraIssue, editJiraIssue, addOrEditJiraIssueComment or transitionJiraIssue'],
  ];
  for (const [decision, reason] of refused) assert.deepEqual(decision, { allow: false, reason });
  assert.deepEqual(checkToolCall({ tool_name: 'mcp__atlassian__executeWrite', tool_input: { cloudId: mapping.cloud_id, name: 'createJiraIssueLink', inputs: { linkType: 'Blocks', inwardIssue: 'DEMO-21', outwardIssue: 'DEMO-23' } } }, { mapping, space: null }), {
    allow: false,
    reason: 'jira: set AO_JIRA_SPACE to the project space key in .claude/settings.json',
  });
});

test('Atlassian tools of another server, like the claude.ai connector, are refused', () => {
  assert.deepEqual(check('mcp__claude_ai_Atlassian__getJiraIssue', { issueIdOrKey: 'DEMO-1' }), {
    allow: false,
    reason: 'jira: use the atlassian MCP server of the project, not mcp__claude_ai_Atlassian__getJiraIssue',
  });
  assert.deepEqual(check('mcp__github__get_pull_request', { pullNumber: 1 }), ALLOW);
});

test('write tools only touch items of the project space', () => {
  const writes = [
    ['mcp__atlassian__createJiraIssue', { projectKey: 'DEMO', summary: 'x', issueType: 'Story' }],
    ['mcp__atlassian__editJiraIssue', { issueIdOrKey: 'DEMO-12', fields: {} }],
    ['mcp__atlassian__addOrEditJiraIssueComment', { issueIdOrKey: 'https://phunghuutung12b4.atlassian.net/browse/DEMO-12', commentBody: 'x' }],
    ['mcp__atlassian__transitionJiraIssue', { issueIdOrKey: 'DEMO-12', transitionName: 'Start' }],
  ];
  for (const [tool, input] of writes) {
    assert.deepEqual(check(tool, { cloudId: mapping.cloud_id, ...input }), ALLOW, tool);
  }
  assert.deepEqual(check('mcp__atlassian__editJiraIssue', { issueIdOrKey: 'SCRUM-3', fields: {} }), {
    allow: false,
    reason: 'jira: SCRUM-3 is outside the project space DEMO',
  });
  assert.deepEqual(check('mcp__atlassian__createJiraIssue', { projectKey: 'SCRUM', summary: 'x', issueType: 'Story' }), {
    allow: false,
    reason: 'jira: SCRUM is outside the project space DEMO',
  });
  // A numeric id hides the space; the agent must use the key.
  assert.deepEqual(check('mcp__atlassian__transitionJiraIssue', { issueIdOrKey: '10023', transitionName: 'Start' }), {
    allow: false,
    reason: 'jira: use the work item key, not 10023, so the project space can be checked',
  });
  // Reads may look anywhere.
  assert.deepEqual(check('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'SCRUM-3' }), ALLOW);
});

test('write tools stay on the site of the mapping', () => {
  assert.deepEqual(check('mcp__atlassian__editJiraIssue', { cloudId: 'another-site', issueIdOrKey: 'DEMO-12', fields: {} }), {
    allow: false,
    reason: 'jira: another-site is not the Jira site of the project',
  });
  assert.deepEqual(check('mcp__atlassian__editJiraIssue', { cloudId: 'https://phunghuutung12b4.atlassian.net', issueIdOrKey: 'DEMO-12', fields: {} }), ALLOW);
});

test('without a project space, every write is refused', () => {
  assert.deepEqual(check('mcp__atlassian__editJiraIssue', { issueIdOrKey: 'DEMO-12', fields: {} }, null), {
    allow: false,
    reason: 'jira: set AO_JIRA_SPACE to the project space key in .claude/settings.json',
  });
  assert.deepEqual(check('mcp__atlassian__getJiraIssue', { issueIdOrKey: 'DEMO-12' }, null), ALLOW);
});

// A status change as GET /issue/{key}/changelog returns it.
const move = (from, to, created) => ({ created, items: [{ field: 'status', fromString: from, toString: to }] });
const ROUND = [move('In Progress', 'In Review', '2026-11-01T09:00:00.000+0700'), move('In Review', 'In Progress', '2026-11-01T10:00:00.000+0700')];
const item = (labels = []) => ({ key: 'DEMO-12', type: 'Story', labels });

test('rework: the third request-changes asks the agent to flag the item; the first two do not', () => {
  const after = (rounds) => reworkDecision({ histories: Array.from({ length: rounds }, () => ROUND).flat(), item: item(), contract, mapping });
  assert.deepEqual(after(1), { block: false });
  assert.deepEqual(after(2), { block: false });
  const third = after(3);
  assert.equal(third.block, true);
  assert.equal(
    third.reason,
    'jira-rework: DEMO-12 went back 3 times, the limit in policies.yaml. Through the atlassian MCP server: set Flagged on DEMO-12, add the label needs-you, and comment why it keeps going back. Then stop and wait for the human.',
  );
});

test('rework: no request once the item has the label, or when the last move was not a rework', () => {
  const three = [ROUND, ROUND, ROUND].flat();
  assert.deepEqual(reworkDecision({ histories: three, item: item(['needs-you']), contract, mapping }), { block: false });
  assert.deepEqual(
    reworkDecision({ histories: [...three, move('In Progress', 'In Review', '2026-11-02T09:00:00.000+0700')], item: item(), contract, mapping }),
    { block: false },
  );
});

test('rework: the order of the history does not matter', () => {
  const three = [ROUND, ROUND, ROUND].flat().toReversed();
  assert.equal(reworkDecision({ histories: three, item: item(), contract, mapping }).block, true);
});
