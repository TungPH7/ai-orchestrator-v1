import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readGates } from '../../lib/quality/gates.mjs';
import { deltaEffort, fullEffort, pathTier, requiredReviewRoles, withProjectPaths } from '../../lib/quality/review-tiers.mjs';
import { ROOT } from '../helpers/kit.mjs';

const gates = readGates(join(ROOT, 'quality'));
const tier = (...files) => pathTier(files, gates).tier;
const ROLES = ['reviewer', 'security'];

test('the tier of a PR is the highest its files touch (C1 spec 3.2)', () => {
  assert.equal(tier('apps/web/src/components/cart-row.tsx', 'apps/web/messages/vi.json'), 'normal');
  assert.equal(tier('apps/api/src/cart/cart.controller.ts', 'apps/web/src/app/page.tsx'), 'sensitive');
  assert.equal(tier('apps/api/src/cart/cart.service.ts'), 'sensitive', 'services are sensitive now: security runs at high, as every PR did before C1');
  assert.equal(tier('apps/web/src/app/page.tsx', 'apps/api/src/auth/jwt.strategy.ts'), 'critical');
  assert.equal(pathTier(['apps/api/src/cart/cart.controller.ts', 'apps/web/src/a.tsx'], gates).paths.join(), 'apps/api/src/cart/cart.controller.ts', 'paths: those of the top tier');
});

test('the Java paths that decide who calls the API, what it reads and how it is built', () => {
  const critical = [
    'apps/api/.mvn/wrapper/maven-wrapper.properties',
    'apps/api/mvnw',
    'apps/api/src/main/java/com/acme/common/security/SecurityConfig.java',
    'apps/api/src/main/java/com/acme/auth/AuthService.java',
    'apps/api/src/main/resources/db/migration/V4__orders.sql',
  ];
  const sensitive = [
    'apps/api/pom.xml',
    'apps/api/src/main/resources/application-prod.yml',
    'apps/api/src/main/java/com/acme/order/controller/OrderController.java',
    'apps/api/src/main/java/com/acme/common/logging/CorrelationIdFilter.java',
    'apps/api/src/main/java/com/acme/order/repository/OrderRepository.java',
    'apps/api/src/main/java/com/acme/order/dto/CreateOrderRequest.java',
    'apps/api/src/main/java/com/acme/order/domain/Order.java',
    'apps/api/src/main/java/com/acme/order/service/OrderService.java',
  ];
  for (const file of critical) assert.equal(tier(file), 'critical', file);
  for (const file of sensitive) assert.equal(tier(file), 'sensitive', file);
  assert.equal(tier('apps/api/src/test/java/com/acme/order/OrderMapperTest.java'), 'normal');
});

test('the protected paths are critical, in any case, and a kit copy is critical', () => {
  for (const file of ['.github/workflows/ci.yml', '.Claude/rules/x.md', '.ai-orchestrator/lib/workflow/steps.mjs', '.githooks/pre-commit', '.mcp.json']) assert.equal(tier(file), 'critical', file);
});

test('a PR of docs only is docs, unless a file is critical: the instructions of the agents are Markdown too', () => {
  assert.equal(tier('docs/user-guide/cart.md', 'README.md'), 'docs');
  assert.equal(tier('apps/api/src/dto/README.md'), 'docs', 'a Markdown file in a sensitive folder is still docs');
  assert.equal(tier('docs/user-guide/cart.md', 'apps/web/src/a.tsx'), 'normal');
  assert.equal(tier('docs/guide.md', '.claude/rules/ai-orchestrator.md'), 'critical');
  assert.equal(tier('docs/guide.md', 'docs/auth/login.md'), 'critical', 'a critical glob wins even on a doc');
  // Review of shop PR #79: what steers an agent outside .claude/ is no doc either, at the root or in an app, in any case.
  // Windows finds AGENTS.md under the name agents.md, so docs/agents.md is one too.
  const steering = ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'apps/user/AGENTS.md', 'apps/api/CLAUDE.md', 'apps/admin/claude.local.md', 'docs/agents.md'];
  // A .claude folder, a plugin or an MCP config in an app is loaded as the root's are.
  steering.push('apps/user/.claude/rules/x.md', 'apps/user/.Claude/settings.json', 'apps/api/.mcp.json', 'apps/user/.claude-plugin/plugin.json', 'apps/user/.gitattributes');
  for (const file of steering) assert.equal(tier(file), 'critical', file);
  assert.equal(tier('docs/agents-guide.md'), 'docs', 'another name that only looks alike');
  assert.equal(tier('docs/claude/notes.md'), 'docs', 'a folder named claude, without the dot');
});

