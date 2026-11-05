// Creates the agents' GitHub Apps with GitHub's manifest flow (quality-gates spec section 2.2, docs/github-apps-setup.md).
// A local page sends each App's manifest to GitHub; you confirm on GitHub; GitHub returns a one-time code, which this
// script exchanges for the App's id, slug and private key. The key goes straight into a file and is never printed.
//
// node scripts/github-app-create.mjs --owner TungPH7 --repo ao-pilot [--apps dev,review|deploy] [--keys-dir <dir>] [--port 47100]
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { appManifest, installUrl, registrationPage } from '../lib/quality/app-manifest.mjs';
import { createGitHubClient, readGitHubToken } from '../lib/tracker/github-client.mjs';

const { values: args } = parseArgs({
  options: {
    owner: { type: 'string' },
    repo: { type: 'string' },
    apps: { type: 'string', default: 'dev,review' },
    'keys-dir': { type: 'string', default: join(homedir(), 'ao-keys') },
    port: { type: 'string', default: '47100' },
    'timeout-minutes': { type: 'string', default: '30' },
  },
});
if (!args.owner || !args.repo) {
  console.error('Usage: node scripts/github-app-create.mjs --owner <login> --repo <name> [--apps dev,review] [--keys-dir <dir>]');
  process.exit(2);
}

const baseUrl = `http://127.0.0.1:${args.port}`;
const state = randomBytes(16).toString('hex');
const apps = args.apps.split(',').map((kind) => ({ kind, manifest: appManifest(kind, { owner: args.owner, baseUrl }) }));
const ids = await repositoryIds(`${args.owner}/${args.repo}`);

// With the ids GitHub preselects the account and the repository on the install page; without them you pick both.
async function repositoryIds(repo) {
  try {
    const github = createGitHubClient({ repo, token: readGitHubToken() });
    const { id, owner } = await github.get('');
    return { ownerId: owner.id, repoId: id };
  } catch {
    return undefined;
  }
}

// The code is a one-time secret: it is never logged. The response also holds a client secret, which is dropped.
async function convert(code) {
  const res = await fetch(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`, {
    method: 'POST',
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ai-orchestrator' },
  });
  if (!res.ok) throw new Error(`GitHub refused the App code (${res.status}); start again from the local page`);
  const { id, slug, pem } = await res.json();
  return { id, slug, pem };
}

// The key file must not exist yet, so a second run never overwrites a key in use.
function saveKey(slug, pem) {
  mkdirSync(args['keys-dir'], { recursive: true });
  const file = join(args['keys-dir'], `${slug}.pem`);
  writeFileSync(file, pem, { flag: 'wx', mode: 0o600 });
  return file;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}

const page = () => registrationPage({ owner: args.owner, repo: args.repo, state, apps, ids });
const finished = () => apps.every(({ installed }) => installed);

const server = createServer(async (req, res) => {
  const url = new URL(req.url, baseUrl);
  const [, step, kind] = url.pathname.split('/');
  const app = apps.find((a) => a.kind === kind);
  try {
    if (url.pathname === '/') return send(res, 200, page());
    if (step === 'created' && app) {
      if (url.searchParams.get('state') !== state) return send(res, 400, 'Sai state: hãy bắt đầu lại từ trang của script.');
      if (!app.created) {
        const { id, slug, pem } = await convert(url.searchParams.get('code') ?? '');
        app.created = { id, slug, keyFile: saveKey(slug, pem) };
        console.log(`created ${kind}: slug=${slug} id=${id} key=${app.created.keyFile}`);
      }
      return send(res, 302, '', { Location: installUrl(app.created.slug, ids) });
    }
    if (step === 'installed' && app?.created) {
      app.installed = true;
      console.log(`installed ${kind}: slug=${app.created.slug} installation=${url.searchParams.get('installation_id') ?? 'unknown'}`);
      send(res, 302, '', { Location: '/' });
      if (finished()) setTimeout(() => server.close(() => process.exit(0)), 1000);
      return;
    }
    return send(res, 404, 'Không có trang này.');
  } catch (error) {
    console.error(`error at ${url.pathname}: ${error.message}`);
    return send(res, 500, `Lỗi: ${error.message}`);
  }
});

server.listen(Number(args.port), '127.0.0.1', () => console.log(`open ${baseUrl}/`));
setTimeout(() => {
  console.error(`timed out: ${apps.filter((a) => !a.installed).map((a) => a.kind).join(', ')} not finished`);
  process.exit(1);
}, Number(args['timeout-minutes']) * 60_000).unref();
