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

// We use dynamic requires so a missing native module never crashes the
// module loader — it only makes isAvailable() return false.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreeSitterParser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TreeSitterTree = any;

let _Parser: TreeSitterParser | null = null;
let _jsGrammar: TreeSitterParser | null = null;
let _tsGrammar: TreeSitterParser | null = null;
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
// Provider implementation
// ---------------------------------------------------------------------------

export class NativeTreeSitterProvider implements AstProvider {
  readonly name = 'native-tree-sitter';

  async isAvailable(): Promise<boolean> {
    return tryLoad();
  }

  async parse(
    source: string,
    language: 'javascript' | 'typescript',
  ): Promise<ParseResult> {
    if (!(await tryLoad()) || _Parser === null) {
      throw new Error('NativeTreeSitterProvider is not available');
    }

    // _Parser and grammars are already loaded and cached by tryLoad()
    const parser = new _Parser();
    parser.setLanguage(language === 'javascript' ? _jsGrammar : _tsGrammar);
    const tree: TreeSitterTree = parser.parse(source);

    return {
      language,
      root: mapNode(tree.rootNode),
      providerName: this.name,
    };
  }
}
