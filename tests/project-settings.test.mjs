import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { APP_SETTINGS, appSettings, projectSettings } from '../lib/project-settings.mjs';

// The settings of the two GitHub Apps live in the env block of the project's .claude/settings.json, which only Claude
// Code hands to the hooks. A kit script run from a shell outside Claude Code reads them there (project-scaffold part 3,
// spec 2.6: ao-pr.mjs, as ao-agent.mjs already did).
test('the settings of the Apps: the environment first, then .claude/settings.json; placeholders of the kit count as unset', () => {
  const settings = { AO_DEV_APP: 'acme-ao-dev', AO_DEV_APP_ID: '11', AO_REVIEW_APP: '<review-app-slug>', AO_REVIEW_APP_ID: '12', AO_JIRA_SPACE: 'SHOP' };
  assert.deepEqual(appSettings(settings, { AO_DEV_APP_ID: '99' }), { AO_DEV_APP: 'acme-ao-dev', AO_DEV_APP_ID: '99', AO_REVIEW_APP_ID: '12' });
  assert.deepEqual(APP_SETTINGS, ['AO_DEV_APP', 'AO_DEV_APP_ID', 'AO_REVIEW_APP', 'AO_REVIEW_APP_ID', 'AO_MERGE_APP', 'AO_MERGE_APP_ID']);
  assert.deepEqual(appSettings({}, {}), {});
});

test('projectSettings reads the env block of .claude/settings.json, and nothing when the file is missing or broken', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'settings-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  assert.deepEqual(projectSettings(dir), {});
  mkdirSync(join(dir, '.claude'));
  writeFileSync(join(dir, '.claude', 'settings.json'), JSON.stringify({ env: { AO_DEV_APP: 'acme-ao-dev' } }));
  assert.deepEqual(projectSettings(dir), { AO_DEV_APP: 'acme-ao-dev' });
  writeFileSync(join(dir, '.claude', 'settings.json'), '{ not json');
  assert.deepEqual(projectSettings(dir), {});
});
