/**
 * ParserFactory
 *
 * Resolves the best available AstProvider at runtime, trying each option in
 * priority order and returning the first one that reports isAvailable() === true.
 *
 * Priority:
 *   1. NativeTreeSitterProvider  (fastest, requires C++ build tools on Windows)
 *   2. WasmTreeSitterProvider    (requires WASM blobs, no build tools)
 *   3. TypeScriptCompilerProvider (pure JS, always available)
 *
 * The resolved provider is cached so probing happens only once per process.
 */

import type { AstProvider } from './ast-provider.js';
import { NativeTreeSitterProvider } from './providers/native-tree-sitter.js';
import { WasmTreeSitterProvider } from './providers/wasm-tree-sitter.js';
import { TypeScriptCompilerProvider } from './providers/typescript-compiler.js';

const PROVIDERS: AstProvider[] = [
  new NativeTreeSitterProvider(),
  new WasmTreeSitterProvider(),
  new TypeScriptCompilerProvider(),
];

let _cached: AstProvider | null = null;

/**
 * Returns the first available AstProvider.
 * Throws if somehow no provider is available (should never happen because
 * TypeScriptCompilerProvider has no external dependencies).
 */
export async function resolveProvider(): Promise<AstProvider> {
  if (_cached !== null) return _cached;

  for (const provider of PROVIDERS) {
    let available = false;
    try {
      available = await provider.isAvailable();
    } catch {
      available = false;
    }

    if (available) {
      _cached = provider;
      return provider;
    }
  }

  throw new Error(
    'No AST provider is available. ' +
    'This should never happen because TypeScriptCompilerProvider has no native dependencies. ' +
    'Ensure the `typescript` package is installed.',
  );
}

/**
 * Convenience wrapper: resolve provider and parse in one call.
 */
export async function parseSource(
  source: string,
  language: 'javascript' | 'typescript',
) {
  const provider = await resolveProvider();
  return provider.parse(source, language);
}
