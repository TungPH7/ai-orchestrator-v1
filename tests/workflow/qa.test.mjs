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
  const kept = [];
  const notes = qaFollowUp({
    run,
    tree,
    projectDir: 'D:/work/pilot',
    list: (dir) => listing[dir] ?? [],
    attach: async (key, files) => {
      attached.push([key, files]);
      return { attached: files.map((f) => f.split('/').pop()), skipped: [] };
    },
    keep: async (key, files) => {
      kept.push([key, files]);
      return `.ai/runs/${key}/traces`;
    },
    running: async () => SHA,
    ...more,
  });
  return notes.then((n) => ({ notes: n, attached, kept }));
};

test('after a qa run on Production, before its worktree goes, the screenshots and traces go to the item with the CI token', async () => {
  const { notes, attached, kept } = await follow({ run: { ...run, qa: { environment: 'production', sha: SHA, auth: false } } });
  assert.deepEqual(attached, [['DEMO-21', ['D:/work/pilot/.ai/qa/DEMO-21/cart.png', 'C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results/cart-remove/trace.zip']]]);
  assert.deepEqual(kept, []);
  assert.deepEqual(notes, ['Attached to DEMO-21: cart.png, trace.zip.']);
});

test('behind basic auth the traces stay on this machine: Playwright writes httpCredentials into them, password and all', async () => {
  const { notes, attached, kept } = await follow();
  assert.deepEqual(attached, [['DEMO-21', ['D:/work/pilot/.ai/qa/DEMO-21/cart.png']]]);
  assert.deepEqual(kept, [['DEMO-21', ['C:/Temp/ao-reviews/pilot-DEMO-21-qa/test-results/cart-remove/trace.zip']]]);
  assert.deepEqual(notes, [
    'Attached to DEMO-21: cart.png.',
    'The 1 Playwright trace of the run holds the basic auth of Development, so it is not attached: it stays on this machine, in .ai/runs/DEMO-21/traces.',
  ]);
});

test('behind basic auth only images and videos of .ai/qa/<KEY>/ go to Jira: a trace or a config put there could hold the password', async () => {
  const folder = 'D:/work/pilot/.ai/qa/DEMO-21';
  const list = (dir) => (dir === folder ? [`${folder}/cart.png`, `${folder}/flow.webm`, `${folder}/run/trace.zip`, `${folder}/playwright.config.ts`] : []);
  const behind = await follow({ list });
  assert.deepEqual(behind.attached, [['DEMO-21', [`${folder}/cart.png`, `${folder}/flow.webm`]]]);
  assert.deepEqual(behind.notes, [
    'Attached to DEMO-21: cart.png, flow.webm.',
    'Behind the basic auth of Development only images and videos go to Jira, so these stay in .ai/qa/DEMO-21/: trace.zip, playwright.config.ts.',
  ]);
  const open = await follow({ list, run: { ...run, qa: { environment: 'production', sha: SHA, auth: false } } });
  assert.equal(open.attached[0][1].length, 4);
});

test('a deploy during the run is said, so the report is not read as one of the release that runs now (spec 2.5)', async () => {
  const { notes } = await follow({ running: async () => 'd'.repeat(40) });
  assert.equal(notes.at(-1), 'Development ran cccccccc when qa started and runs dddddddd now: the deployer replaced it during the run, so run /ao-qa DEMO-21 again.');
});

test('a failed upload is a note, not a failed run, and no file is no upload', async () => {
  const failed = await follow({ attach: async () => { throw new Error('Jira POST /rest/api/3/issue/DEMO-21/attachments returned 413'); } });
  assert.deepEqual(failed.notes[0], 'The evidence was not attached: Jira POST /rest/api/3/issue/DEMO-21/attachments returned 413. It stays in .ai/qa/DEMO-21/.');
  const lost = await follow({ keep: async () => { throw new Error('EPERM: operation not permitted'); } });
  assert.equal(lost.notes.at(-1), 'The 1 Playwright trace of the run holds the basic auth of Development, so it is not attached, and keeping it failed: EPERM: operation not permitted.');
  const none = await follow({ list: () => [] });
  assert.deepEqual([none.notes, none.attached], [[], []]);
});
