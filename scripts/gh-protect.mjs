// gh:protect (quality-gates spec section 2.8): applies the ruleset ao-protected to a project repository, with your
// GitHub CLI login, since it takes admin rights. Run it from the kit repository:
//   npm run gh:protect -- --repo <owner>/<name>
// A repository without rulesets, such as a private one on the Free plan, is left as it is: soft mode, exit code 0.
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { readGates } from '../lib/quality/gates.mjs';
import { applyRuleset } from '../lib/quality/ruleset.mjs';
import { createGitHubClient, readGitHubToken } from '../lib/tracker/github-client.mjs';

try {
  const { values } = parseArgs({ options: { repo: { type: 'string' } } });
  if (!/^[\w.-]+\/[\w.-]+$/.test(values.repo ?? '')) throw new Error('usage: npm run gh:protect -- --repo <owner>/<name>');
  const token = readGitHubToken();
  if (!token) throw new Error('Log in to the GitHub CLI with an account that is admin of the repository');
  const gates = readGates(fileURLToPath(new URL('../quality/', import.meta.url)));
  await applyRuleset(createGitHubClient({ repo: values.repo, token, write: true }), gates);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
