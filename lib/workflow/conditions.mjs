// The order of the runs of a stage and their conditions (C1 spec section 6): `runs` of a stage of contract/stages.yaml
// names its roles in order, each with an optional `when` (the run applies) and `done` (its output exists already).
// Both name a condition of CONDITIONS below, a pure function of the facts of the command, so adding a role, such as
// seo, is a change of data. A condition answers true, false, or null when the input it reads does not exist yet, such
// as the screens of a SPEC ba has still to write: the run is then listed with the condition's text, as a forecast, and
// ao-step decides again after each run. Pure.

// A SPEC that has screens names design.md, where ux writes them.
export const SCREENS = /design\.md/;
// sa's part of stage spec: the heading it adds under the SPEC's Objective (agents/prompts/sa.md).
export const NFR = /^#{2,4}\s+Non-functional requirements\s*$/im;

// text: how a forecast names the condition when its answer is still null.
export const CONDITIONS = {
  'spec-written': { test: ({ docs }) => Boolean(docs?.spec) },
  'spec-has-screens': { text: 'the SPEC has screens', test: ({ docs }) => (docs?.spec ? SCREENS.test(docs.spec) : null) },
  'design-written': { test: ({ docs }) => Boolean(docs?.design) },
  // A SPEC still to write has no requirements yet: sa runs after ba.
  'spec-has-nfr': { test: ({ docs }) => Boolean(docs?.spec) && NFR.test(docs.spec) },
  'plan-written': { test: ({ docs }) => Boolean(docs?.plan) },
  // ba creates the items from plan.md: without a plan, items of the Epic are not those of the plan.
  'plan-items-created': { test: ({ docs, item }) => Boolean(docs?.plan) && (item?.children?.length ?? 0) > 0 },
};

// The runs of stage `id` in contract/stages.yaml, in order: [{ role, purpose?, when?, done? }].
export function stageRuns(contract, id) {
  const stage = contract.stages.find((s) => s.id === id);
  if (!stage?.runs) throw new Error(`stage ${id} of contract/stages.yaml has no runs`);
  return stage.runs;
}

// The roles of stage `id`, in order: the order of the dev agents of a Story, for one.
export const stageRoles = (contract, id) => stageRuns(contract, id).map(({ role }) => role);

function answer(name, facts) {
  const condition = CONDITIONS[name];
  if (!condition) throw new Error(`unknown condition ${name}; use one of ${Object.keys(CONDITIONS).join(', ')}`);
  return condition.test(facts);
}

// The runs of stage `id` still to make on these facts, in order: those not done whose `when` is not false. A run whose
// `when` cannot be answered yet carries the condition's text in `when`. Returns [{ role, purpose, when? }].
export function pendingRuns(contract, id, facts) {
  const pending = [];
  for (const { role, purpose, when, done } of stageRuns(contract, id)) {
    if (done && answer(done, facts) === true) continue;
    const applies = when ? answer(when, facts) : true;
    if (applies === false) continue;
    pending.push({ role, purpose, ...(applies === null && { when: CONDITIONS[when].text ?? when }) });
  }
  return pending;
}
