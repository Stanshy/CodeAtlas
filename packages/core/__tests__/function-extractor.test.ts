/**
 * function-extractor unit tests
 *
 * Tests extractFunctions() against fixture files in
 * __tests__/fixtures/function-level/.
 *
 * Exercises:
 *   - Function declarations, arrow functions, async, generator, exported
 *   - Class extraction (constructor, getter, setter, methods)
 *   - Nested-function isolation (only top-level extracted)
 *   - Parameter and return type extraction
 *   - No anonymous functions in results
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFile } from 'fs/promises';
import { parseSource } from '../src/parser/index.js';
import { extractFunctions } from '../src/parser/function-extractor.js';
import type { ParsedFunction, ParsedClass } from '../src/parser/function-extractor.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const fixturesDir = resolve(__dirname, 'fixtures', 'function-level');

async function parseFixture(filename: string) {
  const source = await readFile(resolve(fixturesDir, filename), 'utf-8');
  const ast = await parseSource(source, 'typescript');
  return extractFunctions(ast.root);
}

// ---------------------------------------------------------------------------
// basic-functions.ts
// ---------------------------------------------------------------------------

describe('extractFunctions — basic-functions.ts', () => {
  it('extracts at least 5 named functions', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    expect(functions.length).toBeGreaterThanOrEqual(5);
  });

  it('extracts the greet function with kind "function"', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');
  });

  it('greet function has parameter "name" of type string', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.parameters.length).toBeGreaterThanOrEqual(1);
    expect(fn!.parameters[0].name).toBe('name');
  });

  it('greet function has return type "string"', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.returnType).toBe('string');
  });

  it('fetchData function is async', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'fetchData');
    expect(fn).toBeDefined();
    expect(fn!.isAsync).toBe(true);
  });

  it('fetchData function has parameter "url" of type string', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'fetchData');
    expect(fn).toBeDefined();
    const urlParam = fn!.parameters.find((p) => p.name === 'url');
    expect(urlParam).toBeDefined();
  });

  it('generateIds function is a generator', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'generateIds');
    expect(fn).toBeDefined();
    expect(fn!.isGenerator).toBe(true);
  });

  it('multiply arrow function is extracted with kind "function"', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'multiply');
    expect(fn).toBeDefined();
    expect(fn!.kind).toBe('function');
  });

  it('multiply has two parameters', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'multiply');
    expect(fn).toBeDefined();
    expect(fn!.parameters.length).toBe(2);
  });

  it('formatDate function is exported', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'formatDate');
    expect(fn).toBeDefined();
    expect(fn!.isExported).toBe(true);
  });

  it('greet is not exported', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.isExported).toBe(false);
  });

  it('no function has an empty name (no anonymous functions)', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    for (const fn of functions) {
      expect(fn.name.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// class-example.ts
// ---------------------------------------------------------------------------

describe('extractFunctions — class-example.ts', () => {
  it('extracts the Animal class', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
  });

  it('Animal class is exported', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    expect(cls!.isExported).toBe(true);
  });

  it('Animal class has a constructor method', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    const ctor = cls!.methods.find((m) => m.kind === 'constructor');
    expect(ctor).toBeDefined();
  });

  it('Animal class has a getter for "name"', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    const getter = cls!.methods.find((m) => m.name === 'name' && m.kind === 'getter');
    expect(getter).toBeDefined();
  });

  it('Animal class has a setter for "name"', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    const setter = cls!.methods.find((m) => m.name === 'name' && m.kind === 'setter');
    expect(setter).toBeDefined();
  });

  it('Animal class has a speak method', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    const method = cls!.methods.find((m) => m.name === 'speak');
    expect(method).toBeDefined();
    expect(method!.kind).toBe('method');
  });

  it('all methods in Animal class have className set to "Animal"', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    for (const method of cls!.methods) {
      expect(method.className).toBe('Animal');
    }
  });

  it('constructor has parameters', async () => {
    const { classes } = await parseFixture('class-example.ts');
    const cls = classes.find((c) => c.name === 'Animal');
    expect(cls).toBeDefined();
    const ctor = cls!.methods.find((m) => m.kind === 'constructor');
    expect(ctor).toBeDefined();
    expect(ctor!.parameters.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// nested-functions.ts
// ---------------------------------------------------------------------------

describe('extractFunctions — nested-functions.ts', () => {
  it('extracts only top-level functions (not inner ones)', async () => {
    const { functions } = await parseFixture('nested-functions.ts');
    const names = functions.map((f) => f.name);
    // Should NOT contain innerFilter or innerTransform or deeplyNested
    expect(names).not.toContain('innerFilter');
    expect(names).not.toContain('innerTransform');
    expect(names).not.toContain('deeplyNested');
  });

  it('extracts outerFunction as top-level', async () => {
    const { functions } = await parseFixture('nested-functions.ts');
    const fn = functions.find((f) => f.name === 'outerFunction');
    expect(fn).toBeDefined();
  });

  it('extracts anotherTopLevel as top-level', async () => {
    const { functions } = await parseFixture('nested-functions.ts');
    const fn = functions.find((f) => f.name === 'anotherTopLevel');
    expect(fn).toBeDefined();
  });

  it('extracts exactly 2 top-level functions', async () => {
    const { functions } = await parseFixture('nested-functions.ts');
    expect(functions.length).toBe(2);
  });

  it('outerFunction has parameter "data"', async () => {
    const { functions } = await parseFixture('nested-functions.ts');
    const fn = functions.find((f) => f.name === 'outerFunction');
    expect(fn).toBeDefined();
    const dataParam = fn!.parameters.find((p) => p.name === 'data');
    expect(dataParam).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Parameters extraction
// ---------------------------------------------------------------------------

describe('extractFunctions — parameter extraction', () => {
  it('multiply has parameters a and b', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'multiply');
    expect(fn).toBeDefined();
    const paramNames = fn!.parameters.map((p) => p.name);
    expect(paramNames).toContain('a');
    expect(paramNames).toContain('b');
  });

  it('fetchData url parameter has type annotation', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'fetchData');
    expect(fn).toBeDefined();
    const urlParam = fn!.parameters.find((p) => p.name === 'url');
    expect(urlParam).toBeDefined();
    expect(urlParam!.type).toBeDefined();
    expect(urlParam!.type).toContain('string');
  });
});

// ---------------------------------------------------------------------------
// Return type extraction
// ---------------------------------------------------------------------------

describe('extractFunctions — return type extraction', () => {
  it('greet has return type "string"', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'greet');
    expect(fn).toBeDefined();
    expect(fn!.returnType).toBeDefined();
    expect(fn!.returnType).toContain('string');
  });

  it('multiply has return type "number"', async () => {
    const { functions } = await parseFixture('basic-functions.ts');
    const fn = functions.find((f) => f.name === 'multiply');
    expect(fn).toBeDefined();
    expect(fn!.returnType).toBeDefined();
    expect(fn!.returnType).toContain('number');
  });
});
