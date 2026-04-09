/**
 * CodeAtlas — Wiki Exporter: Link Resolver
 *
 * Resolves WikiEdges into `[[slug|displayName]]` wiki-link format strings.
 * Uses a populated SlugRegistry to guarantee zero dead links — any edge whose
 * targetId is not registered in the registry is silently dropped rather than
 * emitted as a broken reference.
 *
 * Typical data flow:
 *   page-generator → WikiNode[] + SlugRegistry → link-resolver → NodeLinks map
 *   → md-renderer (T5) embeds ResolvedLink.wikiLink strings in .md files
 *
 * Wiki-link format examples:
 *   [[authentication-system|認證機制]]
 *   [[user-repository|使用者資料存取]]
 *   [[rest-api-design|REST API 設計]]
 *
 * Sprint 19: Wiki Knowledge Export + Obsidian Knowledge Graph
 */

import type { WikiNode, WikiEdge, WikiEdgeType } from './types.js';
import type { SlugRegistry } from './slug-registry.js';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/** A resolved wiki-link ready for Markdown embedding. */
export interface ResolvedLink {
  /** Wiki-link syntax: [[targetSlug|displayName]] */
  wikiLink: string;
  /** The edge type for grouping in the .md file */
  edgeType: WikiEdgeType;
  /** Target slug for cross-referencing */
  targetSlug: string;
  /** Human-readable label */
  displayName: string;
}

/** Resolved links for a single wiki node, grouped by knowledge edge type for convenient rendering. */
export interface NodeLinks {
  nodeId: string;
  /** Outgoing links grouped by knowledge edge type */
  relates: ResolvedLink[];
  depends: ResolvedLink[];
  implements: ResolvedLink[];
  extends: ResolvedLink[];
  uses: ResolvedLink[];
  /** All links flat (convenience accessor) */
  all: ResolvedLink[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve all wiki-links for a set of WikiNodes.
 *
 * For each node, iterates over its outgoing edges and attempts to resolve each
 * edge's targetId via the registry. Edges whose target is not registered are
 * skipped, ensuring the caller receives only live, navigable links.
 *
 * @param nodes    WikiNode array produced by page-generator
 * @param registry Populated SlugRegistry from page-generator
 * @returns        Map from node ID to its resolved, grouped links
 */
export function resolveLinks(
  nodes: WikiNode[],
  registry: SlugRegistry,
): Map<string, NodeLinks> {
  const result = new Map<string, NodeLinks>();

  for (const node of nodes) {
    const grouped: Omit<NodeLinks, 'nodeId' | 'all'> = {
      relates: [],
      depends: [],
      implements: [],
      extends: [],
      uses: [],
    };

    for (const edge of node.edges) {
      const resolved = formatWikiLink(edge, registry);
      if (resolved === null) {
        // Target not in registry — drop to prevent dead links.
        continue;
      }
      grouped[edge.type].push(resolved);
    }

    const all: ResolvedLink[] = [
      ...grouped.relates,
      ...grouped.depends,
      ...grouped.implements,
      ...grouped.extends,
      ...grouped.uses,
    ];

    result.set(node.id, {
      nodeId: node.id,
      ...grouped,
      all,
    });
  }

  return result;
}

/**
 * Format a single WikiEdge into a ResolvedLink.
 *
 * Resolves the edge's targetId through the registry. If the target slug is not
 * found (i.e. would be a dead link), returns null so the caller can skip it.
 *
 * Display name resolution order:
 *   1. edge.label  — explicit symbol-level label set by the analyzer
 *   2. targetSlug  — fallback when no label was provided
 *
 * @param edge     The wiki edge to format
 * @param registry Populated SlugRegistry
 * @returns        A ResolvedLink, or null when the target is unresolvable
 */
export function formatWikiLink(
  edge: WikiEdge,
  registry: SlugRegistry,
): ResolvedLink | null {
  const slug = registry.resolve(edge.targetId);
  if (slug === undefined) {
    return null;
  }

  const displayName = edge.label !== undefined && edge.label.length > 0
    ? edge.label
    : slug;

  const wikiLink = `[[${slug}|${displayName}]]`;

  return {
    wikiLink,
    edgeType: edge.type,
    targetSlug: slug,
    displayName,
  };
}
