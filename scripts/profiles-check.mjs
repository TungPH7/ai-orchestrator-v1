// npm run profiles:check (project-scaffold spec 3): builds each profile of profiles/ in a temporary folder, as ao-kit
// init would, then installs its packages and runs the four scripts the build-test job of CI runs. A profile with no app
// of its own, such as base-pnpm, is built with the stacks of profiles/stacks/ instead, as a project of ao-kit add would
// be: base-pnpm with an app web of the stack nextjs and an app admin of the stack react (project-scaffold part 2,
// spec 2.3). Kit only: the workflow profiles.yml runs it when a PR changes a profile or lib/scaffold/. It needs the
// network, to install the packages, and a few minutes.
// Usage: node scripts/profiles-check.mjs [<profile> ...]
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManager } from '../lib/quality/package-manager.mjs';
import { REQUIRED_SCRIPTS } from '../lib/scaffold/project-config.mjs';
import { copyProfile, copyStack, profileNames, readProfile, readStack } from '../lib/scaffold/profile.mjs';

const kitDir = fileURLToPath(new URL('..', import.meta.url));
const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : profileNames(kitDir);
// The apps a profile with no app of its own is built with: name, stack, port.
const STACK_APPS = [
  ['web', 'nextjs', 3000],
  ['admin', 'react', 5173],
];
const project = { name: 'ao-skeleton', title: 'AO Skeleton' };

let failed = 0;
for (const name of names) {
  const profile = readProfile(kitDir, name);
  const manager = profile.package_manager;
  const withStacks = Object.keys(profile.apps ?? {}).length === 0;
  const label = withStacks ? `${name} + ${STACK_APPS.map(([app, stack]) => `${app} (${stack})`).join(' + ')}` : name;
  // The long form of the temp folder: Vite does not find the tests under a Windows short name such as HUUTUN~1.
  const dir = mkdtempSync(join(realpathSync.native(tmpdir()), `profile-${name}-`));
  try {
    copyProfile({ profile, projectDir: dir, ...project });
    if (withStacks) {
      for (const [app, stack, port] of STACK_APPS) copyStack({ stack: readStack(kitDir, stack), projectDir: dir, app, port, ...project });
    }
    // A profile that ships its lockfile installs it as it is; one that has none yet makes it, as ao-kit add does.
    const install = manager === 'npm' ? ['ci', '--no-audit', '--no-fund'] : ['install'];
    for (const args of [install, ...REQUIRED_SCRIPTS.map((script) => ['run', script])]) {
      const started = Date.now();
      const run = runManager(manager, args, { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const seconds = Math.round((Date.now() - started) / 1000);
      if (run.status !== 0) {
        console.error(`${label}: ${manager} ${args.join(' ')} failed after ${seconds} s\n${`${run.stdout ?? ''}${run.stderr ?? ''}${run.error?.message ?? ''}`.trim().slice(-3000)}`);
        failed += 1;
        break;
      }
      console.log(`${label}: ${manager} ${args.join(' ')} OK, ${seconds} s`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
process.exitCode = failed > 0 ? 1 : 0;
