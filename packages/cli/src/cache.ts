/**
 * @codeatlas/cli — AI Summary Cache
 *
 * File-based cache for AI-generated node summaries.
 * Stores results in .codeatlas/cache/{hash}.json to avoid
 * redundant external API calls.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CachedSummary {
  nodeId: string;
  summary: string;
  provider: string;
  cachedAt: string; // ISO 8601
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute a deterministic hash for the cache key.
 */
function cacheHash(nodeId: string, provider: string): string {
  return crypto.createHash('sha256').update(`${nodeId}:${provider}`).digest('hex').slice(0, 16);
}

/**
 * Resolve the full path for a cache entry.
 */
function cachePath(cacheDir: string, nodeId: string, provider: string): string {
  return path.join(cacheDir, `${cacheHash(nodeId, provider)}.json`);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read a cached summary if it exists.
 *
 * @returns The cached summary, or `null` if not found or corrupt.
 */
export async function getCachedSummary(
  cacheDir: string,
  nodeId: string,
  provider: string,
): Promise<CachedSummary | null> {
  const filePath = cachePath(cacheDir, nodeId, provider);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch {
    // File does not exist — cache miss
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as CachedSummary;
    // Basic shape validation
    if (parsed && typeof parsed.summary === 'string' && typeof parsed.nodeId === 'string') {
      return parsed;
    }
    return null;
  } catch {
    // Corrupt JSON — treat as miss
    return null;
  }
}

/**
 * Write a summary to the cache.
 *
 * Silently ensures the cache directory exists before writing.
 */
export async function setCachedSummary(
  cacheDir: string,
  nodeId: string,
  provider: string,
  summary: string,
): Promise<void> {
  // Ensure cache directory exists
  try {
    await fs.mkdir(cacheDir, { recursive: true });
  } catch {
    // Directory already exists or cannot be created — proceed anyway
  }

  const entry: CachedSummary = {
    nodeId,
    summary,
    provider,
    cachedAt: new Date().toISOString(),
  };

  const filePath = cachePath(cacheDir, nodeId, provider);

  try {
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch {
    // Cache write failure is non-fatal — the summary was already returned to client
  }
}
