import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { readRoster, validateRoster } from '../../lib/agents/roster.mjs';
import { readContract } from '../../lib/contract.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { CONTRACT_DIR, ROOT, makeKit } from '../helpers/kit.mjs';
import { applyPatch } from '../helpers/patch.mjs';

const FIXTURE_DIR = new URL('../fixtures/agents/invalid/', import.meta.url);
const VALIDATE_SCRIPT = join(ROOT, 'scripts', 'validate-contract.mjs');

const contract = readContract(CONTRACT_DIR);
const gates = readGates(join(ROOT, 'quality'));
const roster = readRoster(join(ROOT, 'agents'));

// The SKILL.md of each vendored skill in the kit, by skill name; undefined when the folder or file is missing.
const kitSkills = new Map(
  roster.vendored_skills.map(({ name }) => {
    const file = join(ROOT, 'kit', '.claude', 'skills', name, 'SKILL.md');
    return [name, existsSync(file) ? readFileSync(file, 'utf8') : undefined];
  }),
);

// The roles that have a hand-written prompt in agents/prompts/.
const prompts = readdirSync(join(ROOT, 'agents', 'prompts')).filter((file) => file.endsWith('.md')).map((file) => file.slice(0, -3));

test('the real roster, with the skills vendored into the kit and the prompts, breaks no rule', () => {
  assert.deepEqual(validateRoster(roster, contract, { gates, skills: kitSkills, prompts }), []);
  assert.equal(prompts.length, 10);
});

test('A4 also checks the vendored folders: each has a SKILL.md named like the skill (T9)', () => {
  const skills = new Map(roster.vendored_skills.map(({ name }) => [name, `---\nname: ${name}\ndescription: d\n---\n`]));
  assert.deepEqual(validateRoster(roster, contract, { gates, skills }), []);

  skills.set('interview-me', undefined);
  skills.set('playwright-cli', '---\nname: playwright\ndescription: d\n---\n');
  assert.deepEqual(
    validateRoster(roster, contract, { gates, skills }).map(({ rule, path, message }) => `${rule} ${path}: ${message}`),
    ['A4 vendored_skills.interview-me: has no SKILL.md in kit/.claude/skills/interview-me', 'A4 vendored_skills.playwright-cli: SKILL.md is named playwright, not playwright-cli'],
  );
});

test('model and effort of each role (spec 2.2)', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(roster.roles).map(([id, { model, effort }]) => [id, `${model} ${effort}`])), {
    pm: 'sonnet medium',
    ba: 'opus xhigh',
    ux: 'sonnet xhigh',
    sa: 'opus xhigh',
    'fe-dev': 'opus high',
    'be-dev': 'opus high',
    reviewer: 'opus xhigh',
    security: 'opus max',
    qa: 'opus high',
    devops: 'opus high',
  });
});

// One row of the table in spec 2.3: tools | files it may write | git | Jira | preloaded skills.
const row = (id) => {
  const { tools, writes, git, jira, skills } = roster.roles[id];
  return [tools.join(' '), writes.join(' '), git, jira.join(' '), skills.join(' ')].join(' | ');
};

test('tools, files, git, Jira and skills of each role (spec 2.3)', () => {
  assert.equal(row('pm'), 'Bash Write | .ai/** | read | read | ');
  assert.equal(row('ba'), 'Bash Edit Write | docs/specs/** CHANGELOG.md .ai/** | write | read create edit comment link | spec-driven-development interview-me');
  assert.equal(row('ux'), 'Bash Edit Write | docs/specs/** .ai/** | write | read | frontend-ui-engineering');
  assert.equal(row('sa'), 'Bash Edit Write | docs/specs/** docs/adr/** .ai/** | write | read comment | planning-and-task-breakdown api-and-interface-design documentation-and-adrs');
  assert.equal(row('fe-dev'), 'Bash Edit Write | ** | write | read edit comment transition | test-driven-development incremental-implementation frontend-ui-engineering browser-testing-with-devtools');
  assert.equal(row('be-dev'), 'Bash Edit Write | ** | write | read edit comment transition | test-driven-development incremental-implementation api-and-interface-design');
  assert.equal(row('reviewer'), 'Bash Write | .ai/** | read | read | code-review-and-quality');
  assert.equal(row('security'), 'Bash Write | .ai/** | read | read | security-and-hardening sentry-security-review');
  assert.equal(row('qa'), 'Bash Write | .ai/** | read | read create edit comment transition | playwright-cli');
  assert.equal(row('devops'), 'Bash Edit Write | ** | write | read edit comment transition | ci-cd-and-automation shipping-and-launch');
});

test('fe-dev alone gets Chrome DevTools, in six groups; memory, extensions, third-party, WebMCP and PWA are not offered (spec 2.3, T2)', () => {
  assert.deepEqual(Object.entries(roster.roles).filter(([, role]) => role.mcp).map(([id, { mcp }]) => `${id} ${JSON.stringify(mcp)}`), [
    'fe-dev {"chrome-devtools":["navigation","input","emulation","debugging","network","performance"]}',
  ]);
  const groups = roster.mcp_tools['chrome-devtools'];
  assert.deepEqual(Object.keys(groups), ['navigation', 'input', 'emulation', 'debugging', 'network', 'performance']);
  assert.equal(Object.values(groups).flat().length, 31);
  assert.ok(!Object.values(groups).flat().includes('click_at'), 'click_at needs --experimentalVision, which the kit does not turn on');
});

