/**
 * Publish release/ artifacts to a full (non-prerelease) GitHub Release.
 * electron-updater needs latest.yml on a discoverable release — Setup.exe alone is not enough.
 * Always uploads StentorDeck-ReleaseNotes-<version>.txt with the installer.
 *
 * Usage: GH_TOKEN=… node scripts/publish-github-release.mjs
 * Or:    GITHUB_TOKEN=… npm run publish:github
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const releaseDir = process.env.RELEASE_DIR
  ? join(root, process.env.RELEASE_DIR)
  : join(root, 'release');
const owner = 'vectrus';
const repo = 'StentorDecks';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Set GH_TOKEN or GITHUB_TOKEN (repo scope) and re-run.');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const setupName = `StentorDeck-Setup-${version}.exe`;
const notesName = `StentorDeck-ReleaseNotes-${version}.txt`;
const setupPath = join(releaseDir, setupName);
const latestYml = join(releaseDir, 'latest.yml');
const notesPath = join(releaseDir, notesName);

// Ensure release notes txt exists next to the exe.
const writeNotes = spawnSync(process.execPath, [join(root, 'scripts', 'write-release-notes.mjs')], {
  cwd: root,
  env: { ...process.env, RELEASE_DIR: process.env.RELEASE_DIR || 'release' },
  encoding: 'utf8',
});
if (writeNotes.status !== 0) {
  console.error(writeNotes.stderr || writeNotes.stdout);
  process.exit(writeNotes.status ?? 1);
}

if (!existsSync(setupPath) || !existsSync(latestYml) || !existsSync(notesPath)) {
  console.error(
    `Missing required assets in ${releaseDir}:\n` +
      `  - ${setupName}\n` +
      `  - latest.yml\n` +
      `  - ${notesName}\n` +
      `Run: npm run dist  (then npm run publish:github)`,
  );
  process.exit(1);
}

const notesBody = readFileSync(notesPath, 'utf8');

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'stentordeck-publish',
};

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  }
  return body;
}

const existing = await gh(`/repos/${owner}/${repo}/releases/tags/${tag}`).catch(() => null);
let release = existing;
if (!release) {
  console.log(`Creating release ${tag}…`);
  release = await gh(`/repos/${owner}/${repo}/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tag_name: tag,
      name: `StentorDeck ${version}`,
      body: notesBody,
      draft: false,
      prerelease: false,
      make_latest: 'true',
      target_commitish: 'main',
    }),
  });
} else {
  console.log(`Release ${tag} already exists (id ${release.id}); updating notes + assets…`);
  await gh(`/repos/${owner}/${repo}/releases/${release.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: notesBody,
      prerelease: false,
      draft: false,
      make_latest: 'true',
    }),
  });
  // Refresh asset list after PATCH
  release = await gh(`/repos/${owner}/${repo}/releases/${release.id}`);
}

const assetNames = new Set([
  setupName,
  notesName,
  'latest.yml',
  `${setupName}.blockmap`,
]);

const toUpload = readdirSync(releaseDir)
  .filter((name) => assetNames.has(name))
  .map((name) => join(releaseDir, name));

for (const p of [setupPath, latestYml, notesPath]) {
  if (!toUpload.includes(p)) toUpload.push(p);
}

for (const filePath of [...new Set(toUpload)]) {
  if (!existsSync(filePath)) continue;
  const name = basename(filePath);
  const existingAsset = (release.assets || []).find((a) => a.name === name);
  if (existingAsset) {
    console.log(`Deleting old asset ${name}…`);
    await gh(`/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
      method: 'DELETE',
    });
  }
  const bytes = readFileSync(filePath);
  console.log(`Uploading ${name} (${(bytes.length / 1e6).toFixed(1)} MB)…`);
  const uploadUrl = release.upload_url.replace(/\{.*\}$/, `?name=${encodeURIComponent(name)}`);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes.length),
    },
    body: bytes,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upload ${name} → ${res.status}: ${t.slice(0, 500)}`);
  }
  console.log(`  ok ${name}`);
}

console.log(`\nPublished https://github.com/${owner}/${repo}/releases/tag/${tag}`);
console.log(`Notes: https://github.com/${owner}/${repo}/releases/download/${tag}/${notesName}`);
console.log(`Feed:  https://github.com/${owner}/${repo}/releases/download/${tag}/latest.yml`);
