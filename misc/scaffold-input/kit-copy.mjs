// Copies the kit into a project checkout, as README "Cài kit vào repo dự án" steps 1 and 2 say, for release-workflow
// T19 (plan decision 6). Written for ao-pilot, kept as input for project-scaffold. Keeps the project's .claude/settings.json and settings.local.json; .claude/agents is rendered
// afterwards with render-agents. audit.yml is not copied: the deployer replaces it. Usage: node kit-copy.mjs <kit> <project>
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [kit, project] = process.argv.slice(2);
if (!existsSync(join(kit, 'kit')) || !existsSync(join(project, '.ai-orchestrator'))) throw new Error('usage: kit-copy.mjs <kit> <project>');
const ao = join(project, '.ai-orchestrator');
const fresh = (from, to) => {
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
};

for (const dir of ['contract', 'lib', 'tracker', 'quality', 'agents', 'templates']) fresh(join(kit, dir), join(ao, dir));
for (const file of ['package.json', 'package-lock.json']) cpSync(join(kit, file), join(ao, file));
mkdirSync(join(ao, 'docs'), { recursive: true });
cpSync(join(kit, 'docs', 'sdlc.md'), join(ao, 'docs', 'sdlc.md'));

const SCRIPTS = ['ao-agent.mjs', 'ao-git-credential.mjs', 'ao-pr.mjs', 'ao-step.mjs', 'audit.mjs', 'check-design.mjs', 'check-policy.mjs', 'commit-msg.mjs', 'coverage-diff.mjs', 'install-hooks.mjs', 'jira-sync.mjs', 'merge-gate.mjs', 'pre-commit.mjs', 'pre-push.mjs', 'render-agents.mjs'];
rmSync(join(ao, 'scripts'), { recursive: true, force: true });
mkdirSync(join(ao, 'scripts'));
for (const script of SCRIPTS) cpSync(join(kit, 'scripts', script), join(ao, 'scripts', script));

for (const dir of ['skills', 'hooks', 'rules']) fresh(join(kit, 'kit', '.claude', dir), join(project, '.claude', dir));
fresh(join(kit, 'kit', '.githooks'), join(project, '.githooks'));
cpSync(join(kit, 'kit', '.mcp.json'), join(project, '.mcp.json'));
cpSync(join(kit, 'kit', '.jira', 'config.yml'), join(project, '.jira', 'config.yml'));
for (const workflow of ['ci.yml', 'jira-sync.yml', 'merge-gate.yml']) cpSync(join(kit, 'kit', '.github', 'workflows', workflow), join(project, '.github', 'workflows', workflow));

// spec 2.3: the deploy.yaml of ao-pilot.
writeFileSync(
  join(ao, 'deploy.yaml'),
  [
    '# How the deployer of the kit builds, runs and smoke-tests ao-pilot on the VPS (release-workflow spec 2.3, 2.9).',
    '# Values of the variables live on the VPS in /etc/ao/secrets/pilot/<environment>.env; the deployer adds AO_PUBLIC_URL.',
    'apps:',
    '  web:',
    '    dockerfile: Dockerfile',
    '    port: 3000',
    '    health: /',
    '    public: true',
    '    env: [HOST, PORT]',
    'smoke:',
    '  - { app: web, path: /, expect_status: 200, expect_text: "Giỏ hàng" }',
    '',
  ].join('\n'),
);
console.log('kit copied');
