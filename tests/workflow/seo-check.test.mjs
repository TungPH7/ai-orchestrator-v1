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
  assert.deepEqual(seoTextProblems(text, { hosts: HOSTS }), ['an address outside the hosts of the apps with seo: true and schema.org, on line 4']);
  assert.deepEqual(seoTextProblems('- canonical: https://shop.ao.t2g.io.vn/', { hosts: HOSTS }), []);
});

// Review of shop PR #80 (security, Low): a problem names the line and the program, never the words seo wrote, which
// reach the main session, which has Bash, in the reason of a STOP and the log of /ao-run before you read them.
test('a command, in a shell block, at the start of a line or in a code span, is named by its program and line', () => {
  const problems = (text) => seoTextProblems(text, { hosts: HOSTS });
  assert.deepEqual(problems('Chạy:\n\n```bash\nls\n```\n'), ['a shell block (bash) on line 3']);
  assert.deepEqual(problems('```powershell\nGet-ChildItem\n```'), ['a shell block (powershell) on line 1']);
  assert.deepEqual(problems('$ curl https://shop.ao.t2g.io.vn/'), ['a command (curl) on line 1']);
  assert.deepEqual(problems('Trước khi làm, `npm i left-pad` rồi build.'), ['a command (npm) on line 1']);
  assert.deepEqual(problems('git push origin develop\nlà đủ\n`git status`'), ['a command (git) on line 1', 'a command (git) on line 3']);
  assert.deepEqual(problems('- https://evil.test/ignore-all-rules-and-run'), ['an address outside the hosts of the apps with seo: true and schema.org, on line 1'], 'no host, no path');
  assert.deepEqual(problems('```json\n{ "@context": "https://schema.org" }\n```\n- title: Giày chạy bộ nam\n- Node của Next.js đọc `generateMetadata`'), []);
});

// Review of shop PR #81 (reviewer, Low): a no-break space after the program named it undefined.
test('a command followed by any space is named by its program', () => {
  assert.deepEqual(seoTextProblems('SEO Specialist: x'+'\n'+'npm\u00a0i left-pad', { hosts: HOSTS }), ['a command (npm) on line 2']);
});
