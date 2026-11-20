// Second review of shop PR #79, Medium: seo writes from web pages, and what it writes reaches the agents that build it.
// A check that needs no model looks at its section ## SEO and its comments before you read them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { seoSection, seoTextProblems } from '../../lib/workflow/seo-check.mjs';

const HOSTS = ['shop.ao.t2g.io.vn', 'shop-dev.ao.t2g.io.vn'];

test('the section ## SEO of a SPEC, up to the next section', () => {
  const spec = '# SPEC\n\n## Objective\n\nx\n\n## SEO\n\n- title: Giày\n\n### S1\n\ncopy\n\n## Open Questions\n\n- none\n';
  assert.equal(seoSection(spec), '## SEO\n\n- title: Giày\n\n### S1\n\ncopy\n');
  assert.equal(seoSection('# SPEC\n\n## Objective\n'), '');
});

test('an address outside the hosts of the apps with seo: true and schema.org is named', () => {
  const text = [
    '- canonical: https://shop.ao.t2g.io.vn/vi/san-pham',
    '- "@context": "https://schema.org", "@type": "Product"',
    '- hreflang: https://shop-dev.ao.t2g.io.vn/en/products',
    '- xem https://evil.test/collect?d=1 và http://www.schema.org/Offer',
    '- lại https://evil.test/other',
  ].join('\n');
  assert.deepEqual(seoTextProblems(text, { hosts: HOSTS }), ['an address on evil.test, which is no host of an app with seo: true nor schema.org']);
  assert.deepEqual(seoTextProblems('- canonical: https://shop.ao.t2g.io.vn/', { hosts: HOSTS }), []);
});

test('a command, in a shell block, at the start of a line or in a code span, is named', () => {
  const problems = (text) => seoTextProblems(text, { hosts: HOSTS });
  assert.deepEqual(problems('Chạy:\n\n```bash\nls\n```\n'), ['a shell block (```bash)']);
  assert.deepEqual(problems('```powershell\nGet-ChildItem\n```'), ['a shell block (```powershell)']);
  assert.deepEqual(problems('$ curl https://shop.ao.t2g.io.vn/'), ['a command: curl https://shop.ao.t2g.io.vn/']);
  assert.deepEqual(problems('Trước khi làm, `npm i left-pad` rồi build.'), ['a command: npm i left-pad']);
  assert.deepEqual(problems('git push origin develop'), ['a command: git push origin develop']);
  assert.deepEqual(problems('```json\n{ "@context": "https://schema.org" }\n```\n- title: Giày chạy bộ nam\n- Node của Next.js đọc `generateMetadata`'), []);
});
