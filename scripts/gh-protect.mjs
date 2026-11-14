// gh:protect (quality-gates spec section 2.8): applies the rulesets ao-protected-merge, ao-protected-main,
// ao-release-branches, ao-release-tags and ao-protected to a project repository, with your GitHub CLI login, since it
// takes admin rights, and deletes ao-protected-release of Pilot 3, T9. Only the ao-merge App bypasses the ruleset of PRs
// on develop and release/*, and makes v* tags besides you (lib/quality/ruleset.mjs), so its id is needed:
// github.apps.merge_id of project.yaml. Run it from the kit repository, or let ao-kit setup github run it:
//   npm run gh:protect -- --repo <owner>/<name> --merge-app-id <id>
// A repository without rulesets, such as a private one on the Free plan, is left as it is: soft mode, exit code 0.
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readGates } from '../lib/quality/gates.mjs';
import { applyRulesets } from '../lib/quality/ruleset.mjs';
import { createGitHubClient, readGitHubToken } from '../lib/tracker/github-client.mjs';

try {
  const { values } = parseArgs({ options: { repo: { type: 'string' }, 'merge-app-id': { type: 'string' } } });
  const mergeAppId = Number(values['merge-app-id']);
  if (!/^[\w.-]+\/[\w.-]+$/.test(values.repo ?? '') || !Number.isInteger(mergeAppId) || mergeAppId <= 0) {
    throw new Error('usage: npm run gh:protect -- --repo <owner>/<name> --merge-app-id <id of the ao-merge App>');
  }
  const token = readGitHubToken();
  if (!token) throw new Error('Log in to the GitHub CLI with an account that is admin of the repository');
  const gates = readGates(fileURLToPath(new URL('../quality/', import.meta.url)));
  await applyRulesets(createGitHubClient({ repo: values.repo, token, write: true }), gates, { mergeAppId });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
