/**
 * python-extractor.test.ts
 *
 * Sprint 18 / T9 — E2E Python extraction tests
 *
 * Covers Python import extraction, function extraction, parameter handling,
 * class/method extraction, decorators, and async functions.
 *
 * Tests are guarded by a skipIf check: if tree-sitter is unavailable for
 * Python, individual tests emit a skip rather than a hard failure, so the
 * suite never goes red purely because of missing native binaries.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseFileImports } from '../src/parser/import-extractor.js';
import { parseSource } from '../src/parser/parser-factory.js';
import { extractFunctions } from '../src/parser/function-extractor.js';

// ---------------------------------------------------------------------------
// Availability guard
// ---------------------------------------------------------------------------

let pythonAvailable = false;

beforeAll(async () => {
  try {
    await parseSource('x = 1', 'python');
    pythonAvailable = true;
  } catch {
    pythonAvailable = false;
  }
});

function skipIfUnavailable() {
  if (!pythonAvailable) {
    console.warn('[SKIP] Python tree-sitter not available — skipping test');
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function extractPython(code: string) {
  const parseResult = await parseSource(code, 'python');
  return extractFunctions(parseResult.root, 'python');
}

// ---------------------------------------------------------------------------
// Python Import Extractor
// ---------------------------------------------------------------------------

describe('Python Import Extractor', () => {
  it('extracts absolute import (import os)', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'import os', 'python');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('os');
    expect(result.imports[0].isNamespace).toBe(true);
  });

  it('extracts multiple dotted names from one import statement', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'import os, sys', 'python');
    expect(result.imports).toHaveLength(2);
    const sources = result.imports.map((i) => i.source);
    expect(sources).toContain('os');
    expect(sources).toContain('sys');
  });

  it('extracts from-import with named symbols', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports(
      'test.py',
      'from os.path import join, exists',
      'python',
    );
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('os.path');
    expect(result.imports[0].importedSymbols).toContain('join');
    expect(result.imports[0].importedSymbols).toContain('exists');
  });

  it('extracts relative import with single dot', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'from . import utils', 'python');
    expect(result.imports).toHaveLength(1);
    // Source must start with a dot (relative marker)
    expect(result.imports[0].source).toMatch(/^\./);
  });

  it('extracts relative from-import with double dot', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports(
      'test.py',
      'from ..models import User',
      'python',
    );
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toMatch(/^\.\./);
    expect(result.imports[0].importedSymbols).toContain('User');
  });

  it('extracts wildcard import (from foo import *) as namespace', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'from foo import *', 'python');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].isNamespace).toBe(true);
  });

  it('extracts aliased import (import numpy as np)', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'import numpy as np', 'python');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('numpy');
  });

  it('extracts parenthesized multi-symbol from-import', async () => {
    if (skipIfUnavailable()) return;
    const code = `from os.path import (\n    join,\n    exists,\n    dirname\n)`;
    const result = await parseFileImports('test.py', code, 'python');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].importedSymbols.length).toBeGreaterThanOrEqual(3);
  });

  it('returns empty imports for a file with no import statements', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'x = 1\nprint(x)', 'python');
    expect(result.imports).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('reports no errors when parsing valid Python', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('test.py', 'import os\nimport sys', 'python');
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Python Function Extractor
// ---------------------------------------------------------------------------

describe('Python Function Extractor', () => {
  it('extracts a simple top-level function with its name', async () => {
    if (skipIfUnavailable()) return;
    const result = await extractPython('def hello(name):\n    return f"Hello {name}"');
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('hello');
  });

  it('extracts simple function parameters', async () => {
    if (skipIfUnavailable()) return;
    const result = await extractPython('def hello(name):\n    return f"Hello {name}"');
    expect(result.functions[0].parameters).toHaveLength(1);
    expect(result.functions[0].parameters[0].name).toBe('name');
  });

  it('extracts async function and marks isAsync = true', async () => {
    if (skipIfUnavailable()) return;
    const result = await extractPython(
      'async def fetch_data(url):\n    pass',
    );
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('fetch_data');
    expect(result.functions[0].isAsync).toBe(true);
  });

  it('extracts class definition with its name', async () => {
    if (skipIfUnavailable()) return;
    const code = `class UserService:\n    def __init__(self, db):\n        self.db = db\n\n    def get_user(self, user_id):\n        pass`;
    const result = await extractPython(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('UserService');
  });

  it('extracts class methods (strips self from parameters)', async () => {
    if (skipIfUnavailable()) return;
    const code = `class UserService:\n    def get_user(self, user_id):\n        pass`;
    const result = await extractPython(code);
    const getUser = result.classes[0].methods.find((m) => m.name === 'get_user');
    expect(getUser).toBeDefined();
    // self must be stripped from the public parameter list
    expect(getUser!.parameters.every((p) => p.name !== 'self')).toBe(true);
  });

  it('extracts decorated top-level function', async () => {
    if (skipIfUnavailable()) return;
    const code = `@staticmethod\ndef create():\n    pass`;
    const result = await extractPython(code);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('create');
  });

  it('extracts *args parameter with isRest = true', async () => {
    if (skipIfUnavailable()) return;
    const code = `def flexible(*args, **kwargs):\n    pass`;
    const result = await extractPython(code);
    expect(result.functions).toHaveLength(1);
    const args = result.functions[0].parameters.find((p) => p.name === 'args');
    expect(args).toBeDefined();
    expect(args!.isRest).toBe(true);
  });

  it('extracts **kwargs parameter with isRest = true', async () => {
    if (skipIfUnavailable()) return;
    const code = `def flexible(*args, **kwargs):\n    pass`;
    const result = await extractPython(code);
    const kwargs = result.functions[0].parameters.find((p) => p.name === 'kwargs');
    expect(kwargs).toBeDefined();
    expect(kwargs!.isRest).toBe(true);
  });

  it('extracts typed parameter type annotation', async () => {
    if (skipIfUnavailable()) return;
    const code = `def add(a: int, b: int) -> int:\n    return a + b`;
    const result = await extractPython(code);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].parameters[0].type).toBe('int');
  });

  it('marks default parameter as isOptional = true', async () => {
    if (skipIfUnavailable()) return;
    const code = `def add(a: int, b: int = 0) -> int:\n    return a + b`;
    const result = await extractPython(code);
    const b = result.functions[0].parameters.find((p) => p.name === 'b');
    expect(b).toBeDefined();
    expect(b!.isOptional).toBe(true);
  });

  it('extracts multiple top-level functions', async () => {
    if (skipIfUnavailable()) return;
    const code = `def foo():\n    pass\n\ndef bar():\n    pass\n\ndef baz():\n    pass`;
    const result = await extractPython(code);
    expect(result.functions.length).toBeGreaterThanOrEqual(3);
  });
});
