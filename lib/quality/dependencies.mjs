// Libraries approved before they are installed (C1 spec section 5): the list `dependencies.approved` of the project's
// .ai-orchestrator/project.yaml, a protected file the kit copy leaves alone, with the project's own audit exceptions
// beside it. The policy job, gh-guard and dep-check read it through these. Pure.

export const ECOSYSTEMS = ['npm', 'maven'];

// The dependencies block of a project.yaml config: { approved, exceptions }, empty when it has none.
export function projectDependencies(config) {
  const block = config?.dependencies ?? {};
  return { approved: block.approved ?? [], exceptions: block.exceptions ?? [] };
}

// The audit rule of the policy job: the kit's level and exceptions, with the project's exceptions added. A kit copy no
// longer wipes them, as it wiped the picomatch exception of shop at SHOP-74.
export function auditRule(gates, config) {
  return { ...gates.dependencies, exceptions: [...(gates.dependencies.exceptions ?? []), ...projectDependencies(config).exceptions] };
}

// Whether `name` of `ecosystem` is on the approved list. A Maven name is groupId:artifactId; npm names compare in lower
// case, as the registry keeps them.
export function isApproved(approved, ecosystem, name) {
  const key = ecosystem === 'npm' ? String(name).toLowerCase() : String(name);
  return approved.some((entry) => entry.ecosystem === ecosystem && (ecosystem === 'npm' ? entry.name.toLowerCase() : entry.name) === key);
}

const NPM_FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

// The direct dependencies a package.json names, or [] for a text that is not JSON.
export function packageJsonDependencies(text) {
  let json;
  try {
    json = JSON.parse(text ?? '');
  } catch {
    return [];
  }
  return [...new Set(NPM_FIELDS.flatMap((field) => Object.keys(json?.[field] ?? {})))].sort();
}

// The groupId:artifactId of each <dependency> of a pom.xml, those in <dependencyManagement> and <plugins> included, as
// written: a coordinate that takes a ${property} is kept as it reads.
export function pomDependencies(text) {
  const found = new Set();
  for (const [, block] of String(text ?? '').replace(/<!--[\s\S]*?-->/g, '').matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)) {
    const group = /<groupId>\s*([^<\s]+)\s*<\/groupId>/.exec(block)?.[1];
    const artifact = /<artifactId>\s*([^<\s]+)\s*<\/artifactId>/.exec(block)?.[1];
    if (group && artifact) found.add(`${group}:${artifact}`);
  }
  return [...found].sort();
}

// The direct dependencies a change adds: in `after`, not in `before` (the same file at the base, or '' for a new file).
// A version change of a dependency already there is not new: audit and osv-scanner check it.
export function addedDependencies({ path, before = '', after = '' }) {
  const read = /(^|\/)pom\.xml$/.test(path) ? pomDependencies : /(^|\/)package\.json$/.test(path) ? packageJsonDependencies : null;
  if (!read) return [];
  const was = new Set(read(before));
  return read(after).filter((name) => !was.has(name)).map((name) => ({ ecosystem: read === pomDependencies ? 'maven' : 'npm', name }));
}

// The problems of the policy job for the dependencies a PR adds: one per name not on the approved list. changes:
// [{ path, before, after }] of the package.json and pom.xml files the PR changes. The workspace packages of the project
// itself (`own`, names of its package.json files) are not libraries.
export function unapprovedDependencies(changes, approved, own = []) {
  const problems = [];
  for (const change of changes) {
    for (const { ecosystem, name } of addedDependencies(change)) {
      if (ecosystem === 'npm' && own.includes(name)) continue;
      if (ecosystem === 'maven' && /\$\{/.test(name)) continue;
      if (!isApproved(approved, ecosystem, name)) problems.push(`${change.path}: ${name} (${ecosystem}) is new and not on dependencies.approved of project.yaml: run node .ai-orchestrator/scripts/dep-check.mjs ${ecosystem} ${name}@<version> first`);
    }
  }
  return problems;
}

// The verdict of dep-check from what it read about one version of a library (C1 spec section 5): { ok, problems,
// notes }. facts: { vulnerabilities: [ids], license, published (ISO), downloads (a week, or null for Maven),
// maintainers (count, or null), installScripts: [names], provenance (true, false, or null when the registry has no such
// thing), errors: [what could not be read] }. A check that could not be read makes the verdict "suspicious", never "ok".
export const MIN_AGE_DAYS = 14;
export const MIN_WEEKLY_DOWNLOADS = 1000;
export function depVerdict(facts, { licenses, today }) {
  const problems = [];
  const notes = [];
  for (const error of facts.errors ?? []) problems.push(`could not read ${error}`);
  if (facts.vulnerabilities?.length > 0) problems.push(`known vulnerabilities: ${facts.vulnerabilities.join(', ')}`);
  if (!facts.license) problems.push('no license');
  else if (!licenseAllowed(facts.license, licenses)) problems.push(`license ${facts.license} is not on dependencies.licenses of quality/gates.yaml`);
  if (facts.published) {
    const days = Math.floor((Date.parse(today) - Date.parse(facts.published)) / 86400000);
    if (days < MIN_AGE_DAYS) problems.push(`published ${days} days ago, less than ${MIN_AGE_DAYS}`);
  }
  if (facts.downloads != null && facts.downloads < MIN_WEEKLY_DOWNLOADS) problems.push(`${facts.downloads} downloads last week, fewer than ${MIN_WEEKLY_DOWNLOADS}`);
  if (facts.maintainers === 0) problems.push('no maintainer listed');
  else if (facts.maintainers === 1) notes.push('one maintainer');
  if (facts.installScripts?.length > 0) problems.push(`runs scripts at install: ${facts.installScripts.join(', ')}`);
  if (facts.provenance === false) notes.push('no npm provenance');
  return { ok: problems.length === 0, problems, notes };
}

// An SPDX expression is allowed when one of its OR branches has only allowed licenses.
export function licenseAllowed(expression, licenses) {
  const branches = String(expression).replace(/[()]/g, ' ').split(/\s+OR\s+/i);
  return branches.some((branch) => branch.split(/\s+AND\s+/i).map((id) => id.trim()).filter(Boolean).every((id) => licenses.includes(id)));
}
