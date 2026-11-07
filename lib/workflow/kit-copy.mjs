// A PR that copies a kit another project already reviewed (kit-copy-review spec 2.1, 2.2): ao-step compares it with the
// head of that review and writes the two reports itself, with no agent. The claim in the PR description proves nothing:
// everything is checked here against what GitHub says. Any doubt falls back to the review by the agents, so nothing here
// can let a PR through unread that would not have been read anyway. decideKitCopy and kitCopyReport are pure.
import { matchesGlob } from '../quality/glob.mjs';
import { botLogin, reportGaps } from '../quality/merge-gate.mjs';

const CLAIM = /^Kit review:[ \t]*([\w.-]+\/[\w.-]+)#(\d+)[ \t\r]*$/gm;
const MARK = 'Kit copy of:';
const MARKED = new RegExp(`^${MARK}`, 'm');

// The PR the description points at, or null without exactly one line of the right form.
export function kitReviewOf(body) {
  const found = [...(body ?? '').matchAll(CLAIM)];
  return found.length === 1 ? { repo: found[0][1], number: Number(found[0][2]) } : null;
}

const within = (globs, path) => globs.some((glob) => matchesGlob(glob, path));
// What a tree holds at each path: kind, mode and content, so a link or a file made executable counts as a change.
const entries = ({ tree }) => new Map(tree.filter(({ type }) => type !== 'tree').map(({ path, type, mode, sha }) => [path, `${type} ${mode} ${sha}`]));

// claim: { repo, number }, from kitReviewOf. peers: the repositories of AO_KIT_PEERS. pr: { headSha, files }, files as
// GET /pulls/{n}/files gives them. headTree: GET /git/trees/{head}?recursive=1. reference: { pull, reviews, newest, tree },
// where newest is the newest commit of its base on gates.kit_copy.newest_path. Returns { ok: false, reason } or
// { ok: true, compared, reference: { repo, number, head }, renders }; renders asks for the rendered files to be checked.
export function decideKitCopy({ claim, peers, pr, headTree, reference, gates, apps, approvers }) {
  const no = (reason) => ({ ok: false, reason });
  const name = `${claim.repo}#${claim.number}`;
  if (!peers.includes(claim.repo)) return no(`${claim.repo} is not in AO_KIT_PEERS`);
  const { pull, reviews, newest, tree } = reference;
  if (!pull.merged_at) return no(`${name} is not merged`);
  if (!gates.protected_branches.some((glob) => matchesGlob(glob, pull.base.ref))) return no(`${name} was merged into ${pull.base.ref}, not a protected branch`);
  if (!approvers.includes(pull.merged_by?.login)) return no(`${name} was merged by ${pull.merged_by?.login}, not by you`);

  const head = pull.head.sha;
  const bot = botLogin(apps.review);
  const gaps = reportGaps(reviews, head, `on head ${head.slice(0, 7)}`, gates.github_apps.review.roles, bot);
  if (gaps.length > 0) return no(`${name} lacks: ${gaps.join('; ')}`);
  // A copy of a copy would hide how far the real review is.
  if (reviews.some((r) => r.user?.login === bot && r.commit_id === head && MARKED.test(r.body ?? ''))) return no(`${name} is a kit copy too: point at the PR the agents reviewed`);
  const rule = gates.kit_copy;
  if (newest !== pull.merge_commit_sha) return no(`${name} is not the newest PR of ${claim.repo} on ${rule.newest_path}`);
  if (headTree.truncated) return no('the tree of the head is too large for GitHub to list');
  if (tree.truncated) return no(`the tree of ${name} is too large for GitHub to list`);

  const ours = entries(headTree);
  const theirs = entries(tree);
  const compared = new Set();
  let renders = false;
  const differs = (path) => {
    compared.add(path);
    return (ours.get(path) ?? null) !== (theirs.get(path) ?? null);
  };
  // A renamed file counts by both names; the same comparison covers a file removed, which must be gone there too.
  for (const path of pr.files.flatMap(({ filename, previous_filename: previous }) => (previous ? [previous, filename] : [filename]))) {
    if (within(rule.rendered, path)) renders = true;
    else if (!within([...rule.same, ...rule.same_when_changed], path)) return no(`the PR changes ${path}, which is not a kit file`);
    else if (differs(path)) return no(`${path} differs from ${name}`);
  }
  // Both ways: a part of the copy left out, or a file added beside it, is a kit nobody reviewed as a whole.
  for (const path of [...new Set([...ours.keys(), ...theirs.keys()])].filter((p) => within(rule.same, p)).sort()) {
    if (differs(path)) return no(`${path} differs from ${name}`);
  }
  return { ok: true, compared: compared.size, reference: { repo: claim.repo, number: claim.number, head }, renders };
}

// The report of one role, in the form of templates/review-report.md, for the head ao-step compared.
export function kitCopyReport({ role, pr, key, reference, compared }) {
  const title = pr.title.endsWith(`(${key})`) ? pr.title : `${pr.title} (${key})`;
  const source = `${reference.repo}#${reference.number}`;
  return `${[
    `# Review: ${title}`,
    '',
    `Role: ${role}`,
    `${MARK} ${source} at ${reference.head}`,
    '',
    '## Context',
    '',
    `Không agent nào đọc PR này. \`ao-step\` so ${compared} file của bản chép kit với head của ${source}, nơi \`reviewer\` và \`security\` đã review đầy đủ, và file nào cũng khớp về nội dung, mode và loại. Các file render lại đã được dựng lại từ nguồn ở head của PR.`,
    '',
    '## Findings',
    '',
    '| Severity | Axis | Where | Finding | Suggested fix |',
    '|---|---|---|---|---|',
    '',
    '## Verdict',
    '',
    `Không có finding mới, vì nội dung giống hệt bản đã review ở ${source}. Bạn vẫn đọc diff và merge ở gate ③.`,
  ].join('\n')}\n`;
}
