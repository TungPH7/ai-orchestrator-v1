// The agent roster, agents/roster.yaml (agent-roster spec sections 2.1 to 2.3 and 6), and its rules A1 to A5 (spec
// section 7). Like lib/contract.mjs, only the read function touches the disk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import { parse } from 'yaml';
import { NON_AGENT_ROLES } from '../rules/references.mjs';
import { schemaErrors } from '../rules/schema.mjs';

const schema = JSON.parse(readFileSync(new URL('../../agents/schema/roster.schema.json', import.meta.url), 'utf8'));
const validateSchema = new Ajv({ allErrors: true }).compile(schema);

export function readRoster(dir = 'agents') {
  const file = join(dir, 'roster.yaml');
  try {
    return parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`, { cause: error });
  }
}

// Returns every rule violation as { rule, path, message }; the contract must already be valid. gates, the project's
// quality/gates.yaml, says which roles use a GitHub App (A5); without it that part of A5 is skipped.
export function validateRoster(roster, contract, { gates } = {}) {
  if (!validateSchema(roster)) return schemaErrors(roster, validateSchema.errors, 'A1', 'agents/roster.yaml');
  return [...checkMcpGroups(roster), ...checkRoles(roster, contract), ...checkTransitions(roster, contract), ...checkSkills(roster), ...checkWriting(roster, gates)];
}

// Rule A1, beyond the schema: a role's MCP tool groups are groups the roster offers for that server.
function checkMcpGroups(roster) {
  const errors = [];
  for (const [id, { mcp = {} }] of Object.entries(roster.roles)) {
    for (const [server, groups] of Object.entries(mcp)) {
      const offered = Object.keys(roster.mcp_tools[server] ?? {});
      const unknown = groups.filter((group) => !offered.includes(group));
      if (unknown.length > 0) {
        errors.push({ rule: 'A1', path: `roles.${id}.mcp.${server}`, message: `${unknown.join(', ')} not offered by mcp_tools.${server} (${offered.join(', ') || 'no groups'})` });
      }
    }
  }
  return errors;
}

// Rule A2: each agent role of the contract has exactly one roster entry, and every entry is an agent role.
function checkRoles(roster, contract) {
  const agentRoles = contract.roles.map(({ id }) => id).filter((id) => !NON_AGENT_ROLES.includes(id));
  const entries = Object.keys(roster.roles);
  return [
    ...agentRoles.filter((id) => !entries.includes(id)).map((id) => ({ rule: 'A2', path: `roles.${id}`, message: 'agent role of the contract has no roster entry' })),
    ...entries.filter((id) => !agentRoles.includes(id)).map((id) => ({ rule: 'A2', path: `roles.${id}`, message: 'is not an agent role of the contract' })),
  ];
}

// Rule A3: only a role that is an actor of at least one transition may move items.
function checkTransitions(roster, contract) {
  const actors = new Set(Object.values(contract.workflows).flatMap(({ transitions }) => transitions.flatMap(({ actors: list }) => list)));
  return Object.entries(roster.roles)
    .filter(([id, { jira }]) => jira.includes('transition') && !actors.has(id))
    .map(([id]) => ({ rule: 'A3', path: `roles.${id}.jira`, message: `${id} is the actor of no transition, so it may not move items` }));
}

// Rule A4: every preloaded skill is a vendored skill, and vendored names are unique. The vendored folders are checked
// when they exist (T9).
function checkSkills(roster) {
  const names = roster.vendored_skills.map(({ name }) => name);
  const errors = [];
  const twice = [...new Set(names.filter((name, index) => names.indexOf(name) !== index))];
  if (twice.length > 0) errors.push({ rule: 'A4', path: 'vendored_skills', message: `${twice.join(', ')} vendored twice` });
  for (const [id, { skills }] of Object.entries(roster.roles)) {
    const missing = skills.filter((skill) => !names.includes(skill));
    if (missing.length > 0) errors.push({ rule: 'A4', path: `roles.${id}.skills`, message: `${missing.join(', ')} not a vendored skill` });
  }
  return errors;
}

// Rule A5: a role with a GitHub App or git write needs Bash; a role with Edit or Write lists the files it may write,
// and a role that lists files has Edit or Write.
function checkWriting(roster, gates) {
  const appRoles = new Set(Object.values(gates?.github_apps ?? {}).flatMap(({ roles }) => roles));
  const errors = [];
  for (const [id, { tools, git, writes }] of Object.entries(roster.roles)) {
    const needs = [appRoles.has(id) && 'a GitHub App', git === 'write' && 'git write'].filter(Boolean);
    if (needs.length > 0 && !tools.includes('Bash')) errors.push({ rule: 'A5', path: `roles.${id}.tools`, message: `${needs.join(' and ')} need Bash` });
    const writer = tools.includes('Edit') || tools.includes('Write');
    if (writer && writes.length === 0) errors.push({ rule: 'A5', path: `roles.${id}.writes`, message: 'the role has Edit or Write but no files it may write' });
    if (!writer && writes.length > 0) errors.push({ rule: 'A5', path: `roles.${id}.writes`, message: 'the role lists files to write but has neither Edit nor Write' });
  }
  return errors;
}
