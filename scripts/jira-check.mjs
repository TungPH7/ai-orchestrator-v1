// Reports where the live Jira configuration of a space differs from tracker/jira.yaml (tracker-integration spec
// section 2.10), and exits non-zero when it does. Only sends GET requests, with your read-only token.
// Usage: node scripts/jira-check.mjs --space <KEY> [contract-dir]
// Needs JIRA_ADMIN_EMAIL and JIRA_ADMIN_TOKEN.
import { join } from 'node:path';
import { formatError, loadContract } from '../lib/contract.mjs';
import { findDrift, manualChecks, readJiraConfig, tokenWarnings } from '../lib/tracker/drift.mjs';
import { basicAuth, createJiraClient } from '../lib/tracker/jira-client.mjs';
import { readMapping, validateMapping } from '../lib/tracker/mapping.mjs';

const USAGE = 'Usage: node scripts/jira-check.mjs --space <KEY> [contract-dir]';
const args = process.argv.slice(2);
const at = args.indexOf('--space');
const space = at === -1 ? undefined : args[at + 1];
const [dir = 'contract'] = args.filter((_, index) => index !== at && index !== at + 1);

try {
  if (!space || space.startsWith('--')) throw new Error(USAGE);
  const missing = ['JIRA_ADMIN_EMAIL', 'JIRA_ADMIN_TOKEN'].filter((name) => !process.env[name]);
  if (missing.length > 0) throw new Error(`Set ${missing.join(' and ')}: your Atlassian email and your read-only API token`);

  const contract = loadContract(dir);
  const trackerDir = join(dir, '..', 'tracker');
  const mapping = readMapping(trackerDir);
  const errors = validateMapping(mapping, contract);
  if (errors.length > 0) throw new Error(`Invalid mapping in ${trackerDir}:\n${errors.map(formatError).join('\n')}`);

  const client = createJiraClient({
    cloudId: mapping.cloud_id,
    authorization: basicAuth(process.env.JIRA_ADMIN_EMAIL, process.env.JIRA_ADMIN_TOKEN),
  });
  const drift = findDrift(await readJiraConfig(client, { space, mapping }), { contract, mapping });
  for (const { message } of drift) console.log(message);
  // Neither of these fails the check: the API cannot show the first, and the second is only a reminder.
  for (const check of manualChecks(contract, mapping)) console.log(`Check by hand: ${check}`);
  for (const warning of tokenWarnings(mapping)) console.log(`Warning: ${warning}`);
  if (drift.length > 0) {
    console.error(`${drift.length} difference(s) between Jira and ${join(trackerDir, 'jira.yaml')}`);
    process.exitCode = 1;
  } else {
    console.log(`Jira space ${space} matches ${join(trackerDir, 'jira.yaml')}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
