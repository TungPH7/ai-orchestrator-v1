import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gitAuthEnv, readHeads, tick } from '../../lib/release/deployer.mjs';
import { baseline, emptyState, readState, stateText } from '../../lib/release/record.mjs';

const TOKEN = 'ghs_FakeInstallationToken0123456789';
const YOU = 'TungPH7';
const BOT = 'tungph7-ao-dev[bot]';
const sha = (ch) => ch.repeat(40);
const tree = (ch) => `${ch}0`.repeat(20);
const [A, B, C, D, H, M, R] = ['a', 'b', 'c', 'd', '1', '2', '3'].map(sha); // develop: A, B, C, D; main: H (hotfix), M (release merge); release head R
const URLS = { development: 'https://pilot-dev.ao.t2g.io.vn', staging: 'https://pilot-staging.ao.t2g.io.vn', production: 'https://pilot.ao.t2g.io.vn' };
// The hosts of /etc/ao/deployer.yaml: one host for each environment, that of the one public app.
const PROJECT = { name: 'pilot', repo: 'TungPH7/ao-pilot', hosts: Object.fromEntries(Object.entries(URLS).map(([env, url]) => [env, new URL(url).host])) };
const pass = (s, pull = { number: 7, head: 'feature/DEMO-21-cart' }) => ({ sha: s, ok: true, problems: [], pull });
const fail = (s, problem) => ({ sha: s, ok: false, problems: [problem], pull: null });

// A mirror: branch heads, open release branches, the tree of each commit, and the branches that contain a commit.
function fakeGit(repo) {
  const calls = [];
  const git = async (args, options = {}) => {
    calls.push({ args, env: options.env });
    const [cmd] = args;
    if (cmd === 'fetch') return '';
    if (cmd === 'for-each-ref' && args.includes('--no-merged')) return repo.open.map((b) => `${b} ${repo.heads[b]}`).join('\n');
    if (cmd === 'for-each-ref' && args.includes('--contains')) return (repo.contains?.[args[args.indexOf('--contains') + 1]] ?? []).join('\n');
    if (cmd === 'for-each-ref') return Object.entries(repo.heads).map(([b, s]) => `${b} ${s}`).join('\n');
    if (cmd === 'merge-base') return ''; // every audited commit is an ancestor in these histories
    if (cmd === 'rev-parse') {
      const of = args.at(-1).replace('^{tree}', '');
      if (!repo.trees[of]) throw new Error(`fatal: bad revision ${of}`);
      return `${repo.trees[of]}\n`;
    }
    throw new Error(`unexpected git ${args.join(' ')}`);
  };
  return { git, calls };
}

// GitHub: the deployments of each environment newest first, and every write the deployer makes.
function fakeGitHub(deployments = {}) {
  const writes = [];
  let id = 100;
  return {
    writes,
    get: async (path, query) => {
      if (path === '/deployments') return deployments[query.environment] ?? [];
      throw new Error(`unexpected GET ${path}`);
    },
    request: async (method, path, query, body) => {
      writes.push({ method, path, body });
      return path === '/deployments' ? { id: ++id } : {};
    },
  };
}
const statuses = (gh) => gh.writes.filter(({ path }) => path.endsWith('/statuses')).map(({ path, body }) => `${path.split('/')[2]} ${body.state}${body.description ? ` ${body.description}` : ''}`);
const created = (gh) => gh.writes.filter(({ path }) => path === '/deployments').map(({ body }) => `${body.environment} ${body.ref.slice(0, 1)} ${body.payload.via}`);

// The audits of each branch head, and an installer that answers from a list.
const fakeAudit = (table) => async ({ since, head, branch }) => ({ base: since, rewritten: false, audits: table[`${branch} ${head}`] ?? [] });
function fakeInstaller(results = []) {
  const installs = [];
  const pruned = [];
  return {
    installs,
    pruned,
    install: async ({ env, sha: s, tree: t }) => {
      installs.push(`${env} ${s.slice(0, 1)}`);
      // As the installer of the kit answers: the public apps it switched to, in the order of deploy.yaml.
      const next = results.shift() ?? { outcome: 'success', public: [{ app: 'web', port: 3000 }] };
      if (next instanceof Error) throw next;
      return next;
    },
    prune: async (keep) => pruned.push([...keep].length),
  };
}

