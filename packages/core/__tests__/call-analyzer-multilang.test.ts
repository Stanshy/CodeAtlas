/**
 * call-analyzer-multilang.test.ts
 *
 * Sprint 18 / T9 + T10 — Multi-language call analysis tests
 *
 * Verifies that analyzeCallRelations() correctly handles:
 *   - Python: direct calls, self.method() attribute calls
 *   - Java:   this.method() invocations, new object creation
 *   - JS/TS:  existing behaviour is unaffected (regression tests)
 *
 * Tests guard themselves with availability checks so they skip gracefully
 * when tree-sitter native binaries are not installed.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseSource } from '../src/parser/parser-factory.js';
import { extractFunctions } from '../src/parser/function-extractor.js';
import { analyzeCallRelations } from '../src/analyzer/call-analyzer.js';

// ---------------------------------------------------------------------------
// Availability guards
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
// Helpers
// ---------------------------------------------------------------------------

async function analyzePython(code: string) {
  const parseResult = await parseSource(code, 'python');
  const funcs = extractFunctions(parseResult.root, 'python');
  const allFunctions = [
    ...funcs.functions,
    ...funcs.classes.flatMap((c) => c.methods),
  ];
  return analyzeCallRelations(
    parseResult.root,
    'test.py',
    allFunctions,
    new Map(),
    'python',
  );
}

async function analyzeJava(code: string) {
  const parseResult = await parseSource(code, 'java');
  const funcs = extractFunctions(parseResult.root, 'java');
  const allFunctions = [
    ...funcs.functions,
    ...funcs.classes.flatMap((c) => c.methods),
  ];
  return analyzeCallRelations(
    parseResult.root,
    'Test.java',
    allFunctions,
    new Map(),
    'java',
  );
}

// ---------------------------------------------------------------------------
// Python call analysis
// ---------------------------------------------------------------------------

describe('Call Analyzer — Python', () => {
  it('detects direct function call between two top-level functions', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `def helper():\n    pass\n\ndef main():\n    helper()`;
    const relations = await analyzePython(code);
    expect(relations.some((r) => r.calleeName === 'helper')).toBe(true);
  });

  it('direct Python call has callType "direct"', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `def helper():\n    pass\n\ndef main():\n    helper()`;
    const relations = await analyzePython(code);
    const rel = relations.find((r) => r.calleeName === 'helper');
    expect(rel).toBeDefined();
    expect(rel!.callType).toBe('direct');
  });

  it('detects self.method() attribute call', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `class Svc:\n    def get(self):\n        return self.fetch()\n    def fetch(self):\n        pass`;
    const relations = await analyzePython(code);
    expect(relations.some((r) => r.calleeName === 'fetch')).toBe(true);
  });

  it('self.method() call has callType "method"', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `class Svc:\n    def get(self):\n        return self.fetch()\n    def fetch(self):\n        pass`;
    const relations = await analyzePython(code);
    const rel = relations.find((r) => r.calleeName === 'fetch');
    expect(rel).toBeDefined();
    expect(rel!.callType).toBe('method');
  });

  it('does not emit call relation for built-in print()', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `def main():\n    print("hello")`;
    const relations = await analyzePython(code);
    expect(relations.every((r) => r.calleeName !== 'print')).toBe(true);
  });

  it('produces call relations result array (may be empty for simple code)', async () => {
    if (!pythonAvailable) {
      console.warn('[SKIP] Python tree-sitter not available');
      return;
    }
    const code = `def foo():\n    pass`;
    const relations = await analyzePython(code);
    expect(Array.isArray(relations)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Java call analysis
// ---------------------------------------------------------------------------

describe('Call Analyzer — Java', () => {
  it('detects this.method() call inside a Java class', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class Svc {\n    public void run() {\n        this.process();\n    }\n    public void process() {}\n}`;
    const relations = await analyzeJava(code);
    expect(relations.some((r) => r.calleeName === 'process')).toBe(true);
  });

  it('this.method() call has callType "method"', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class Svc {\n    public void run() {\n        this.process();\n    }\n    public void process() {}\n}`;
    const relations = await analyzeJava(code);
    const rel = relations.find((r) => r.calleeName === 'process');
    expect(rel).toBeDefined();
    expect(rel!.callType).toBe('method');
  });

  it('detects new object creation expression', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class App {\n    public void run() {\n        Svc svc = new Svc();\n    }\n}\nclass Svc {}`;
    const relations = await analyzeJava(code);
    expect(relations.some((r) => r.calleeName === 'Svc' && r.callType === 'new')).toBe(true);
  });

  it('new expression has callType "new"', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class App {\n    public void run() {\n        Svc svc = new Svc();\n    }\n}\nclass Svc {}`;
    const relations = await analyzeJava(code);
    const rel = relations.find((r) => r.callType === 'new');
    expect(rel).toBeDefined();
    expect(rel!.callType).toBe('new');
  });

  it('does not emit call relation for built-in System references', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class App {\n    public void run() {\n        System.out.println("hello");\n    }\n}`;
    const relations = await analyzeJava(code);
    expect(relations.every((r) => r.calleeName !== 'System')).toBe(true);
  });

  it('produces call relations result array (may be empty for simple code)', async () => {
    if (!javaAvailable) {
      console.warn('[SKIP] Java tree-sitter not available');
      return;
    }
    const code = `public class Foo {\n    public void bar() {}\n}`;
    const relations = await analyzeJava(code);
    expect(Array.isArray(relations)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JS/TS regression: call analyzer still works after multi-language changes
// ---------------------------------------------------------------------------

describe('Call Analyzer — JS/TS Regression', () => {
  it('produces call relations for JS/TS code (existing path unchanged)', async () => {
    const code = `
      function process() { return transform(); }
      function transform() { return 42; }
    `;
    const ast = await parseSource(code, 'typescript');
    const funcs = extractFunctions(ast.root);
    const allFunctions = [...funcs.functions, ...funcs.classes.flatMap((c) => c.methods)];
    const relations = analyzeCallRelations(ast.root, 'file.ts', allFunctions, new Map());
    expect(Array.isArray(relations)).toBe(true);
    expect(relations.some((r) => r.calleeName === 'transform')).toBe(true);
  });

  it('direct JS/TS call has callType "direct" and confidence "high"', async () => {
    const code = `
      function doWork() {}
      function runner() { doWork(); }
    `;
    const ast = await parseSource(code, 'typescript');
    const funcs = extractFunctions(ast.root);
    const allFunctions = [...funcs.functions];
    const relations = analyzeCallRelations(ast.root, 'file.ts', allFunctions, new Map());
    const rel = relations.find((r) => r.calleeName === 'doWork');
    expect(rel).toBeDefined();
    expect(rel!.callType).toBe('direct');
    expect(rel!.confidence).toBe('high');
  });
});
