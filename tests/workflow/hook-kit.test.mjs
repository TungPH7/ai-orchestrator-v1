import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOOK_FILES, hookKitDrift, hookKitNote } from '../../lib/workflow/hook-kit.mjs';

// Review round 3 of shop PR #21, security: the clone at AO_KIT_DIR was 6 commits behind the kit copy of shop, so agents
// ran the gh-guard of before the review. ao-step names the hook files that differ.
test('the hook files that differ between AO_KIT_DIR and the kit copy of the project are named', () => {
  const files = { 'D:/kit/lib/quality/commands.mjs': 'old', 'D:/shop/.ai-orchestrator/lib/quality/commands.mjs': 'new' };
  const read = (path) => files[path] ?? 'same';
  const drift = hookKitDrift({ kitDir: 'D:\\kit\\', copyDir: 'D:/shop/.ai-orchestrator', read });
  assert.deepEqual(drift, ['lib/quality/commands.mjs']);
  assert.match(hookKitNote(drift, 'D:/kit'), /^Note: the hooks of agents load the kit in AO_KIT_DIR \(D:\/kit\), and lib\/quality\/commands\.mjs there differ from the kit copy of this project: bring that clone to the kit of the project/);
  assert.deepEqual(hookKitDrift({ kitDir: 'D:/Shop/.ai-orchestrator/', copyDir: 'D:/shop/.ai-orchestrator', read: () => assert.fail('no read') }), [], 'the same folder');
  assert.deepEqual(hookKitDrift({ kitDir: 'D:/kit', copyDir: 'D:/shop/.ai-orchestrator', read: () => 'same' }), []);
  assert.equal(hookKitNote([], 'D:/kit'), null);
  assert.ok(HOOK_FILES.includes('lib/tracker/guard.mjs'));
});