async function run({ repo, state, deployments, audits = {}, results, dryRun = false, project = PROJECT }) {
  const g = fakeGit(repo);
  const gh = fakeGitHub(deployments);
  const inst = fakeInstaller(results);
  const saved = [];
  const lines = [];
  let error = null;
  try {
    await tick({
      project,
      state,
      save: async (s) => saved.push(JSON.parse(stateText(s))),
      git: g.git,
      token: TOKEN,
      github: gh,
      audit: fakeAudit(audits),
      installer: inst,
      approvers: [YOU],
      log: (line) => lines.push(line),
      dryRun,
    });
  } catch (e) {
    error = e;
  }
  return { g, gh, inst, saved, lines, error, state };
}

// A project whose baseline is develop A, main H0 and no release branch, with nothing deployed yet.
const H0 = sha('9');
function started() {
  const state = emptyState();
  baseline(state, { develop: A, main: H0, releases: {} });
  return state;
}
const TREES = { [A]: tree('a'), [B]: tree('b'), [C]: tree('c'), [D]: tree('d'), [H0]: tree('9'), [H]: tree('1'), [M]: tree('3'), [R]: tree('3') };

test('without a baseline the deployer leaves the project alone', async () => {
  const { gh, inst, lines } = await run({ repo: { heads: { develop: B, main: H0 }, open: [], trees: TREES }, state: emptyState() });
  assert.deepEqual(gh.writes, []);
  assert.deepEqual(inst.installs, []);
  assert.match(lines.join('\n'), /no baseline: run ao-deploy\.mjs baseline pilot --confirm/);
});

test('baseline marks the heads of today as audited and seen, so the first tick deploys nothing old', async () => {
  const { gh, inst } = await run({ repo: { heads: { develop: A, main: H0 }, open: [], trees: TREES }, state: started() });
  assert.deepEqual([gh.writes, inst.installs], [[], []]);
});

test('Development runs a new head of develop once every new commit passed audit, and reports it on GitHub', async () => {
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(B), pass(C)] } });
  assert.deepEqual(created(r.gh), ['development c branch']);
  assert.deepEqual(statuses(r.gh), ['101 in_progress', '101 success']);
  assert.equal(r.gh.writes.at(-1).body.environment_url, URLS.development);
  assert.deepEqual(r.inst.installs, ['development c']);
  const env = r.state.environments.development;
  assert.deepEqual(env.current, { sha: C, tree: tree('c'), branch: 'develop', public: [{ app: 'web', port: 3000 }] });
  assert.deepEqual([env.seen.develop, r.state.branches.develop.audited, env.pending], [C, C, null]);
  assert.deepEqual(r.inst.pruned, [1], 'images are pruned after a deploy');
  // Nothing new on the next tick.
  const again = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: r.state });
  assert.deepEqual([again.gh.writes, again.inst.installs], [[], []]);
});

test('a commit that failed audit under the head is reported as error with the reason, and nothing is installed', async () => {
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(B), fail(sha('e'), 'pushed without a PR')] } });
  assert.deepEqual(r.inst.installs, []);
  assert.deepEqual(statuses(r.gh).length, 1, 'a refusal has a single status: error');
  assert.match(statuses(r.gh)[0], /^101 error eeeeeee did not pass audit: pushed without a PR/);
  assert.ok(r.gh.writes.at(-1).body.description.length <= 140, 'GitHub keeps 140 characters of a description');
  assert.equal(r.state.environments.development.seen.develop, C, 'the same head is not tried again');
  assert.equal(r.state.branches.develop.audited, B, 'the audit goes no further than the last commit that passed');
});

