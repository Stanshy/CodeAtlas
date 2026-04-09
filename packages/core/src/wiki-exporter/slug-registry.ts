/**
 * CodeAtlas — Wiki Exporter: Slug Registry
 *
 * Manages globally unique slug generation, conflict resolution, and dead link
 * detection for the Wiki Knowledge Export feature.
 *
 * Slug rules (Appendix B):
 *   - Canonical ID: `{type}:{relative-path}:{name}` — always compared lowercase
 *   - Slug: preserves original case for readability, used as .md filename
 *   - Conflict resolution: suffix -2, -3, … appended on case-insensitive collision
 *
 * Sprint 19: Wiki Knowledge Export + Obsidian Knowledge Graph
 */

import type { WikiEdge, WikiNodeType, SlugRegistryEntry, ISlugRegistry } from './types.js';

export class SlugRegistry implements ISlugRegistry {
  /** Map from lowercase canonical ID to its registered entry */
  private readonly entries = new Map<string, SlugRegistryEntry>();

  /**
   * Map from lowercase slug to the lowercase canonical ID that owns it.
   * Used for O(1) collision detection on case-insensitive slug uniqueness.
   */
  private readonly slugIndex = new Map<string, string>();

  /**
   * Register a canonical ID → slug mapping.
   *
   * - If the canonical ID is already registered, returns the existing slug (idempotent).
   * - The slug is sanitized for filesystem safety before comparison and storage.
   * - On case-insensitive collision with an existing slug, a numeric suffix (-2, -3, …)
   *   is appended until a unique slug is found.
   *
   * @param canonicalId  Canonical identifier, e.g. `method:src/auth/login.ts:login`
   * @param slug         Proposed slug, e.g. `method--src--auth--login`
   * @param type         WikiNode type
   * @param displayName  Human-readable label for the page
   * @returns The final (possibly suffixed) slug that was registered.
   */
  register(
    canonicalId: string,
    slug: string,
    type: WikiNodeType,
    displayName: string,
  ): string {
    const normalizedId = canonicalId.toLowerCase();

    // Idempotent: return the already-registered slug for the same canonical ID.
    const existing = this.entries.get(normalizedId);
    if (existing !== undefined) {
      return existing.slug;
    }

    // Sanitize the proposed slug for cross-platform filesystem safety.
    const baseSanitized = sanitizeFilename(slug);

    // Resolve slug collisions via case-insensitive comparison.
    let finalSlug = baseSanitized;
    let slugLower = finalSlug.toLowerCase();
    let suffix = 2;

    while (this.slugIndex.has(slugLower)) {
      finalSlug = `${baseSanitized}-${suffix}`;
      slugLower = finalSlug.toLowerCase();
      suffix++;
    }

    // Persist to both indexes.
    const entry: SlugRegistryEntry = {
      canonicalId: normalizedId,
      slug: finalSlug,
      type,
      displayName,
    };
    this.entries.set(normalizedId, entry);
    this.slugIndex.set(slugLower, normalizedId);

    return finalSlug;
  }

  /**
   * Resolve a canonical ID to its registered slug.
   * Returns `undefined` if the ID has not been registered.
   */
  resolve(canonicalId: string): string | undefined {
    return this.entries.get(canonicalId.toLowerCase())?.slug;
  }

  /** Return all registered entries in insertion order. */
  getAll(): SlugRegistryEntry[] {
    return [...this.entries.values()];
  }

  /**
   * Identify dead links — edges whose `targetId` has no corresponding registered entry.
   *
   * @param edges The full set of wiki edges to validate.
   * @returns Deduplicated array of unresolvable `targetId` values.
   */
  getDeadLinks(edges: WikiEdge[]): string[] {
    const dead = new Set<string>();
    for (const edge of edges) {
      if (!this.entries.has(edge.targetId.toLowerCase())) {
        dead.add(edge.targetId);
      }
    }
    return [...dead];
  }
}

/**
 * Remove OS-illegal filename characters while preserving readability.
 *
 * Illegal characters on Windows/macOS/Linux: `< > : " / \ | ? *`
 * Each illegal character is replaced with a hyphen. Consecutive hyphens that
 * result from replacement are collapsed to a maximum of two (to preserve the
 * intentional double-dash separator used in CodeAtlas slugs). Leading and
 * trailing hyphens are stripped. An empty result (e.g. all-illegal input)
 * falls back to the literal string `"untitled"`.
 */
export function sanitizeFilename(slug: string): string {
  if (slug.length === 0) {
    return 'untitled';
  }

  const sanitized = slug
    // Replace every OS-illegal character with a hyphen.
    .replace(/[<>:"/\\|?*]/g, '-')
    // Collapse runs of 3+ hyphens to exactly two (preserves intentional '--').
    .replace(/-{3,}/g, '--')
    // Strip leading and trailing hyphens.
    .replace(/^-+|-+$/g, '');

  // Guard: if everything was stripped (e.g. input was only illegal chars), use fallback.
  return sanitized.length > 0 ? sanitized : 'untitled';
}
