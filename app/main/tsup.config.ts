import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    preload: 'src/preload.ts',
  },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  // Must stay external — packaged via electron-builder node_modules + asarUnpack.
  external: ['electron', 'electron-updater', 'better-sqlite3', 'chokidar', 'music-metadata'],
  noExternal: ['@stentordeck/shared'],
});
