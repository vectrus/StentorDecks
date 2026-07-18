/**
 * Source-tree update without GitHub Desktop.
 * Usage: npm run update [-- --stash] [-- --start]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = new Set(process.argv.slice(2));
const doStash = args.has('--stash');
const doStart = args.has('--start');

let electronTarget = '33.4.11';
try {
  const raw = require(path.join(root, 'package.json')).devDependencies.electron;
  electronTarget = String(raw).replace(/^[\^~>=\s]*/, '');
} catch {
  /* keep */
}

const env = {
  ...process.env,
  npm_config_runtime: 'electron',
  npm_config_target: electronTarget,
  npm_config_disturl: 'https://electronjs.org/headers',
  npm_config_build_from_source: 'false',
};

function run(cmd, cmdArgs, opts = {}) {
  console.info(`\n→ ${cmd} ${cmdArgs.join(' ')}`);
  const r = spawnSync(cmd, cmdArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env,
    ...opts,
  });
  if ((r.status ?? 1) !== 0) {
    console.error(`\nFAILED: ${cmd} ${cmdArgs.join(' ')} (exit ${r.status ?? 1})`);
    process.exit(r.status ?? 1);
  }
}

function gitOut(gitArgs) {
  const r = spawnSync('git', gitArgs, {
    cwd: root,
    encoding: 'utf8',
    shell: true,
  });
  if ((r.status ?? 1) !== 0) {
    throw new Error(r.stderr || r.stdout || `git ${gitArgs.join(' ')} failed`);
  }
  return (r.stdout || '').trim();
}

console.info(`
╔══════════════════════════════════════════╗
║  StentorDeck — update source tree        ║
╚══════════════════════════════════════════╝
`);

for (const bin of ['git', 'node', 'npm']) {
  const check = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
    encoding: 'utf8',
    shell: true,
  });
  if ((check.status ?? 1) !== 0) {
    console.error(`ERROR: ${bin} not found on PATH.`);
    process.exit(1);
  }
}

if (!fs.existsSync(path.join(root, '.git'))) {
  console.error('ERROR: not a git repo. For the installed app, use Settings → Check for updates.');
  process.exit(1);
}

let dirty = '';
try {
  dirty = gitOut(['status', '--porcelain']);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

if (dirty) {
  if (!doStash) {
    console.error('Working tree has local changes — refusing to overwrite.\n');
    console.error(dirty);
    console.error(`
Commit or stash first, then re-run:
  npm run update
Or stash automatically:
  npm run update -- --stash
`);
    process.exit(1);
  }
  console.info('Stashing local changes…');
  run('git', ['stash', 'push', '-u', '-m', 'stentordeck-update']);
  console.info('Restore later with:  git stash pop');
}

run('git', ['fetch', 'origin']);
run('git', ['pull', '--ff-only']);

console.info('Refreshing dependencies (Electron ABI)…');
run(npm, ['install']);
run(npm, ['run', 'rebuild:native']);

console.info('Refreshing Desktop shortcut…');
const sc = spawnSync(npm, ['run', 'shortcut'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
  env,
});
if ((sc.status ?? 1) !== 0) {
  console.warn('Shortcut refresh failed (continuing).');
}

console.info(`
Source update complete.
  Packaged booth app: Settings → Check for updates (after a GitHub Release).
  Launch: Start StentorDeck.bat  or  Desktop shortcut.
`);

if (doStart) {
  run(npm, ['start']);
}
