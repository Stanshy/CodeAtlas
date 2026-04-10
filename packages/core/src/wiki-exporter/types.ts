/**
 * CodeAtlas — Wiki Exporter Type Definitions
 *
 * All Wiki-related types for the Wiki Knowledge Export feature.
 * Redesigned from framework nodes (code-structure mapping) to
 * knowledge nodes (AI-extracted concepts).
 *
 * Sprint 19: Wiki Knowledge Export + Obsidian Knowledge Graph
 */

// === Discriminated Union Literals ===

/** WikiNode.type — the semantic category of the knowledge concept */
export type WikiNodeType = 'architecture' | 'pattern' | 'feature' | 'integration' | 'concept';

/** WikiEdge.type — the relationship kind between two knowledge concept nodes */
export type WikiEdgeType = 'relates' | 'depends' | 'implements' | 'extends' | 'uses';

// === Core Graph Types ===

/**
 * A single wiki page node representing an AI-extracted knowledge concept.
 * Each node maps 1-to-1 with a generated .md file.
 */
export interface WikiNode {
  /** Stable canonical id (e.g. "concept:authentication-system") */
  id: string;
  /** Filename slug (e.g. "authentication-system") */
  slug: string;
  type: WikiNodeType;
  /** Human-readable label (e.g. "認證機制", "JWT Token 驗證") */
  displayName: string;
  /** AI-generated concept summary (1-3 sentences) */
  summary: string;
  /** Source code files this concept spans (relative paths from project root) */
  sourceFiles: string[];
  /** Outgoing concept relationships */
  edges: WikiEdge[];
  /** Output .md path relative to wiki root dir (e.g. "concepts/authentication-system.md") */
  mdPath: string;
}

/**
 * A directed relationship between two knowledge concept nodes.
 * Used to generate [[wiki-link]] cross-references in Markdown output.
 */
export interface WikiEdge {
  type: WikiEdgeType;
  /** ID of the target WikiNode */
  targetId: string;
  /** Slug of the target node — used to generate [[wiki-link]] syntax */
  targetSlug: string;
  /** Optional relationship description (e.g. "使用 JWT 實作") */
  label?: string;
}

// === Page Metadata ===

/**
 * Lightweight metadata for a single wiki page.
 * Included in WikiManifest.pages — does NOT contain full page content.
 */
export interface WikiPageMeta {
  slug: string;
  /** Path relative to wiki root dir */
  mdPath: string;
  type: WikiNodeType;
  displayName: string;
  /** Source code files this concept spans (relative paths) */
  sourceFiles: string[];
  /** True when the page includes AI-generated content in its summary field */
  hasAiContent: boolean;
}

// === Manifest & Stats ===

/**
 * Export statistics surfaced in the manifest and CLI output.
 */
export interface WikiExportStats {
  /** Total number of generated .md pages */
  pageCount: number;
  /** Total number of [[wiki-link]] references written across all pages */
  linkCount: number;
  /** Number of [[wiki-link]] references whose target page does not exist */
  deadLinks: number;
  /** Ratio of page count to graph node count (0–1) */
  coverage: number;
}

/**
 * The wiki-manifest.json file written to .codeatlas/wiki/.
 * Returned verbatim by GET /api/wiki.
 * Does NOT contain full page content — use /api/wiki/page/:slug for that.
 */
export interface WikiManifest {
  status: 'ready' | 'not_generated';
  /** ISO 8601 timestamp of when this manifest was generated */
  generatedAt: string;
  /** All wiki nodes (graph structure, no .md content) */
  nodes: WikiNode[];
  /** All wiki edges (flattened from node.edges for convenience) */
  edges: WikiEdge[];
  stats: WikiExportStats;
  /** Lightweight page metadata for listing and routing */
  pages: WikiPageMeta[];
}

// === Page Detail ===

/**
 * Full wiki page content returned by GET /api/wiki/page/:slug.
 * Loaded lazily on demand — not included in the manifest.
 */
export interface WikiPageDetail {
  slug: string;
  /** Full Markdown text of the page (frontmatter + body) */
  content: string;
  /** Parsed YAML frontmatter fields as a plain object */
  frontmatter: Record<string, unknown>;
}

// === Export Result ===

/**
 * Return type of WikiExporter.export().
 * Carries the full manifest plus all generated .md file contents in memory.
 */
export interface WikiExportResult {
  manifest: WikiManifest;
  /** All generated Markdown files — written to disk by the CLI command */
  mdFiles: Array<{ path: string; content: string }>;
  stats: WikiExportStats;
}

// === Slug Registry ===

/**
 * A single entry in the slug registry.
 * Tracks the mapping between canonical IDs (lowercase-normalized) and display slugs.
 */
export interface SlugRegistryEntry {
  /** Lowercase-normalized canonical ID */
  canonicalId: string;
  /** Slug that preserves original casing for readability */
  slug: string;
  type: WikiNodeType;
  displayName: string;
}

/**
 * Slug registry interface — ensures globally unique slugs and detects dead links.
 * Implemented by SlugRegistry in slug-registry.ts.
 */
export interface ISlugRegistry {
  /**
   * Register a new canonical ID → slug mapping.
   * If the slug is already taken, a disambiguating suffix is appended and returned.
   * @returns The final (possibly suffixed) slug that was registered.
   */
  register(canonicalId: string, slug: string, type: WikiNodeType, displayName: string): string;

  /**
   * Resolve a canonical ID to its registered slug.
   * Returns undefined if the ID has not been registered.
   */
  resolve(canonicalId: string): string | undefined;

  /** Return all registered entries in insertion order. */
  getAll(): SlugRegistryEntry[];

  /**
   * Identify dead links — edges whose targetId has no corresponding registered entry.
   * @param edges The full set of wiki edges to validate.
   * @returns Array of unresolvable targetId values.
   */
  getDeadLinks(edges: WikiEdge[]): string[];
}

// === AI Concept Extraction ===

/**
 * Raw concept extracted by AI, before mapping to WikiNode.
 * Produced during Phase 1 of the wiki export pipeline.
 */
export interface ExtractedConcept {
  /** Display name (e.g. "認證機制") */
  name: string;
  /** Suggested slug (e.g. "authentication-system") */
  slug: string;
  type: WikiNodeType;
  /** 1-3 sentence summary of the concept */
  summary: string;
  /** Relative file paths that implement or relate to this concept */
  sourceFiles: string[];
  /** Slugs of related concepts (used to build edges) */
  relatedConcepts: string[];
  /** Outgoing edges from this concept */
  edges: Array<{
    /** Target concept slug */
    target: string;
    type: WikiEdgeType;
    /** Optional relationship description */
    label?: string;
  }>;
}

/** Result from AI concept extraction (Phase 1) */
export interface ConceptExtractionResult {
  concepts: ExtractedConcept[];
}

// === Project Context ===

/**
 * Context assembled from AnalysisResult for AI concept extraction.
 * Passed to the AI provider to produce ConceptExtractionResult.
 */
export interface ProjectContext {
  /** Formatted file tree string */
  fileTree: string;
  /** Key function/class signatures */
  signatures: string;
  /** Summarized import relationships */
  importGraph: string;
  /** Existing AI summaries if available */
  aiSummaries: string;
  totalFiles: number;
  totalFunctions: number;
}
