/**
 * Unit tests for wiki-exporter/slug-registry.ts
 *
 * Coverage:
 *   - Registers and resolves a slug
 *   - Returns existing slug for same canonical ID (idempotent)
 *   - Appends -2 suffix on collision
 *   - Case-insensitive collision detection
 *   - sanitizeFilename removes illegal chars
 *   - sanitizeFilename handles empty string
 *   - getDeadLinks detects missing targets
 *   - getDeadLinks returns empty for valid edges
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SlugRegistry, sanitizeFilename } from '../../src/wiki-exporter/slug-registry.js';
import type { WikiEdge } from '../../src/wiki-exporter/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEdge(targetId: string, type: WikiEdge['type'] = 'relates'): WikiEdge {
  return { type, targetId, targetSlug: '' };
}

// ---------------------------------------------------------------------------
// SlugRegistry tests
// ---------------------------------------------------------------------------

describe('SlugRegistry — register and resolve', () => {
  it('registers a slug and resolves it by canonical ID', () => {
    const registry = new SlugRegistry();
    const returned = registry.register('file:src/auth.ts', 'file--src--auth-ts', 'feature', 'auth.ts');

    expect(returned).toBe('file--src--auth-ts');
    expect(registry.resolve('file:src/auth.ts')).toBe('file--src--auth-ts');
  });

  it('returns the same slug when registering the same canonical ID twice (idempotent)', () => {
    const registry = new SlugRegistry();
    const first = registry.register('file:src/auth.ts', 'file--src--auth-ts', 'feature', 'auth.ts');
    const second = registry.register('file:src/auth.ts', 'file--src--auth-ts', 'feature', 'auth.ts');

    expect(first).toBe(second);
    expect(second).toBe('file--src--auth-ts');
  });

  it('appends -2 suffix when a slug collision occurs', () => {
    const registry = new SlugRegistry();
    registry.register('module:src/auth', 'module--src--auth', 'architecture', 'auth');
    // Different canonical ID but same slug
    const suffixed = registry.register('module:src/auth-v2', 'module--src--auth', 'architecture', 'auth-v2');

    expect(suffixed).toBe('module--src--auth-2');
  });

  it('appends -3 when -2 is also taken', () => {
    const registry = new SlugRegistry();
    registry.register('module:src/a', 'module--src--a', 'architecture', 'a');
    registry.register('module:src/b', 'module--src--a', 'architecture', 'b');
    const third = registry.register('module:src/c', 'module--src--a', 'architecture', 'c');

    expect(third).toBe('module--src--a-3');
  });

  it('performs case-insensitive collision detection', () => {
    const registry = new SlugRegistry();
    registry.register('module:src/auth', 'Module--Src--Auth', 'architecture', 'Auth');
    // Lowercase variant should collide case-insensitively
    const result = registry.register('module:src/auth2', 'module--src--auth', 'architecture', 'auth2');

    expect(result).toBe('module--src--auth-2');
  });

  it('resolve returns undefined for unregistered canonical ID', () => {
    const registry = new SlugRegistry();
    expect(registry.resolve('file:nonexistent.ts')).toBeUndefined();
  });

  it('getAll returns all registered entries', () => {
    const registry = new SlugRegistry();
    registry.register('file:a.ts', 'file--a-ts', 'feature', 'a.ts');
    registry.register('file:b.ts', 'file--b-ts', 'feature', 'b.ts');

    expect(registry.getAll()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Dead link detection
// ---------------------------------------------------------------------------

describe('SlugRegistry — getDeadLinks', () => {
  it('detects missing target IDs as dead links', () => {
    const registry = new SlugRegistry();
    registry.register('file:src/auth.ts', 'file--src--auth-ts', 'feature', 'auth.ts');

    const edges: WikiEdge[] = [
      makeEdge('file:src/auth.ts'),         // valid
      makeEdge('file:src/missing.ts'),      // dead
    ];

    const deadLinks = registry.getDeadLinks(edges);

    expect(deadLinks).toContain('file:src/missing.ts');
    expect(deadLinks).not.toContain('file:src/auth.ts');
  });

  it('returns empty array when all edges have valid targets', () => {
    const registry = new SlugRegistry();
    registry.register('file:src/auth.ts', 'file--src--auth-ts', 'feature', 'auth.ts');
    registry.register('file:src/user.ts', 'file--src--user-ts', 'feature', 'user.ts');

    const edges: WikiEdge[] = [
      makeEdge('file:src/auth.ts'),
      makeEdge('file:src/user.ts'),
    ];

    const deadLinks = registry.getDeadLinks(edges);

    expect(deadLinks).toHaveLength(0);
  });

  it('deduplicates repeated dead link targets', () => {
    const registry = new SlugRegistry();

    const edges: WikiEdge[] = [
      makeEdge('file:missing.ts'),
      makeEdge('file:missing.ts'),
      makeEdge('file:missing.ts'),
    ];

    const deadLinks = registry.getDeadLinks(edges);

    expect(deadLinks).toHaveLength(1);
    expect(deadLinks[0]).toBe('file:missing.ts');
  });

  it('returns empty array for empty edges input', () => {
    const registry = new SlugRegistry();
    expect(registry.getDeadLinks([])).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sanitizeFilename
// ---------------------------------------------------------------------------

describe('sanitizeFilename', () => {
  it('returns the slug unchanged when no illegal characters are present', () => {
    expect(sanitizeFilename('module--src--auth')).toBe('module--src--auth');
  });

  it('replaces colons with hyphens', () => {
    const result = sanitizeFilename('file:src/auth.ts');
    expect(result).not.toContain(':');
  });

  it('replaces angle brackets with hyphens', () => {
    const result = sanitizeFilename('file<illegal>name');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('replaces forward slashes with hyphens', () => {
    const result = sanitizeFilename('path/to/file');
    expect(result).not.toContain('/');
  });

  it('replaces backslashes with hyphens', () => {
    const result = sanitizeFilename('path\\to\\file');
    expect(result).not.toContain('\\');
  });

  it('collapses triple-or-more hyphens to double hyphens', () => {
    // Three hyphens from illegal char replacement should collapse to two
    const result = sanitizeFilename('a---b');
    expect(result).toBe('a--b');
  });

  it('handles empty string by returning "untitled"', () => {
    expect(sanitizeFilename('')).toBe('untitled');
  });

  it('returns "untitled" when all characters are illegal', () => {
    expect(sanitizeFilename('///')).toBe('untitled');
  });

  it('strips leading and trailing hyphens', () => {
    const result = sanitizeFilename('-module--src-');
    expect(result.startsWith('-')).toBe(false);
    expect(result.endsWith('-')).toBe(false);
  });
});
