import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { appCredentials, appJwt, installationToken } from '../../lib/quality/github-app.mjs';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const NOW = Date.UTC(2026, 9, 29, 1, 0, 0);
const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));

test('the App JWT is signed with RS256 by the App key and names the App', () => {
  const jwt = appJwt({ appId: 5514949, privateKey, now: NOW });
  const [header, payload, signature] = jwt.split('.');
  assert.deepEqual(decode(header), { alg: 'RS256', typ: 'JWT' });
  const verify = createVerify('RSA-SHA256').update(`${header}.${payload}`);
  assert.ok(verify.verify(publicKey, signature, 'base64url'));
  const claims = decode(payload);
  assert.equal(claims.iss, 5514949);
  // Issued a minute early for clock drift, and valid for less than the 10 minutes GitHub allows.
  assert.equal(claims.iat, NOW / 1000 - 60);
  assert.ok(claims.exp > NOW / 1000 && claims.exp - NOW / 1000 <= 600);
});

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: new URL(url), init });
    const { status = 200, body } = responses.shift();
    return new Response(JSON.stringify(body), { status });
  };
  return { fetch, calls };
}

test('an installation token is bought with the JWT, for the one repository only', async () => {
  const { fetch, calls } = fakeFetch([{ body: { id: 176282622 } }, { status: 201, body: { token: 'ghs_secret', expires_at: '2026-10-29T02:00:00Z' } }]);
  const result = await installationToken({ appId: 5514949, privateKey, repo: 'TungPH7/ao-pilot', fetch, now: NOW });
  assert.deepEqual(result, { token: 'ghs_secret', expiresAt: '2026-10-29T02:00:00Z' });

  const [find, buy] = calls;
  assert.equal(find.url.href, 'https://api.github.com/repos/TungPH7/ao-pilot/installation');
  assert.match(find.init.headers.Authorization, /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
  assert.equal(buy.url.href, 'https://api.github.com/app/installations/176282622/access_tokens');
  assert.equal(buy.init.method, 'POST');
  assert.deepEqual(JSON.parse(buy.init.body), { repositories: ['ao-pilot'] });
});

test('the token can be narrowed to fewer permissions than the App has', async () => {
  const { fetch, calls } = fakeFetch([{ body: { id: 1 } }, { status: 201, body: { token: 't', expires_at: 'x' } }]);
  await installationToken({ appId: 1, privateKey, repo: 'TungPH7/ao-pilot', permissions: { pull_requests: 'write' }, fetch, now: NOW });
  assert.deepEqual(JSON.parse(calls[1].init.body), { repositories: ['ao-pilot'], permissions: { pull_requests: 'write' } });
});

test('errors say what to check and never carry the JWT or the key', async () => {
  const notInstalled = fakeFetch([{ status: 404, body: { message: 'Not Found' } }]);
  await assert.rejects(
    installationToken({ appId: 1, privateKey, repo: 'TungPH7/ao-pilot', fetch: notInstalled.fetch, now: NOW }),
    (error) => /not installed on TungPH7\/ao-pilot/.test(error.message) && !error.message.includes('eyJ') && !error.message.includes('PRIVATE KEY'),
  );
  const badKey = fakeFetch([{ status: 401, body: { message: 'A JSON web token could not be decoded' } }]);
  await assert.rejects(
    installationToken({ appId: 1, privateKey, repo: 'TungPH7/ao-pilot', fetch: badKey.fetch, now: NOW }),
    /App ID and the private key/,
  );
});

test('the credentials of an App come from AO_<KIND>_APP_ID, AO_<KIND>_APP and the key or its file', () => {
  const env = { AO_DEV_APP_ID: '5514949', AO_DEV_APP: 'tungph7-ao-dev', AO_DEV_APP_KEY_FILE: 'C:/keys/dev.pem' };
  const readFile = (file) => (file === 'C:/keys/dev.pem' ? privateKey : assert.fail(`unexpected file ${file}`));
  assert.deepEqual(appCredentials('dev', { env, readFile, readUserVariable: () => assert.fail('no registry') }), {
    appId: 5514949,
    slug: 'tungph7-ao-dev',
    privateKey,
  });
  // In CI the key itself is in AO_DEV_APP_KEY.
  const ci = { AO_DEV_APP_ID: '5514949', AO_DEV_APP: 'tungph7-ao-dev', AO_DEV_APP_KEY: privateKey };
  assert.equal(appCredentials('dev', { env: ci, readFile: () => assert.fail('no file'), readUserVariable: () => undefined }).privateKey, privateKey);
});

test('a variable set after Claude Code started is read from the user environment, and a missing one is named', () => {
  const env = { AO_REVIEW_APP_ID: '5514961', AO_REVIEW_APP: 'tungph7-ao-review' };
  const readUserVariable = (name) => (name === 'AO_REVIEW_APP_KEY_FILE' ? 'C:/keys/review.pem' : undefined);
  assert.equal(appCredentials('review', { env, readFile: () => privateKey, readUserVariable }).privateKey, privateKey);

  assert.throws(() => appCredentials('review', { env: {}, readFile: () => privateKey, readUserVariable: () => undefined }), /AO_REVIEW_APP_ID/);
  assert.throws(
    () => appCredentials('review', { env, readFile: () => privateKey, readUserVariable: () => undefined }),
    /AO_REVIEW_APP_KEY or AO_REVIEW_APP_KEY_FILE/,
  );
  assert.throws(() => appCredentials('admin', { env }), /unknown App kind 'admin'/);
});
