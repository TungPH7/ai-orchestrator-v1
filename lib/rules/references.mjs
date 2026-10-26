// Rule R3: every role, guard, effect and work type that the contract names is declared.

export function checkReferences(contract) {
  const errors = [];
  const declared = {
    role: new Set(contract.roles.map(({ id }) => id)),
    guard: new Set(Object.keys(contract.guards)),
    effect: new Set(Object.keys(contract.effects)),
    'work type': new Set(contract.work_types.map(({ id }) => id)),
  };
  const check = (kind, ids = [], path) => {
    for (const id of ids.filter((i) => !declared[kind].has(i))) errors.push({ rule: 'R3', path, message: `unknown ${kind} '${id}'` });
  };

  for (const [name, workflow] of Object.entries(contract.workflows)) {
    check('work type', workflow.applies_to, `workflows.${name}.applies_to`);
    for (const { id, actors, guards, effects } of workflow.transitions) {
      const at = `workflows.${name}.transitions[id=${id}]`;
      check('role', actors, `${at}.actors`);
      check('guard', guards, `${at}.guards`);
      check('effect', effects, `${at}.effects`);
    }
  }
  check('effect', [contract.rework.on_limit], 'rework.on_limit');
  for (const { id, applies_to: types } of contract.work_item_fields) check('work type', types, `work_item_fields[id=${id}].applies_to`);
  check('work type', contract.dod_common.applies_to, 'dod_common.applies_to');
  return errors;
}
