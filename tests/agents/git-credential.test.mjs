import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { credentialAnswer, credentialPlan, parseCredentialRequest } from '../../lib/agents/git-credential.mjs';
import { readRoster } from '../../lib/agents/roster.mjs';
import { readGates } from '../../lib/quality/gates.mjs';
import { ROOT } from '../helpers/kit.mjs';

const roster = readRoster(join(ROOT, 'agents'));
const gates = readGates(join(ROOT, 'quality'));
const REPO = 'TungPH7/ao-pilot';
// What git writes on the helper's stdin for a push to the project, with credential.useHttpPath.
const PUSH = 'protocol=https\nhost=github.com\npath=TungPH7/ao-pilot.git\n';
const plan = (role, { action = 'get', input = PUSH } = {}) => credentialPlan({ action, request: parseCredentialRequest(input), role, repo: REPO, roster, gates });

test('git\'s request is read as key=value lines, and a value keeps its = signs', () => {
  assert.deepEqual(parseCredentialRequest('protocol=https\r\nhost=github.com\npath=a/b.git\nwwwauth[]=Basic realm="x=y"\n\n'), {
    protocol: 'https',
    host: 'github.com',
    path: 'a/b.git',
    'wwwauth[]': 'Basic realm="x=y"',
  });
});

test('a role with git write gets a token of ao-dev with contents: write; devops also gets workflows (dev-workflow spec 2.3)', () => {
  for (const role of ['ba', 'ux', 'sa', 'fe-dev', 'be-dev']) {
    assert.deepEqual(plan(role), { kind: 'dev', permissions: { contents: 'write' } }, role);
  }
  assert.deepEqual(plan('devops'), { kind: 'dev', permissions: { contents: 'write', workflows: 'write' } });
});

test('a read-only role gets a token of ao-review that only reads, so it can fetch but not push', () => {
  for (const role of ['pm', 'reviewer', 'security', 'qa']) {
    assert.deepEqual(plan(role), { kind: 'review', permissions: { contents: 'read' } }, role);
  }
});

test('another repository, another host, plain http or no path gets nothing, with the reason', () => {
  const cases = [
    ['protocol=https\nhost=github.com\npath=TungPH7/ai-orchestrator-v1.git\n', /only on TungPH7\/ao-pilot, not TungPH7\/ai-orchestrator-v1/],
    ['protocol=https\nhost=gitlab.com\npath=TungPH7/ao-pilot.git\n', /only for https:\/\/github\.com/],
    ['protocol=http\nhost=github.com\npath=TungPH7/ao-pilot.git\n', /only for https:\/\/github\.com/],
    ['protocol=https\nhost=github.com\n', /credential\.useHttpPath/],
  ];
  for (const [input, reason] of cases) {
    const result = plan('fe-dev', { input });
    assert.equal(result.kind, undefined, input);
    assert.match(result.reason, reason, input);
  }
  assert.equal(plan('fe-dev', { input: 'protocol=https\nhost=github.com\npath=tungph7/AO-PILOT\n' }).kind, 'dev', 'GitHub names ignore letter case, and .git is optional');
});

test('an unknown role gets nothing; store and erase are ignored without a word', () => {
  assert.match(plan('qa-lead').reason, /qa-lead is not a role of agents\/roster\.yaml/);
  assert.deepEqual(plan('fe-dev', { action: 'store', input: `${PUSH}username=x-access-token\npassword=ghs_x\n` }), {});
  assert.deepEqual(plan('fe-dev', { action: 'erase' }), {});
});

test('the answer names the token as the password of x-access-token', () => {
  assert.equal(credentialAnswer('ghs_abc'), 'username=x-access-token\npassword=ghs_abc\n');
  assert.throws(() => credentialAnswer('ghs_a\nhost=evil'), /token/);
});

// The script, as git runs it: `<helper> <action>` with the request on stdin. These cases stop before any token is bought.
const HELPER = join(ROOT, 'scripts', 'ao-git-credential.mjs');
const runHelper = (args, input) => spawnSync(process.execPath, [HELPER, ...args], { input, encoding: 'utf8', env: { ...process.env, AO_DEV_APP_ID: '', AO_REVIEW_APP_ID: '' } });

test('ao-git-credential.mjs prints nothing on stdout when it gives no token, and says why on stderr', () => {
  const other = runHelper(['fe-dev', REPO, 'get'], 'protocol=https\nhost=github.com\npath=someone/else.git\n');
  assert.equal(other.status, 0);
  assert.equal(other.stdout, '');
  assert.match(other.stderr, /^ao-git-credential: agents get a token only on TungPH7\/ao-pilot, not someone\/else/);

  const store = runHelper(['fe-dev', REPO, 'store'], `${PUSH}username=x-access-token\npassword=ghs_x\n`);
  assert.deepEqual([store.status, store.stdout, store.stderr], [0, '', '']);

  const usage = runHelper(['fe-dev'], PUSH);
  assert.equal(usage.status, 0);
  assert.equal(usage.stdout, '');
  assert.match(usage.stderr, /usage/);
});
