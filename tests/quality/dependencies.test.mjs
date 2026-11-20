import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { addApproved, newestStable, npmFacts, osvIds, parseSpec, pomLicenses, pomParent } from '../../lib/quality/dep-check.mjs';
import { addedDependencies, auditRule, depVerdict, isApproved, licenseAllowed, packageJsonDependencies, planLibraries, pomDependencies, projectDependencies, unapprovedDependencies } from '../../lib/quality/dependencies.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const APPROVED = [{ ecosystem: 'npm', name: 'zod', range: '^4.6.6', by: 'plan SHOP-7', on: '2026-11-20' }, { ecosystem: 'maven', name: 'org.mapstruct:mapstruct', range: '1.6.3', by: 'dep-check', on: '2026-11-20' }];
const POM = (deps) => `<project><dependencies>${deps.map((d) => `<dependency><groupId>${d.split(':')[0]}</groupId><artifactId>${d.split(':')[1]}</artifactId></dependency>`).join('')}</dependencies></project>`;

test('the audit rule takes the project exceptions too: a kit copy no longer wipes them (C1 spec section 5)', () => {
  const exception = { advisory: 'GHSA-2222-3333-4444', reason: 'picomatch, dev only', expires: '2026-12-31' };
  assert.deepEqual(auditRule(gates, { dependencies: { exceptions: [exception] } }).exceptions, [...gates.dependencies.exceptions, exception]);
  assert.deepEqual(projectDependencies(null), { approved: [], exceptions: [] });
});

test('approved: npm by name in any case, Maven by groupId:artifactId', () => {
  assert.ok(isApproved(APPROVED, 'npm', 'Zod'));
  assert.ok(isApproved(APPROVED, 'maven', 'org.mapstruct:mapstruct'));
  assert.ok(!isApproved(APPROVED, 'maven', 'org.mapstruct:mapstruct-processor'));
  assert.ok(!isApproved(APPROVED, 'npm', 'org.mapstruct:mapstruct'), 'the ecosystem counts');
});

test('the dependencies a package.json or a pom.xml names, and those a change adds', () => {
  assert.deepEqual(packageJsonDependencies('{"dependencies":{"zod":"^4"},"devDependencies":{"vitest":"^3"}}'), ['vitest', 'zod']);
  assert.deepEqual(packageJsonDependencies('not json'), []);
  assert.deepEqual(pomDependencies(`${POM(['org.mapstruct:mapstruct'])}<!-- <dependency><groupId>x</groupId><artifactId>y</artifactId></dependency> -->`), ['org.mapstruct:mapstruct']);
  const before = '{"dependencies":{"zod":"^3"}}';
  assert.deepEqual(addedDependencies({ path: 'apps/web/package.json', before, after: '{"dependencies":{"zod":"^4","lodash":"^4"}}' }), [{ ecosystem: 'npm', name: 'lodash' }], 'a new version of zod is not new');
  assert.deepEqual(addedDependencies({ path: 'apps/api/pom.xml', before: POM(['a:b']), after: POM(['a:b', 'c:d']) }), [{ ecosystem: 'maven', name: 'c:d' }]);
  assert.deepEqual(addedDependencies({ path: 'README.md', before: '', after: 'x' }), []);
});

test('the policy job fails on a new direct dependency not approved, and passes an approved one or the project\'s own package', () => {
  const changes = [
    { path: 'apps/web/package.json', before: '{"dependencies":{}}', after: '{"dependencies":{"zod":"^4.6.6","left-pad":"^1","@shop/ui":"*"}}' },
    { path: 'apps/api/pom.xml', before: POM([]), after: POM(['org.mapstruct:mapstruct', 'com.acme:${lib}']) },
  ];
  const problems = unapprovedDependencies(changes, APPROVED, ['@shop/ui']);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /^apps\/web\/package\.json: left-pad \(npm\) is new and not on dependencies\.approved of project\.yaml: run node \.ai-orchestrator\/scripts\/dep-check\.mjs npm left-pad@<version> first$/);
});

