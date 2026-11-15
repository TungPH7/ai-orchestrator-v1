import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOOK_FOLDERS, hookKitDrift, hookKitNote } from '../../lib/workflow/hook-kit.mjs';

// Review round 3 of shop PR #21, security: the clone at AO_KIT_DIR was 6 commits behind the kit copy of shop, so agents
// ran the gh-guard of before the review. ao-step names the files that differ. Round 4: every file of the folders that
// decide what an agent may do counts, imports included (git-options.mjs, scope.mjs…); a file of the copy missing in the
// clone counts, a file only the kit holds does not.
test('the files of the kit copy that differ in AO_KIT_DIR, or are missing there, are named', () => {
  const trees = {
    'D:/shop/.ai-orchestrator/lib': ['quality/commands.mjs', 'quality\\git-options.mjs', 'workflow/hook-kit.mjs'],
    'D:/shop/.ai-orchestrator/scripts': ['ao-agent.mjs'],
    'D:/kit/lib': ['quality/commands.mjs', 'quality/git-options.mjs', 'workflow/only-in-the-kit.mjs'],
  };
  const files = {
    'D:/kit/lib/quality/git-options.mjs': 'new',
    'D:/shop/.ai-orchestrator/lib/quality/git-options.mjs': 'old',
    'D:/shop/.ai-orchestrator/lib/workflow/hook-kit.mjs': 'only in the copy',
    'D:/kit/lib/workflow/hook-kit.mjs': null,
  };
  const read = (path) => (path in files ? files[path] : 'same');
  const list = (dir) => trees[dir] ?? [];
  const drift = hookKitDrift({ kitDir: 'D:\\kit\\', copyDir: 'D:/shop/.ai-orchestrator', read, list });
  assert.deepEqual(drift, ['lib/quality/git-options.mjs', 'lib/workflow/hook-kit.mjs']);
  assert.match(hookKitNote(drift, 'D:/kit'), /^Note: the hooks of agents load the kit in AO_KIT_DIR \(D:\/kit\), and 2 of its files differ from the kit copy of this project \(lib\/quality\/git-options\.mjs, lib\/workflow\/hook-kit\.mjs\): bring that clone/);
  assert.match(hookKitNote(['a', 'b', 'c', 'd', 'e'], 'D:/kit'), /\(a, b, c and 2 more\)/);
  assert.deepEqual(hookKitDrift({ kitDir: 'D:/Shop/.ai-orchestrator/', copyDir: 'D:/shop/.ai-orchestrator', read: () => assert.fail('no read'), list }), [], 'the same folder');
  assert.equal(hookKitNote([], 'D:/kit'), null);
  assert.deepEqual(HOOK_FOLDERS, ['lib', 'scripts', 'agents', 'quality', 'contract', 'tracker']);
});
