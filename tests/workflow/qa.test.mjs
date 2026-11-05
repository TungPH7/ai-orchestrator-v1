import { test } from 'node:test';
import assert from 'node:assert/strict';
import { basicAuthEnv, qaFollowUp } from '../../lib/workflow/qa.mjs';

const SHA = 'c'.repeat(40);
const run = { role: 'qa', key: 'DEMO-21', purpose: 'qa', qa: { environment: 'development', sha: SHA, auth: true } };
const tree = { path: 'C:/Temp/ao-reviews/pilot-DEMO-21-qa' };

test('AO_ENV_AUTH (user:password) becomes the two variables Playwright reads; a wrong value is named without its text', () => {
  assert.deepEqual(basicAuthEnv('ao:p@ss:word'), { E2E_HTTP_USER: 'ao', E2E_HTTP_PASSWORD: 'p@ss:word' });
  for (const bad of [undefined, '', 'no-colon', ':nouser', 'nopassword:']) {
    assert.throws(() => basicAuthEnv(bad), (error) => /AO_ENV_AUTH must be user:password/.test(error.message) && !error.message.includes('no-colon'), String(bad));
  }
});

// The files qa left: screenshots in .ai/qa/<KEY>/ of the project, and the Playwright traces of the worktree.
const listing = {
  'D:/work/pilot/.ai/qa/DEMO-21': ['D:/work/pilot/.ai/qa/DEMO-21/cart.png'],
  'C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results': ['C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results/cart-remove/trace.zip', 'C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results/cart-remove/error-context.md'],
};
const follow = (more = {}) => {
  const attached = [];
  const notes = qaFollowUp({
    run,
    tree,
    projectDir: 'D:/work/pilot',
    list: (dir) => listing[dir] ?? [],
    attach: async (key, files) => {
      attached.push([key, files]);
      return { attached: files.map((f) => f.split('/').pop()), skipped: [] };
    },
    running: async () => SHA,
    ...more,
  });
  return notes.then((n) => ({ notes: n, attached }));
};

test('after the qa run, before its worktree goes, the screenshots and traces go to the item with the CI token', async () => {
  const { notes, attached } = await follow();
  assert.deepEqual(attached, [['DEMO-21', ['D:/work/pilot/.ai/qa/DEMO-21/cart.png', 'C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results/cart-remove/trace.zip']]]);
  assert.deepEqual(notes, ['Attached to DEMO-21: cart.png, trace.zip.']);
});

test('a deploy during the run is said, so the report is not read as one of the release that runs now (spec 2.5)', async () => {
  const { notes } = await follow({ running: async () => 'd'.repeat(40) });
  assert.equal(notes.at(-1), 'Development ran cccccccc when qa started and runs dddddddd now: the deployer replaced it during the run, so run /ao-qa DEMO-21 again.');
});

test('a failed upload is a note, not a failed run, and no file is no upload', async () => {
  const failed = await follow({ attach: async () => { throw new Error('Jira POST /rest/api/3/issue/DEMO-21/attachments returned 413'); } });
  assert.deepEqual(failed.notes, ['The evidence was not attached: Jira POST /rest/api/3/issue/DEMO-21/attachments returned 413. It stays in .ai/qa/DEMO-21/.']);
  const none = await follow({ list: () => [] });
  assert.deepEqual([none.notes, none.attached], [[], []]);
});
