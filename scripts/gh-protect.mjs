// gh:protect (quality-gates spec section 2.8): applies the rulesets ao-protected, ao-protected-merge and
// ao-protected-release to a project repository, with your GitHub CLI login, since it takes admin rights. The ao-dev App
// bypasses the two rulesets of PRs (lib/quality/ruleset.mjs), so its id is needed: github.apps.dev_id of project.yaml.
// Run it from the kit repository, or let ao-kit setup github run it:
//   npm run gh:protect -- --repo <owner>/<name> --dev-app-id <id>
// A repository without rulesets, such as a private one on the Free plan, is left as it is: soft mode, exit code 0.
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readGates } from '../lib/quality/gates.mjs';
import { applyRulesets } from '../lib/quality/ruleset.mjs';
import { createGitHubClient, readGitHubToken } from '../lib/tracker/github-client.mjs';

try {
  const { values } = parseArgs({ options: { repo: { type: 'string' }, 'dev-app-id': { type: 'string' } } });
  const devAppId = Number(values['dev-app-id']);
  if (!/^[\w.-]+\/[\w.-]+$/.test(values.repo ?? '') || !Number.isInteger(devAppId) || devAppId <= 0) {
    throw new Error('usage: npm run gh:protect -- --repo <owner>/<name> --dev-app-id <id of the ao-dev App>');
  }
  const token = readGitHubToken();
  if (!token) throw new Error('Log in to the GitHub CLI with an account that is admin of the repository');
  const gates = readGates(fileURLToPath(new URL('../quality/', import.meta.url)));
  await applyRulesets(createGitHubClient({ repo: values.repo, token, write: true }), gates, { devAppId });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