test('the record keeps the public app of the release that runs, for Caddy, also across a docs-only commit', async () => {
  const web = { app: 'web', port: 3000 };
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(C)] }, results: [{ outcome: 'success', public: web }] });
  assert.deepEqual(r.state.environments.development.current.public, web);
  const trees = { ...TREES, [D]: tree('c') };
  const docs = await run({ repo: { heads: { develop: D, main: H0 }, open: [], trees }, state: r.state, audits: { [`develop ${D}`]: [pass(D)] } });
  assert.deepEqual(docs.state.environments.development.current, { sha: D, tree: tree('c'), branch: 'develop', public: web });
});

test('a docs-only commit keeps the running containers and still reports success', async () => {
  const state = started();
  Object.assign(state.environments.development, { current: { sha: A, tree: tree('a'), branch: 'develop' } });
  const trees = { ...TREES, [B]: tree('a') };
  const r = await run({ repo: { heads: { develop: B, main: H0 }, open: [], trees }, state, audits: { [`develop ${B}`]: [pass(B)] } });
  assert.deepEqual(r.inst.installs, []);
  assert.deepEqual(statuses(r.gh), ['101 in_progress', '101 success']);
  assert.equal(r.state.environments.development.current.sha, B);
});

test('a hotfix merged into main runs on Staging first; Production waits for your deployment request (spec 2.8)', async () => {
  const hot = { number: 31, head: 'hotfix/DEMO-40-total' };
  const r = await run({ repo: { heads: { develop: A, main: H }, open: [], trees: TREES }, state: started(), audits: { [`main ${H}`]: [pass(H, hot)] } });
  assert.deepEqual(created(r.gh), ['staging 1 branch']);
  assert.deepEqual(r.inst.installs, ['staging 1']);
  assert.equal(r.state.environments.production.seen.main, H, 'Production skipped the hotfix without a report');
  // You ship it: /ao-ship creates a deployment request with your login.
  const request = { id: 55, sha: H, creator: { login: YOU }, payload: { ao: 'request', rollback: false } };
  const shipped = await run({ repo: { heads: { develop: A, main: H }, open: [], trees: TREES }, state: r.state, deployments: { production: [request] } });
  assert.deepEqual(created(shipped.gh), [], 'the request is the deployment');
  assert.deepEqual(statuses(shipped.gh), ['55 in_progress', '55 success']);
  assert.deepEqual(shipped.state.environments.production.current, { sha: H, tree: tree('1'), branch: null, public: [{ app: 'web', port: 3000 }] });
  assert.deepEqual(shipped.state.requests, [55]);
});

test('the merge of a release PR runs on Production once its tree passed Staging; smoke failing there keeps the old release (spec 2.4, 2.9)', async () => {
  const state = started();
  state.environments.staging.runs.push({ sha: R, tree: tree('3'), ok: true, via: 'branch', at: 't' });
  state.environments.production.current = { sha: H0, tree: tree('9'), branch: 'main' };
  const merged = { [`main ${M}`]: [pass(M, { number: 30, head: 'release/v0.1.0' })] };
  const ok = await run({ repo: { heads: { develop: A, main: M }, open: [], trees: TREES }, state: structuredClone(state), audits: merged });
  assert.deepEqual(created(ok.gh), ['production 2 branch']);
  assert.equal(ok.gh.writes[0].body.production_environment, true);
  assert.deepEqual(ok.state.environments.production.current.sha, M);

  const smoke = { outcome: 'failure', reason: 'web /: status 500, expected 200' };
  const bad = await run({ repo: { heads: { develop: A, main: M }, open: [], trees: TREES }, state: structuredClone(state), audits: merged, results: [smoke] });
  assert.deepEqual(statuses(bad.gh), ['101 in_progress', '101 failure web /: status 500, expected 200']);
  assert.equal(bad.state.environments.production.current.sha, H0, 'the old release still runs');
  const { sha: ran, ok: green } = bad.state.environments.production.runs.at(-1);
  assert.deepEqual([ran, green], [M, false]);
});

