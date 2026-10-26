// Rule R3: every role, guard and effect a transition names is declared.

export function checkReferences(contract) {
  const errors = [];
  const declared = {
    role: new Set(contract.roles.map(({ id }) => id)),
    guard: new Set(Object.keys(contract.guards)),
    effect: new Set(Object.keys(contract.effects)),
  };
  const check = (kind, ids = [], path) => {
    for (const id of ids.filter((i) => !declared[kind].has(i))) errors.push({ rule: 'R3', path, message: `unknown ${kind} '${id}'` });
  };

  for (const [name, workflow] of Object.entries(contract.workflows)) {
    for (const { id, actors, guards, effects } of workflow.transitions) {
      const at = `workflows.${name}.transitions[id=${id}]`;
      check('role', actors, `${at}.actors`);
      check('guard', guards, `${at}.guards`);
      check('effect', effects, `${at}.effects`);
    }
  }
  return errors;
}
