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
import type { SupportedLanguage } from '../types.js';
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
 * Returns a tree-sitter provider (native or WASM) for languages that require
 * tree-sitter (Python, Java).  TypeScriptCompilerProvider cannot handle these
 * languages and is excluded from consideration.
 *
 * Throws if no tree-sitter provider is available.
 */
async function resolveProviderForLanguage(language: SupportedLanguage): Promise<AstProvider> {
  // For JS/TS, use the standard cached resolution (includes all 3 providers).
  if (language === 'javascript' || language === 'typescript') {
    return resolveProvider();
  }

  // For Python/Java, only tree-sitter providers are viable.
  const treeSitterProviders = PROVIDERS.filter(p => p.name !== 'typescript-compiler-api');
  for (const provider of treeSitterProviders) {
    let available = false;
    try {
      available = await provider.isAvailable();
    } catch {
      available = false;
    }
    if (available) return provider;
  }

  throw new Error(
    `No AST provider available for language "${language}". ` +
    'tree-sitter (native or WASM) is required for Python/Java parsing.',
  );
}

/**
 * Convenience wrapper: resolve provider and parse in one call.
 */
export async function parseSource(
  source: string,
  language: SupportedLanguage,
) {
  const provider = await resolveProviderForLanguage(language);
  return provider.parse(source, language);
}
