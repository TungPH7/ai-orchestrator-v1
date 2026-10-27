// Writes docs/jira-setup.md from the contract and the Jira mapping next to it; with --check, fails instead when
// the file is out of date (tracker-integration spec section 2.10).
// Usage: node scripts/jira-checklist.mjs [--check] [contract-dir] [output-file]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { formatError, loadContract } from '../lib/contract.mjs';
import { renderChecklist } from '../lib/tracker/checklist.mjs';
import { readMapping, validateMapping } from '../lib/tracker/mapping.mjs';

const args = process.argv.slice(2);
const check = args[0] === '--check';
const [dir = 'contract', out = 'docs/jira-setup.md'] = check ? args.slice(1) : args;

try {
  const contract = loadContract(dir);
  const trackerDir = join(dir, '..', 'tracker');
  const mapping = readMapping(trackerDir);
  const errors = validateMapping(mapping, contract);
  if (errors.length > 0) throw new Error(`Invalid mapping in ${trackerDir}:\n${errors.map(formatError).join('\n')}`);

  const checklist = renderChecklist(contract, mapping);
  if (check) {
    // Compare after normalizing line endings, so a CRLF checkout on Windows still passes.
    const current = existsSync(out) ? readFileSync(out, 'utf8').replaceAll('\r\n', '\n') : null;
    if (current === checklist) {
      console.log(`${out} is up to date`);
    } else {
      console.error(`${out} is out of date: run npm run jira:checklist and commit the result`);
      process.exitCode = 1;
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, checklist);
    console.log(`Wrote ${out}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
