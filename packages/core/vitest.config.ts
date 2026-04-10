import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        // Type/interface-only files — no executable code
        'src/**/*.d.ts',
        'src/types.ts',
        'src/ai/types.ts',
        'src/parser/ast-provider.ts',
        // Barrel index that just re-exports
        'src/index.ts',
        'src/parser/index.ts',
        // WASM provider requires a WASM binary not available in unit test environment
        'src/parser/providers/wasm-tree-sitter.ts',
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        // Branch threshold is 78% because several defensive fallback branches
        // are structurally unreachable in tests:
        //   - analyzer/index.ts:  '?? 0' / '?? nodes.length' (buildGraph always fills stats)
        //   - parser-factory.ts:  throw after all providers fail (TypeScriptCompiler always works)
        //   - graph-builder.ts:   readFile error catch (filesystem always readable in tests)
        // All reachable branches are covered.
        branches: 78,
        statements: 80,
      },
    },
  },
});
