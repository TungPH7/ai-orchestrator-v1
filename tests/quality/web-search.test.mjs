// Review of shop PR #79: the record of the pages the searches of a run gave a role that reads web pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { resultUrls, searchFile } from '../../lib/quality/web-search.mjs';

test('the URLs of a WebSearch response, whatever its shape, without the punctuation after one', () => {
  const response = { results: [{ content: [{ title: 'A', url: 'https://a.test/x?y=1' }, { title: 'B', url: 'http://b.test/' }] }, 'See https://c.test/page. And https://a.test/x?y=1, again.'] };
  assert.deepEqual(resultUrls(response), ['https://a.test/x?y=1', 'http://b.test/', 'https://c.test/page']);
  assert.deepEqual(resultUrls('Links: (https://d.test/a) [https://e.test/b]'), ['https://d.test/a', 'https://e.test/b']);
  assert.deepEqual(resultUrls(undefined), []);
});

test('one record per session, under a name that stays in its folder', () => {
  assert.equal(searchFile('T', 'abc-123'), join('T', 'ao-web-search', 'abc-123.txt'));
  assert.equal(searchFile('T', '../x'), join('T', 'ao-web-search', '___x.txt'));
  assert.equal(searchFile('T', undefined), null);
  assert.equal(searchFile('T', ''), null);
});
