// ao-kit (project-scaffold spec 2.2): sets a project up with the kit, from the clone of the kit on your machine. It is
// not copied into projects. Each command can run again: what is done already is skipped and said so.
// Usage: node <kit>/scripts/ao-kit.mjs <command> <project dir>
//   check <dir>   project.yaml against its schema, deploy.yaml, package.json and the folders; writes nothing
// Exit: 0 when it did what it says, 1 when the project has a problem it names, 2 on a wrong command line.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { checkProject, PROJECT_FILE, readProjectConfig } from '../lib/scaffold/project-config.mjs';

const USAGE = 'usage: node <kit>/scripts/ao-kit.mjs check <project dir>';
const COMMANDS = { check };

function check(dir) {
  const file = join(dir, PROJECT_FILE);
  if (!existsSync(file)) {
    console.log(`no ${PROJECT_FILE} in ${dir}: write it as SPEC-project-scaffold.md 2.1 shows`);
    return 1;
  }
  const { config, errors } = readProjectConfig(readFileSync(file, 'utf8'));
  const read = (path) => (existsSync(join(dir, path)) ? readFileSync(join(dir, path), 'utf8') : null);
  const packageText = read('package.json');
  const problems = [
    ...errors,
    ...(config && errors.length === 0
      ? checkProject({ config, deployText: read('.ai-orchestrator/deploy.yaml'), packageJson: packageText ? JSON.parse(packageText) : null, exists: (path) => existsSync(join(dir, path)) })
      : []),
  ];
  for (const { rule, path, message } of problems) console.log(`${rule} ${path}: ${message}`);
  if (problems.length > 0) return 1;
  const apps = Object.keys(config.apps);
  console.log(`project.yaml OK: ${apps.length} app${apps.length === 1 ? '' : 's'} (${apps.join(', ')}), space ${config.jira.space}, repo ${config.github.repo}`);
  return 0;
}

const [command, dir] = process.argv.slice(2);
if (!COMMANDS[command] || !dir) {
  console.error(USAGE);
  process.exit(2);
}
process.exitCode = COMMANDS[command](resolve(dir));
