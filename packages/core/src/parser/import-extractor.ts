/**
 * ImportExtractor
 *
 * Walks an AstNode tree produced by any AstProvider and extracts all
 * import / export / require declarations into normalized ParsedImport and
 * ParsedExport records.
 *
 * Two AST dialects are supported transparently:
 *
 *   - tree-sitter (native / WASM): uses snake_case node type strings
 *     e.g. "import_statement", "export_statement", "call_expression"
 *
 *   - TypeScript Compiler API (fallback): uses PascalCase SyntaxKind names
 *     e.g. "ImportDeclaration", "ExportDeclaration", "CallExpression"
 *
 * All callers use the same public API regardless of which provider ran.
 */

import { parseSource } from './parser-factory.js';
import type { AstNode, ParseResult } from './ast-provider.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParsedImport {
  /** Original import path string as written in source (no quotes) e.g. './bar' */
  source: string;
  /** Named symbols imported — empty for default/namespace/side-effect imports */
  importedSymbols: string[];
  /** Whether this is a default import */
  isDefault: boolean;
  /** Whether this is a dynamic import() call */
  isDynamic: boolean;
  /** Whether this is a namespace import (import * as x) */
  isNamespace: boolean;
  /** Whether this is `import type { ... }` */
  isTypeOnly: boolean;
  /** 1-based line number where the import appears */
  line: number;
}

export interface ParsedExport {
  /** Re-export source path (present only for `export ... from '...'`) */
  source?: string;
  /** Exported symbol names — empty for barrel exports */
  exportedSymbols: string[];
  /** Whether this is a default export */
  isDefault: boolean;
  /** Whether this is a barrel re-export (`export * from '...'`) */
  isBarrel: boolean;
  /** 1-based line number where the export appears */
  line: number;
}

