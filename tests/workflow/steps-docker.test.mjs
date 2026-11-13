import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dockerGate } from '../../lib/workflow/steps.mjs';

// project-scaffold part 3, spec 2.2: the tests of a Java app start Postgres with Testcontainers, so a command that
// starts be-dev on a project with a Java app stops first when Docker is not running. dockerRunning is asked only then.
const decision = (...roles) => ({ go: true, runs: roles.map((role) => ({ role, key: 'SHOP-9' })), lines: [] });

test('be-dev on a project with a Java app waits for Docker', () => {
  const asked = [];
  const running = (answer) => () => (asked.push(answer), answer);
  const stopped = dockerGate(decision('be-dev', 'fe-dev'), { java: true, dockerRunning: running(false) });
  assert.equal(stopped.go, false);
  assert.match(stopped.reason, /Java app.*Docker is not running/);
  assert.match(stopped.next, /Start Docker Desktop/);
  assert.deepEqual(dockerGate(decision('be-dev'), { java: true, dockerRunning: running(true) }), decision('be-dev'));
  assert.deepEqual(asked, [false, true]);
});

test('no Java app, no be-dev run, or a stop already: Docker is not asked about', () => {
  const never = () => assert.fail('dockerRunning was asked');
  assert.deepEqual(dockerGate(decision('be-dev'), { java: false, dockerRunning: never }), decision('be-dev'));
  assert.deepEqual(dockerGate(decision('fe-dev', 'qa', 'reviewer'), { java: true, dockerRunning: never }), decision('fe-dev', 'qa', 'reviewer'));
  const stop = { go: false, reason: 'x', next: 'y', lines: [] };
  assert.equal(dockerGate(stop, { java: true, dockerRunning: never }), stop);
});
