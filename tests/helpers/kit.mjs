// Temp copies of the kit for tests that need files on disk.
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const CONTRACT_DIR = join(ROOT, 'contract');

// Copies the real contract YAML files into a fresh temp folder, then applies { 'relative/path': text },
// where null leaves a file out. The folder is removed when the test ends.
export function makeKit(t, files) {
  const root = mkdtempSync(join(tmpdir(), 'kit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const real = readdirSync(CONTRACT_DIR).filter((file) => file.endsWith('.yaml'));
  const all = { ...Object.fromEntries(real.map((file) => [`contract/${file}`, readFileSync(join(CONTRACT_DIR, file), 'utf8')])), ...files };
  for (const [path, text] of Object.entries(all)) {
    if (text === null) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}