export interface FileParseResult {
  imports: ParsedImport[];
  exports: ParsedExport[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Internal helpers — string utilities
// ---------------------------------------------------------------------------

/** Strip surrounding quotes from a string node's text value. */
function stripQuotes(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

// ---------------------------------------------------------------------------
// AST dialect detection helpers
// ---------------------------------------------------------------------------

/** Returns true when the tree looks like it came from tree-sitter (snake_case). */
function isTreeSitterAst(root: AstNode): boolean {
  return root.type === 'program' || root.type === 'source_file';
}

// ---------------------------------------------------------------------------
// tree-sitter dialect helpers
// ---------------------------------------------------------------------------

/** Find the first direct child node whose type is one of the given values. */
function findChild(node: AstNode, ...types: string[]): AstNode | undefined {
  for (const child of node.children) {
    if (types.includes(child.type)) return child;
  }
  return undefined;
}

/** Find ALL direct children matching one of the given types. */
function findChildren(node: AstNode, ...types: string[]): AstNode[] {
  return node.children.filter((c) => types.includes(c.type));
}

/**
 * Extract the bare module path string from a tree-sitter string node.
 * The actual content lives in the string_fragment child, or we strip quotes
 * from the node's raw text.
 */
function extractTreeSitterStringValue(node: AstNode): string {
  const fragment = findChild(node, 'string_fragment');
  if (fragment) return fragment.text;
  return stripQuotes(node.text);
}

/** Walk tree-sitter AST for a single import_statement node. */
function extractTreeSitterImport(node: AstNode): ParsedImport | null {
  const line = node.startLine + 1;

  // Find the source path: the last `string` child of import_statement
  const stringNodes = findChildren(node, 'string');
  if (stringNodes.length === 0) return null;
  const sourceNode = stringNodes[stringNodes.length - 1];
  const source = extractTreeSitterStringValue(sourceNode);

  // Detect `import type { ... }` by checking for a 'type' keyword child
  // between the 'import' keyword and the import_clause.
  const childTexts = node.children.map((c) => c.text);
  const importIdx = childTexts.indexOf('import');
  const isTypeOnly =
    importIdx !== -1 && childTexts[importIdx + 1] === 'type';

  const result: ParsedImport = {
    source,
    importedSymbols: [],
    isDefault: false,
    isDynamic: false,
    isNamespace: false,
    isTypeOnly,
    line,
  };

  // Walk import_clause to extract named/default/namespace bindings
  const clause = findChild(node, 'import_clause');
  if (!clause) {
    // Side-effect import: import './foo'
    return result;
  }

  for (const child of clause.children) {
    if (child.type === 'identifier') {
      // default import: import foo from '...'
      result.isDefault = true;
    } else if (child.type === 'namespace_import') {
      // import * as foo from '...'
      result.isNamespace = true;
    } else if (child.type === 'named_imports') {
      // import { a, b } from '...'
      for (const spec of child.children) {
        if (spec.type === 'import_specifier') {
          // First identifier is the exported name; second (after `as`) is alias
          const idents = findChildren(spec, 'identifier');
          if (idents.length > 0) {
            result.importedSymbols.push(idents[0].text);
          }
        }
      }
    }
  }

  return result;
}

/** Walk tree-sitter AST for a single export_statement node. */
function extractTreeSitterExport(node: AstNode): ParsedExport | null {
  const line = node.startLine + 1;

  const result: ParsedExport = {
    exportedSymbols: [],
    isDefault: false,
    isBarrel: false,
    line,
  };

  // Check for `export default`
  result.isDefault = node.children.some(
    (c) => c.type === 'default' || c.text === 'default',
  );

  // Check for `export * from '...'` (barrel) or `export * as ns from '...'`
  const hasStarExport = node.children.some((c) => c.text === '*');

  // Look for re-export source path (a `string` child of the export_statement)
  const stringNodes = findChildren(node, 'string');
  if (stringNodes.length > 0) {
    result.source = extractTreeSitterStringValue(
      stringNodes[stringNodes.length - 1],
    );
  }

  if (hasStarExport && result.source !== undefined) {
    result.isBarrel = true;
    return result;
  }

  // Named re-exports: export { foo, bar } from '...'
  const exportClause = findChild(node, 'export_clause');
  if (exportClause) {
    for (const child of exportClause.children) {
      if (child.type === 'export_specifier') {
        const idents = findChildren(child, 'identifier');
        if (idents.length > 0) {
          result.exportedSymbols.push(idents[0].text);
        }
      }
    }
  }

  return result;
}

/** Walk a tree-sitter call_expression and check for require() or dynamic import(). */
function extractTreeSitterCallExpression(node: AstNode): ParsedImport | null {
  const line = node.startLine + 1;

  // The first child of call_expression is the function being called
  const funcNode = node.children[0];
  if (!funcNode) return null;

  // Dynamic import(): call_expression whose function node type is `import`
  if (funcNode.type === 'import' || funcNode.text === 'import') {
    const args = findChild(node, 'arguments');
    if (!args) return null;
    const strNode = findChild(args, 'string');
    if (!strNode) return null;
    return {
      source: extractTreeSitterStringValue(strNode),
      importedSymbols: [],
      isDefault: false,
      isDynamic: true,
      isNamespace: false,
      isTypeOnly: false,
      line,
    };
  }

  // require(): call_expression whose function identifier text is `require`
  if (funcNode.text === 'require') {
    const args = findChild(node, 'arguments');
    if (!args) return null;
    const strNode = findChild(args, 'string');
    if (!strNode) return null;
    return {
      source: extractTreeSitterStringValue(strNode),
      importedSymbols: [],
      isDefault: true, // CJS require is semantically a default import
      isDynamic: false,
      isNamespace: false,
      isTypeOnly: false,
      line,
    };
  }

  return null;
}

/** Recursively walk a tree-sitter AST, collecting imports and exports. */
function walkTreeSitter(
  node: AstNode,
  imports: ParsedImport[],
  exports: ParsedExport[],
  errors: string[],
): void {
  try {
    if (node.type === 'import_statement') {
      const parsed = extractTreeSitterImport(node);
      if (parsed) imports.push(parsed);
      // Do not recurse further — children are handled inside extractor
      return;
    }

    if (node.type === 'export_statement') {
      const parsed = extractTreeSitterExport(node);
      if (parsed) exports.push(parsed);
      return;
    }

    if (node.type === 'call_expression') {
      const parsed = extractTreeSitterCallExpression(node);
      if (parsed) imports.push(parsed);
      // Continue recursing — nested call_expressions are possible
    }
  } catch (err) {
    errors.push(
      `Tree-sitter extraction failed at line ${node.startLine + 1}: ${String(err)}`,
    );
  }

  for (const child of node.children) {
    walkTreeSitter(child, imports, exports, errors);
  }
}

// ---------------------------------------------------------------------------
// TypeScript Compiler API dialect helpers
// ---------------------------------------------------------------------------

/** Recursively find the first descendant whose type matches. */
function findDescendant(node: AstNode, ...types: string[]): AstNode | undefined {
  for (const child of node.children) {
    if (types.includes(child.type)) return child;
    const found = findDescendant(child, ...types);
    if (found) return found;
  }
  return undefined;
}

/**
 * Extract the module specifier string from a TypeScript compiler AST node.
 * The specifier appears as a StringLiteral child (direct or one level deep).
 */
function extractTsStringLiteral(node: AstNode): string | undefined {
  // Direct child StringLiteral
  const direct = node.children.find((c) => c.type === 'StringLiteral');
  if (direct) return stripQuotes(direct.text);

  // One level deeper (e.g. inside ExpressionStatement → CallExpression)
  for (const child of node.children) {
    const nested = child.children.find((c) => c.type === 'StringLiteral');
    if (nested) return stripQuotes(nested.text);
  }

  return undefined;
}

/** Walk a TypeScript Compiler API ImportDeclaration node. */
function extractTsImportDeclaration(node: AstNode): ParsedImport | null {
  const line = node.startLine + 1;

  const moduleSpecifier = extractTsStringLiteral(node);
  if (moduleSpecifier === undefined) return null;

  // Detect `import type { ... }` — the ImportClause has a child with text "type",
  // OR the token sequence at ImportDeclaration level is: import → type → ...
  const importClause = node.children.find((c) => c.type === 'ImportClause');
  let isTypeOnly = false;
  if (importClause) {
    isTypeOnly = importClause.children.some((c) => c.text === 'type');
  }
  if (!isTypeOnly) {
    const texts = node.children.map((c) => c.text);
    const importIdx = texts.findIndex((t) => t === 'import');
    if (importIdx !== -1 && texts[importIdx + 1] === 'type') {
      isTypeOnly = true;
    }
  }

  const result: ParsedImport = {
    source: moduleSpecifier,
    importedSymbols: [],
    isDefault: false,
    isDynamic: false,
    isNamespace: false,
    isTypeOnly,
    line,
  };

  if (!importClause) {
    // Side-effect import: import './foo'
    return result;
  }

  for (const child of importClause.children) {
    if (child.type === 'Identifier') {
      // default import: import foo from '...'
      result.isDefault = true;
    } else if (child.type === 'NamespaceImport') {
      // import * as foo from '...'
      result.isNamespace = true;
    } else if (child.type === 'NamedImports') {
      // import { a, b as c } from '...'
      for (const spec of child.children) {
        if (spec.type === 'ImportSpecifier') {
          const ident = spec.children.find((c) => c.type === 'Identifier');
          if (ident) result.importedSymbols.push(ident.text);
        }
      }
    }
  }

  return result;
}

/** Walk a TypeScript Compiler API ExportDeclaration node. */
function extractTsExportDeclaration(node: AstNode): ParsedExport | null {
  const line = node.startLine + 1;

  const result: ParsedExport = {
    exportedSymbols: [],
    isDefault: false,
    isBarrel: false,
    line,
  };

  // Re-export source (if present)
  const moduleSpecifier = extractTsStringLiteral(node);
  if (moduleSpecifier !== undefined) {
    result.source = moduleSpecifier;
  }

  // Barrel: export * from '...' — TS compiler emits a NamespaceExport child
  const hasNamespaceExport = node.children.some(
    (c) => c.type === 'NamespaceExport' || c.text === '*',
  );
  if (hasNamespaceExport && result.source !== undefined) {
    result.isBarrel = true;
    return result;
  }

  // Named exports / re-exports
  const namedExports = node.children.find((c) => c.type === 'NamedExports');
  if (namedExports) {
    for (const spec of namedExports.children) {
      if (spec.type === 'ExportSpecifier') {
        const ident = spec.children.find((c) => c.type === 'Identifier');
        if (ident) result.exportedSymbols.push(ident.text);
      }
    }
  }

  return result;
}

/** Walk a TypeScript Compiler API ExportAssignment node (export default ...). */
function extractTsExportAssignment(node: AstNode): ParsedExport {
  return {
    exportedSymbols: [],
    isDefault: true,
    isBarrel: false,
    line: node.startLine + 1,
  };
}

/** Extract dynamic import() or require() from a TS compiler CallExpression. */
function extractTsCallExpression(node: AstNode): ParsedImport | null {
  const line = node.startLine + 1;

  const funcNode = node.children[0];
  if (!funcNode) return null;

  // Dynamic import(): first child has type "ImportKeyword"
  if (funcNode.type === 'ImportKeyword' || funcNode.text === 'import') {
    const strLiteral = findDescendant(node, 'StringLiteral');
    if (!strLiteral) return null;
    return {
      source: stripQuotes(strLiteral.text),
      importedSymbols: [],
      isDefault: false,
      isDynamic: true,
      isNamespace: false,
      isTypeOnly: false,
      line,
    };
  }

  // require(): Identifier whose text is "require"
  if (funcNode.type === 'Identifier' && funcNode.text === 'require') {
    const strLiteral = findDescendant(node, 'StringLiteral');
    if (!strLiteral) return null;
    return {
      source: stripQuotes(strLiteral.text),
      importedSymbols: [],
      isDefault: true,
      isDynamic: false,
      isNamespace: false,
      isTypeOnly: false,
      line,
    };
  }

  return null;
}

/** Recursively walk a TypeScript Compiler API AST, collecting imports and exports. */
function walkTsCompiler(
  node: AstNode,
  imports: ParsedImport[],
  exports: ParsedExport[],
  errors: string[],
): void {
  try {
    if (node.type === 'ImportDeclaration') {
      const parsed = extractTsImportDeclaration(node);
      if (parsed) imports.push(parsed);
      return;
    }

    if (node.type === 'ExportDeclaration') {
      const parsed = extractTsExportDeclaration(node);
      if (parsed) exports.push(parsed);
      return;
    }

    if (node.type === 'ExportAssignment') {
      exports.push(extractTsExportAssignment(node));
      return;
    }

    if (node.type === 'CallExpression') {
      const parsed = extractTsCallExpression(node);
      if (parsed) imports.push(parsed);
      // Continue recursing — nested calls may exist
    }
  } catch (err) {
    errors.push(
      `TS compiler extraction failed at line ${node.startLine + 1}: ${String(err)}`,
    );
  }

  for (const child of node.children) {
    walkTsCompiler(child, imports, exports, errors);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse `sourceCode` and extract all import/export declarations.
 *
 * @param filePath    Absolute or relative path (used only in error messages)
 * @param sourceCode  Raw source text
 * @param language    'javascript' | 'typescript'
 */
export async function parseFileImports(
  filePath: string,
  sourceCode: string,
  language: 'javascript' | 'typescript',
): Promise<FileParseResult> {
  const imports: ParsedImport[] = [];
  const exports: ParsedExport[] = [];
  const errors: string[] = [];

  let parseResult: ParseResult;
  try {
    parseResult = await parseSource(sourceCode, language);
  } catch (err) {
    errors.push(`Failed to parse ${filePath}: ${String(err)}`);
    return { imports, exports, errors };
  }

  const { root } = parseResult;

  if (isTreeSitterAst(root)) {
    walkTreeSitter(root, imports, exports, errors);
  } else {
    // TypeScript Compiler API — root type is "SourceFile"
    walkTsCompiler(root, imports, exports, errors);
  }

  return { imports, exports, errors };
}