test('the verdict of dep-check: a library passes only when every check was read and none fails', () => {
  const good = { vulnerabilities: [], license: 'MIT', published: '2026-09-01T00:00:00Z', downloads: 50000, maintainers: 3, installScripts: [], provenance: true, errors: [] };
  const opts = { licenses: gates.dependencies.licenses, today: '2026-11-20' };
  assert.deepEqual(depVerdict(good, opts), { ok: true, problems: [], notes: [] });
  const bad = { ...good, vulnerabilities: ['GHSA-mrhx-c7xc-m3w5'], license: 'WTFPL', published: '2026-11-15T00:00:00Z', downloads: 12, installScripts: ['postinstall'], errors: ['the downloads of last week'] };
  assert.deepEqual(depVerdict(bad, opts).problems, [
    'could not read the downloads of last week',
    'known vulnerabilities: GHSA-mrhx-c7xc-m3w5',
    'license WTFPL is not on dependencies.licenses of quality/gates.yaml',
    'published 5 days ago, less than 14',
    '12 downloads last week, fewer than 1000',
    'runs scripts at install: postinstall',
  ]);
  assert.deepEqual(depVerdict({ ...good, maintainers: 1, provenance: false }, opts).notes, ['one maintainer', 'no npm provenance']);
  assert.ok(licenseAllowed('(MIT OR GPL-3.0)', gates.dependencies.licenses));
  assert.ok(!licenseAllowed('MIT AND GPL-3.0', gates.dependencies.licenses));
});

test('what dep-check reads in the answers of the registries', () => {
  assert.deepEqual(parseSpec('npm', '@nestjs/core@11.0.0'), { name: '@nestjs/core', version: '11.0.0' });
  assert.deepEqual(parseSpec('maven', 'org.mapstruct:mapstruct@1.6.3'), { name: 'org.mapstruct:mapstruct', version: '1.6.3' });
  assert.throws(() => parseSpec('npm', 'zod@^4'), /give an exact one/);
  assert.throws(() => parseSpec('maven', 'mapstruct@1.6.3'), /groupId:artifactId/);
  const doc = { 'dist-tags': { latest: '2.0.0' }, time: { '2.0.0': '2026-10-01T00:00:00Z' }, versions: { '2.0.0': { license: 'MIT', maintainers: [{}, {}], scripts: { postinstall: 'x', test: 'y' }, dist: { attestations: { provenance: {} } } } } };
  assert.deepEqual(npmFacts(doc, null), { version: '2.0.0', license: 'MIT', published: '2026-10-01T00:00:00Z', maintainers: 2, installScripts: ['postinstall'], provenance: true, errors: [] });
  assert.deepEqual(npmFacts(doc, '9.9.9').errors, ['version 9.9.9 of the npm registry']);
  assert.deepEqual(pomLicenses('<licenses><license><name>The Apache Software License, Version 2.0</name></license></licenses>'), ['Apache-2.0']);
  assert.deepEqual(pomParent('<parent><groupId>g</groupId><artifactId>a</artifactId><version>1</version></parent>'), { groupId: 'g', artifactId: 'a', version: '1' });
  assert.deepEqual(osvIds({ vulns: [{ id: 'GHSA-b' }, { id: 'GHSA-a' }] }), ['GHSA-a', 'GHSA-b']);
  assert.equal(newestStable('<version>1.6.3</version><version>1.7.0.Beta2</version><version>2.0.0-M1</version>'), '1.6.3');
});

