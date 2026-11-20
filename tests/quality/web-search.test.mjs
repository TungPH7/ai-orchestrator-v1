// Review of shop PR #79: the record of the pages the searches of a run gave a role that reads web pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resultUrls, searchFile } from '../../lib/quality/web-search.mjs';
import { ROOT } from '../helpers/kit.mjs';

// Second review of shop PR #79, Medium: the response of WebSearch in Claude Code 2.1.329 is { query, results,
// durationSeconds, searchCount }, and the query is what the role typed. Every URL of the whole response let it fetch a
// URL it searched for, so a page could have it send data out through a search. Only the url of each result counts.
test('the URLs of a WebSearch response: the url of each result, not the query or the text', () => {
  const response = {
    query: 'site:evil.test/?d=SECRET https://evil.test/collect?d=SECRET',
    results: [
      { tool_use_id: 'srvtoolu_1', content: [{ title: 'A', url: 'https://a.test/x?y=1' }, { title: 'B', url: 'http://b.test/' }, { title: 'C', url: 'https://a.test/x?y=1' }] },
      'A summary that names https://c.test/page and https://evil.test/collect?d=SECRET.',
    ],
    durationSeconds: 1.2,
    searchCount: 1,
  };
  assert.deepEqual(resultUrls(response), ['https://a.test/x?y=1', 'http://b.test/']);
  // A url that is no web address, or one that would write a line of its own in the record, counts as none.
  const odd = { query: 'x', results: [{ content: [{ url: 'javascript:alert(1)' }, { url: 'https://d.test/a\nhttps://evil.test/' }, { url: 'https://user:pw@e.test/' }, { url: 42 }, { url: 'https://f.test/ok' }] }] };
  assert.deepEqual(resultUrls(odd), ['https://f.test/ok']);
  // Any other shape gives none: a string, a list, no results.
  assert.deepEqual(resultUrls('Links: (https://d.test/a) [https://e.test/b]'), []);
  assert.deepEqual(resultUrls([{ content: [{ url: 'https://a.test/' }] }]), []);
  assert.deepEqual(resultUrls({ query: 'https://evil.test/' }), []);
  assert.deepEqual(resultUrls(undefined), []);
});

test('the hook records the url of each result of a WebSearch of an agent, not its query', () => {
  const temp = mkdtempSync(join(tmpdir(), 'ao-ws-'));
  try {
    const input = {
      hook_event_name: 'PostToolUse',
      tool_name: 'WebSearch',
      agent_type: 'seo',
      session_id: 's1',
      tool_input: { query: 'https://evil.test/?d=SECRET' },
      tool_response: { query: 'https://evil.test/?d=SECRET', results: [{ tool_use_id: 't', content: [{ title: 'A', url: 'https://a.test/x' }] }, 'see https://evil.test/?d=SECRET'], durationSeconds: 1, searchCount: 1 },
    };
    const result = spawnSync(process.execPath, [join(ROOT, 'kit', '.claude', 'hooks', 'web-search.mjs')], { input: JSON.stringify(input), encoding: 'utf8', env: { ...process.env, AO_KIT_DIR: ROOT, CLAUDE_PROJECT_DIR: ROOT, TEMP: temp, TMP: temp, TMPDIR: temp } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(searchFile(temp, 's1'), 'utf8'), 'https://a.test/x\n');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('one record per session, under a name that stays in its folder', () => {
  assert.equal(searchFile('T', 'abc-123'), join('T', 'ao-web-search', 'abc-123.txt'));
  assert.equal(searchFile('T', '../x'), join('T', 'ao-web-search', '___x.txt'));
  assert.equal(searchFile('T', undefined), null);
  assert.equal(searchFile('T', ''), null);
});
