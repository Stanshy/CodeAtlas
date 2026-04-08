/**
 * NativeTreeSitterProvider
 *
 * Uses the `tree-sitter` Node.js native binding together with
 * `tree-sitter-javascript` and `tree-sitter-typescript` grammars.
 *
 * On Windows this requires C++ build tools (Visual Studio Build Tools or
 * the "Desktop development with C++" workload).  If those are absent the
 * `require()` call will throw and `isAvailable()` will return false, causing
 * the factory to fall through to the next provider.
 */

import type { AstNode, AstProvider, ParseResult } from '../ast-provider.js';
import type { SupportedLanguage } from '../../types.js';

// We use dynamic requires so a missing native module never crashes the
// module loader — it only makes isAvailable() return false.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreeSitterParser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreeSitterTree = any;

let _Parser: TreeSitterParser | null = null;
let _jsGrammar: TreeSitterParser | null = null;
let _tsGrammar: TreeSitterParser | null = null;
let _pyGrammar: TreeSitterParser | null = null;
let _javaGrammar: TreeSitterParser | null = null;
let _available: boolean | null = null;   // cached after first probe

async function tryLoad(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    // createRequire is needed inside an ESM module to load CJS native addons
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);

    _Parser = require('tree-sitter');
    const jsModule = require('tree-sitter-javascript');
    const tsModule = require('tree-sitter-typescript');

    // tree-sitter-typescript exposes { typescript, tsx }
    _jsGrammar = jsModule;
    _tsGrammar = tsModule.typescript ?? tsModule;

    // Load Python grammar (optional — failure does not break JS/TS availability)
    try {
      _pyGrammar = require('tree-sitter-python');
    } catch { /* Python grammar not installed */ }

    // Load Java grammar (optional — failure does not break JS/TS availability)
    try {
      _javaGrammar = require('tree-sitter-java');
    } catch { /* Java grammar not installed */ }

    // Quick smoke-test: parse a trivial snippet
    const parser = new _Parser();
    parser.setLanguage(_jsGrammar);
    const tree: TreeSitterTree = parser.parse('const x = 1;');
    if (tree.rootNode.type !== 'program') throw new Error('unexpected root type');

    _available = true;
  } catch {
    _available = false;
  }
  return _available;
}

// ---------------------------------------------------------------------------
// Map a tree-sitter SyntaxNode to our lightweight AstNode
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNode(node: any): AstNode {
  return {
    type: node.type as string,
    text: node.text as string,
    startLine: node.startPosition.row as number,
    endLine: node.endPosition.row as number,
    children: (node.children as any[]).map(mapNode),
  };
}

// ---------------------------------------------------------------------------
// Grammar selector
// ---------------------------------------------------------------------------

function getGrammar(language: SupportedLanguage): TreeSitterParser | null {
  switch (language) {
    case 'javascript': return _jsGrammar;
    case 'typescript': return _tsGrammar;
    case 'python':     return _pyGrammar;
    case 'java':       return _javaGrammar;
  }
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

export class NativeTreeSitterProvider implements AstProvider {
  readonly name = 'native-tree-sitter';

  async isAvailable(): Promise<boolean> {
    return tryLoad();
  }

  async parse(
    source: string,
    language: SupportedLanguage,
  ): Promise<ParseResult> {
    if (!(await tryLoad()) || _Parser === null) {
      throw new Error('NativeTreeSitterProvider is not available');
    }

    const grammar = getGrammar(language);
    if (grammar === null) {
      throw new Error(
        `NativeTreeSitterProvider: grammar for "${language}" is not loaded. ` +
        `Install the tree-sitter-${language} package.`,
      );
    }

    const parser = new _Parser();
    parser.setLanguage(grammar);
    // Sprint 18: Normalize \r\n → \n before parsing. Windows-style line endings
    // (or mixed CR/LF) can crash tree-sitter grammars (especially Python/Java).
    const normalised = source.indexOf('\r') >= 0 ? source.replace(/\r\n?/g, '\n') : source;
    // Sprint 18: tree-sitter native binding has a ~32KB string input limit.
    // Use the callback API for large files to avoid "Invalid argument" errors.
    const tree: TreeSitterTree = normalised.length > 30_000
      ? parser.parse((index: number) => normalised.slice(index, index + 4096))
      : parser.parse(normalised);

    return {
      language,
      root: mapNode(tree.rootNode),
      providerName: this.name,
    };
  }
}
