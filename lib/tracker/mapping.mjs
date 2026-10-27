// Mapping of the SDLC contract to Jira (tracker-integration spec section 2.3), and its rules J1–J4 (spec section 7).
// Like lib/contract.mjs, only readMapping touches the disk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { schemaErrors } from '../rules/schema.mjs';

const schema = JSON.parse(readFileSync(new URL('../../tracker/schema/jira.schema.json', import.meta.url), 'utf8'));
const validateSchema = new Ajv({ allErrors: true }).compile(schema);

export function readMapping(dir = 'tracker') {
  const file = join(dir, 'jira.yaml');
  try {
    return parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`, { cause: error });
  }
}

// Returns every rule violation as { rule, path, message }; the contract must already be valid.
export function validateMapping(mapping, contract) {
  if (!validateSchema(mapping)) return schemaErrors(mapping, validateSchema.errors, 'J1', 'tracker/jira.yaml');
  return checkIdentities(mapping, contract);
}

// Rule J4: every contract role belongs to exactly one identity, and identities name only contract roles.
function checkIdentities(mapping, contract) {
  const errors = [];
  const declared = new Set(contract.roles.map(({ id }) => id));
  const owner = new Map();
  for (const { id, roles } of mapping.identities) {
    const path = `identities[id=${id}].roles`;
    for (const role of roles) {
      if (!declared.has(role)) errors.push({ rule: 'J4', path, message: `unknown role '${role}'` });
      else if (owner.has(role)) errors.push({ rule: 'J4', path, message: `role '${role}' already belongs to identity '${owner.get(role)}'` });
      else owner.set(role, id);
    }
  }
  for (const role of declared) {
    if (!owner.has(role)) errors.push({ rule: 'J4', path: 'identities', message: `role '${role}' belongs to no identity` });
  }
  return errors;
}
