/**
 * Publish release/ artifacts to a full (non-prerelease) GitHub Release.
 * electron-updater needs latest.yml on a discoverable release — Setup.exe alone is not enough.
 *
 * Usage: GH_TOKEN=… node scripts/publish-github-release.mjs
 * Or:    GITHUB_TOKEN=… npm run publish:github
 */
import { createReadStream, existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const releaseDir = join(root, 'release');
const owner = 'vectrus';
const repo = 'StentorDecks';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error('Set GH_TOKEN or GITHUB_TOKEN (repo scope) and re-run.');
  process.exit(1);
}

const pkg = JSON.parse(
  await import('node:fs/promises').then((fs) => fs.readFile(join(root, 'package.json'), 'utf8')),
);
const version = pkg.version;
const tag = `v${version}`;
const setupName = `StentorDeck-Setup-${version}.exe`;
const setupPath = join(releaseDir, setupName);
const latestYml = join(releaseDir, 'latest.yml');

if (!existsSync(setupPath) || !existsSync(latestYml)) {
  console.error(`Missing ${setupName} and/or latest.yml in release/. Run: npm run dist`);
  process.exit(1);
}

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
      body:
        `StentorDeck ${version}\n\n` +
        `Installer: ${setupName}\n` +
        `Auto-update feed: latest.yml (required for Settings → Check for updates).\n\n` +
        `Install over your current build. Library / settings / MIDI map stay in %APPDATA%.`,
      draft: false,
      prerelease: false,
      make_latest: 'true',
      target_commitish: 'main',
    }),
  });
} else {
  console.log(`Release ${tag} already exists (id ${release.id}); uploading/replacing assets…`);
  if (release.prerelease || release.draft) {
    await gh(`/repos/${owner}/${repo}/releases/${release.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prerelease: false, draft: false, make_latest: 'true' }),
    });
  }
}

const assetNames = new Set([
  setupName,
  'latest.yml',
  `${setupName}.blockmap`,
  `StentorDeck-Setup-${version}.exe.blockmap`,
]);

const toUpload = readdirSync(releaseDir)
  .filter((name) => assetNames.has(name) || name === `${setupName}.blockmap`)
  .map((name) => join(releaseDir, name));

// Always include setup + latest.yml; blockmap optional.
const required = [setupPath, latestYml];
for (const p of required) {
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
  const size = statSync(filePath).size;
  console.log(`Uploading ${name} (${(size / 1e6).toFixed(1)} MB)…`);
  const uploadUrl = release.upload_url.replace(/\{.*\}$/, `?name=${encodeURIComponent(name)}`);
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(size),
    },
    body: createReadStream(filePath),
    duplex: 'half',
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Upload ${name} → ${res.status}: ${t.slice(0, 500)}`);
  }
  console.log(`  ok ${name}`);
}

console.log(`\nPublished https://github.com/${owner}/${repo}/releases/tag/${tag}`);
console.log('Verify latest.yml:');
console.log(`  https://github.com/${owner}/${repo}/releases/download/${tag}/latest.yml`);
