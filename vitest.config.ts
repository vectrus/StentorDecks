import { defineConfig } from 'vitest/config';
import path from 'node:path';
import react from '@vitejs/plugin-react';

/**
 * Unit tests (node) + component tests (jsdom via environmentMatchGlobs).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@stentordeck/shared': path.resolve(__dirname, 'shared/src'),
    },
  },
  test: {
    globals: false,
    setupFiles: ['app/renderer/src/test/setup.ts'],
    include: [
      'shared/**/*.test.ts',
      'app/main/**/*.test.ts',
      'app/renderer/**/*.test.ts',
      'app/renderer/**/*.component.test.tsx',
    ],
    environmentMatchGlobs: [
      ['**/*.component.test.tsx', 'jsdom'],
      ['**/*', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['shared/src/**', 'app/renderer/src/**', 'app/main/src/**'],
      exclude: [
        '**/*.test.ts',
        '**/*.component.test.tsx',
        '**/*.fixture.ts',
        '**/dist/**',
        '**/test/**',
      ],
    },
  },
});
