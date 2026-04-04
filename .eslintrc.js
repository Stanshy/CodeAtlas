/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: true,
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js', '!.eslintrc.js'],
  overrides: [
    {
      // Parser provider files use dynamic require() to load optional native
      // bindings and WASM modules.  The external modules have no TypeScript
      // type declarations, so `any` is the intentional escape hatch here.
      files: [
        'packages/core/src/parser/providers/native-tree-sitter.ts',
        'packages/core/src/parser/providers/wasm-tree-sitter.ts',
        'packages/core/src/parser/providers/typescript-compiler.ts',
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/no-redundant-type-constituents': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
      },
    },
    {
      // AI provider stubs intentionally have no await — they throw immediately
      // or return a static string.  The async signature is required by the
      // SummaryProvider interface so callers can await them uniformly.
      files: [
        'packages/core/src/ai/anthropic.ts',
        'packages/core/src/ai/disabled.ts',
        'packages/core/src/ai/openai.ts',
      ],
      rules: {
        '@typescript-eslint/require-await': 'off',
      },
    },
    {
      // scanner/index.ts uses a safe cast on readdir's return type because the
      // TypeScript overload signature does not narrow to string names when
      // encoding:'utf8' is passed; the cast is correct and intentional.
      files: ['packages/core/src/scanner/index.ts'],
      rules: {
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      },
    },
    {
      // server.ts uses a manually-typed reply helper that returns `any` so it
      // works with both Fastify v4 and v5 reply signatures without importing
      // the concrete generic type.
      files: ['packages/cli/src/server.ts'],
      rules: {
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
      },
    },
    {
      // CLI command files must use console.log/warn/error to communicate with
      // the terminal — that is their sole output mechanism.
      files: ['packages/cli/src/commands/**/*.ts'],
      rules: {
        'no-console': 'off',
      },
    },
    {
      // web.ts is a CLI sub-command that also uses console for server status.
      files: ['packages/cli/src/web.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
