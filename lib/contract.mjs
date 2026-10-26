// Read-only access to the SDLC contract (spec section 6). Every function except readContract is pure.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { CONTRACT_FILES, checkSchemas } from './rules/schema.mjs';

const RULES = [checkSchemas];

// Merges the top-level keys of every contract file into one object, and adds the file names
// found in the templates folder next to `dir`, so the rules never touch the disk.
export function readContract(dir = 'contract') {
  const contract = {};
  for (const name of CONTRACT_FILES) {
    const file = join(dir, `${name}.yaml`);
    try {
      Object.assign(contract, parse(readFileSync(file, 'utf8')));
    } catch (error) {
      throw new Error(`Cannot read ${file}: ${error.message}`, { cause: error });
    }
  }
  const templatesDir = join(dir, '..', 'templates');
  contract.template_files = existsSync(templatesDir) ? readdirSync(templatesDir).sort() : [];
  return contract;
}

// Returns every rule violation as { rule, path, message }; an empty list means the contract is valid.
export function validateContract(contract) {
  return RULES.flatMap((rule) => rule(contract));
}

export function loadContract(dir = 'contract') {
  const contract = readContract(dir);
  const errors = validateContract(contract);
  if (errors.length > 0) throw new Error(`Invalid contract in ${dir}:\n${errors.map(formatError).join('\n')}`);
  return deepFreeze(contract);
}

export function formatError({ rule, path, message }) {
  return `${rule} ${path}: ${message}`;
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
