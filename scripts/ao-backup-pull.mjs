// ao-backup-pull.mjs (Pilot 3, spec 2.4; docs/vps-setup.md, section 16): your machine pulls the encrypted copies of the
// database backups from the VPS, as aobackup over SFTP, read only. It runs from the kit on your machine, not from a
// project. It removes nothing on the VPS; on your machine it keeps the copies the VPS keeps (Pilot 3, spec 2.9). The
// decisions are in lib/release/backup-pull.mjs.
//   node scripts/ao-backup-pull.mjs keygen --identity <file>       a new age key pair: the identity goes to <file>, which
//                                                                  you move into your password manager; the recipient
//                                                                  (age1…) is printed for deployer.yaml
//   node scripts/ao-backup-pull.mjs pull --host <ssh host> --dest <folder>
//   node scripts/ao-backup-pull.mjs install --host <ssh host> --dest <folder>   the task of Windows that runs pull
//   node scripts/ao-backup-pull.mjs status [--dest <folder>]       the age of the newest copies; exit 1 past 36 hours
//   node scripts/ao-backup-pull.mjs decrypt <copy.age> --identity - --out <file>   the identity pasted on stdin, as
//                                                                  Get-Clipboard | node … gives it; or a file, such as on a USB key
// <ssh host> is a Host of your ~/.ssh/config, such as ao-backup, with the user aobackup and its own key. The identity
// never stays on this machine: an agent runs as your Windows user and reads what you read (review of shop PR #13).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { decryptFile, newKeyPair } from '../lib/release/backup-copy.mjs';
import { LIST_BATCH, PULL_CONFIG, TASK_NAME, copyAges, getBatch, isFuture, localCopies, localPath, parseListing, taskScript, toPrune, toPull } from '../lib/release/backup-pull.mjs';

const STALE_HOURS = 36;
const CONFIG = PULL_CONFIG;
const SFTP = process.platform === 'win32' ? 'C:\\Windows\\System32\\OpenSSH\\sftp.exe' : 'sftp';
const USAGE = 'usage: node ao-backup-pull.mjs keygen --identity <file> | pull --host <ssh host> --dest <folder> | install --host <ssh host> --dest <folder> | status [--dest <folder>] | decrypt <copy.age> --identity <-|file> --out <file>';

function sftp(host, batch) {
  const done = spawnSync(SFTP, ['-q', '-o', 'BatchMode=yes', '-b', '-', host], { input: batch, encoding: 'utf8', timeout: 30 * 60_000 });
  if (done.error) throw done.error;
  if (done.status !== 0) throw new Error(`sftp to ${host} failed: ${`${done.stderr ?? ''}`.trim().split('\n').at(-1) || `exit ${done.status}`}`);
  return done.stdout ?? '';
}

function report(dest) {
  const ages = copyAges(localCopies(dest), new Date());
  if (ages.length === 0) {
    console.log(`ao-backup-pull: no copy in ${dest} yet`);
    return false;
  }
  let fresh = true;
  for (const { project, env, name, hours } of ages) {
    const old = hours > STALE_HOURS;
    if (old) fresh = false;
    console.log(`ao-backup-pull: ${project}/${env}: newest copy ${name}, ${hours} h old${old ? `: older than ${STALE_HOURS} h, see docs/vps-setup.md section 16` : ''}`);
  }
  return fresh;
}

