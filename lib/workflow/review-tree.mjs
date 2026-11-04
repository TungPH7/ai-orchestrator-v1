// The worktree of a PR under review holds the PR's code, and it sits inside the project, where the review session runs.
// Claude Code loads the instruction files of a folder when the agent reads a file in it: .claude/rules/ (seen in the
// review of ao-sample PR #13), CLAUDE.md, and AGENTS.md where the project has no CLAUDE.md (seen in its second review).
// Those of the PR would then steer the review of the PR. ao-step removes them from the worktree right after it is
// added; the agent reads them in the diff, or with git show. The names are those security found in Claude Code 2.1.318;
// a later version may load more.

// Names compared in lower case: Windows finds CLAUDE.md under the name claude.md.
const INSTRUCTION_FILES = ['claude.md', 'claude.local.md', 'agents.md'];
const INSTRUCTION_FOLDERS = ['.claude'];
// A worktree has no installed packages, so a node_modules in it is the PR's too; only git's own entry is skipped.
const SKIPPED = ['.git'];

// The instruction files and folders of a tree, as paths relative to it with forward slashes. The name decides before
// the type: a .claude that is a link to a folder is not a directory to readdir, and goes all the same. A link is not
// followed. fs: { readdirSync }.
export function instructionPaths(dir, { readdirSync }, prefix = '') {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${prefix}${entry.name}`;
    const name = entry.name.toLowerCase();
    if (INSTRUCTION_FOLDERS.includes(name) || INSTRUCTION_FILES.includes(name)) found.push(path);
    else if (entry.isDirectory() && !SKIPPED.includes(name)) found.push(...instructionPaths(`${dir}/${entry.name}`, { readdirSync }, `${path}/`));
  }
  return found;
}

// Removes them; returns the paths removed. rmSync removes a link, not what it points to. fs: { readdirSync, rmSync }.
export function removeInstructions(dir, fs) {
  const paths = instructionPaths(dir, fs);
  for (const path of paths) fs.rmSync(`${dir}/${path}`, { recursive: true, force: true });
  return paths;
}
