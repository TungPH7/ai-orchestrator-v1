import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadContract, routeBug } from '../lib/contract.mjs';
import { CONTRACT_DIR } from './helpers/kit.mjs';

const contract = loadContract(CONTRACT_DIR);

test('bug routing has the 3 locations of spec 2.6: production, staging, development', () => {
  assert.deepEqual(
    contract.bug_routing.map(({ id }) => id),
    ['production', 'staging', 'development'],
  );
});

test('Story and Task branch from develop and are tested on Development', () => {
  assert.deepEqual(contract.new_work_route, { applies_to: ['story', 'task'], base_branch: 'develop', qa_environments: ['development'] });
});

test('SemVer: a release bumps minor, a hotfix bumps patch, a breaking change bumps major', () => {
  assert.equal(contract.versioning.scheme, 'SemVer');
  assert.deepEqual(contract.versioning.bumps.map(({ part }) => part), ['minor', 'patch', 'major']);
});

test('routeBug returns a copy, so callers cannot reach the frozen contract', () => {
  const route = routeBug(contract, { affects: 'development', severity: 'low' });

  route.qaEnvironments.push('staging');

  assert.deepEqual(routeBug(contract, { affects: 'development', severity: 'low' }).qaEnvironments, ['development']);
});

test('routeBug: a location with no routing is an error', () => {
  assert.throws(() => routeBug(contract, { affects: 'qa', severity: 'low' }), /qa/);
});

test('routeBug: a severity with no route is an error', () => {
  assert.throws(() => routeBug(contract, { affects: 'staging', severity: 'trivial' }), /trivial/);
});