function pull(host, dest) {
  mkdirSync(dest, { recursive: true });
  const now = new Date();
  const listed = parseListing(sftp(host, LIST_BATCH));
  // A copy dated in the future stays on the VPS: it would pass for the newest one for ever (review of shop PR #13).
  const future = listed.filter((file) => isFuture(file, now));
  for (const file of future) console.log(`ao-backup-pull: left ${file.path} on ${host}: its name holds a time later than now, which no backup run writes`);
  const remote = listed.filter((file) => !isFuture(file, now));
  const missing = toPull(remote, dest, existsSync);
  for (const file of missing) mkdirSync(dirname(localPath(dest, file)), { recursive: true });
  let error = null;
  if (missing.length > 0) {
    try {
      sftp(host, getBatch(missing, dest));
    } catch (failure) {
      error = failure.message;
    }
  }
  const pulled = [];
  for (const file of missing) {
    const target = localPath(dest, file);
    const part = `${target}.part`;
    if (existsSync(part) && statSync(part).size > 0) {
      renameSync(part, target);
      pulled.push(file.name);
    } else rmSync(part, { force: true });
  }
  // This machine keeps the copies the VPS keeps, and lets the older ones go (Pilot 3, spec 2.9).
  const pruned = toPrune(localCopies(dest).filter((file) => !isFuture(file, now)));
  for (const file of pruned) rmSync(localPath(dest, file), { force: true });
  writeFileSync(join(dest, 'last-pull.json'), `${JSON.stringify({ at: new Date().toISOString(), host, listed: remote.length, future: future.map(({ path }) => path), pulled, pruned: pruned.map(({ name }) => name), error }, null, 2)}\n`);
  console.log(`ao-backup-pull: ${remote.length} copies on ${host}, ${pulled.length} pulled into ${dest}, ${pruned.length} older ones let go${error ? `; ${error}` : ''}`);
  return report(dest) && !error && future.length === 0;
}

// The identity: pasted on stdin with --identity -, else read from the file named, such as one on a USB key.
function readIdentity(where) {
  const text = (where === '-' ? readFileSync(0, 'utf8') : readFileSync(where, 'utf8')).trim();
  if (!text) throw new Error(where === '-' ? 'no identity on stdin: paste it, as Get-Clipboard | node … decrypt … --identity - does' : `${where} is empty`);
  return text;
}

function install(host, dest) {
  const script = taskScript({ node: process.execPath, script: fileURLToPath(import.meta.url), host, dest });
  const done = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], { input: script, encoding: 'utf8' });
  if (done.status !== 0) throw new Error(`the task of Windows was not registered: ${`${done.stderr ?? ''}`.trim().split('\n').at(-1)}`);
  mkdirSync(dirname(CONFIG), { recursive: true });
  writeFileSync(CONFIG, `${JSON.stringify({ host, dest }, null, 2)}\n`);
  console.log(`ao-backup-pull: task ${TASK_NAME} registered, every day at 09:00 and at each sign-in; ${CONFIG} written`);
}

const { values, positionals } = parseArgs({ allowPositionals: true, options: { host: { type: 'string' }, dest: { type: 'string' }, identity: { type: 'string' }, out: { type: 'string' } } });
const [command, file] = positionals;
try {
  if (command === 'keygen' && values.identity) {
    if (existsSync(values.identity)) throw new Error(`${values.identity} exists: a new key would make the copies made for the old one unreadable with it`);
    const { identity, recipient } = await newKeyPair();
    writeFileSync(values.identity, `${identity}\n`, { flag: 'wx', mode: 0o600 });
    console.log(`ao-backup-pull: identity written to ${values.identity}: move it into your password manager, then delete ${values.identity}. An agent runs as your Windows user, so the identity must not stay on this machine; decrypt reads it from stdin (--identity -)`);
    console.log(recipient);
  } else if (command === 'pull' && values.host && values.dest) process.exitCode = pull(values.host, values.dest) ? 0 : 1;
  else if (command === 'install' && values.host && values.dest) install(values.host, values.dest);
  else if (command === 'status') {
    const dest = values.dest ?? (existsSync(CONFIG) ? JSON.parse(readFileSync(CONFIG, 'utf8')).dest : null);
    if (!dest) throw new Error(`no --dest and no ${CONFIG}: run install first`);
    process.exitCode = report(dest) ? 0 : 1;
  } else if (command === 'decrypt' && file && values.identity && values.out) {
    await decryptFile(file, values.out, readIdentity(values.identity));
    console.log(`ao-backup-pull: ${values.out} written, ${statSync(values.out).size} bytes`);
  } else {
    console.error(USAGE);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`ao-backup-pull: ${error.message}`);
  process.exitCode = 1;
}
