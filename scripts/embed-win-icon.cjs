/**
 * electron-builder afterPack: embed brand icon + version metadata into the .exe.
 *
 * We keep win.signAndEditExecutable=false so builds don't need winCodeSign's
 * darwin symlinks (fails without Developer Mode / admin). Icon embedding is
 * done here with the `rcedit` npm package instead.
 */
const path = require('node:path');
const fs = require('node:fs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const productName = context.packager.appInfo.productFilename || 'StentorDeck';
  const exePath = path.join(context.appOutDir, `${productName}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');

  if (!fs.existsSync(exePath)) {
    console.warn(`[afterPack] exe missing: ${exePath}`);
    return;
  }
  if (!fs.existsSync(iconPath)) {
    console.warn(`[afterPack] icon missing: ${iconPath} — run npm run icons`);
    return;
  }

  const { default: rcedit } = await import('rcedit');
  const version = context.packager.appInfo.version;
  await rcedit(exePath, {
    icon: iconPath,
    'version-string': {
      CompanyName: 'Julius',
      FileDescription: 'StentorDeck',
      ProductName: 'StentorDeck',
      InternalName: 'StentorDeck',
      LegalCopyright: 'Julius',
      OriginalFilename: `${productName}.exe`,
    },
    'file-version': version,
    'product-version': version,
  });
  console.info(`[afterPack] embedded icon + metadata → ${exePath}`);
};
