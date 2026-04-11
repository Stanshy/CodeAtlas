import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    // Explicit tsconfig reference prevents the TS6307 error that occurs
    // when tsup's dts worker interacts with composite project settings.
    compilerOptions: {
      composite: false,
      declaration: true,
      declarationMap: true,
    },
  },
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  target: 'es2022',
  // Native C++ addons (tree-sitter) cannot be bundled — they must be loaded
  // at runtime via require().  Externalising them ensures the dynamic
  // createRequire() calls in NativeTreeSitterProvider work correctly.
  external: [
    'tree-sitter',
    'tree-sitter-javascript',
    'tree-sitter-typescript',
    'tree-sitter-python',
    'tree-sitter-java',
    'web-tree-sitter',
  ],
});
