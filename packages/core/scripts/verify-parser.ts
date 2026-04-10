/**
 * verify-parser.ts
 *
 * Smoke-test script for the AST provider layer.
 * Attempts to parse JS and TS snippets and prints the resulting AST
 * structure to confirm the selected provider works on this machine.
 *
 * Run with:
 *   node --loader ts-node/esm packages/core/scripts/verify-parser.ts
 * or:
 *   npx tsx packages/core/scripts/verify-parser.ts
 */

// We import directly from source (not dist) so no build step is required.
import { resolveProvider } from '../src/parser/parser-factory.js';
import type { AstNode } from '../src/parser/ast-provider.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const JS_SOURCE = `import { foo } from './bar';
const x = require('./baz');
export function greet(name) {
  return 'hello ' + name;
}`;

const TS_SOURCE = `import type { Foo } from './types';
export const bar: string = 'hello';
export default function process(input: Foo): string {
  return input.toString();
}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Renders the top two levels of the AST for readable output. */
function renderTree(node: AstNode, indent = 0, maxDepth = 3): string {
  if (indent > maxDepth) return '';
  const prefix = '  '.repeat(indent);
  const snippet = node.text.replace(/\n/g, '\\n').slice(0, 60);
  let out = `${prefix}[${node.type}] "${snippet}"\n`;
  for (const child of node.children) {
    out += renderTree(child, indent + 1, maxDepth);
  }
  return out;
}

function section(title: string): void {
  console.log('\n' + '='.repeat(60));
  console.log(` ${title}`);
  console.log('='.repeat(60));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('CodeAtlas — AST Provider Verification\n');

  let provider;
  try {
    provider = await resolveProvider();
  } catch (err) {
    console.error('FATAL: Could not resolve any AST provider.');
    console.error(err);
    process.exit(1);
  }

  console.log(`Selected provider: ${provider.name}`);

  // --- JavaScript ---
  section('JavaScript parse');
  console.log('Source:\n' + JS_SOURCE + '\n');
  try {
    const result = await provider.parse(JS_SOURCE, 'javascript');
    console.log(`Provider: ${result.providerName}`);
    console.log(`Root node type: ${result.root.type}`);
    console.log(`Top-level children: ${result.root.children.length}`);
    console.log('\nAST (depth <= 3):');
    console.log(renderTree(result.root));
    console.log('JavaScript parse: PASS');
  } catch (err) {
    console.error('JavaScript parse: FAIL');
    console.error(err);
    process.exit(1);
  }

  // --- TypeScript ---
  section('TypeScript parse');
  console.log('Source:\n' + TS_SOURCE + '\n');
  try {
    const result = await provider.parse(TS_SOURCE, 'typescript');
    console.log(`Provider: ${result.providerName}`);
    console.log(`Root node type: ${result.root.type}`);
    console.log(`Top-level children: ${result.root.children.length}`);
    console.log('\nAST (depth <= 3):');
    console.log(renderTree(result.root));
    console.log('TypeScript parse: PASS');
  } catch (err) {
    console.error('TypeScript parse: FAIL');
    console.error(err);
    process.exit(1);
  }

  section('Result');
  console.log(`All checks PASSED using provider: ${provider.name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