// executeWrite only behind link, which block-atlassian narrows to createJiraIssueLink of type Blocks (Pilot 1, T10).
test('Jira permissions become Rovo MCP tools; only ba may write through executeWrite, and no role may delete (spec 2.3)', () => {
  assert.deepEqual(roster.jira_tools, {
    read: ['getJiraIssue', 'searchJiraIssuesUsingJql', 'executeRead'],
    create: ['createJiraIssue'],
    edit: ['editJiraIssue'],
    comment: ['addOrEditJiraIssueComment'],
    link: ['executeWrite'],
    transition: ['transitionJiraIssue'],
  });
  assert.deepEqual(Object.keys(roster.roles).filter((id) => roster.roles[id].jira.includes('link')), ['ba']);
  assert.ok(!Object.values(roster.jira_tools).flat().includes('executeDestructive'));
});

test('16 vendored skills, each pinned by a full commit: 13 of agent-skills at the 0.6.13 tag and three from the registry (spec 2.7)', () => {
  const by = (repo) => roster.vendored_skills.filter((skill) => skill.repo === repo);

  assert.equal(roster.vendored_skills.length, 16);
  assert.equal(by('addyosmani/agent-skills').length, 13);
  for (const skill of by('addyosmani/agent-skills')) {
    assert.deepEqual(skill, { name: skill.name, repo: 'addyosmani/agent-skills', path: `skills/${skill.name}`, commit: 'aeac41d4d005999432bb7312f7ff06383a91d59d' });
  }
  assert.deepEqual(by('microsoft/playwright-cli'), [
    { name: 'playwright-cli', repo: 'microsoft/playwright-cli', path: 'skills/playwright-cli', commit: '83368cb3bfc0b2bd8ff8af4ade8e0107461ed421' },
  ]);
  assert.deepEqual(by('getsentry/skills'), [
    { name: 'sentry-security-review', repo: 'getsentry/skills', path: 'skills/security-review', commit: '6d20de492725c78e805aa0741507bb90d1982cc7', upstream_name: 'security-review' },
    { name: 'gha-security-review', repo: 'getsentry/skills', path: 'skills/gha-security-review', commit: 'b11ee5163295996fa6449c4842749811c82ac77c' },
  ]);
  // Every preloaded skill is vendored, and gha-security-review is the one security reads only for workflow changes.
  const preloaded = new Set(Object.values(roster.roles).flatMap(({ skills }) => skills));
  assert.deepEqual(roster.vendored_skills.map(({ name }) => name).filter((name) => !preloaded.has(name)), ['gha-security-review']);
});

test('readRoster names the file it cannot read', () => {
  assert.throws(() => readRoster(join(ROOT, 'no-such-dir')), /Cannot read .*roster\.yaml/);
});

test('validate script also checks the roster next to the contract folder', () => {
  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, CONTRACT_DIR], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Roster OK: .*roster\.yaml/);
});

test('validate script prints roster errors and exits non-zero', (t) => {
  const text = readFileSync(join(ROOT, 'agents', 'roster.yaml'), 'utf8').replace('model: sonnet\n    effort: medium', 'model: gpt-5\n    effort: medium');
  const root = makeKit(t, { 'agents/roster.yaml': text, 'quality/gates.yaml': readFileSync(join(ROOT, 'quality', 'gates.yaml'), 'utf8') });

  const result = spawnSync(process.execPath, [VALIDATE_SCRIPT, join(root, 'contract')], { encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /A1 roles\.pm\.model: \S/);
});

// Each fixture breaks exactly one rule: { description, rule, expect: [paths], patch: [ops], prompts? }. prompts, when
// given, stands for the prompt files of agents/prompts/; without it the prompts are not checked.
const fixtures = readdirSync(FIXTURE_DIR).filter((file) => file.endsWith('.yaml')).sort();

test('every rule from A1 to A5 has at least one fixture', () => {
  const rules = new Set(fixtures.map((file) => file.slice(0, 2).toUpperCase()));
  for (const rule of ['A1', 'A2', 'A3', 'A4', 'A5']) assert.ok(rules.has(rule), rule);
});

for (const file of fixtures) {
  const fixture = parse(readFileSync(new URL(file, FIXTURE_DIR), 'utf8'));

  test(`${file}: ${fixture.description}`, () => {
    const errors = validateRoster(applyPatch(roster, fixture.patch), contract, { gates, prompts: fixture.prompts });

    assert.deepEqual(
      errors.map(({ rule, path }) => `${rule} ${path}`).sort(),
      fixture.expect.map((path) => `${fixture.rule} ${path}`).sort(),
    );
    for (const { message } of errors) assert.ok(message, 'every error has a message');
  });
}
