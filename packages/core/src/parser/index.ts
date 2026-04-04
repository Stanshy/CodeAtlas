/**
 * @codeatlas/core — Parser Module
 *
 * Public API surface for the parser subsystem.
 * T5 (Import Parser) and other downstream tasks import from here.
 */

export type { AstNode, AstProvider, ParseResult } from './ast-provider.js';
export { resolveProvider, parseSource } from './parser-factory.js';
export { NativeTreeSitterProvider } from './providers/native-tree-sitter.js';
export { WasmTreeSitterProvider } from './providers/wasm-tree-sitter.js';
export { TypeScriptCompilerProvider } from './providers/typescript-compiler.js';

// T5 — Import / Export extraction and path resolution
export type {
  ParsedImport,
  ParsedExport,
  FileParseResult,
} from './import-extractor.js';
export { parseFileImports } from './import-extractor.js';

// Sprint 7 / T3 — Function / Class extraction
export type {
  ParsedFunction,
  ParsedClass,
  FunctionExtractionResult,
} from './function-extractor.js';
export { extractFunctions } from './function-extractor.js';

export type { ResolveResult } from './import-resolver.js';
export {
  resolveImportEdges,
  resolveExportEdges,
  resolveAllEdges,
  toPosix,
  isRelative,
  toProjectRelative,
} from './import-resolver.js';
