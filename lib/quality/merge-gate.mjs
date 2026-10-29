// merge-gate's decision for one PR (quality-gates spec section 2.5). Pure: scripts/merge-gate.mjs gathers the facts
// from GitHub, calls decideMerge and merges. CI and changes-requested are read as the tracker guards read them.
import { checkBranch, checkPrTitle, parseBranch } from '../tracker/conventions.mjs';
import { changesRequestedOn, lastDecision } from '../tracker/facts.mjs';
import { matchesGlob } from './glob.mjs';
import { checkDescription, readReviewReport } from './pull-request.mjs';

// The account GitHub gives a GitHub App: its slug followed by [bot].
export const botLogin = (slug) => `${slug}[bot]`;

// facts: `pr` as GET /pulls/{n} gives it; its `commits`, `files` and `reviews` (oldest first, as GitHub lists them);
// `checks` of the head commit as readChecks gives them; the `gates`; `apps`, the slugs of the two Apps; and
// `approvers`, your logins (AO_APPROVERS). Returns one of:
//   { action: 'merge', method, sha, title, body }   merge at head commit `sha`, with this commit title and body
//   { action: 'wait', missing }                       the conditions not met yet
//   { action: 'needs-you', paths, missing }           the PR touches protected paths: you read the diff and merge it
//   { action: 'skip', reason }                        not a PR merge-gate merges
export function decideMerge({ pr, commits, files, checks, reviews, gates, apps, approvers }) {
  if (pr.state !== 'open') return skip('the PR is not open');
  if (pr.user?.login !== botLogin(apps.dev)) return skip(`opened by ${pr.user?.login}, not by ${apps.dev}: whoever opened it merges it`);
  if (pr.draft) return skip('the PR is a draft');
  const branch = parseBranch(pr.head.ref);
  if (!branch || branch.kind === 'release') return skip(`${pr.head.ref} is not the branch of a work item`);

  const head = pr.head.sha;
  const at = `on head ${head.slice(0, 7)}`;
  const missing = [];
  const placed = checkBranch(pr.head.ref, { base: pr.base.ref });
  if (!placed.ok) missing.push(`valid branch (${placed.reason})`);
  // null means GitHub has not worked it out yet; the merge call itself refuses a conflict.
  if (pr.mergeable === false) missing.push(`conflicts with ${pr.base.ref} resolved`);
  const title = checkPrTitle(pr.title ?? '');
  if (!title.ok) missing.push(`valid title (${title.reason})`);
  for (const problem of checkDescription(pr.body)) missing.push(`complete description (${problem})`);
  // A failed check is also half of changes-requested; this line already says it.
  if (!checks.green) missing.push(`CI green ${at}`);
  missing.push(...reportGaps(reviews, head, at, gates.github_apps.review.roles, botLogin(apps.review)));
  if (changesRequestedOn(reviews, head)) missing.push(`answer to the changes requested ${at}`);
  if (!approvedOn(reviews, head, approvers)) missing.push(`approval ${at}`);

  const paths = protectedPaths(files, gates);
  if (paths.length > 0) return { action: 'needs-you', paths, missing };
  if (missing.length > 0) return { action: 'wait', missing };
  return { action: 'merge', method: gates.merge_method[branch.kind], sha: head, title: pr.title, body: squashBody(commits) };
}

const skip = (reason) => ({ action: 'skip', reason });

// Each role of the review App needs a report posted by that App on the head commit; the latest one of each role must
// be readable and have no Critical or High finding.
function reportGaps(reviews, head, at, roles, bot) {
  const reports = reviews.filter((r) => r.user?.login === bot && r.commit_id === head).map((r) => readReviewReport(r.body, roles));
  return roles.flatMap((role) => {
    const latest = reports.filter((report) => report.role === role).at(-1);
    if (!latest) return [`${role} report ${at}`];
    if (!latest.ok) return [`readable ${role} report ${at} (${latest.problems.join('; ')})`];
    if (latest.blocking.length > 0) return [`${role} report ${at} without Critical or High findings (${latest.blocking.length} open)`];
    return [];
  });
}

// An approval as merge-gate needs it: the latest deciding review of one of your logins approves the head commit, so a
// push after it needs a new approval.
function approvedOn(reviews, sha, approvers) {
  return approvers.some((login) => {
    const last = lastDecision(reviews, login);
    return last?.state === 'APPROVED' && last.commit_id === sha;
  });
}

// The protected paths among the PR's files; a renamed file counts by its old name too.
function protectedPaths(files, gates) {
  const names = files.flatMap(({ filename, previous_filename: previous }) => (previous ? [previous, filename] : [filename]));
  return [...new Set(names.filter((name) => gates.protected_paths.some(({ path }) => matchesGlob(path, name))))];
}

// The body of the squash commit: the header of each commit of the PR, merge commits left out, so the Sub-task keys
// stay on the base branch.
function squashBody(commits) {
  return commits
    .filter(({ parents }) => parents.length < 2)
    .map(({ commit }) => `- ${commit.message.split('\n', 1)[0]}`)
    .join('\n');
}
