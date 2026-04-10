/**
 * Config resolver unit tests
 *
 * Tests for packages/cli/src/config.ts — readConfigFile, readEnvVars, resolveConfig.
 *
 * Covers:
 *   readConfigFile:
 *     - Returns empty object when file doesn't exist
 *     - Reads valid .codeatlas.json correctly
 *     - Returns empty + console.error on invalid JSON
 *     - Warns on unknown aiProvider, returns 'disabled'
 *     - Validates port range (invalid port → warning, no port in result)
 *     - Detects key-like fields → console.warn
 *
 *   readEnvVars:
 *     - Returns OPENAI_API_KEY when provider is 'openai'
 *     - Returns ANTHROPIC_API_KEY when provider is 'anthropic'
 *     - Falls back to CODEATLAS_AI_KEY
 *     - Returns empty object when no env vars set
 *
 *   resolveConfig:
 *     - CLI flag overrides json file (port, aiProvider)
 *     - env var overrides CLI for aiKey (env > CLI)
 *     - Defaults: port=3000, ollamaModel='codellama', aiProvider='disabled'
 *     - Full merge with all sources
 *
 * Sprint 6 — T9: Tests + Regression
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readConfigFile, readEnvVars, resolveConfig } from '../src/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'codeatlas-config-test-'));
}

function writeTempConfig(dir: string, content: unknown): void {
  fs.writeFileSync(path.join(dir, '.codeatlas.json'), JSON.stringify(content), 'utf-8');
}

function writeRawConfig(dir: string, raw: string): void {
  fs.writeFileSync(path.join(dir, '.codeatlas.json'), raw, 'utf-8');
}

function cleanDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // Cleanup best-effort
  }
}

// ---------------------------------------------------------------------------
// readConfigFile
// ---------------------------------------------------------------------------

describe('readConfigFile — file does not exist', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it('returns empty object when .codeatlas.json does not exist', () => {
    const result = readConfigFile(tempDir);
    expect(result).toEqual({});
  });
});

describe('readConfigFile — valid config', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    cleanDir(tempDir);
  });

  it('reads aiProvider correctly', () => {
    writeTempConfig(tempDir, { aiProvider: 'ollama' });
    const result = readConfigFile(tempDir);
    expect(result.aiProvider).toBe('ollama');
  });

  it('reads port correctly', () => {
    writeTempConfig(tempDir, { port: 4000 });
    const result = readConfigFile(tempDir);
    expect(result.port).toBe(4000);
  });

  it('reads ollamaModel correctly', () => {
    writeTempConfig(tempDir, { ollamaModel: 'llama2' });
    const result = readConfigFile(tempDir);
    expect(result.ollamaModel).toBe('llama2');
  });

  it('reads ignore array correctly', () => {
    writeTempConfig(tempDir, { ignore: ['node_modules', 'dist'] });
    const result = readConfigFile(tempDir);
    expect(result.ignore).toEqual(['node_modules', 'dist']);
  });

  it('reads a full valid config correctly', () => {
    writeTempConfig(tempDir, {
      aiProvider: 'ollama',
      ollamaModel: 'codellama',
      port: 3001,
      ignore: ['dist'],
    });
    const result = readConfigFile(tempDir);
    expect(result.aiProvider).toBe('ollama');
    expect(result.ollamaModel).toBe('codellama');
    expect(result.port).toBe(3001);
    expect(result.ignore).toEqual(['dist']);
  });
});

describe('readConfigFile — invalid JSON', () => {
  let tempDir: string;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanDir(tempDir);
  });

  it('returns empty object when JSON is invalid', () => {
    writeRawConfig(tempDir, '{ not valid json }');
    const result = readConfigFile(tempDir);
    expect(result).toEqual({});
  });

  it('calls console.error when JSON is invalid', () => {
    writeRawConfig(tempDir, '{ not valid json }');
    readConfigFile(tempDir);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

describe('readConfigFile — unknown aiProvider', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanDir(tempDir);
  });

  it('returns aiProvider as "disabled" when provider is unknown', () => {
    writeTempConfig(tempDir, { aiProvider: 'totally-unknown' });
    const result = readConfigFile(tempDir);
    expect(result.aiProvider).toBe('disabled');
  });

  it('calls console.warn when aiProvider is unknown', () => {
    writeTempConfig(tempDir, { aiProvider: 'totally-unknown' });
    readConfigFile(tempDir);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe('readConfigFile — invalid port', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanDir(tempDir);
  });

  it('does not include port in result when port is out of range (0)', () => {
    writeTempConfig(tempDir, { port: 0 });
    const result = readConfigFile(tempDir);
    expect(result.port).toBeUndefined();
  });

  it('does not include port in result when port is out of range (99999)', () => {
    writeTempConfig(tempDir, { port: 99999 });
    const result = readConfigFile(tempDir);
    expect(result.port).toBeUndefined();
  });

  it('calls console.warn when port is invalid', () => {
    writeTempConfig(tempDir, { port: 99999 });
    readConfigFile(tempDir);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

describe('readConfigFile — sensitive key detection', () => {
  let tempDir: string;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tempDir = makeTempDir();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanDir(tempDir);
  });

  it('calls console.warn when config contains a field with "key" in the name', () => {
    writeTempConfig(tempDir, { apiKey: 'sk-1234' });
    readConfigFile(tempDir);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('calls console.warn when config contains a field with "secret" in the name', () => {
    writeTempConfig(tempDir, { mySecret: 'supersecret' });
    readConfigFile(tempDir);
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it('calls console.warn when config contains a field with "token" in the name', () => {
    writeTempConfig(tempDir, { authToken: 'tok-abc' });
    readConfigFile(tempDir);
    expect(warnSpy).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// readEnvVars
// ---------------------------------------------------------------------------

describe('readEnvVars — OPENAI_API_KEY', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('returns OPENAI_API_KEY as aiKey when provider is "openai"', () => {
    process.env.OPENAI_API_KEY = 'sk-openai-test';
    const result = readEnvVars('openai');
    expect(result.aiKey).toBe('sk-openai-test');
  });
});

describe('readEnvVars — ANTHROPIC_API_KEY', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('returns ANTHROPIC_API_KEY as aiKey when provider is "anthropic"', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    const result = readEnvVars('anthropic');
    expect(result.aiKey).toBe('sk-ant-test');
  });
});

describe('readEnvVars — CODEATLAS_AI_KEY fallback', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('falls back to CODEATLAS_AI_KEY when no provider-specific key is set', () => {
    process.env.CODEATLAS_AI_KEY = 'codeatlas-key-test';
    const result = readEnvVars('ollama');
    expect(result.aiKey).toBe('codeatlas-key-test');
  });
});

describe('readEnvVars — no env vars set', () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('returns empty object when no env vars are set', () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
    const result = readEnvVars('ollama');
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// resolveConfig
// ---------------------------------------------------------------------------

describe('resolveConfig — defaults', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  afterEach(() => {
    cleanDir(tempDir);
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('defaults to port 3000 when no source specifies a port', () => {
    const result = resolveConfig({}, tempDir);
    expect(result.port).toBe(3000);
  });

  it('defaults to ollamaModel "codellama"', () => {
    const result = resolveConfig({}, tempDir);
    expect(result.ollamaModel).toBe('codellama');
  });

  it('defaults to aiProvider "disabled"', () => {
    const result = resolveConfig({}, tempDir);
    expect(result.aiProvider).toBe('disabled');
  });

  it('defaults to empty ignore array', () => {
    const result = resolveConfig({}, tempDir);
    expect(result.ignore).toEqual([]);
  });

  it('aiKey is undefined when no env vars or CLI key set', () => {
    const result = resolveConfig({}, tempDir);
    expect(result.aiKey).toBeUndefined();
  });
});

describe('resolveConfig — CLI flag overrides', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  afterEach(() => {
    cleanDir(tempDir);
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('CLI port overrides json file port', () => {
    writeTempConfig(tempDir, { port: 4000 });
    const result = resolveConfig({ port: 5000 }, tempDir);
    expect(result.port).toBe(5000);
  });

  it('CLI aiProvider overrides json file aiProvider', () => {
    writeTempConfig(tempDir, { aiProvider: 'openai' });
    const result = resolveConfig({ aiProvider: 'ollama' }, tempDir);
    expect(result.aiProvider).toBe('ollama');
  });

  it('CLI ollamaModel overrides json file ollamaModel', () => {
    writeTempConfig(tempDir, { ollamaModel: 'llama2' });
    const result = resolveConfig({ ollamaModel: 'mistral' }, tempDir);
    expect(result.ollamaModel).toBe('mistral');
  });
});

describe('resolveConfig — env var takes priority over CLI for aiKey', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  afterEach(() => {
    cleanDir(tempDir);
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('env OPENAI_API_KEY overrides CLI aiKey when provider is openai', () => {
    process.env.OPENAI_API_KEY = 'sk-env-key';
    const result = resolveConfig({ aiProvider: 'openai', aiKey: 'sk-cli-key' }, tempDir);
    expect(result.aiKey).toBe('sk-env-key');
  });
});

describe('resolveConfig — full merge', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  afterEach(() => {
    cleanDir(tempDir);
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.CODEATLAS_AI_KEY;
  });

  it('full merge: CLI + json + env produces correct ResolvedConfig', () => {
    writeTempConfig(tempDir, { port: 4000, ollamaModel: 'llama2' });
    process.env.OPENAI_API_KEY = 'sk-env-key';
    const result = resolveConfig(
      { aiProvider: 'openai', port: 5000 },
      tempDir,
    );
    expect(result.aiProvider).toBe('openai');    // CLI wins
    expect(result.port).toBe(5000);              // CLI wins over json
    expect(result.ollamaModel).toBe('llama2');   // json (no CLI override)
    expect(result.aiKey).toBe('sk-env-key');     // env wins over CLI
  });
});
