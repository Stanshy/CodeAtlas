/**
 * language-detection.test.ts
 *
 * Sprint 18 / T11 — Language detection and JS/TS regression tests
 *
 * Verifies that:
 *   - Python files are parsed correctly by the Python path
 *   - Java files are parsed correctly by the Java path
 *   - JS/TS parsing is completely unaffected by multi-language changes
 *   - Errors are not produced for well-formed source in any supported language
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseFileImports } from '../src/parser/import-extractor.js';
import { parseSource } from '../src/parser/parser-factory.js';
import { extractFunctions } from '../src/parser/function-extractor.js';

// ---------------------------------------------------------------------------
// Language availability flags
// ---------------------------------------------------------------------------

let pythonAvailable = false;
let javaAvailable = false;

beforeAll(async () => {
  try {
    await parseSource('x = 1', 'python');
    pythonAvailable = true;
  } catch {
    pythonAvailable = false;
  }

  try {
    await parseSource('class Hello {}', 'java');
    javaAvailable = true;
  } catch {
    javaAvailable = false;
  }
});

// ---------------------------------------------------------------------------
// Language-specific parse paths
// ---------------------------------------------------------------------------

describe('Language Detection via parseFileImports', () => {
  it('parses .py source via the Python path without errors', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const result = await parseFileImports('app.py', 'import os', 'python');
    expect(result.errors).toHaveLength(0);
    expect(result.imports).toHaveLength(1);
  });

  it('parses .java source via the Java path without errors', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const result = await parseFileImports('App.java', 'import java.util.List;', 'java');
    expect(result.errors).toHaveLength(0);
    expect(result.imports).toHaveLength(1);
  });

  it('parses TypeScript source correctly (JS/TS path unchanged)', async () => {
    const result = await parseFileImports(
      'app.ts',
      "import { foo } from './bar';",
      'typescript',
    );
    expect(result.errors).toHaveLength(0);
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('./bar');
  });

  it('parses JavaScript CJS require correctly (JS path unchanged)', async () => {
    const result = await parseFileImports(
      'app.js',
      "const x = require('./utils');",
      'javascript',
    );
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('./utils');
  });

  it('parses JavaScript ES import correctly (JS path unchanged)', async () => {
    const result = await parseFileImports(
      'app.js',
      "import lodash from 'lodash';",
      'javascript',
    );
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('lodash');
    expect(result.imports[0].isDefault).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JS/TS regression: extractFunctions still works after multi-language changes
// ---------------------------------------------------------------------------

describe('JS/TS Function Extractor Regression', () => {
  it('extracts a TypeScript function declaration unchanged', async () => {
    const code = `function greet(name: string): string {\n  return "Hello " + name;\n}`;
    const ast = await parseSource(code, 'typescript');
    const result = extractFunctions(ast.root);
    expect(result.functions.length).toBeGreaterThanOrEqual(1);
    const fn = result.functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');
  });

  it('extracts TypeScript class with method unchanged', async () => {
    const code = `class Greeter {\n  greet(name: string): string {\n    return "Hello " + name;\n  }\n}`;
    const ast = await parseSource(code, 'typescript');
    const result = extractFunctions(ast.root);
    expect(result.classes.length).toBeGreaterThanOrEqual(1);
    const cls = result.classes.find((c) => c.name === 'Greeter');
    expect(cls).toBeDefined();
  });

  it('extracts JavaScript arrow function unchanged', async () => {
    const code = `const add = (a, b) => a + b;`;
    const ast = await parseSource(code, 'javascript');
    const result = extractFunctions(ast.root);
    const fn = result.functions.find((f) => f.name === 'add');
    expect(fn).toBeDefined();
  });

  it('TypeScript named imports are extracted with correct source', async () => {
    const code = `import { readFile, writeFile } from 'fs/promises';`;
    const result = await parseFileImports('util.ts', code, 'typescript');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('fs/promises');
    expect(result.imports[0].importedSymbols).toContain('readFile');
    expect(result.imports[0].importedSymbols).toContain('writeFile');
  });

  it('TypeScript namespace import is marked isNamespace = true', async () => {
    const code = `import * as path from 'path';`;
    const result = await parseFileImports('util.ts', code, 'typescript');
    expect(result.imports[0].isNamespace).toBe(true);
    expect(result.imports[0].source).toBe('path');
  });

  it('TypeScript type-only import is marked isTypeOnly = true', async () => {
    const code = `import type { Foo } from './types';`;
    const result = await parseFileImports('util.ts', code, 'typescript');
    expect(result.imports[0].isTypeOnly).toBe(true);
  });

  it('TypeScript default import is marked isDefault = true', async () => {
    const code = `import React from 'react';`;
    const result = await parseFileImports('util.ts', code, 'typescript');
    expect(result.imports[0].isDefault).toBe(true);
    expect(result.imports[0].source).toBe('react');
  });
});
