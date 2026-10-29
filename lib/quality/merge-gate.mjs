// merge-gate (quality-gates spec section 2.5): decideMerge, the pure decision for one PR, and runMergeGate, which reads
// the open PRs with a GitHub client, decides each one and merges. scripts/merge-gate.mjs only builds the clients. CI
// and changes-requested are read as the tracker guards read them.
import { checkBranch, checkPrTitle, parseBranch } from '../tracker/conventions.mjs';
import { changesRequestedOn, lastDecision, readChecks } from '../tracker/facts.mjs';
import { matchesGlob } from './glob.mjs';
import { checkDescription, readReviewReport } from './pull-request.mjs';

const OPEN_PRS = { state: 'open', sort: 'created', direction: 'asc' };
// GitHub's answers to a merge it will not make now: 405, the PR cannot be merged; 409, the head moved.
const REFUSED = [405, 409];

// The account GitHub gives a GitHub App: its slug followed by [bot].
export const botLogin = (slug) => `${slug}[bot]`;

// Every open PR, oldest first: skipped, decided, and merged with the client `mergeClient()` gives when it meets every
// condition, one line each. dryRun only prints, and never calls mergeClient. A merge GitHub refuses for now is a wait;
// any other error is returned among the failures, and the run goes on.
export async function runMergeGate({ github, mergeClient, gates, apps, approvers, dryRun = false, log = console.log }) {
  const failures = [];
  const open = await github.getAll('/pulls', OPEN_PRS);
  if (open.length === 0) log('No open PR');
  let writer;
  for (const listed of open) {
    const { number } = listed;
    try {
      // The list already says whether merge-gate would skip it, before the reads.
      const reason = skipReason(listed, apps);
      const decision = reason ? skip(reason) : decideMerge({ ...(await readMergeFacts(github, number)), gates, apps, approvers });
      if (decision.action !== 'merge') {
        log(describe(number, decision));
        continue;
      }
      const what = `${decision.title} (${decision.method} at ${decision.sha.slice(0, 7)})`;
      if (dryRun) {
        log(`Would merge #${number}: ${what}`);
        continue;
      }
      writer ??= await mergeClient();
      try {
        // With the head SHA, GitHub refuses the merge if a push came after the facts were read.
        await writer.request('PUT', `/pulls/${number}/merge`, {}, { sha: decision.sha, merge_method: decision.method, commit_title: decision.title, commit_message: decision.body });
        log(`Merged #${number}: ${what}`);
      } catch (error) {
        if (!REFUSED.includes(error.status)) throw error;
        log(`Waiting #${number}: GitHub refused the merge at ${decision.sha.slice(0, 7)} (${error.status}): ${error.message.replace(/^GitHub .*? returned \d+: /, '')}`);
      }
    } catch (error) {
      failures.push({ number, error });
      log(`Failed #${number}: ${error.message}`);
    }
  }
  return { failures };
}

// The facts decideMerge needs for PR `number`. The PR itself is read again: only that answer says if it can merge.
async function readMergeFacts(github, number) {
  const pr = await github.get(`/pulls/${number}`);
  return {
    pr,
    commits: await github.getAll(`/pulls/${number}/commits`),
    files: await github.getAll(`/pulls/${number}/files`),
    reviews: await github.getAll(`/pulls/${number}/reviews`),
    checks: await readChecks(github, pr.head.sha),
  };
}

function describe(number, { action, reason, missing, paths }) {
  if (action === 'skip') return `Skipped #${number}: ${reason}`;
  if (action === 'wait') return `Waiting #${number}: ${missing.join('; ')}`;
  const still = missing.length > 0 ? ` (still missing: ${missing.join('; ')})` : '';
  return `Needs you #${number}: it changes ${paths.join(', ')}, so read the diff and merge it yourself${still}`;
}

// Why merge-gate leaves a PR alone, from what the list of open PRs gives too; undefined when it does not.
function skipReason(pr, apps) {
  if (pr.state !== 'open') return 'the PR is not open';
  if (pr.user?.login !== botLogin(apps.dev)) return `opened by ${pr.user?.login}, not by ${apps.dev}: whoever opened it merges it`;
  if (pr.draft) return 'the PR is a draft';
  const branch = parseBranch(pr.head.ref);
  if (!branch || branch.kind === 'release') return `${pr.head.ref} is not the branch of a work item`;
  return undefined;
}

// facts: `pr` as GET /pulls/{n} gives it; its `commits`, `files` and `reviews` (oldest first, as GitHub lists them);
// `checks` of the head commit as readChecks gives them; the `gates`; `apps`, the slugs of the two Apps; and
// `approvers`, your logins (AO_APPROVERS). Returns one of:
//   { action: 'merge', method, sha, title, body }   merge at head commit `sha`, with this commit title and body
//   { action: 'wait', missing }                       the conditions not met yet
//   { action: 'needs-you', paths, missing }           the PR touches protected paths: you read the diff and merge it
//   { action: 'skip', reason }                        not a PR merge-gate merges
export function decideMerge({ pr, commits, files, checks, reviews, gates, apps, approvers }) {
  const reason = skipReason(pr, apps);
  if (reason) return skip(reason);

  const branch = parseBranch(pr.head.ref);
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
