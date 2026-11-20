// C1 spec 6.2, 6.6: ao-step commits for seo, which has no git, only the SPEC of an Epic on a branch of the item.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedPaths, seoChange } from '../../lib/workflow/seo-commit.mjs';

const NUL = '\0';
const status = (...entries) => entries.join(NUL) + NUL;

test('the paths of git status -z: a change, a new file, and both paths of a rename', () => {
  assert.deepEqual(changedPaths(status(' M docs/specs/DEMO-20/spec.md', '?? docs/specs/DEMO-20/seo-notes.md', 'R  docs/specs/DEMO-20/b.md', 'docs/specs/DEMO-20/a.md')), [
    'docs/specs/DEMO-20/spec.md',
    'docs/specs/DEMO-20/seo-notes.md',
    'docs/specs/DEMO-20/b.md',
    'docs/specs/DEMO-20/a.md',
  ]);
  assert.deepEqual(changedPaths(''), []);
});

test('a change of the SPEC on the branch of the item is committed with the key', () => {
  assert.deepEqual(seoChange({ status: status(' M docs/specs/DEMO-20/spec.md'), branch: 'feature/DEMO-20-spec', key: 'DEMO-20', docsEpic: 'DEMO-20' }), {
    paths: ['docs/specs/DEMO-20/spec.md'],
    message: 'docs(spec): SEO of the SPEC, by seo (DEMO-20)',
  });
  // A request on a Story of the Epic: the SPEC of its Epic, on the branch of the Story, whose PR is reviewed.
  assert.deepEqual(seoChange({ status: status(' M docs/specs/DEMO-20/spec.md'), branch: 'feature/DEMO-23-cart-page', key: 'DEMO-23', docsEpic: null }).paths, ['docs/specs/DEMO-20/spec.md']);
  assert.equal(seoChange({ status: '', branch: 'feature/DEMO-20-spec', key: 'DEMO-20', docsEpic: 'DEMO-20' }), null);
});

test('any file but the SPEC, or a base branch: nothing is committed and the command stops', () => {
  const outside = seoChange({ status: status(' M docs/specs/DEMO-20/spec.md', '?? apps/user/messages/vi.json'), branch: 'feature/DEMO-20-spec', key: 'DEMO-20', docsEpic: 'DEMO-20' });
  assert.match(outside.stop, /^seo changed apps\/user\/messages\/vi\.json, which is no SPEC \(docs\/specs\/<EPIC>\/spec\.md\): ao-step committed nothing/);
  for (const branch of ['develop', 'main', 'release/v0.4.0', '']) {
    assert.match(seoChange({ status: status(' M docs/specs/DEMO-20/spec.md'), branch, key: 'DEMO-21', docsEpic: null }).stop, /a base branch: ao-step committed nothing/, branch);
  }
});

test('review of shop PR #79: a file that would steer an agent, or another file under the specs, is no SPEC', () => {
  const stop = (path, docsEpic = 'DEMO-20') => seoChange({ status: status(' M docs/specs/DEMO-20/spec.md', `?? ${path}`), branch: 'feature/DEMO-20-spec', key: 'DEMO-20', docsEpic }).stop;
  for (const path of ['docs/specs/DEMO-20/CLAUDE.md', 'docs/specs/DEMO-20/AGENTS.md', 'docs/specs/DEMO-20/.claude/rules/x.md', 'docs/specs/DEMO-20/seo-notes.md', 'docs/specs/DEMO-20/design.md', 'docs/specs/DEMO-20/sub/spec.md', 'docs/specs/DEMO-20/SPEC.md', '.ai/ledger/DEMO-20.md']) {
    assert.match(stop(path), /which is no SPEC/, path);
  }
  // On the docs branch of an Epic, whose PR merges without review after gate ②, only the SPEC of that Epic.
  assert.match(stop('docs/specs/DEMO-11/spec.md'), /^seo changed docs\/specs\/DEMO-11\/spec\.md, which is not the SPEC of DEMO-20 on its docs branch: ao-step committed nothing/);
});
