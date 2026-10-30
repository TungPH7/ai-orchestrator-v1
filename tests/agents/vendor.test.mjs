import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { planFiles, renameSkill, sourceNote, vendorSkill } from '../../lib/agents/vendor.mjs';
import { ROOT } from '../helpers/kit.mjs';

const tree = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'agents', 'vendor', 'getsentry-tree.json'), 'utf8'));
const COMMIT = '6d20de492725c78e805aa0741507bb90d1982cc7';
const sentry = { name: 'sentry-security-review', repo: 'getsentry/skills', path: 'skills/security-review', commit: COMMIT, upstream_name: 'security-review' };
const gha = { name: 'gha-security-review', repo: 'getsentry/skills', path: 'skills/gha-security-review', commit: COMMIT };

test('the files of a skill are the blobs under its folder, plus the license of the repository root', () => {
  assert.deepEqual(planFiles(gha, tree), [
    { from: 'skills/gha-security-review/SKILL.md', to: 'SKILL.md' },
    { from: 'skills/gha-security-review/references/pwn-request.md', to: 'references/pwn-request.md' },
    { from: 'LICENSE', to: 'LICENSE' },
  ]);
});

test('a skill folder with its own LICENSE keeps it, and the root license comes as REPO-LICENSE; a folder with a longer name is not part of it', () => {
  assert.deepEqual(planFiles(sentry, tree), [
    { from: 'skills/security-review/LICENSE', to: 'LICENSE' },
    { from: 'skills/security-review/SKILL.md', to: 'SKILL.md' },
    { from: 'skills/security-review/references/xss.md', to: 'references/xss.md' },
    { from: 'LICENSE', to: 'REPO-LICENSE' },
  ]);
});

test('a folder without SKILL.md, or a truncated tree, is refused', () => {
  assert.throws(() => planFiles({ ...gha, path: 'skills/nothing-here' }, tree), /no SKILL\.md under skills\/nothing-here/);
  assert.throws(() => planFiles(gha, { ...tree, truncated: true }), /truncated/);
});

test('renaming changes only the name line of the frontmatter', () => {
  const text = '---\nname: security-review\ndescription: Find bugs. Unlike name: in the body.\n---\n\n# Security Review\nname: stays\n';

  assert.equal(renameSkill(text, 'sentry-security-review'), text.replace('name: security-review\n', 'name: sentry-security-review\n'));
  assert.throws(() => renameSkill('# no frontmatter\n', 'x'), /no frontmatter name/);
});

test('SOURCE.md names the repository, path, commit, date, the change and every file', () => {
  const files = planFiles(sentry, tree).map(({ to }) => to);
  const note = sourceNote(sentry, { date: '2026-10-19', files });

  assert.match(note, /^# Source of sentry-security-review$/m);
  assert.match(note, /^\| Repository \| https:\/\/github\.com\/getsentry\/skills \|$/m);
  assert.match(note, /^\| Path \| `skills\/security-review` \|$/m);
  assert.match(note, new RegExp(`^\\| Commit \\| \`${COMMIT}\` \\(2026-10-19\\) \\|$`, 'm'));
  assert.match(note, /^\| Changes \| `name:` renamed from `security-review` to `sentry-security-review` \|$/m);
  for (const file of files) assert.ok(note.includes(`- \`${file}\``), file);
  assert.match(note, /npm run skills:vendor -- sentry-security-review/);
  assert.match(sourceNote(gha, { date: '2026-09-29', files: ['SKILL.md'] }), /^\| Changes \| None \|$/m);
});

test('vendorSkill fetches the tree, the commit date and each file at the pinned commit, then writes the folder', async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'vendor-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const asked = [];
  const fetchJson = async (url) => {
    asked.push(url);
    if (url.endsWith(`/git/trees/${COMMIT}?recursive=1`)) return tree;
    if (url.endsWith(`/commits/${COMMIT}`)) return { commit: { committer: { date: '2026-10-19T22:57:58Z' } } };
    throw new Error(`unexpected ${url}`);
  };
  const fetchBytes = async (url) => {
    asked.push(url);
    const path = url.replace(`https://raw.githubusercontent.com/getsentry/skills/${COMMIT}/`, '');
    return Buffer.from(path.endsWith('SKILL.md') ? '---\nname: security-review\ndescription: d\n---\nbody\n' : `content of ${path}\n`);
  };

  const files = await vendorSkill(sentry, { dir: join(dir, 'sentry-security-review'), fetchJson, fetchBytes });

  assert.deepEqual(files, ['LICENSE', 'SKILL.md', 'references/xss.md', 'REPO-LICENSE', 'SOURCE.md']);
  const read = (file) => readFileSync(join(dir, 'sentry-security-review', file), 'utf8');
  assert.equal(read('SKILL.md'), '---\nname: sentry-security-review\ndescription: d\n---\nbody\n');
  assert.equal(read('REPO-LICENSE'), 'content of LICENSE\n');
  assert.equal(read('references/xss.md'), 'content of skills/security-review/references/xss.md\n');
  assert.match(read('SOURCE.md'), /\(2026-10-19\)/);
  assert.deepEqual(readdirSync(join(dir, 'sentry-security-review')).sort(), ['LICENSE', 'REPO-LICENSE', 'SKILL.md', 'SOURCE.md', 'references']);
  assert.ok(asked.every((url) => url.startsWith('https://api.github.com/repos/getsentry/skills/') || url.startsWith(`https://raw.githubusercontent.com/getsentry/skills/${COMMIT}/`)), asked.join('\n'));
});
