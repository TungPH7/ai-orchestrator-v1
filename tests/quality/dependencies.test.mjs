import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { addApproved, newestStable, npmFacts, osvIds, parseSpec, pomLicenses, pomParent } from '../../lib/quality/dep-check.mjs';
import { addedDependencies, auditRule, depVerdict, isApproved, licenseAllowed, ownPackages, packageJsonDependencies, planLibraries, pomDependencies, projectDependencies, unapprovedDependencies, workspaceCatalogs } from '../../lib/quality/dependencies.mjs';
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
    { path: 'apps/api/pom.xml', before: POM([]), after: POM(['org.mapstruct:mapstruct']) },
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

// Second review of shop PR #79, Medium: catalog: was taken for the project's own packages, though its version is in
// pnpm-workspace.yaml, where the policy job read neither the catalogs nor the overrides.
test('the policy job reads catalog: from pnpm-workspace.yaml, and checks its catalogs and overrides', () => {
  const workspace = 'packages:\n  - apps/*\ncatalog:\n  zod: ^4.7.0\n  left-pad: ^1.3.0\ncatalogs:\n  next:\n    zod: ^5.0.0\n  bad:\n    zod: npm:evil@1\n';
  const catalogs = workspaceCatalogs(workspace);
  const change = (after) => unapprovedDependencies([{ path: 'apps/web/package.json', before: '{"dependencies":{}}', after }], APPROVED, [], { catalogs });
  assert.match(change('{"dependencies":{"left-pad":"catalog:"}}')[0], /left-pad \(npm\) is new and not on dependencies\.approved/);
  assert.match(change('{"dependencies":{"zod":"catalog:next"}}')[0], /zod asks for catalog:next \(\^5\.0\.0 in pnpm-workspace\.yaml\), outside \^4\.6\.6/);
  assert.match(change('{"dependencies":{"zod":"catalog:bad"}}')[0], /zod points to catalog:bad \(npm:evil@1 in pnpm-workspace\.yaml\), which is no version of the registry/);
  assert.match(change('{"dependencies":{"zod":"catalog:none"}}')[0], /zod asks for catalog:none, which pnpm-workspace\.yaml has no entry for/);
  assert.deepEqual(change('{"dependencies":{"zod":"catalog:","@shop/ui":"workspace:*"}}'), []);

  const yaml = (before, after) => unapprovedDependencies([{ path: 'pnpm-workspace.yaml', before, after }], APPROVED);
  const base = 'packages:\n  - apps/*\ncatalog:\n  react: ^19.0.0\noverrides:\n  playwright-core: 1.61.1\n';
  assert.match(yaml(base, `${base.replace('catalog:\n', 'catalog:\n  left-pad: ^1.3.0\n')}`)[0], /^pnpm-workspace\.yaml: left-pad \(npm\) is new and not on dependencies\.approved/);
  assert.match(yaml(base, `${base}catalogs:\n  next:\n    zod: ^5.0.0\n`)[0], /^pnpm-workspace\.yaml: zod asks for \^5\.0\.0, outside \^4\.6\.6/);
  assert.match(yaml(base, base.replace('playwright-core: 1.61.1', 'playwright-core: npm:evil@1'))[0], /^pnpm-workspace\.yaml: playwright-core points to npm:evil@1, which is no version of the registry/);
  assert.match(yaml(base, `${base}  react>scheduler: github:x/y\n`)[0], /react>scheduler points to github:x\/y/);
  assert.deepEqual(yaml(base, base.replace('react: ^19.0.0', 'react: ^19.1.0')), [], 'a new version of a catalog entry already there');
  assert.deepEqual(yaml(base, `${base.replace('catalog:\n', 'catalog:\n  zod: ^4.7.0\n')}`), [], 'an approved library inside its range');
  assert.match(yaml(base, 'packages: [')[0], /^pnpm-workspace\.yaml is no YAML after this change/);
});

// Second review of shop PR #79, Medium: the policy job took the name of any package.json in the repo for the project's
// own, so a package.json an agent added under any name let that name in from the registry. With pnpm, the project's
// packages come in by workspace: alone; with npm, by name, and only those inside the workspaces of the root package.json.
test('the project\'s own packages: none with pnpm, and only those inside the workspaces of npm', () => {
  const manifests = [{ path: 'package.json', name: 'shop' }, { path: 'apps/ui/package.json', name: '@shop/ui' }, { path: 'tools/x/package.json', name: 'left-pad' }, { path: 'apps/web/sub/package.json', name: 'deep' }];
  assert.deepEqual(ownPackages({ manager: 'pnpm', packageJson: { workspaces: ['apps/*'] }, manifests }), []);
  assert.deepEqual(ownPackages({ manager: 'npm', packageJson: { workspaces: ['apps/*'] }, manifests }), ['@shop/ui']);
  assert.deepEqual(ownPackages({ manager: 'npm', packageJson: { workspaces: { packages: ['tools/*/'] } }, manifests }), ['left-pad']);
  assert.deepEqual(ownPackages({ manager: 'npm', packageJson: {}, manifests }), []);
});

