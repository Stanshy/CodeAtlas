/**
 * AST Provider and ParserFactory unit tests
 *
 * Tests for:
 *   - packages/core/src/parser/providers/typescript-compiler.ts
 *   - packages/core/src/parser/providers/native-tree-sitter.ts
 *   - packages/core/src/parser/parser-factory.ts
 *
 * These tests ensure the TypeScript Compiler provider works directly,
 * the factory caches its result, and parseSource is a working shortcut.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TypeScriptCompilerProvider } from '../src/parser/providers/typescript-compiler.js';

// ---------------------------------------------------------------------------
// TypeScriptCompilerProvider — always available (pure JS, no native deps)
// ---------------------------------------------------------------------------

describe('TypeScriptCompilerProvider', () => {
  let provider: TypeScriptCompilerProvider;

  beforeEach(() => {
    provider = new TypeScriptCompilerProvider();
  });

  it('name is "typescript-compiler-api"', () => {
    expect(provider.name).toBe('typescript-compiler-api');
  });

  it('isAvailable() resolves to true (typescript is always installed)', async () => {
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  // --- JavaScript parsing ---

  it('parses JavaScript and returns a ParseResult with language "javascript"', async () => {
    const result = await provider.parse("const x = 1;", 'javascript');
    expect(result.language).toBe('javascript');
    expect(result.providerName).toBe('typescript-compiler-api');
  });

  it('returns a root AstNode with children', async () => {
    const result = await provider.parse("const x = 1;", 'javascript');
    expect(result.root).toBeDefined();
    expect(typeof result.root.type).toBe('string');
    expect(Array.isArray(result.root.children)).toBe(true);
  });

  it('parses a named import declaration', async () => {
    const result = await provider.parse(
      "import { foo } from './bar';",
      'javascript',
    );
    const allNodes: typeof result.root[] = [];
    function collect(node: typeof result.root) {
      allNodes.push(node);
      node.children.forEach(collect);
    }
    collect(result.root);
    const importDecl = allNodes.find((n) => n.type === 'ImportDeclaration');
    expect(importDecl).toBeDefined();
  });

  it('root has startLine 0 for first line', async () => {
    const result = await provider.parse("const x = 1;", 'javascript');
    expect(result.root.startLine).toBe(0);
  });

  it('root text contains the source code', async () => {
    const result = await provider.parse("const x = 1;", 'javascript');
    expect(result.root.text).toContain('const x = 1');
  });

  // --- TypeScript parsing ---

  it('parses TypeScript and returns language "typescript"', async () => {
    const result = await provider.parse(
      "import type { Foo } from './types';",
      'typescript',
    );
    expect(result.language).toBe('typescript');
  });

  it('parses TypeScript export declaration', async () => {
    const result = await provider.parse(
      "export function greet(): string { return 'hi'; }",
      'typescript',
    );
    expect(result.root).toBeDefined();
    expect(result.root.children.length).toBeGreaterThan(0);
  });

  it('handles empty source without throwing', async () => {
    await expect(provider.parse('', 'javascript')).resolves.toBeDefined();
  });

  it('handles syntax errors without throwing', async () => {
    await expect(
      provider.parse('export const y = {{{;', 'typescript'),
    ).resolves.toBeDefined();
  });

  it('parses CJS require() call', async () => {
    const result = await provider.parse(
      "const x = require('./mod');",
      'javascript',
    );
    const allNodes: typeof result.root[] = [];
    function collect(node: typeof result.root) {
      allNodes.push(node);
      node.children.forEach(collect);
    }
    collect(result.root);
    const callExprs = allNodes.filter((n) => n.type === 'CallExpression');
    expect(callExprs.length).toBeGreaterThan(0);
  });

  it('parses export * from barrel', async () => {
    const result = await provider.parse(
      "export * from './utils';",
      'typescript',
    );
    const allNodes: typeof result.root[] = [];
    function collect(node: typeof result.root) {
      allNodes.push(node);
      node.children.forEach(collect);
    }
    collect(result.root);
    const exportDecl = allNodes.find((n) => n.type === 'ExportDeclaration');
    expect(exportDecl).toBeDefined();
  });

  it('parses default export', async () => {
    const result = await provider.parse(
      "export default function main() {}",
      'typescript',
    );
    expect(result.root).toBeDefined();
  });

  it('nodes have startLine and endLine as numbers', async () => {
    const result = await provider.parse(
      "import { a } from './a';\nconst b = 1;",
      'typescript',
    );
    function checkNode(node: typeof result.root) {
      expect(typeof node.startLine).toBe('number');
      expect(typeof node.endLine).toBe('number');
      node.children.forEach(checkNode);
    }
    checkNode(result.root);
  });

  it('multi-line source: second line has startLine >= 1', async () => {
    const result = await provider.parse(
      "const a = 1;\nconst b = 2;",
      'typescript',
    );
    // Walk to find a node on line 2
    const allNodes: typeof result.root[] = [];
    function collect(node: typeof result.root) {
      allNodes.push(node);
      node.children.forEach(collect);
    }
    collect(result.root);
    const hasSecondLine = allNodes.some((n) => n.startLine >= 1);
    expect(hasSecondLine).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ParserFactory — resolveProvider and parseSource
// ---------------------------------------------------------------------------

describe('ParserFactory — resolveProvider', () => {
  it('resolveProvider returns an AstProvider with a name string', async () => {
    const { resolveProvider } = await import('../src/parser/parser-factory.js');
    const provider = await resolveProvider();
    expect(typeof provider.name).toBe('string');
    expect(provider.name.length).toBeGreaterThan(0);
  });

  it('resolveProvider returns the same cached instance on repeated calls', async () => {
    const { resolveProvider } = await import('../src/parser/parser-factory.js');
    const p1 = await resolveProvider();
    const p2 = await resolveProvider();
    expect(p1).toBe(p2);
  });

  it('resolveProvider returns a provider whose isAvailable() is true', async () => {
    const { resolveProvider } = await import('../src/parser/parser-factory.js');
    const provider = await resolveProvider();
    await expect(provider.isAvailable()).resolves.toBe(true);
  });
});

describe('ParserFactory — parseSource', () => {
  it('parseSource resolves a ParseResult for JavaScript', async () => {
    const { parseSource } = await import('../src/parser/parser-factory.js');
    const result = await parseSource("const x = 1;", 'javascript');
    expect(result).toHaveProperty('root');
    expect(result).toHaveProperty('language');
    expect(result).toHaveProperty('providerName');
  });

  it('parseSource resolves a ParseResult for TypeScript', async () => {
    const { parseSource } = await import('../src/parser/parser-factory.js');
    const result = await parseSource("export const x: number = 1;", 'typescript');
    expect(result.language).toBe('typescript');
  });

  it('parseSource root node has children array', async () => {
    const { parseSource } = await import('../src/parser/parser-factory.js');
    const result = await parseSource("import { a } from './a';", 'typescript');
    expect(Array.isArray(result.root.children)).toBe(true);
  });
});
