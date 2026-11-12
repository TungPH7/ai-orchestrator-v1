// Starts both apps for local work: web on :3000, api on :3001. Ctrl+C stops both.
// npm runs as npm-cli.js under node, never through a shell. On Windows npm is npm.cmd, which Node starts only through
// a shell, and CI blocks that (Semgrep spawn-shell-true). `npm run dev` names npm-cli.js in npm_execpath.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const nodeDir = dirname(process.execPath);
const npmCli = [process.env.npm_execpath, join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js')].find((file) => file?.endsWith('.js') && existsSync(file));

const apps = [
  ['web', ['run', 'dev', '-w', 'web']],
  ['api', ['run', 'start:dev', '-w', 'api']],
];

const children = apps.map(([name, args]) => {
  const child = npmCli ? spawn(process.execPath, [npmCli, ...args], { stdio: 'inherit' }) : spawn('npm', args, { stdio: 'inherit' });
  child.on('exit', (code) => console.log(`${name} stopped (${code})`));
  return child;
});

process.on('SIGINT', () => {
  for (const child of children) child.kill('SIGINT');
});
