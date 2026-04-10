/**
 * CodeAtlas Web — Wiki Type Definitions
 *
 * Types for the Wiki Knowledge Graph tab (Sprint 19 T13).
 * Mirrors the WikiManifest / WikiPageDetail shapes produced by the CLI
 * wiki-exporter and served by /api/wiki + /api/wiki/page/:slug.
 *
 * Web package does not import from core — all types are re-declared here.
 *
 * Sprint 19 — T13: Wiki Knowledge Graph Tab
 * Updated for knowledge-node model (architecture/pattern/feature/integration/concept).
 */

// ---------------------------------------------------------------------------
// Node / Edge types that appear in the manifest
// ---------------------------------------------------------------------------

/** Semantic type of a wiki knowledge node — drives colour in the force graph */
export type WikiNodeType = 'architecture' | 'pattern' | 'feature' | 'integration' | 'concept';

/** Minimal metadata for a single wiki page — no content, manifest-only */
export interface WikiPageMeta {
  /** URL-safe identifier, unique across all pages */
  slug: string;
  /** Human-readable display name */
  displayName: string;
  /** Semantic type — drives colour */
  type: WikiNodeType;
  /** Relative path to the .md file inside the wiki root */
  mdPath: string;
  /** Source files this knowledge node was extracted from */
  sourceFiles: string[];
  /** Whether this page has AI-generated content */
  hasAiContent?: boolean;
}

/** An edge in the wiki knowledge graph */
export interface WikiEdge {
  source: string;   // slug
  target: string;   // slug
  /** Relationship label — e.g. 'implements', 'uses', 'depends_on' */
  relation?: string;
}

/** Aggregate statistics returned with the manifest */
export interface WikiStats {
  totalPages: number;
  totalLinks: number;
  generatedAt: string;
  projectPath: string;
}

/**
 * A node entry in the manifest — contains slug + edges with targetSlug.
 * Used to reconstruct links (since flattened edges[] lose source context).
 */
export interface WikiManifestNode {
  slug: string;
  edges: Array<{ targetSlug: string; type: string; label?: string }>;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

/**
 * Response from GET /api/wiki when wiki has been generated.
 * Contains full manifest (page metadata + edges + stats) but NO content.
 */
export interface WikiManifest {
  status: 'ready';
  pages: WikiPageMeta[];
  edges: WikiEdge[];
  /** Full node objects — used to rebuild links with source context */
  nodes?: WikiManifestNode[];
  stats: WikiStats;
}

/**
 * Response from GET /api/wiki when wiki has never been generated.
 */
export interface WikiNotGenerated {
  status: 'not_generated';
}

/** Union of the two possible /api/wiki responses */
export type WikiApiResponse = WikiManifest | WikiNotGenerated;

/**
 * Response from GET /api/wiki/page/:slug — lazy-loaded single page.
 */
export interface WikiPageDetail {
  slug: string;
  displayName: string;
  type: WikiNodeType;
  content: string;       // raw Markdown content
  frontmatter: Record<string, unknown>;
  hasAiContent: boolean;
}

// ---------------------------------------------------------------------------
// D3 simulation node/link types
// ---------------------------------------------------------------------------

/**
 * D3 simulation node — extends WikiPageMeta with mutable position fields
 * that d3-force writes to during simulation.
 */
export interface WikiSimNode extends WikiPageMeta {
  /** Mutable — set by d3-force simulation */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  /** Computed radius (px) based on type */
  radius: number;
}

/**
 * D3 simulation link — source/target are resolved to WikiSimNode references
 * after d3-force processes the links array.
 */
export interface WikiSimLink {
  source: WikiSimNode | string;
  target: WikiSimNode | string;
  relation?: string;
}