test('Production refuses the merge of a release PR whose tree did not pass Staging, as error, not failure', async () => {
  const r = await run({ repo: { heads: { develop: A, main: M }, open: [], trees: TREES }, state: started(), audits: { [`main ${M}`]: [pass(M, { number: 30, head: 'release/v0.1.0' })] } });
  assert.deepEqual(r.inst.installs, []);
  assert.match(statuses(r.gh).at(-1), /^101 error the tree of 2222222 has not passed Staging/);
});

test('Staging runs the open release branch, but not while a hotfix holds it before Production', async () => {
  const state = started();
  state.environments.staging.current = { sha: H, tree: tree('1'), branch: 'main' };
  state.environments.staging.seen.main = H;
  state.branches.main = { audited: H, pull: { number: 31, head: 'hotfix/DEMO-40-total' } };
  const repo = { heads: { develop: A, main: H, 'release/v0.1.0': R }, open: ['release/v0.1.0'], trees: TREES };
  const held = await run({ repo, state: structuredClone(state), audits: { [`release/v0.1.0 ${R}`]: [pass(R)] } });
  assert.deepEqual(held.inst.installs, []);
  // Once the hotfix ran on Production, the release branch takes Staging again.
  state.environments.production.runs.push({ sha: H, tree: tree('1'), ok: true, via: 'request', at: 't' });
  const free = await run({ repo, state: structuredClone(state), audits: { [`release/v0.1.0 ${R}`]: [pass(R)] } });
  assert.deepEqual(free.inst.installs, ['staging 3']);
});

test('a deployment request outside AO_APPROVERS is refused as error and not tried again', async () => {
  const request = { id: 56, sha: C, creator: { login: BOT }, payload: { ao: 'request', rollback: false } };
  const r = await run({ repo: { heads: { develop: A, main: H0 }, open: [], trees: TREES }, state: started(), deployments: { development: [request] } });
  assert.match(statuses(r.gh).at(-1), /^56 error the deployment request for ccccccc was created by tungph7-ao-dev\[bot\], who is not in AO_APPROVERS/);
  const again = await run({ repo: { heads: { develop: A, main: H0 }, open: [], trees: TREES }, state: r.state, deployments: { development: [request] } });
  assert.deepEqual(again.gh.writes, []);
});

test('your request for a head after a commit that failed audit unblocks Development; the next commit is audited from there (plan decision 5)', async () => {
  const blocked = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [fail(B, 'pushed without a PR')] } });
  const request = { id: 57, sha: C, creator: { login: YOU }, payload: { ao: 'request', rollback: false } };
  const repo = { heads: { develop: C, main: H0 }, open: [], trees: TREES, contains: { [C]: ['develop'] } };
  const unblocked = await run({ repo, state: blocked.state, deployments: { development: [request] } });
  assert.deepEqual(unblocked.inst.installs, ['development c']);
  assert.equal(unblocked.state.branches.develop.audited, C, 'you read the history up to C');
  const next = await run({ repo: { ...repo, heads: { develop: D, main: H0 } }, state: unblocked.state, audits: { [`develop ${D}`]: [pass(D)] } });
  assert.deepEqual(next.inst.installs, ['development d']);
});

test('a rollback runs the older release again, and the head of develop does not come back on its own (spec 2.9)', async () => {
  const state = started();
  const dev = state.environments.development;
  dev.runs.push({ sha: B, tree: tree('b'), ok: true, via: 'branch', at: 't1' }, { sha: C, tree: tree('c'), ok: true, via: 'branch', at: 't2' });
  dev.current = { sha: C, tree: tree('c'), branch: 'develop' };
  dev.seen.develop = C;
  state.branches.develop.audited = C;
  const request = { id: 58, sha: B, creator: { login: YOU }, payload: { ao: 'request', rollback: true } };
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state, deployments: { development: [request] } });
  assert.deepEqual(r.inst.installs, ['development b']);
  assert.equal(r.state.branches.develop.audited, C, 'a rollback approves no history');
  const after = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: r.state });
  assert.deepEqual(after.inst.installs, []);
});

