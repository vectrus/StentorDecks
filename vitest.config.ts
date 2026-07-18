import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['shared/**/*.test.ts', 'app/main/**/*.test.ts', 'app/renderer/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@stentordeck/shared': path.resolve(__dirname, 'shared/src'),
    },
  },
});
