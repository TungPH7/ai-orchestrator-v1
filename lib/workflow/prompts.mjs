// The prompt of each run ao-step.mjs starts (dev-workflow spec 2.2). Short, as in the live runs of agent-roster: the
// agent's own definition already says how it works, so a prompt only says which item, which stage, and the state of the
// checkout. Pure.

// Stage spec of an Epic: ba writes the SPEC, ux the screens, sa the non-functional requirements, then ba opens the docs
// PR. Stage plan: sa writes the plan and pushes it to the docs PR, ba creates the items.
export const PURPOSES = {
  'spec-write': ({ key, branch }) => `Epic ${key} is in Specifying: do stage spec. Write its SPEC on the branch ${branch}, which is checked out, and commit it. Do not push.`,
  design: ({ key, branch }) => `Epic ${key} is in Specifying, and its SPEC is committed on the branch ${branch}, which is checked out. Write its design.md and commit it on that branch. Do not push.`,
  'spec-nfr': ({ key, branch }) => `Epic ${key} is in Specifying, and its SPEC is committed on the branch ${branch}, which is checked out. Do your part of stage spec and commit it on that branch. Do not push.`,
  'docs-pr': ({ key, branch }) => `Stage spec of Epic ${key} is committed on the branch ${branch}, which is checked out. Push the branch and open the docs PR of the Epic into develop.`,
  'plan-write': ({ key, branch, pr }) => `Epic ${key} is in Planning: do stage plan. Its SPEC is approved, the branch ${branch} is checked out, and its docs PR #${pr} is open. Commit the plan on that branch and push it.`,
  'plan-items': ({ key, branch }) => `The plan of Epic ${key} is committed on the branch ${branch}, which is checked out, and waits for the human at gate ②. Do stage plan: create its items.`,
};

export function promptFor(purpose, context) {
  const make = PURPOSES[purpose];
  if (!make) throw new Error(`no prompt for ${purpose}`);
  return make(context);
}

// A run that stopped before its end (the process was stopped, or the usage limit), resumed in its session.
export const resumePrompt = (key) => `Your run stopped before it ended. Read .ai/ledger/${key}.md and go on from where you stopped.`;

// The human's answers to the open questions an agent left, given to the run that asked them.
export function answersPrompt(key, answers) {
  const text = answers.replace(/\r\n?/g, '\n').trim();
  if (text === '') throw new Error('the answers file is empty');
  return `The human answered your open questions:\n\n${text}\n\nTurn each answer into a decision where it belongs, remove the answered questions from Open Questions, and commit. Then edit your comment with the questions on ${key} to say they are answered.`;
}