// Review of shop PR #79: security does not run on a normal PR, and these files of shop were normal.
test('the security files of an app are sensitive: headers, browser env, proxy, lint rules, API client, login, errors', () => {
  const files = [
    'apps/user/src/config/security-headers.ts',
    'apps/user/src/config/env/client.ts',
    'apps/admin/src/config/env.ts',
    'apps/admin/Caddyfile',
    'apps/admin/eslint.config.js',
    'apps/user/eslint.config.mjs',
    'apps/web/.eslintrc.json',
    'apps/admin/src/lib/api/api-client.ts',
    'apps/admin/src/app/routes/login/login-route.tsx',
    'apps/user/src/app/[locale]/login/page.tsx',
    'apps/user/src/app/[locale]/signup/page.tsx',
    'apps/api/src/main/java/com/acme/common/error/GlobalExceptionHandler.java',
    'apps/api/src/main/java/com/acme/common/config/CurrentAuditorProvider.java',
  ];
  for (const file of files) assert.equal(tier(file), 'sensitive', file);
});

test('a project adds paths of its own to a tier in its project.yaml, and takes none away', () => {
  const own = withProjectPaths(gates, { review: { critical_paths: ['apps/api/src/main/java/**/payment/**'], sensitive_paths: ['apps/web/src/lib/fetcher.ts'] } });
  assert.equal(pathTier(['apps/web/src/lib/fetcher.ts'], own).tier, 'sensitive');
  assert.equal(pathTier(['apps/api/src/main/java/com/acme/payment/Charge.java'], own).tier, 'critical');
  assert.equal(pathTier(['apps/web/src/lib/fetcher.ts'], gates).tier, 'normal', 'the lists of the kit stay as they were');
  assert.equal(own.review.waivers, gates.review.waivers);
  assert.equal(withProjectPaths(gates, {}), gates);
  assert.equal(withProjectPaths(gates, null), gates);
});

test('a renamed file counts by both names: moved out of a critical path, it is still critical', () => {
  const files = [{ filename: 'apps/api/src/users/login.ts', previous_filename: 'apps/api/src/auth/login.ts' }];
  assert.equal(pathTier(files, gates).tier, 'critical');
  assert.equal(pathTier([{ filename: 'apps/web/src/a.tsx' }], gates).tier, 'normal');
});

test('a PR with no file, or one GitHub listed only in part, is critical', () => {
  assert.equal(pathTier([], gates).tier, 'critical');
  assert.equal(pathTier(['docs/a.md'], gates, { truncated: true }).tier, 'critical');
});

test('the efforts by tier (C1 spec 3.1): security at max only on a critical PR, not at all on a normal one', () => {
  const table = ['docs', 'normal', 'sensitive', 'critical'].map((t) => `${t}: reviewer ${fullEffort('reviewer', t, 'high')}, security ${fullEffort('security', t, 'max')}`);
  assert.deepEqual(table, ['docs: reviewer high, security null', 'normal: reviewer high, security null', 'sensitive: reviewer high, security high', 'critical: reviewer xhigh, security max']);
  assert.deepEqual([deltaEffort('security', 'sensitive', 'max'), deltaEffort('reviewer', 'normal', 'high'), deltaEffort('security', 'critical', 'max'), deltaEffort('reviewer', 'critical', 'high')], ['high', 'high', 'max', 'xhigh']);
  assert.throws(() => fullEffort('qa', 'normal', 'high'), /no review effort for qa/);
});

test('the reports the merge needs: security by the tier, and always once it has reported on the PR', () => {
  assert.deepEqual(requiredReviewRoles({ roles: ROLES, tier: 'normal' }), ['reviewer']);
  assert.deepEqual(requiredReviewRoles({ roles: ROLES, tier: 'docs' }), ['reviewer']);
  assert.deepEqual(requiredReviewRoles({ roles: ROLES, tier: 'sensitive' }), ROLES);
  assert.deepEqual(requiredReviewRoles({ roles: ROLES, tier: 'critical' }), ROLES);
  assert.deepEqual(requiredReviewRoles({ roles: ROLES, tier: 'normal', reported: ['security'] }), ROLES, 'undoing the controller change does not drop the High security found in a component');
});
