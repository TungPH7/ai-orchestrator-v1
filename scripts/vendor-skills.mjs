// Copies the vendored skills of agents/roster.yaml into kit/.claude/skills/, each at its pinned commit (agent-roster
// spec 2.7). Reads the tree and commit date from the GitHub API, with GITHUB_TOKEN when it is set, and the files
// from raw.githubusercontent.com.
// Usage: npm run skills:vendor [-- <name> ...]   (no name: every vendored skill)
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readRoster } from '../lib/agents/roster.mjs';
import { vendorSkill } from '../lib/agents/vendor.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const roster = readRoster(join(root, 'agents'));
const names = process.argv.slice(2);
const unknown = names.filter((name) => !roster.vendored_skills.some((skill) => skill.name === name));
if (unknown.length > 0) {
  console.error(`Not a vendored skill of agents/roster.yaml: ${unknown.join(', ')}`);
  process.exit(2);
}

const headers = { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) };
const cache = new Map();
async function get(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`GET ${url}: ${response.status} ${response.statusText}`);
  return response;
}
// Skills of one repository share its tree and commit, so each API answer is fetched once.
const fetchJson = (url) => {
  if (!cache.has(url)) cache.set(url, get(url, { headers }).then((response) => response.json()));
  return cache.get(url);
};
const fetchBytes = async (url) => Buffer.from(await (await get(url)).arrayBuffer());

try {
  for (const skill of roster.vendored_skills.filter(({ name }) => names.length === 0 || names.includes(name))) {
    const files = await vendorSkill(skill, { dir: join(root, 'kit', '.claude', 'skills', skill.name), fetchJson, fetchBytes });
    console.log(`${skill.name}: ${files.length} files from ${skill.repo} at ${skill.commit.slice(0, 12)}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
