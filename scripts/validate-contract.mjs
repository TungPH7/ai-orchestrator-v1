// Checks the contract against its schemas and consistency rules (spec section 7), then the Jira mapping
// in the tracker folder next to it (tracker-integration spec section 7), the quality gates in the quality folder
// (quality-gates spec section 7), the agent roster in the agents folder (agent-roster spec section 7) and a project's
// deploy.yaml next to the contract folder (release-workflow spec section 7), when they are there.
// Usage: node scripts/validate-contract.mjs [contract-dir]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readRoster, validateRoster } from '../lib/agents/roster.mjs';
import { formatError, readContract, validateContract } from '../lib/contract.mjs';
import { readCiJobs, readGates, validateGates } from '../lib/quality/gates.mjs';
import { readDeployConfig } from '../lib/release/deploy-config.mjs';
import { readMapping, validateMapping } from '../lib/tracker/mapping.mjs';

const dir = process.argv[2] ?? 'contract';
const trackerDir = join(dir, '..', 'tracker');
const qualityDir = join(dir, '..', 'quality');
const agentsDir = join(dir, '..', 'agents');
// A project keeps deploy.yaml in .ai-orchestrator/, next to its contract copy; the kit itself has none.
const deployFile = join(dir, '..', 'deploy.yaml');

// The SKILL.md of each vendored skill, by name; undefined when it is missing.
function readSkills(roster, skillsDir) {
  return new Map(
    roster.vendored_skills.map(({ name }) => {
      const file = join(skillsDir, name, 'SKILL.md');
      return [name, existsSync(file) ? readFileSync(file, 'utf8') : undefined];
    }),
  );
}

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
    const ciFile = join(qualityDir, '..', 'kit', '.github', 'workflows', 'ci.yml');
    const ciJobs = existsSync(ciFile) ? readCiJobs(ciFile) : undefined;
    report(validateGates(readGates(qualityDir), contract, { ciJobs }), `Gates OK: ${join(qualityDir, 'gates.yaml')}`, qualityDir);
  }
  if (contractOk && existsSync(join(agentsDir, 'roster.yaml'))) {
    const roster = readRoster(agentsDir);
    const gates = existsSync(join(qualityDir, 'gates.yaml')) ? readGates(qualityDir) : undefined;
    // In the kit repo the vendored skills sit in kit/.claude/skills/; a project's copy has no kit folder.
    const skillsDir = join(dir, '..', 'kit', '.claude', 'skills');
    const skills = existsSync(skillsDir) ? readSkills(roster, skillsDir) : undefined;
    const promptsDir = join(agentsDir, 'prompts');
    const prompts = existsSync(promptsDir) ? readdirSync(promptsDir).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : undefined;
    report(validateRoster(roster, contract, { gates, skills, prompts }), `Roster OK: ${join(agentsDir, 'roster.yaml')}`, agentsDir);
  }
  if (existsSync(deployFile)) {
    report(readDeployConfig(readFileSync(deployFile, 'utf8')).errors, `Deploy config OK: ${deployFile}`, deployFile);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
