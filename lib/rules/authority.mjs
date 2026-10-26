// Rule R4: only `human` moves a Story, Task, Bug or Epic to done (spec 2.1). Sub-tasks are exempt:
// the assigned agent closes them. Approval gates join this rule with stages.yaml.

const HUMAN_DONE_TYPES = ['story', 'task', 'bug', 'epic'];

export function checkAuthority(contract) {
  const errors = [];
  for (const [name, workflow] of Object.entries(contract.workflows)) {
    if (!workflow.applies_to.some((type) => HUMAN_DONE_TYPES.includes(type))) continue;
    for (const { id, to, actors } of workflow.transitions) {
      const others = actors.filter((actor) => actor !== 'human');
      if (to === 'done' && others.length > 0) {
        errors.push({
          rule: 'R4',
          path: `workflows.${name}.transitions[id=${id}].actors`,
          message: `only 'human' may move ${workflow.applies_to.join('/')} to 'done', found: ${others.join(', ')}`,
        });
      }
    }
  }
  return errors;
}
