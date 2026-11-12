// npm run profiles:check (project-scaffold spec 3): builds each profile of profiles/ in a temporary folder, as ao-kit
// init would, then runs npm ci and the four scripts the build-test job of CI runs. Kit only: the workflow profiles.yml
// runs it when a PR changes a profile or lib/scaffold/. It needs the network, for npm ci, and a few minutes.
// Usage: node scripts/profiles-check.mjs [<profile> ...]
import { mkdtempSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runNpm } from '../lib/quality/npm.mjs';
import { REQUIRED_SCRIPTS } from '../lib/scaffold/project-config.mjs';
import { copyProfile, readProfile } from '../lib/scaffold/profile.mjs';

const kitDir = fileURLToPath(new URL('..', import.meta.url));
const names = process.argv.slice(2).length > 0 ? process.argv.slice(2) : readdirSync(join(kitDir, 'profiles'));
let failed = 0;
for (const name of names) {
  const profile = readProfile(kitDir, name);
  // The long form of the temp folder: Vite does not find the tests under a Windows short name such as HUUTUN~1.
  const dir = mkdtempSync(join(realpathSync.native(tmpdir()), `profile-${name}-`));
  try {
    copyProfile({ profile, projectDir: dir, name: 'ao-skeleton', title: 'AO Skeleton' });
    for (const args of [['ci', '--no-audit', '--no-fund'], ...REQUIRED_SCRIPTS.map((script) => ['run', script])]) {
      const started = Date.now();
      const run = runNpm(args, { cwd: dir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const seconds = Math.round((Date.now() - started) / 1000);
      if (run.status !== 0) {
        console.error(`${name}: npm ${args.join(' ')} failed after ${seconds} s\n${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().slice(-3000)}`);
        failed += 1;
        break;
      }
      console.log(`${name}: npm ${args.join(' ')} OK, ${seconds} s`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
process.exitCode = failed > 0 ? 1 : 0;
