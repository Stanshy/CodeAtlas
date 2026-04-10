/**
 * Unit tests for PersistentAICache and computeContentHash (Sprint 16 T11)
 *
 * Coverage targets:
 *   - Basic get/set/size operations
 *   - saveToDisk / loadFromDisk round-trip
 *   - Graceful handling of missing and corrupted cache files
 *   - LRU eviction when serialized size exceeds 5 MB
 *   - isStale: contentHash and promptVersion checks
 *   - computeContentHash: consistency and uniqueness
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { PersistentAICache, computeContentHash } from '../src/ai-cache.js';
import type { AICacheEntry } from '../src/ai-cache.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tempDir: string;
let cacheFilePath: string;

function makeEntry(overrides: Partial<AICacheEntry> = {}): AICacheEntry {
  return {
    key: 'directory:src:openai:v1',
    contentHash: 'abc123',
    provider: 'openai',
    promptVersion: 'v1',
    result: { oneLineSummary: 'A test module', role: 'utility' },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeatlas-ai-cache-test-'));
  cacheFilePath = path.join(tempDir, 'ai-results.json');
});

afterEach(async () => {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ---------------------------------------------------------------------------
// PersistentAICache — basic operations
// ---------------------------------------------------------------------------

describe('PersistentAICache — basic operations', () => {
  it('starts empty with size 0', () => {
    const cache = new PersistentAICache(cacheFilePath);
    expect(cache.size).toBe(0);
    expect(cache.getAllEntries()).toHaveLength(0);
  });

  it('set and get returns the stored entry', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const entry = makeEntry();
    cache.set(entry.key, entry);
    const retrieved = cache.get(entry.key);
    expect(retrieved).toEqual(entry);
  });

  it('returns null for a non-existent key', () => {
    const cache = new PersistentAICache(cacheFilePath);
    expect(cache.get('non-existent-key')).toBeNull();
  });

  it('size returns the correct count after multiple sets', () => {
    const cache = new PersistentAICache(cacheFilePath);
    cache.set('key1', makeEntry({ key: 'key1' }));
    cache.set('key2', makeEntry({ key: 'key2' }));
    cache.set('key3', makeEntry({ key: 'key3' }));
    expect(cache.size).toBe(3);
  });

  it('overwriting an existing key keeps size stable', () => {
    const cache = new PersistentAICache(cacheFilePath);
    cache.set('key1', makeEntry({ key: 'key1', contentHash: 'hash-a' }));
    cache.set('key1', makeEntry({ key: 'key1', contentHash: 'hash-b' }));
    expect(cache.size).toBe(1);
    expect(cache.get('key1')?.contentHash).toBe('hash-b');
  });

  it('getAllEntries returns all stored entries', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const e1 = makeEntry({ key: 'k1' });
    const e2 = makeEntry({ key: 'k2' });
    cache.set(e1.key, e1);
    cache.set(e2.key, e2);
    const all = cache.getAllEntries();
    expect(all).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// PersistentAICache — persistence (saveToDisk / loadFromDisk)
// ---------------------------------------------------------------------------

describe('PersistentAICache — persistence', () => {
  it('saveToDisk creates the cache file', async () => {
    const cache = new PersistentAICache(cacheFilePath);
    cache.set('key1', makeEntry({ key: 'key1' }));
    // set() calls saveToDisk internally — verify file exists
    const stat = await fs.stat(cacheFilePath);
    expect(stat.isFile()).toBe(true);
  });

  it('loadFromDisk restores previously saved entries', () => {
    const cache1 = new PersistentAICache(cacheFilePath);
    const entry = makeEntry({ key: 'persist-key' });
    cache1.set(entry.key, entry);

    const cache2 = new PersistentAICache(cacheFilePath);
    cache2.loadFromDisk();
    const restored = cache2.get('persist-key');
    expect(restored).toEqual(entry);
  });

  it('loadFromDisk with missing file starts with empty cache (does not throw)', () => {
    const missingPath = path.join(tempDir, 'does-not-exist.json');
    const cache = new PersistentAICache(missingPath);
    expect(() => cache.loadFromDisk()).not.toThrow();
    expect(cache.size).toBe(0);
  });

  it('loadFromDisk with corrupted JSON starts with empty cache (does not throw)', async () => {
    await fs.writeFile(cacheFilePath, 'NOT VALID JSON {{{', 'utf-8');
    const cache = new PersistentAICache(cacheFilePath);
    expect(() => cache.loadFromDisk()).not.toThrow();
    expect(cache.size).toBe(0);
  });

  it('loadFromDisk with wrong version field starts with empty cache', async () => {
    const bad = JSON.stringify({ version: 99, entries: [] });
    await fs.writeFile(cacheFilePath, bad, 'utf-8');
    const cache = new PersistentAICache(cacheFilePath);
    cache.loadFromDisk();
    expect(cache.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PersistentAICache — LRU eviction
// ---------------------------------------------------------------------------

describe('PersistentAICache — LRU eviction', () => {
  it('evicts oldest entries when serialized size exceeds 5 MB', () => {
    const cache = new PersistentAICache(cacheFilePath);

    // Create entries with large result payloads to push over 5 MB
    // Each entry with a ~600 KB result string will need ~9 entries to exceed 5 MB
    const bigResult = 'x'.repeat(600_000); // ~600 KB per entry

    // Insert 10 entries with ascending timestamps so the first ones are "oldest"
    const baseTime = new Date('2025-01-01T00:00:00.000Z').getTime();
    for (let i = 0; i < 10; i++) {
      const key = `big-entry-${i}`;
      const entry: AICacheEntry = {
        key,
        contentHash: `hash-${i}`,
        provider: 'openai',
        promptVersion: 'v1',
        result: bigResult,
        createdAt: new Date(baseTime + i * 1000).toISOString(),
      };
      // Manually insert to entries without auto-save each time to build up state
      // Then call saveToDisk once to trigger eviction logic
      cache['entries'].set(key, entry);
    }

    // saveToDisk should evict oldest to stay within 5 MB
    cache.saveToDisk();

    // Reload to verify only a subset survived
    const cache2 = new PersistentAICache(cacheFilePath);
    cache2.loadFromDisk();

    // The newest entries should survive; at least 1 entry must remain
    expect(cache2.size).toBeGreaterThan(0);
    // The total should be less than all 10 entries (eviction occurred)
    expect(cache2.size).toBeLessThan(10);

    // If any entries remain, they should be the newest ones (higher index = newer)
    // The youngest entry (big-entry-9) must have survived if any did
    if (cache2.size > 0) {
      const all = cache2.getAllEntries();
      const keys = all.map((e) => e.key);
      // The newest key should be present
      expect(keys).toContain('big-entry-9');
    }
  });
});

// ---------------------------------------------------------------------------
// PersistentAICache — isStale
// ---------------------------------------------------------------------------

describe('PersistentAICache — isStale', () => {
  it('returns false when contentHash and promptVersion both match', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const entry = makeEntry({ contentHash: 'hash-abc', promptVersion: 'v2' });
    expect(cache.isStale(entry, 'hash-abc', 'v2')).toBe(false);
  });

  it('returns true when contentHash differs (source file changed)', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const entry = makeEntry({ contentHash: 'old-hash', promptVersion: 'v2' });
    expect(cache.isStale(entry, 'new-hash', 'v2')).toBe(true);
  });

  it('returns true when promptVersion differs (prompt template updated)', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const entry = makeEntry({ contentHash: 'hash-abc', promptVersion: 'v1' });
    expect(cache.isStale(entry, 'hash-abc', 'v2')).toBe(true);
  });

  it('returns true when both contentHash and promptVersion differ', () => {
    const cache = new PersistentAICache(cacheFilePath);
    const entry = makeEntry({ contentHash: 'old', promptVersion: 'v1' });
    expect(cache.isStale(entry, 'new', 'v2')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeContentHash
// ---------------------------------------------------------------------------

describe('computeContentHash', () => {
  it('returns a consistent md5 hash for the same input', () => {
    const h1 = computeContentHash('hello world');
    const h2 = computeContentHash('hello world');
    expect(h1).toBe(h2);
  });

  it('returns a different hash for different input', () => {
    const h1 = computeContentHash('hello world');
    const h2 = computeContentHash('hello world!');
    expect(h1).not.toBe(h2);
  });

  it('returns a 32-character hex string (md5 length)', () => {
    const hash = computeContentHash('test content');
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it('handles empty string without throwing', () => {
    expect(() => computeContentHash('')).not.toThrow();
    expect(computeContentHash('')).toHaveLength(32);
  });
});
