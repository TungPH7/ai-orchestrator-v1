// C1 spec 6.2, 6.6: ao-step commits for seo, which has no git, only a change under docs/specs/ on a branch of the item.
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

test('a change under docs/specs/ on the branch of the item is committed with the key', () => {
  assert.deepEqual(seoChange({ status: status(' M docs/specs/DEMO-20/spec.md'), branch: 'feature/DEMO-20-spec', key: 'DEMO-20' }), {
    paths: ['docs/specs/DEMO-20/spec.md'],
    message: 'docs(spec): SEO of the SPEC, by seo (DEMO-20)',
  });
  assert.equal(seoChange({ status: '', branch: 'feature/DEMO-20-spec', key: 'DEMO-20' }), null);
});

test('a path outside docs/specs/, or a base branch: nothing is committed and the command stops', () => {
  const outside = seoChange({ status: status(' M docs/specs/DEMO-20/spec.md', '?? apps/user/messages/vi.json'), branch: 'feature/DEMO-20-spec', key: 'DEMO-20' });
  assert.match(outside.stop, /^seo changed apps\/user\/messages\/vi\.json, outside docs\/specs\/: ao-step committed nothing/);
  for (const branch of ['develop', 'main', 'release/v0.4.0', '']) {
    assert.match(seoChange({ status: status(' M docs/specs/DEMO-20/spec.md'), branch, key: 'DEMO-21' }).stop, /a base branch: ao-step committed nothing/, branch);
  }
});
