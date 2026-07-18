/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { browser: true, node: true, es2022: true },
  ignorePatterns: ['dist/', 'release/', 'node_modules/', '*.cjs', '*.mjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'electron',
            importNames: ['ipcRenderer'],
            message: 'Use shared/ipc + renderer/src/ipc client only (E1).',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: [
        'app/renderer/src/ipc/**/*.ts',
        'app/main/src/preload.ts',
        'app/main/dist/preload.js',
      ],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      files: ['**/*.{ts,tsx}'],
      rules: {
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  ],
};