test('dep-check adds its line to project.yaml and keeps the rest, comments included; the same library is replaced', () => {
  const text = 'name: shop\n# the libraries\ndependencies:\n  exceptions: []\n';
  const once = addApproved(text, { ecosystem: 'npm', name: 'zod', range: '^4.6.6', by: 'dep-check', on: '2026-11-20' });
  assert.match(once, /# the libraries/);
  assert.match(once, /^ {4}- \{ ecosystem: npm, name: zod, range: \^4\.6\.6, by: dep-check, on: 2026-11-20 \}$/m);
  const twice = addApproved(once, { ecosystem: 'npm', name: 'zod', range: '^4.7.0', by: 'dep-check', on: '2026-11-21' });
  assert.equal((twice.match(/name: zod/g) ?? []).length, 1);
  assert.match(twice, /range: \^4\.7\.0/);
});

test('the new libraries of a plan: one line each of its New Libraries section, in or out of code marks', () => {
  const plan = '## Task List\n\n- x\n\n## New Libraries\n\n<!-- guidance -->\n- npm argon2@0.44.0: băm mật khẩu\n- `maven org.mapstruct:mapstruct@1.6.3`: map DTO\n- một dòng khác\n\n## Risks and Mitigations\n\n- npm left-pad@1.3.0: not in the section\n';
  assert.deepEqual(planLibraries(plan), [{ ecosystem: 'npm', spec: 'argon2@0.44.0', why: 'băm mật khẩu' }, { ecosystem: 'maven', spec: 'org.mapstruct:mapstruct@1.6.3', why: 'map DTO' }]);
  assert.deepEqual(planLibraries('## New Libraries\n\nKhông có.\n'), []);
  assert.deepEqual(planLibraries(null), []);
});

// Review of shop PR #79: a name on the list is no pass for another source, or for a version outside its range.
test('the policy job: a dependency pointed away from the registry, or an approved one outside its range', () => {
  const change = (before, after) => unapprovedDependencies([{ path: 'apps/web/package.json', before, after }], APPROVED, ['@shop/ui']);
  assert.match(change('{"dependencies":{"zod":"^4.6.6"}}', '{"dependencies":{"zod":"npm:evil-pkg@1.0.0"}}')[0], /^apps\/web\/package\.json: zod points to npm:evil-pkg@1\.0\.0, which is no version of the registry/);
  for (const spec of ['github:x/y', 'git+https://github.com/x/y.git', 'git://x.test/y', 'https://x.test/z.tgz', 'file:../z', 'link:../z', 'x/y', '../vendor/z']) {
    assert.equal(change('{"dependencies":{"zod":"^4.6.6"}}', `{"devDependencies":{"zod":"${spec}"}}`).length, 1, spec);
  }
  assert.equal(change('{}', '{"overrides":{"react":"npm:evil@1"}}').length, 1, 'an override');
  assert.equal(change('{}', '{"overrides":{"react":{"scheduler":"github:x/y"}}}').length, 1, 'a nested override of npm');
  assert.equal(change('{}', '{"pnpm":{"overrides":{"react>scheduler":"file:../x"}}}').length, 1, 'an override of pnpm');
  assert.equal(change('{}', '{"resolutions":{"react":"link:../x"}}').length, 1, 'a resolution of yarn');
  assert.match(change('{}', '{"dependencies":{"zod":"^5.0.0"}}')[0], /zod asks for \^5\.0\.0, outside \^4\.6\.6, the range dep-check approved/);
  assert.match(change('{}', '{"dependencies":{"zod":"latest"}}')[0], /zod asks for latest, which cannot be checked against \^4\.6\.6/);
  assert.deepEqual(change('{}', '{"dependencies":{"zod":"^4.7.0","@shop/ui":"workspace:*"}}'), []);
  assert.deepEqual(change('{"dependencies":{"react":"^19.0.0"}}', '{"dependencies":{"react":"^19.1.0"}}'), [], 'a new version of one already there');
  assert.deepEqual(change('{"dependencies":{"x":"file:../x"}}', '{"dependencies":{"x":"file:../x"}}'), [], 'a source already there is not new');
  assert.match(change('{}', '{"dependencies":')[0], /^apps\/web\/package\.json is no JSON/, 'a package.json that cannot be read');
  assert.deepEqual(change('{"dependencies":{}}', ''), [], 'a package.json deleted');
});
