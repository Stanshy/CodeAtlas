/**
 * TypeScriptCompilerProvider
 *
 * Uses the TypeScript Compiler API (`ts.createSourceFile`) as a pure-JS
 * fallback that requires no native modules, no WASM, and no build tools.
 *
 * `typescript` is already a devDependency of the monorepo root, so it is
 * always available in the development environment.  For production bundles
 * it should be moved to `dependencies` in @codeatlas/core if this provider
 * is the one selected at runtime.
 *
 * AST node type strings are the TypeScript SyntaxKind names
 * (e.g. "ImportDeclaration", "ExportKeyword") rather than tree-sitter names.
 * Consumers that need to handle both backends should use the provider-agnostic
 * helpers in `../utils/import-extractor.ts` (added in T5).
 */

import type { AstNode, AstProvider, ParseResult } from '../ast-provider.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TS = typeof import('typescript');
let _ts: TS | null = null;

async function loadTs(): Promise<TS> {
  if (_ts !== null) return _ts;
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  _ts = require('typescript') as TS;
  return _ts;
}

// ---------------------------------------------------------------------------
// Map a ts.Node to our lightweight AstNode
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTsNode(node: any, sourceFile: any, ts: TS): AstNode {
  const kind: number = node.kind;
  const kindName: string = (ts.SyntaxKind as Record<number, string>)[kind] ?? `SyntaxKind(${kind})`;

  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile, true));
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());

  const children: AstNode[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ts.forEachChild(node, (child: any) => {
    children.push(mapTsNode(child, sourceFile, ts));
  });

  return {
    type: kindName,
    text: node.getText(sourceFile) as string,
    startLine: start.line,
    endLine: end.line,
    children,
  };
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class TypeScriptCompilerProvider implements AstProvider {
  readonly name = 'typescript-compiler-api';

  async isAvailable(): Promise<boolean> {
    try {
      await loadTs();
      return true;
    } catch {
      return false;
    }
  }

  async parse(
    source: string,
    language: 'javascript' | 'typescript',
  ): Promise<ParseResult> {
    const ts = await loadTs();

    const scriptKind =
      language === 'typescript'
        ? ts.ScriptKind.TS
        : ts.ScriptKind.JS;

    const sourceFile = ts.createSourceFile(
      language === 'typescript' ? '__input__.ts' : '__input__.js',
      source,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      scriptKind,
    );

    return {
      language,
      root: mapTsNode(sourceFile, sourceFile, ts),
      providerName: this.name,
    };
  }
}
