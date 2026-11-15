import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOOK_FOLDERS, hookKitDrift, hookKitNote } from '../../lib/workflow/hook-kit.mjs';

// Review round 3 of shop PR #21, security: the clone at AO_KIT_DIR was 6 commits behind the kit copy of shop, so agents
// ran the gh-guard of before the review. ao-step names the files that differ. Round 4: every file of the folders the
// hooks load counts, imports included (git-options.mjs, scope.mjs…), and a file in one kit only.
test('the files of the hook folders that differ between AO_KIT_DIR and the kit copy of the project are named', () => {
  const trees = {
    'D:/kit/lib': ['quality/commands.mjs', 'quality\\git-options.mjs', 'workflow/hook-kit.mjs'],
    'D:/kit/quality': ['gates.yaml'],
    'D:/kit/contract': [],
    'D:/shop/.ai-orchestrator/lib': ['quality/commands.mjs', 'quality/git-options.mjs'],
    'D:/shop/.ai-orchestrator/quality': ['gates.yaml'],
    'D:/shop/.ai-orchestrator/contract': [],
  };
  const files = { 'D:/kit/lib/quality/git-options.mjs': 'new', 'D:/shop/.ai-orchestrator/lib/quality/git-options.mjs': 'old', 'D:/kit/lib/workflow/hook-kit.mjs': 'only here' };
  const read = (path) => (path in files ? files[path] : path.includes('/lib/workflow/hook-kit.mjs') ? null : 'same');
  const list = (dir) => trees[dir] ?? [];
  const drift = hookKitDrift({ kitDir: 'D:\\kit\\', copyDir: 'D:/shop/.ai-orchestrator', read, list });
  assert.deepEqual(drift, ['lib/quality/git-options.mjs', 'lib/workflow/hook-kit.mjs']);
  assert.match(hookKitNote(drift, 'D:/kit'), /^Note: the hooks of agents load the kit in AO_KIT_DIR \(D:\/kit\), and 2 of its files differ from the kit copy of this project \(lib\/quality\/git-options\.mjs, lib\/workflow\/hook-kit\.mjs\): bring that clone/);
  assert.match(hookKitNote(['a', 'b', 'c', 'd', 'e'], 'D:/kit'), /\(a, b, c and 2 more\)/);
  assert.deepEqual(hookKitDrift({ kitDir: 'D:/Shop/.ai-orchestrator/', copyDir: 'D:/shop/.ai-orchestrator', read: () => assert.fail('no read'), list }), [], 'the same folder');
  assert.equal(hookKitNote([], 'D:/kit'), null);
  assert.deepEqual(HOOK_FOLDERS, ['lib', 'quality', 'contract']);
});
