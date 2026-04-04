/**
 * AST Provider — Abstract Interface
 *
 * Defines the contract for all AST extraction backends.
 * T5 (Import Parser) and all downstream consumers depend only on this
 * interface; they are decoupled from the concrete parser implementation.
 *
 * Three concrete implementations exist, chosen at runtime in priority order:
 *   1. NativeTreeSitterProvider  — tree-sitter native Node.js binding
 *   2. WasmTreeSitterProvider    — web-tree-sitter (WASM, no build tools needed)
 *   3. TypeScriptCompilerProvider — TypeScript Compiler API (pure JS, always works)
 */

// ---------------------------------------------------------------------------
// Lightweight AST node — only the subset CodeAtlas needs
// ---------------------------------------------------------------------------

export interface AstNode {
  /** Tree-sitter node type string, e.g. "import_statement", "call_expression" */
  type: string;
  /** Raw source text for this node */
  text: string;
  /** Zero-based line number of the start position */
  startLine: number;
  /** Zero-based line number of the end position */
  endLine: number;
  /** Child nodes (one level deep; providers may flatten as needed) */
  children: AstNode[];
}

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

export interface ParseResult {
  /** Language that was used to parse the source */
  language: 'javascript' | 'typescript';
  /** Root node of the AST */
  root: AstNode;
  /** Which backend produced this result */
  providerName: string;
}

// ---------------------------------------------------------------------------
// Main provider interface
// ---------------------------------------------------------------------------

export interface AstProvider {
  /** Human-readable name used for logging and diagnostics */
  readonly name: string;

  /**
   * Returns true when the provider has been successfully initialised and
   * all required native modules / WASM blobs are loaded.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Parse `source` and return a lightweight AST.
   *
   * @param source   Raw source code as a string
   * @param language The language to use for parsing
   */
  parse(
    source: string,
    language: 'javascript' | 'typescript',
  ): Promise<ParseResult>;
}
