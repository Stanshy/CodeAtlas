/**
 * WasmTreeSitterProvider
 *
 * Uses `web-tree-sitter` (WASM build) together with pre-compiled
 * `tree-sitter-javascript.wasm` and `tree-sitter-typescript.wasm` grammar
 * files.  No C++ build tools are required.
 *
 * WASM grammar files must exist at:
 *   packages/core/src/parser/wasm/tree-sitter-javascript.wasm
 *   packages/core/src/parser/wasm/tree-sitter-typescript.wasm
 *
 * They can be obtained from the npm packages:
 *   node_modules/tree-sitter-javascript/tree-sitter-javascript.wasm
 *   node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm
 *
 * Or downloaded directly from the tree-sitter GitHub releases.
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { AstNode, AstProvider, ParseResult } from '../ast-provider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const WASM_DIR = join(__dirname, '..', 'wasm');
const JS_WASM = join(WASM_DIR, 'tree-sitter-javascript.wasm');
const TS_WASM = join(WASM_DIR, 'tree-sitter-typescript.wasm');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WebTreeSitter = any;

let _Parser: WebTreeSitter | null = null;
let _jsLang: WebTreeSitter | null = null;
let _tsLang: WebTreeSitter | null = null;
let _available: boolean | null = null;

async function tryLoad(): Promise<boolean> {
  if (_available !== null) return _available;
  try {
    // Check WASM blobs exist before trying to initialise
    if (!existsSync(JS_WASM) || !existsSync(TS_WASM)) {
      _available = false;
      return false;
    }

    const require = createRequire(import.meta.url);
    const WebTreeSitter = require('web-tree-sitter') as WebTreeSitter;

    await WebTreeSitter.init();
    _jsLang = await WebTreeSitter.Language.load(JS_WASM);
    _tsLang = await WebTreeSitter.Language.load(TS_WASM);

    // Smoke-test
    const parser = new WebTreeSitter();
    parser.setLanguage(_jsLang);
    const tree = parser.parse('const x = 1;');
    if (tree.rootNode.type !== 'program') throw new Error('unexpected root type');

    _Parser = WebTreeSitter;
    _available = true;
  } catch {
    _available = false;
  }
  return _available;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNode(node: any): AstNode {
  const children: AstNode[] = [];
  for (let i = 0; i < node.childCount; i++) {
    children.push(mapNode(node.child(i)));
  }
  return {
    type: node.type as string,
    text: node.text as string,
    startLine: node.startPosition.row as number,
    endLine: node.endPosition.row as number,
    children,
  };
}

export class WasmTreeSitterProvider implements AstProvider {
  readonly name = 'wasm-tree-sitter';

  async isAvailable(): Promise<boolean> {
    return tryLoad();
  }

  async parse(
    source: string,
    language: 'javascript' | 'typescript',
  ): Promise<ParseResult> {
    if (!(await tryLoad()) || _Parser === null) {
      throw new Error('WasmTreeSitterProvider is not available');
    }

    const parser = new _Parser();
    parser.setLanguage(language === 'javascript' ? _jsLang : _tsLang);
    const tree = parser.parse(source);

    return {
      language,
      root: mapNode(tree.rootNode),
      providerName: this.name,
    };
  }
}
