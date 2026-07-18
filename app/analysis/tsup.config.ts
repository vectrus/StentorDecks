import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { analysis: 'src/index.ts' },
  format: ['cjs'],
  platform: 'browser',
  target: 'chrome120',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  dts: false,
  external: ['electron', 'fs', 'path', 'node:fs', 'node:path'],
  noExternal: ['@stentordeck/shared'],
  injectStyle: false,
});
