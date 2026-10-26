// Writes docs/sdlc.md from the contract; with --check, fails instead when the file is out of date.
// Usage: node scripts/render-docs.mjs [--check] [contract-dir] [output-file]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadContract } from '../lib/contract.mjs';
import { renderDocs } from '../lib/render.mjs';

const args = process.argv.slice(2);
const check = args[0] === '--check';
const [dir = 'contract', out = 'docs/sdlc.md'] = check ? args.slice(1) : args;

try {
  const docs = renderDocs(loadContract(dir));
  if (check) {
    // Compare after normalizing line endings, so a CRLF checkout on Windows still passes.
    const current = existsSync(out) ? readFileSync(out, 'utf8').replaceAll('\r\n', '\n') : null;
    if (current === docs) {
      console.log(`${out} is up to date`);
    } else {
      console.error(`${out} is out of date: run npm run render and commit the result`);
      process.exitCode = 1;
    }
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, docs);
    console.log(`Wrote ${out}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
