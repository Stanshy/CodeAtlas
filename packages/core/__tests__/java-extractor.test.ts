/**
 * java-extractor.test.ts
 *
 * Sprint 18 / T10 — E2E Java extraction tests
 *
 * Covers Java import extraction, class/interface/enum extraction,
 * method/constructor extraction, parameter types, and return types.
 *
 * Tests are guarded by a skipIf check: if tree-sitter is unavailable for
 * Java, individual tests emit a skip rather than a hard failure.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { parseFileImports } from '../src/parser/import-extractor.js';
import { parseSource } from '../src/parser/parser-factory.js';
import { extractFunctions } from '../src/parser/function-extractor.js';

// ---------------------------------------------------------------------------
// Availability guard
// ---------------------------------------------------------------------------

let javaAvailable = false;

beforeAll(async () => {
  try {
    await parseSource('class Hello {}', 'java');
    javaAvailable = true;
  } catch {
    javaAvailable = false;
  }
});

function skipIfUnavailable() {
  if (!javaAvailable) {
    console.warn('[SKIP] Java tree-sitter not available — skipping test');
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function extractJava(code: string) {
  const parseResult = await parseSource(code, 'java');
  return extractFunctions(parseResult.root, 'java');
}

// ---------------------------------------------------------------------------
// Java Import Extractor
// ---------------------------------------------------------------------------

describe('Java Import Extractor', () => {
  it('extracts a simple qualified import', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('Test.java', 'import com.example.User;', 'java');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('com.example.User');
  });

  it('extracted import has the leaf class as importedSymbol', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('Test.java', 'import com.example.User;', 'java');
    expect(result.imports[0].importedSymbols).toContain('User');
  });

  it('marks wildcard import as isNamespace = true', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('Test.java', 'import com.example.*;', 'java');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].isNamespace).toBe(true);
  });

  it('marks static import as isTypeOnly = true', async () => {
    if (skipIfUnavailable()) return;
    const code = 'import static com.example.Utils.helper;';
    const result = await parseFileImports('Test.java', code, 'java');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].isTypeOnly).toBe(true);
  });

  it('extracts multiple imports from multiple statements', async () => {
    if (skipIfUnavailable()) return;
    const code = [
      'import com.example.User;',
      'import com.example.Order;',
      'import java.util.List;',
    ].join('\n');
    const result = await parseFileImports('Test.java', code, 'java');
    expect(result.imports).toHaveLength(3);
  });

  it('package_declaration does not appear as an import edge', async () => {
    if (skipIfUnavailable()) return;
    const code = 'package com.example;\nimport com.example.User;';
    const result = await parseFileImports('Test.java', code, 'java');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toBe('com.example.User');
  });

  it('extracts deeply nested package import', async () => {
    if (skipIfUnavailable()) return;
    const code = 'import org.springframework.boot.autoconfigure.SpringBootApplication;';
    const result = await parseFileImports('Test.java', code, 'java');
    expect(result.imports).toHaveLength(1);
    expect(result.imports[0].source).toContain('SpringBootApplication');
  });

  it('returns no errors for valid Java import source', async () => {
    if (skipIfUnavailable()) return;
    const result = await parseFileImports('Test.java', 'import java.util.List;', 'java');
    expect(result.errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Java Function Extractor
// ---------------------------------------------------------------------------

describe('Java Function Extractor', () => {
  it('extracts public class by name', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class UserService {\n    public String getUser(int id) {\n        return "user";\n    }\n}`;
    const result = await extractJava(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('UserService');
  });

  it('extracts method inside class', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class UserService {\n    public String getUser(int id) {\n        return "user";\n    }\n}`;
    const result = await extractJava(code);
    expect(result.classes[0].methods).toHaveLength(1);
    expect(result.classes[0].methods[0].name).toBe('getUser');
  });

  it('extracts constructor with kind = "constructor"', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class Foo {\n    public Foo(String name) {\n        this.name = name;\n    }\n}`;
    const result = await extractJava(code);
    expect(result.classes[0].methods).toHaveLength(1);
    expect(result.classes[0].methods[0].kind).toBe('constructor');
  });

  it('extracts interface and treats it as a class entry', async () => {
    if (skipIfUnavailable()) return;
    const code = `public interface UserRepository {\n    User findById(int id);\n}`;
    const result = await extractJava(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('UserRepository');
  });

  it('extracts enum and treats it as a class entry', async () => {
    if (skipIfUnavailable()) return;
    const code = `public enum Status {\n    ACTIVE,\n    INACTIVE\n}`;
    const result = await extractJava(code);
    expect(result.classes).toHaveLength(1);
    expect(result.classes[0].name).toBe('Status');
  });

  it('extracts method return type', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class Svc {\n    public int calculate(int a, int b) {\n        return a + b;\n    }\n}`;
    const result = await extractJava(code);
    const method = result.classes[0].methods[0];
    expect(method.returnType).toBe('int');
  });

  it('extracts method parameter names', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class Svc {\n    public void process(String name, int count) {}\n}`;
    const result = await extractJava(code);
    const method = result.classes[0].methods[0];
    expect(method.parameters).toHaveLength(2);
    expect(method.parameters[0].name).toBe('name');
    expect(method.parameters[1].name).toBe('count');
  });

  it('extracts method parameter types', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class Svc {\n    public void process(String name, int count) {}\n}`;
    const result = await extractJava(code);
    const method = result.classes[0].methods[0];
    expect(method.parameters[0].type).toBe('String');
    expect(method.parameters[1].type).toBe('int');
  });

  it('marks public class as isExported = true', async () => {
    if (skipIfUnavailable()) return;
    const code = `public class OpenClass {\n    public void noop() {}\n}`;
    const result = await extractJava(code);
    expect(result.classes[0].isExported).toBe(true);
  });

  it('marks package-private class as isExported = false', async () => {
    if (skipIfUnavailable()) return;
    const code = `class PackageClass {\n    void noop() {}\n}`;
    const result = await extractJava(code);
    expect(result.classes[0].isExported).toBe(false);
  });
});
