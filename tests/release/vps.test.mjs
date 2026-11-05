import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../helpers/kit.mjs';

// The settings of a systemd unit file, key by key; a key set twice keeps every value.
function unit(name) {
  const settings = {};
  for (const line of readFileSync(join(ROOT, 'vps', name), 'utf8').split('\n')) {
    const match = /^([A-Za-z]+)=(.*)$/.exec(line);
    if (match) (settings[match[1]] ??= []).push(match[2]);
  }
  return settings;
}

test('the deployer runs as aodeploy from the pinned kit, one tick at a time, never as root (spec 2.3)', () => {
  const service = unit('ao-deploy.service');
  assert.deepEqual(service.Type, ['oneshot']);
  assert.deepEqual([service.User, service.Group], [['aodeploy'], ['aodeploy']]);
  assert.deepEqual(service.ExecStart, ['/usr/bin/node /opt/ao/kit/scripts/ao-deploy.mjs tick']);
  assert.deepEqual(service.NoNewPrivileges, ['yes']);
  assert.deepEqual(service.Requires, ['docker.service']);
});

test('the timer starts a tick one minute after the previous one ended, so ticks never overlap', () => {
  const timer = unit('ao-deploy.timer');
  assert.deepEqual(timer.OnUnitInactiveSec, ['1min']);
  assert.equal(timer.OnCalendar, undefined, 'a calendar timer would start a tick while one still runs');
  assert.deepEqual(timer.WantedBy, ['timers.target']);
});
