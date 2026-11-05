import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachEvidence } from '../../lib/tracker/attachments.mjs';

const MB = 1024 * 1024;
// A Jira client with the CI token, as the script of /ao-qa makes it after the qa run, and the files qa left.
function fakes({ meta = { enabled: true, uploadLimit: 10 * MB }, sizes = { 'cart.png': 200_000, 'trace.zip': 3 * MB, 'video.webm': 25 * MB } } = {}) {
  const calls = [];
  const jira = {
    get: async (path) => {
      assert.equal(path, '/rest/api/3/attachment/meta');
      return meta;
    },
    attach: async (key, name, data) => calls.push(['attach', key, name, data.length]),
    comment: async (key, text) => calls.push(['comment', key, text]),
  };
  const fs = {
    stat: async (path) => ({ size: sizes[path.split('/').pop()] }),
    readFile: async (path) => Buffer.alloc(sizes[path.split('/').pop()]),
  };
  const files = Object.keys(sizes).map((name) => `/tmp/ao-qa/DEMO-21/${name}`);
  return { calls, run: () => attachEvidence({ jira, key: 'DEMO-21', files, fs }) };
}

test('every file within the limit Jira gives is attached, and one comment names them', async () => {
  const f = fakes({ sizes: { 'cart.png': 200_000, 'trace.zip': 3 * MB } });
  assert.deepEqual(await f.run(), { attached: ['cart.png', 'trace.zip'], skipped: [] });
  assert.deepEqual(f.calls, [
    ['attach', 'DEMO-21', 'cart.png', 200_000],
    ['attach', 'DEMO-21', 'trace.zip', 3 * MB],
    ['comment', 'DEMO-21', 'ao-step: attached the evidence of qa: cart.png, trace.zip.'],
  ]);
});

test('a file over the limit is left out, and the comment says which and why', async () => {
  const f = fakes();
  assert.deepEqual(await f.run(), { attached: ['cart.png', 'trace.zip'], skipped: [{ name: 'video.webm', size: 25 * MB }] });
  assert.deepEqual(f.calls.map(([kind, , name]) => `${kind} ${kind === 'attach' ? name : ''}`.trim()), ['attach cart.png', 'attach trace.zip', 'comment']);
  assert.equal(f.calls.at(-1)[2], 'ao-step: attached the evidence of qa: cart.png, trace.zip. Not attached, over the limit of 10.0 MB on this Jira: video.webm (25.0 MB).');
});

test('with attachments off on the Jira site, nothing is sent but the comment that says so', async () => {
  const f = fakes({ meta: { enabled: false, uploadLimit: 0 }, sizes: { 'cart.png': 200_000 } });
  assert.deepEqual(await f.run(), { attached: [], skipped: [{ name: 'cart.png', size: 200_000 }] });
  assert.deepEqual(f.calls, [['comment', 'DEMO-21', 'ao-step: attachments are off on this Jira, so the evidence of qa stays in .ai/qa/: cart.png (0.2 MB).']]);
});

test('no file, no comment', async () => {
  const f = fakes({ sizes: {} });
  assert.deepEqual(await f.run(), { attached: [], skipped: [] });
  assert.deepEqual(f.calls, []);
});
