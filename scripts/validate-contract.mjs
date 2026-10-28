// Checks the contract against its schemas and consistency rules (spec section 7), then the Jira mapping
// in the tracker folder next to it (tracker-integration spec section 7) and the quality gates in the quality folder
// (quality-gates spec section 7), when those folders have them.
// Usage: node scripts/validate-contract.mjs [contract-dir]
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { formatError, readContract, validateContract } from '../lib/contract.mjs';
import { readGates, validateGates } from '../lib/quality/gates.mjs';
import { readMapping, validateMapping } from '../lib/tracker/mapping.mjs';

const dir = process.argv[2] ?? 'contract';
const trackerDir = join(dir, '..', 'tracker');
const qualityDir = join(dir, '..', 'quality');

function report(errors, okMessage, where) {
  if (errors.length === 0) {
    console.log(okMessage);
    return true;
  }
  for (const error of errors) console.error(formatError(error));
  console.error(`${errors.length} error(s) in ${where}`);
  process.exitCode = 1;
  return false;
}

try {
  const contract = readContract(dir);
  const contractOk = report(validateContract(contract), `Contract OK: ${dir}`, dir);
  if (contractOk && existsSync(join(trackerDir, 'jira.yaml'))) {
    report(validateMapping(readMapping(trackerDir), contract), `Mapping OK: ${join(trackerDir, 'jira.yaml')}`, trackerDir);
  }
  if (contractOk && existsSync(join(qualityDir, 'gates.yaml'))) {
    report(validateGates(readGates(qualityDir), contract), `Gates OK: ${join(qualityDir, 'gates.yaml')}`, qualityDir);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
