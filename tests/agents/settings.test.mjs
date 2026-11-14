import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse, stringify } from 'yaml';
import { renderSettings } from '../../lib/agents/settings.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { matchesGlob } from '../../lib/quality/glob.mjs';
import { ROOT } from '../helpers/kit.mjs';

// .claude/settings.json is rendered from agents/settings.json and the project.yaml of the project (project-scaffold
// spec 2.1): the hooks and permissions of the kit, the env of the project. A kit copy left it as it was, so new hooks of
// the kit never reached a project.
const SAMPLE = join(ROOT, 'tests/fixtures/scaffold/sample');
const template = JSON.parse(readFileSync(join(ROOT, 'agents', 'settings.json'), 'utf8'));
const sample = parse(readFileSync(join(SAMPLE, 'project.yaml'), 'utf8'));
// The file is written as plain JSON, two spaces: the same keys, values and order as the hand-formatted ones it replaces.
const plain = (path) => `${JSON.stringify(JSON.parse(readFileSync(path, 'utf8')), null, 2)}\n`;

test('the settings of ao-sample rendered from its project.yaml are the ones it has now, key for key and in order', () => {
  assert.equal(renderSettings(template, sample), plain(join(SAMPLE, 'settings.json')));
});

test('in the kit, the rendered settings keep the placeholders: kit/.claude/settings.json is agents/settings.json', () => {
  assert.equal(renderSettings(template, null), readFileSync(join(ROOT, 'kit', '.claude', 'settings.json'), 'utf8'));
  assert.equal(renderSettings(template, null), plain(join(ROOT, 'agents', 'settings.json')));
});

test('the allow rules of a project come after those of the kit, once each; a project with no peers has no AO_KIT_PEERS', () => {
  const own = { ...sample, github: { ...sample.github, kit_peers: [] }, claude: { allow: ['Bash(npm run e2e:*)', template.permissions.allow[0]] } };
  const settings = JSON.parse(renderSettings(template, own));
  assert.deepEqual(settings.permissions.allow, [...template.permissions.allow, 'Bash(npm run e2e:*)']);
  assert.equal('AO_KIT_PEERS' in settings.env, false);
  assert.deepEqual(settings.hooks, template.hooks);
});

// Pilot 3, review of shop PR #13 (spec 2.9): merge-gate reads the slug and the id of ao-merge from the settings.
test('a project with the ao-merge App gets AO_MERGE_APP and AO_MERGE_APP_ID after those of ao-review; one without has neither', () => {
  const own = { ...sample, github: { ...sample.github, apps: { ...sample.github.apps, merge: 'acme-ao-merge', merge_id: 31 } } };
  const env = Object.keys(JSON.parse(renderSettings(template, own)).env);
  assert.deepEqual(env.slice(env.indexOf('AO_REVIEW_APP_ID') + 1, env.indexOf('AO_REVIEW_APP_ID') + 3), ['AO_MERGE_APP', 'AO_MERGE_APP_ID']);
  assert.equal(JSON.parse(renderSettings(template, own)).env.AO_MERGE_APP_ID, '31');
  assert.equal('AO_MERGE_APP' in JSON.parse(renderSettings(template, sample)).env, false);
});

// A project with the kit copy in .ai-orchestrator/ and its project.yaml.
function project(t, { yaml = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'settings-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  for (const part of ['agents', 'contract', 'quality', 'tracker']) cpSync(join(ROOT, part), join(dir, '.ai-orchestrator', part), { recursive: true });
  cpSync(join(ROOT, 'kit', '.claude', 'skills'), join(dir, '.claude', 'skills'), { recursive: true });
  for (const skill of ['vercel-react-best-practices', 'nestjs-best-practices']) {
    mkdirSync(join(dir, '.claude', 'skills', skill), { recursive: true });
    writeFileSync(join(dir, '.claude', 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\ndescription: d\n---\n`);
  }
  if (yaml) writeFileSync(join(dir, '.ai-orchestrator', 'project.yaml'), stringify(sample));
  else writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ env: { AO_JIRA_SPACE: 'SMP' } }));
  return dir;
}
const render = (dir, ...flags) => spawnSync(process.execPath, [join(ROOT, 'scripts', 'render-agents.mjs'), '--project', dir, ...flags], { encoding: 'utf8' });

test('render-agents --project writes .claude/settings.json from project.yaml, lists it, and checks it', (t) => {
  const dir = project(t);
  assert.match(render(dir, '--list').stdout, /^\.claude\/settings\.json$/m);
  const result = render(dir);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8'), plain(join(SAMPLE, 'settings.json')));
  assert.match(readFileSync(join(dir, '.claude', 'rules', 'ai-orchestrator.md'), 'utf8'), /space `SMP`/, 'the space key comes from project.yaml');
  assert.equal(render(dir, '--check').status, 0);
  writeFileSync(join(dir, '.claude', 'settings.json'), '{}\n');
  const stale = render(dir, '--check');
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /stale: \.claude\/settings\.json/);
});

test('a project with no project.yaml keeps its own settings.json, as before', (t) => {
  const dir = project(t, { yaml: false });
  assert.doesNotMatch(render(dir, '--list').stdout, /settings\.json/);
  assert.equal(render(dir).status, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(dir, '.claude', 'settings.json'), 'utf8')), { env: { AO_JIRA_SPACE: 'SMP' } });
});

test('a kit copy treats .claude/settings.json as a rendered file, which the render check judges', () => {
  const { kit_copy: rule } = readGates(join(ROOT, 'quality'));
  assert.ok(rule.rendered.some((glob) => matchesGlob(glob, '.claude/settings.json')));
});