test('a run cut short is finished by the next tick with the same deployment; what was done is not done again', async () => {
  const repo = { heads: { develop: C, main: H }, open: [], trees: TREES };
  const audits = { [`develop ${C}`]: [pass(C)], [`main ${H}`]: [pass(H, { number: 31, head: 'hotfix/DEMO-40-total' })] };
  const cut = await run({ repo, state: started(), audits, results: [{ outcome: 'success' }, new Error('Cannot connect to the Docker daemon')] });
  assert.match(cut.error.message, /Docker daemon/);
  const last = cut.saved.at(-1);
  assert.equal(last.environments.development.current.sha, C);
  const { branch, sha: pendingSha, deployment } = last.environments.staging.pending;
  assert.deepEqual({ branch, sha: pendingSha, deployment }, { branch: 'main', sha: H, deployment: 102 });
  const resumed = await run({ repo, state: readState(JSON.stringify(last)), audits });
  assert.deepEqual(resumed.inst.installs, ['staging 1'], 'Development is not deployed again');
  assert.deepEqual(created(resumed.gh), [], 'the deployment of the cut run is reused');
  assert.deepEqual(statuses(resumed.gh), ['102 in_progress', '102 success']);
});

test('a dry run reads and decides, but writes nothing to GitHub, installs nothing and saves nothing', async () => {
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(C)] }, dryRun: true });
  assert.deepEqual([r.gh.writes, r.inst.installs, r.saved], [[], [], []]);
  assert.match(r.lines.join('\n'), /development: would deploy ccccccc from develop/);
});

test('the token reaches git through its environment only: no argument and no log line carries it', async () => {
  const r = await run({ repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(C)] } });
  assert.deepEqual(r.g.calls[0].args, ['fetch', '--prune', '--quiet', 'origin']);
  assert.deepEqual(r.g.calls[0].env, gitAuthEnv(TOKEN));
  for (const { args } of r.g.calls) assert.ok(!args.some((arg) => arg.includes(TOKEN)));
  assert.ok(!r.lines.some((line) => line.includes(TOKEN)));
  assert.ok(!JSON.stringify(r.gh.writes).includes(TOKEN));
  assert.ok(!Object.values(gitAuthEnv(TOKEN)).some((value) => value.includes(TOKEN)), 'the header holds the token in base64');
});

test('readHeads lists develop, main and the open release branches, and ignores any other branch', async () => {
  const { git } = fakeGit({ heads: { develop: A, main: H, 'release/v0.1.0': R, 'release/v0.0.9': B, 'feature/DEMO-1-x': C }, open: ['release/v0.1.0'], trees: TREES });
  assert.deepEqual(await readHeads(git), { develop: A, main: H, releases: { 'release/v0.1.0': R } });
});

// project-scaffold part 2, spec 2.4: with two public apps, the deployment names the URL of the first one of deploy.yaml.
test('the deployment of two public apps names the URL of the first, on its own host', async () => {
  const hosts = { admin: { development: 'shop-admin-dev.ao.t2g.io.vn', staging: 'shop-admin-staging.ao.t2g.io.vn', production: 'shop-admin.ao.t2g.io.vn' }, user: { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' } };
  const r = await run({ project: { ...PROJECT, hosts }, repo: { heads: { develop: C, main: H0 }, open: [], trees: TREES }, state: started(), audits: { [`develop ${C}`]: [pass(B), pass(C)] }, results: [{ outcome: 'success', public: [{ app: 'user', port: 3000 }, { app: 'admin', port: 5173 }] }] });
  assert.equal(r.gh.writes.at(-1).body.environment_url, 'https://shop-dev.ao.t2g.io.vn');
  assert.deepEqual(r.state.environments.development.current.public, [{ app: 'user', port: 3000 }, { app: 'admin', port: 5173 }]);
});
