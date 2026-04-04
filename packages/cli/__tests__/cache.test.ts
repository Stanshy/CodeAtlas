/**
 * AI Summary Cache unit tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { getCachedSummary, setCachedSummary } from '../src/cache.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeatlas-cache-test-'));
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // Cleanup best-effort
  }
});

describe('getCachedSummary', () => {
  it('returns null when no cache exists', async () => {
    const result = await getCachedSummary(tempDir, 'src/app.ts', 'openai');
    expect(result).toBeNull();
  });

  it('returns null for corrupt cache file', async () => {
    // Write a corrupt file manually
    await setCachedSummary(tempDir, 'src/app.ts', 'openai', 'test summary');
    // Find and corrupt the file
    const files = await fs.readdir(tempDir);
    expect(files.length).toBe(1);
    await fs.writeFile(path.join(tempDir, files[0]), 'not valid json', 'utf-8');

    const result = await getCachedSummary(tempDir, 'src/app.ts', 'openai');
    expect(result).toBeNull();
  });
});

describe('setCachedSummary', () => {
  it('creates cache directory and writes file', async () => {
    const nestedDir = path.join(tempDir, 'nested', 'cache');
    await setCachedSummary(nestedDir, 'src/utils.ts', 'anthropic', 'Utility module.');

    const files = await fs.readdir(nestedDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/\.json$/);
  });

  it('writes valid JSON with correct shape', async () => {
    await setCachedSummary(tempDir, 'src/index.ts', 'openai', 'Main entry point.');

    const files = await fs.readdir(tempDir);
    const content = await fs.readFile(path.join(tempDir, files[0]), 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.nodeId).toBe('src/index.ts');
    expect(parsed.summary).toBe('Main entry point.');
    expect(parsed.provider).toBe('openai');
    expect(typeof parsed.cachedAt).toBe('string');
  });
});

describe('cache round-trip', () => {
  it('set then get returns the same summary', async () => {
    await setCachedSummary(tempDir, 'src/app.ts', 'openai', 'This is the app.');

    const result = await getCachedSummary(tempDir, 'src/app.ts', 'openai');
    expect(result).not.toBeNull();
    expect(result!.summary).toBe('This is the app.');
    expect(result!.nodeId).toBe('src/app.ts');
    expect(result!.provider).toBe('openai');
  });

  it('different provider returns null (different hash)', async () => {
    await setCachedSummary(tempDir, 'src/app.ts', 'openai', 'OpenAI summary');

    const result = await getCachedSummary(tempDir, 'src/app.ts', 'anthropic');
    expect(result).toBeNull();
  });

  it('different nodeId returns null', async () => {
    await setCachedSummary(tempDir, 'src/app.ts', 'openai', 'App summary');

    const result = await getCachedSummary(tempDir, 'src/other.ts', 'openai');
    expect(result).toBeNull();
  });
});
