// Generates the agents and the shared rules file (agent-roster spec 2.1, 2.6) into kit/.claude/, from agents/, the
// contract, quality/gates.yaml and tracker/jira.yaml. --check writes nothing and fails when a generated file is stale.
// Usage: node scripts/render-agents.mjs [--check]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAll } from '../lib/agents/render.mjs';
import { readRoster } from '../lib/agents/roster.mjs';
import { readContract } from '../lib/contract.mjs';
import { readGates } from '../lib/quality/gates.mjs';
import { readMapping } from '../lib/tracker/mapping.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const check = process.argv.includes('--check');
const outDir = join(root, 'kit', '.claude');

const roster = readRoster(join(root, 'agents'));
const sources = {
  roster,
  contract: readContract(join(root, 'contract')),
  gates: readGates(join(root, 'quality')),
  mapping: readMapping(join(root, 'tracker')),
  prompts: Object.fromEntries(Object.keys(roster.roles).map((role) => [role, readFileSync(join(root, 'agents', 'prompts', `${role}.md`), 'utf8')])),
  rules: readFileSync(join(root, 'agents', 'rules.md'), 'utf8'),
};

const files = renderAll(sources);
const stale = [...files].filter(([path, text]) => {
  const file = join(outDir, path);
  return !existsSync(file) || readFileSync(file, 'utf8') !== text;
});

if (check) {
  if (stale.length === 0) console.log(`${files.size} files up to date in kit/.claude/`);
  else {
    for (const [path] of stale) console.error(`stale: kit/.claude/${path}`);
    console.error('Run npm run agents and commit the result.');
    process.exitCode = 1;
  }
} else {
  for (const [path, text] of stale) {
    mkdirSync(dirname(join(outDir, path)), { recursive: true });
    writeFileSync(join(outDir, path), text);
  }
  console.log(`Wrote ${stale.length} of ${files.size} files in kit/.claude/`);
}
