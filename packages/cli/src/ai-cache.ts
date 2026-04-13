/**
 * @codeatlas/cli — Persistent AI Cache
 *
 * Sprint 16: Replaces the in-memory AICache Maps with a disk-backed store.
 * Cache file lives at .codeatlas/cache/ai-results.json.
 *
 * Design decisions:
 *   - LRU eviction at 5 MB — oldest entries removed until under limit.
 *   - Corrupted file on disk → silently rebuild empty (never throw from load).
 *   - All fs operations wrapped in try-catch — never crash the server.
 *   - Staleness is checked by md5 contentHash + promptVersion.
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AICacheEntry {
  /** Cache key = `${scope}:${targetId}:${provider}:${promptVersion}` */
  key: string;
  /** md5 hash of source content for staleness check */
  contentHash: string;
  /** AI provider that generated this result */
  provider: string;
  /** Prompt version used */
  promptVersion: string;
  /** The cached AI result (JSON-serializable) */
  result: unknown;
  /** ISO timestamp when this entry was created */
  createdAt: string;
}

// Serialized shape stored on disk
interface DiskFormat {
  version: 1;
  entries: AICacheEntry[];
}

// ---------------------------------------------------------------------------
// Content hash helper
// ---------------------------------------------------------------------------

/**
 * Compute an md5 hash of the given content string.
 * Used to detect stale cache entries when source files change.
 */
export function computeContentHash(content: string): string {
  return createHash('md5').update(content).digest('hex');
}

// ---------------------------------------------------------------------------
// PersistentAICache
// ---------------------------------------------------------------------------

const MAX_CACHE_BYTES = 5 * 1024 * 1024; // 5 MB

export class PersistentAICache {
  private entries: Map<string, AICacheEntry> = new Map();
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  /**
   * Switch to a new project's cache file.
   * Saves current entries to old path, clears memory, loads from new path.
   */
  switchProject(newFilePath: string): void {
    // Save current entries to old location before switching
    if (this.entries.size > 0) {
      this.saveToDisk();
    }
    this.filePath = newFilePath;
    this.entries = new Map();
    this.loadFromDisk();
  }

  // --------------------------------------------------------------------------
  // Disk I/O
  // --------------------------------------------------------------------------

  /**
   * Load cache from disk.
   * If the file is missing or corrupted, silently start with an empty cache.
   * Never throws.
   */
  loadFromDisk(): void {
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // Corrupted JSON — start fresh
        console.warn('[AICache] Cache file is corrupted, starting fresh.');
        this.entries = new Map();
        return;
      }

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        (parsed as DiskFormat).version !== 1 ||
        !Array.isArray((parsed as DiskFormat).entries)
      ) {
        console.warn('[AICache] Cache file has unexpected format, starting fresh.');
        this.entries = new Map();
        return;
      }

      const disk = parsed as DiskFormat;
      this.entries = new Map();
      for (const entry of disk.entries) {
        if (entry && typeof entry.key === 'string') {
          this.entries.set(entry.key, entry);
        }
      }
    } catch {
      // File does not exist or is unreadable — start fresh silently
      this.entries = new Map();
    }
  }

  /**
   * Persist cache to disk.
   * If serialized size exceeds 5 MB, evicts oldest entries (LRU) until it fits.
   * Never throws.
   */
  saveToDisk(): void {
    try {
      // Sort entries by createdAt ascending (oldest first) for LRU eviction
      let allEntries = Array.from(this.entries.values()).sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

      // Evict oldest entries if over 5 MB
      let serialized = this.serialize(allEntries);
      while (Buffer.byteLength(serialized, 'utf-8') > MAX_CACHE_BYTES && allEntries.length > 0) {
        allEntries = allEntries.slice(1); // remove oldest
        serialized = this.serialize(allEntries);
      }

      // Ensure parent directory exists
      try {
        mkdirSync(dirname(this.filePath), { recursive: true });
      } catch {
        // Directory may already exist — ignore
      }

      writeFileSync(this.filePath, serialized, 'utf-8');
    } catch (err) {
      console.warn(
        '[AICache] Failed to save cache to disk:',
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  // --------------------------------------------------------------------------
  // Entry access
  // --------------------------------------------------------------------------

  /** Get a cache entry by key, or null if not found. */
  get(key: string): AICacheEntry | null {
    return this.entries.get(key) ?? null;
  }

  /** Set a cache entry and auto-save to disk. */
  set(key: string, entry: AICacheEntry): void {
    this.entries.set(key, entry);
    this.saveToDisk();
  }

  /**
   * Check if a cached entry is stale.
   * An entry is stale when the source content has changed (different contentHash)
   * or the prompt template has been updated (different promptVersion).
   */
  isStale(entry: AICacheEntry, currentHash: string, currentPromptVersion: string): boolean {
    return entry.contentHash !== currentHash || entry.promptVersion !== currentPromptVersion;
  }

  /** Return all entries (for migration or status reporting). */
  getAllEntries(): AICacheEntry[] {
    return Array.from(this.entries.values());
  }

  /** Number of entries currently held in memory. */
  get size(): number {
    return this.entries.size;
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  private serialize(entries: AICacheEntry[]): string {
    const disk: DiskFormat = { version: 1, entries };
    return JSON.stringify(disk);
  }
}
