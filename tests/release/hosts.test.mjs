import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostList, hostOf, hostsByApp, publicApps, publicUrls } from '../../lib/release/hosts.mjs';

// The two shapes of hosts in /etc/ao/deployer.yaml (project-scaffold part 2, spec 2.4).
const ONE = { development: 'pilot-dev.ao.t2g.io.vn', staging: 'pilot-staging.ao.t2g.io.vn', production: 'pilot.ao.t2g.io.vn' };
const BY_APP = {
  user: { development: 'shop-dev.ao.t2g.io.vn', staging: 'shop-staging.ao.t2g.io.vn', production: 'shop.ao.t2g.io.vn' },
  admin: { development: 'shop-admin-dev.ao.t2g.io.vn', staging: 'shop-admin-staging.ao.t2g.io.vn', production: 'shop-admin.ao.t2g.io.vn' },
};
const deploy = (apps) => ({ apps: Object.fromEntries(apps.map(([name, open]) => [name, { dockerfile: 'Dockerfile', port: 3000, health: '/', ...(open && { public: true }) }])) });

test('the values tell the shapes apart, so an app may be named staging', () => {
  assert.equal(hostsByApp(ONE), false);
  assert.equal(hostsByApp(BY_APP), true);
  assert.equal(hostsByApp({ staging: BY_APP.user }), true);
  assert.equal(hostOf(ONE, 'staging', 'web'), 'pilot-staging.ao.t2g.io.vn');
  assert.equal(hostOf(BY_APP, 'production', 'admin'), 'shop-admin.ao.t2g.io.vn');
  assert.equal(hostOf(BY_APP, 'production', 'api'), null);
  assert.deepEqual(hostList(ONE).map(({ app, env }) => `${app} ${env}`), ['null development', 'null staging', 'null production']);
  assert.deepEqual(hostList(BY_APP).map(({ app, env }) => `${app} ${env}`), ['user development', 'user staging', 'user production', 'admin development', 'admin staging', 'admin production']);
});

test('publicUrls: the URL of each public app in an environment, or why the deployer may not deploy', () => {
  assert.deepEqual(publicApps(deploy([['api', false], ['web', true]])), ['web']);
  assert.deepEqual(publicUrls(ONE, deploy([['api', false], ['web', true]]), 'development'), { urls: { web: 'https://pilot-dev.ao.t2g.io.vn' }, problem: null });
  assert.deepEqual(publicUrls(BY_APP, deploy([['user', true], ['admin', true], ['api', false]]), 'staging').urls, { user: 'https://shop-staging.ao.t2g.io.vn', admin: 'https://shop-admin-staging.ao.t2g.io.vn' });
  assert.match(publicUrls(ONE, deploy([['user', true], ['admin', true]]), 'development').problem, /^deploy\.yaml has 2 public apps \(user, admin\), and \/etc\/ao\/deployer\.yaml names one host for each environment/);
  assert.equal(publicUrls(BY_APP, deploy([['user', true], ['shop', true]]), 'production').problem, 'shop is public in deploy.yaml but has no production host in /etc/ao/deployer.yaml');
});
