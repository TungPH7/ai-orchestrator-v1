// Which kit the hooks of agents load (review round 3 of shop PR #21, security): they take it from AO_KIT_DIR when set,
// else from .ai-orchestrator/ of the project. A clone at AO_KIT_DIR left behind the kit copy of the project runs an
// older gh-guard and jira-guard than the project was reviewed with. Pure, with read(path) the text of a file or null,
// and list(dir) the paths of the files under a folder, relative to it.

// The folders whose files the hooks load, directly or through imports, and the settings they read (gates.yaml, the
// contract). Round 4 of the review: a list of 7 files missed 18 modules the hooks import, so the whole folders count.
export const HOOK_FOLDERS = ['lib', 'quality', 'contract'];

// The files of HOOK_FOLDERS that differ between the kit at kitDir and the kit copy at copyDir, or are in one only, with
// forward slashes. [] when they agree, or when the two are the same folder.
export function hookKitDrift({ kitDir, copyDir, read, list }) {
  const base = (dir) => dir.replaceAll('\\', '/').replace(/\/+$/, '');
  if (base(kitDir).toLowerCase() === base(copyDir).toLowerCase()) return [];
  const files = (dir) => HOOK_FOLDERS.flatMap((folder) => list(`${base(dir)}/${folder}`).map((path) => `${folder}/${path.replaceAll('\\', '/')}`));
  const all = [...new Set([...files(kitDir), ...files(copyDir)])].sort();
  return all.filter((file) => read(`${base(kitDir)}/${file}`) !== read(`${base(copyDir)}/${file}`));
}

// The line ao-step prints when they differ, or null: the first three files and how many more.
export function hookKitNote(drift, kitDir) {
  if (drift.length === 0) return null;
  const named = drift.slice(0, 3).join(', ') + (drift.length > 3 ? ` and ${drift.length - 3} more` : '');
  return `Note: the hooks of agents load the kit in AO_KIT_DIR (${kitDir}), and ${drift.length} of its files differ from the kit copy of this project (${named}): bring that clone to the kit of the project (git pull), so agents run the gh-guard and jira-guard the project was reviewed with.`;
}
