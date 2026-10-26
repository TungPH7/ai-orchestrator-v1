// Temp copies of the kit for tests that need files on disk.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CONTRACT_DIR = join(ROOT, 'contract');
const TEMPLATE_DIR = join(ROOT, 'templates');

// Copies the real contract YAML files and, unless `templates` is false, the real templates into a fresh temp folder,
// then applies { 'relative/path': text }, where null leaves a file out. The folder is removed when the test ends.
export function makeKit(t, files, { templates = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const copy = (dir, prefix, filter) =>
    readdirSync(dir).filter(filter).map((file) => [`${prefix}/${file}`, readFileSync(join(dir, file), 'utf8')]);
  const all = {
    ...Object.fromEntries(copy(CONTRACT_DIR, 'contract', (file) => file.endsWith('.yaml'))),
    ...(templates ? Object.fromEntries(copy(TEMPLATE_DIR, 'templates', () => true)) : {}),
    ...files,
  };
  for (const [path, text] of Object.entries(all)) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