// Second review of shop PR #79, Medium: the check read only a <dependency> written exactly so. A new plugin, a build
// extension, a parent or a repository, and a <dependency > with a space, all went past gh-guard and the policy job.
test('a pom.xml: every dependency, plugin, extension and parent, however the tag is written, and no new repository', () => {
  const pom = (inner) => `<project><groupId>com.shop</groupId><properties><lib.group>com.acme</lib.group></properties>${inner}</project>`;
  const change = (before, after) => unapprovedDependencies([{ path: 'apps/api/pom.xml', before: pom(before), after: pom(after) }], APPROVED);
  const names = (after) => change('', after).map((line) => /: (\S+) \(maven\) is new/.exec(line)?.[1] ?? line);
  assert.deepEqual(names('<dependencies><dependency >\n <groupId>com.acme</groupId><artifactId>evil</artifactId></dependency ></dependencies>'), ['com.acme:evil']);
  assert.deepEqual(names('<dependencies><dependency xmlns="x"><artifactId>evil</artifactId><groupId>com.acme</groupId></dependency></dependencies>'), ['com.acme:evil'], 'attributes, and the artifactId first');
  assert.deepEqual(names('<build><plugins><plugin><artifactId>evil-maven-plugin</artifactId></plugin></plugins></build>'), ['org.apache.maven.plugins:evil-maven-plugin'], 'a plugin, with the default group');
  assert.deepEqual(names('<build><plugins><plugin><dependencies><dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId></dependency></dependencies><groupId>com.acme</groupId><artifactId>p</artifactId></plugin></plugins></build>'), ['com.acme:p'], 'the coordinates of the plugin, not of its dependency');
  assert.deepEqual(names('<build><extensions><extension><groupId>com.acme</groupId><artifactId>ext</artifactId></extension></extensions></build>'), ['com.acme:ext'], 'a build extension');
  assert.deepEqual(names('<parent><groupId>com.acme</groupId><artifactId>parent</artifactId><version>1</version></parent>'), ['com.acme:parent'], 'a parent');
  assert.deepEqual(names('<build><plugins><plugin><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><configuration><annotationProcessorPaths><path><groupId>com.acme</groupId><artifactId>processor</artifactId></path></annotationProcessorPaths></configuration></plugin></plugins></build>'), ['com.acme:processor'], 'an annotation processor of the compiler');
  assert.deepEqual(names('<dependencies><dependency><groupId>${lib.group}</groupId><artifactId>evil</artifactId></dependency></dependencies>'), ['com.acme:evil'], 'a property of the pom');
  assert.match(change('', '<dependencies><dependency><groupId>${nowhere}</groupId><artifactId>evil</artifactId></dependency></dependencies>')[0], /apps\/api\/pom\.xml: \$\{nowhere\}:evil takes a property this pom\.xml does not set, so it cannot be checked/);
  assert.deepEqual(names('<dependencies><dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId><exclusions><exclusion><groupId>com.acme</groupId><artifactId>x</artifactId></exclusion></exclusions></dependency></dependencies>'), [], 'an approved one with an exclusion');
  assert.deepEqual(names('<dependencies><dependency><groupId>${project.groupId}</groupId><artifactId>shared</artifactId></dependency></dependencies>'), ['com.shop:shared'], 'the group of the project, by its property');
  for (const tag of ['repositories><repository', 'pluginRepositories><pluginRepository']) {
    const [outer, inner] = tag.split('><');
    assert.match(change('', `<${outer}><${inner}><id>x</id><url>https://repo.evil.test/maven</url></${inner}></${outer}>`)[0], /apps\/api\/pom\.xml adds the repository https:\/\/repo\.evil\.test\/maven: libraries come only from Maven Central/, tag);
  }
  const kept = '<repositories><repository><id>x</id><url>https://repo.example.test/</url></repository></repositories>';
  assert.deepEqual(change(kept, `${kept}<dependencies><dependency><groupId>org.mapstruct</groupId><artifactId>mapstruct</artifactId></dependency></dependencies>`), [], 'a repository already there');
});
