// Whether an agent may make a Jira transition (tracker-integration spec section 2.6): the logic of the jira-guard hook.
// The hook script in kit/.claude/hooks/ only reads stdin, builds the clients and prints the decision.
import { NON_AGENT_ROLES } from '../rules/references.mjs';
import { checkTransition } from '../transitions.mjs';
import { githubGuards, jiraGuards, readItem } from './facts.mjs';

// input: the PreToolUse input of mcp__atlassian__transitionJiraIssue. Returns { allow: true } or { allow: false, reason }.
// Any error while reading the facts refuses the call.
export async function decide(input, { contract, mapping, jira, github, approvers = [] }) {
  const role = input.agent_type;
  const deny = (reason) => ({ allow: false, reason: `jira-guard: ${reason}` });
  if (!role) return deny('only an agent may move a Jira item; this call does not come from a subagent named after a role of the contract');
  if (NON_AGENT_ROLES.includes(role) || !contract.roles.some(({ id }) => id === role)) return deny(`"${role}" is not an agent role of the contract`);

  const { issueIdOrKey: key, transitionId, transitionName } = input.tool_input ?? {};
  try {
    const item = await readItem(jira, key);
    if (item.labels.includes(mapping.needs_you_label)) return deny(`${key} has the label ${mapping.needs_you_label} and waits for you`);

    const workType = contract.work_types.find(({ jira_issue_type: type }) => type === item.type)?.id;
    if (!workType) return deny(`${key} is a ${item.type}, which the contract does not know`);
    const workflowId = Object.keys(contract.workflows).find((id) => contract.workflows[id].applies_to.includes(workType));
    const workflow = contract.workflows[workflowId];
    const mapped = mapping.workflows[workflowId];

    let name = transitionName;
    if (!name) {
      // An id only means something on this item; the agent's token lists the transitions it may make here.
      const { transitions } = await jira.get(`/rest/api/3/issue/${encodeURIComponent(key)}/transitions`);
      name = transitions.find(({ id }) => id === String(transitionId))?.name;
      if (!name) return deny(`transition ${transitionId} is not available on ${key}`);
    }
    const state = Object.keys(mapped.states).find((id) => mapped.states[id].status === item.status);
    const transition = workflow.transitions.find(({ id, from }) => mapped.transitions[id].name === name && [from].flat().includes(state));
    if (!transition) return deny(`the contract has no transition "${name}" from "${item.status}" for a ${item.type}`);
    if (!transition.actors.includes(role)) return deny(`${role} may not make "${name}" on ${key}; it is for ${transition.actors.join(', ')}`);

    const needed = transition.guards ?? [];
    const guards = [
      ...(await jiraGuards(jira, { item, actor: role, needed, contract, mapping })),
      ...(github ? await githubGuards(github, { item, needed, contract, mapping, approvers }) : []),
    ];
    const result = checkTransition(contract, workType, transition.id, { actor: role, facts: { guards } });
    if (!result.ok) return deny(`"${name}" on ${key} needs ${result.missingGuards.join(', ')}`);
    return { allow: true };
  } catch (error) {
    return deny(`could not check ${key}: ${error.message}`);
  }
}
