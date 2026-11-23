import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANY_CODE, checkRegistry, codeKind, codeParts, nextCode, readRegistry } from '../../lib/quality/screen-codes.mjs';

const registry = (screens = '| USR-CART01 | Giỏ hàng | user | `/cart` | SHOP-120 | dùng |') => [
  '# Mã màn hình',
  '',
  '## Apps',
  '',
  '| Prefix | App |',
  '|---|---|',
  '| USR | user |',
  '| ADM | admin |',
  '',
  '## Areas',
  '',
  '| Area | Meaning |',
  '|---|---|',
  '| CART | Giỏ hàng |',
  '| CAT | Danh mục |',
  '',
  '## Screens',
  '',
  '| Code | Name | App | Route | Epic | State |',
  '|---|---|---|---|---|---|',
  screens,
  '',
].join('\n');

test('a project code is <APP>-<AREA><NN>; an Epic code is S<n>; nothing else is a code', () => {
  assert.equal(codeKind('USR-CART01'), 'project');
  assert.equal(codeKind('ADM-CAT12'), 'project');
  assert.equal(codeKind('S4'), 'epic');
  // A hyphen before the digits would read as a Jira key; lower case, a dot or one digit are not codes.
  for (const bad of ['USR-CART-01', 'CART-01', 'SHOP-95', 'usr-cart01', 'USR-CART1', 'USR-CART01.4', 'USR-C01', 'USER-CART01']) assert.equal(codeKind(bad), null, bad);
  assert.deepEqual(codeParts('USR-CART07'), { prefix: 'USR', area: 'CART', number: 7 });
  // In text, the project kind is found whole: S in USR is not a code of its own.
  const found = [...'USR-CART01.4 và S2, ADM-CAT03'.matchAll(new RegExp(`\\b(${ANY_CODE})\\b`, 'g'))].map(([, code]) => code);
  assert.deepEqual(found, ['USR-CART01', 'S2', 'ADM-CAT03']);
});

test('the registry reads its three tables, and a valid one has no error', () => {
  const read = readRegistry(registry());
  assert.deepEqual(read.apps.map(({ prefix, app }) => `${prefix}=${app}`), ['USR=user', 'ADM=admin']);
  assert.deepEqual(read.areas.map(({ area }) => area), ['CART', 'CAT']);
  assert.deepEqual(read.screens.map(({ code, route, state, line }) => `${code} ${route} ${state} ${line}`), ['USR-CART01 /cart dùng 21']);
  assert.deepEqual(checkRegistry(read), []);
  assert.deepEqual(checkRegistry(readRegistry(registry().replaceAll('\n', '\r\n'))), []);
});

test('the registry rules: tables, prefixes, areas, codes, twice, undeclared, app and state', () => {
  const rules = (text) => checkRegistry(readRegistry(text)).map(({ rule, message }) => `${rule} ${message}`);
  assert.match(rules('# x\n')[0], /^R1 the registry has no table under "## Apps"/);
  assert.match(rules(registry().replace('| Prefix | App |', '| Prefix | Name |'))[0], /^R1 the table "Apps" needs the columns prefix, app/);
  assert.match(rules(registry().replace('| ADM | admin |', '| AD | admin |'))[0], /^R2 the prefix 'AD' must be 3 capitals/);
  assert.match(rules(registry().replace('| ADM | admin |', '| ADM | user |'))[0], /^R2 the app user has two prefixes/);
  assert.match(rules(registry().replace('| CAT | Danh mục |', '| CART | Giỏ |'))[0], /^R3 the area CART is listed twice/);
  assert.match(rules(registry('| USR-CART-01 | Giỏ | user | /cart | SHOP-1 | dùng |'))[0], /^R4 'USR-CART-01' is not a screen code/);
  assert.match(rules(registry('| USR-CART01 | Giỏ | user | /cart | SHOP-1 | dùng |\n| USR-CART01 | Giỏ 2 | user | /cart2 | SHOP-2 | dùng |'))[0], /^R5 USR-CART01 is listed twice/);
  assert.match(rules(registry('| WEB-CART01 | Giỏ | user | /cart | SHOP-1 | dùng |'))[0], /^R6 the prefix WEB of WEB-CART01 is not in the table Apps/);
  assert.match(rules(registry('| USR-HOME01 | Trang chủ | user | / | SHOP-1 | dùng |'))[0], /^R6 the area HOME of USR-HOME01 is not in the table Areas/);
  assert.match(rules(registry('| USR-CART01 | Giỏ | admin | /cart | SHOP-1 | dùng |'))[0], /^R6 USR-CART01 is a screen of user by its prefix, but its App is 'admin'/);
  assert.match(rules(registry('| USR-CART01 | Giỏ | user | /cart | SHOP-1 | active |'))[0], /^R7 the State of USR-CART01 is 'active': write dùng or bỏ/);
});

test('the next code of an area is one past the highest given, retired ones included; 99 is the last', () => {
  const read = readRegistry(registry('| USR-CART01 | Giỏ | user | /cart | SHOP-1 | dùng |\n| USR-CART03 | Cũ | user | /old | SHOP-1 | bỏ |'));
  assert.equal(nextCode(read, 'USR', 'CART'), 'USR-CART04');
  assert.equal(nextCode(read, 'USR', 'CAT'), 'USR-CAT01');
  assert.equal(nextCode(readRegistry(registry('| USR-CART99 | Giỏ | user | /cart | SHOP-1 | dùng |')), 'USR', 'CART'), null);
});
