/**
 * @codeatlas/core — Directory Aggregator
 *
 * Sprint 12 / T2: Aggregates file-level GraphNodes and GraphEdges into a
 * higher-level DirectoryGraph, where each node represents a directory and
 * each edge represents cross-directory dependencies.
 *
 * Sprint 13 / T3: Smart expansion — large directories (>70% of total files)
 * are automatically expanded into sub-directory cards so the graph stays
 * informative without being overwhelmed by a single dominant node.
 *
 * Algorithm:
 *   1. Group file nodes by their first-level directory under the source root
 *      - Monorepo:     packages/{name}/src/{dir}/... → bucket "{dir}"
 *      - Standard:     src/{dir}/...                 → bucket "{dir}"
 *      - Direct src/: src/{file}                    → bucket "src"
 *      - Root-level:   {file}                        → bucket "root"
 *   2. Merge small directories (≤ 2 files) into "其他" unless that would
 *      reduce total directories below 4
 *   3. Build directory edges by mapping file-level edges to their parent dirs
 *   4. Remove self-loops (same source and target directory)
 *   5. Classify each directory as entry | logic | data | support
 *   6. Assign directory role from children's majority NodeRole (or heuristic)
 *   7. Return null when total directories <= 2 (flat project fallback)
 *   8. (Sprint 13) Smart expansion: directories >70% of total files are
 *      expanded into sub-directory cards; edges are reassigned accordingly
 */

import type { GraphNode, GraphEdge } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type DirectoryType = 'entry' | 'logic' | 'data' | 'support';

/** Sprint 13: card category derived from path heuristics */
export type DirectoryCategory = 'frontend' | 'backend' | 'infra';

export interface DirectoryNode {
  id: string;
  label: string;
  type: DirectoryType;
  fileCount: number;
  files: string[];
  role: string;
  /** Sprint 13: full path of this directory, e.g. 'frontend/src/services/' */
  sublabel?: string;
  /** Sprint 13: high-level category inferred from path patterns */
  category?: DirectoryCategory;
  /** Sprint 13: true when this node was produced by auto-expanding a parent */
  autoExpand?: boolean;
}

export interface DirectoryEdge {
  source: string;
  target: string;
  weight: number;
}

export interface DirectoryGraph {
  nodes: DirectoryNode[];
  edges: DirectoryEdge[];
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Entry: files whose basename indicates application entry points. */
const ENTRY_FILENAMES = new Set(['app.ts', 'index.ts', 'main.ts', 'server.ts']);

/** Logic: directory segment names that indicate request-handling / business logic. */
const LOGIC_DIR_NAMES = new Set([
  'routes',
  'controllers',
  'services',
  'hooks',
  'handlers',
  'pages',
  'views',
]);

/** Data: directory segment names that indicate data / persistence layers. */
const DATA_DIR_NAMES = new Set([
  'models',
  'db',
  'types',
  'schemas',
  'entities',
  'stores',
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the first-level directory key from a file path.
 *
 * Stripping strategy (applied in order, first match wins):
 *   1. Monorepo path  packages/{name}/src/{dir}/... → "{dir}"
 *   2. Standard path  src/{dir}/...                 → "{dir}"
 *   3. File at src/   src/{file}                    → "src"
 *   4. Root-level     {file}                        → "root"
 *
 * The returned key is a single directory name (e.g. "components", "hooks"),
 * which keeps the total number of directory buckets between 5 and 15.
 *
 * Examples:
 *   "packages/web/src/components/NeonNode.tsx"       → "components"
 *   "packages/core/src/analyzers/dir-agg.ts"         → "analyzers"
 *   "src/services/user.ts"                           → "services"
 *   "src/index.ts"                                   → "src"
 *   "index.ts"                                       → "root"
 */
function getDirKey(filePath: string): string {
  // Normalise separators to forward-slashes
  const normalised = filePath.replace(/\\/g, '/');

  // Match monorepo pattern: packages/{name}/src/{dir}/...
  const monoMatch = normalised.match(/^packages\/[^/]+\/src\/([^/]+)\//);
  if (monoMatch) {
    return monoMatch[1]!;
  }

  // Match monorepo file directly in src/ with no subdirectory:
  // packages/{name}/src/{file}
  const monoSrcDirect = normalised.match(/^packages\/[^/]+\/src\/[^/]+$/);
  if (monoSrcDirect) {
    return 'src';
  }

  // Match standard path: src/{dir}/...
  const srcMatch = normalised.match(/^src\/([^/]+)\//);
  if (srcMatch) {
    return srcMatch[1]!;
  }

  // File sitting directly in src/ (no subdirectory): src/{file}
  if (/^src\/[^/]+$/.test(normalised)) {
    return 'src';
  }

  // Root-level file (no directory at all)
  if (!normalised.includes('/')) {
    return 'root';
  }

  // Fallback: use first path segment (handles lib/, dist/, etc.)
  return normalised.split('/')[0]!;
}

/**
 * Return the final segment of a directory path for label / classification use.
 * Because getDirKey() now returns single-segment keys (e.g. "services"),
 * dirSegment() is effectively an identity function for those keys, but it
 * still handles multi-segment fall-through values gracefully.
 * "src/services" → "services",  "root" → "root",  "services" → "services"
 */
function dirSegment(dirKey: string): string {
  const lastSlash = dirKey.lastIndexOf('/');
  return lastSlash === -1 ? dirKey : dirKey.slice(lastSlash + 1);
}

/**
 * Classify a directory by examining:
 *   1. Whether any file in it has an entry-point filename
 *   2. The directory name against known logic / data sets
 *   3. Falls back to "support"
 */
function classifyDirectory(dirKey: string, fileBasenames: string[]): DirectoryType {
  // Rule 1 — entry point check
  for (const basename of fileBasenames) {
    if (ENTRY_FILENAMES.has(basename)) {
      return 'entry';
    }
  }

  // Rule 2 — directory segment check
  const segment = dirSegment(dirKey).toLowerCase();
  if (LOGIC_DIR_NAMES.has(segment)) return 'logic';
  if (DATA_DIR_NAMES.has(segment)) return 'data';

  return 'support';
}

/**
 * Derive a human-readable role string for the directory by looking at the
 * `metadata.role` values of its child file nodes.
 *
 * If a majority role exists it is returned; otherwise we fall back to the
 * DirectoryType name as the role string.
 */
function computeDirectoryRole(
  childNodes: GraphNode[],
  fallback: DirectoryType,
): string {
  const counts = new Map<string, number>();
  for (const node of childNodes) {
    if (node.metadata.role !== undefined) {
      counts.set(node.metadata.role, (counts.get(node.metadata.role) ?? 0) + 1);
    }
  }

  if (counts.size === 0) return fallback;

  let bestRole = fallback as string;
  let bestCount = 0;
  for (const [role, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestRole = role;
    }
  }
  return bestRole;
}

/**
 * Merge small directories (≤ 2 files) into an "其他" (other) catch-all bucket.
 *
 * The merge is skipped entirely when it would reduce the total number of
 * directory buckets to fewer than 4, preserving enough structural detail for
 * the layout algorithm to produce a meaningful graph.
 *
 * Returns a new Map with small directories replaced by "其他".
 * The "其他" bucket accumulates all nodes from every merged directory.
 */
const SMALL_DIR_THRESHOLD = 2;
const MIN_DIRECTORIES_AFTER_MERGE = 4;
const OTHER_BUCKET_KEY = '其他';

function mergeSmallDirectories(
  buckets: Map<string, GraphNode[]>,
): Map<string, GraphNode[]> {
  const smallKeys: string[] = [];
  for (const [key, nodes] of buckets) {
    if (nodes.length <= SMALL_DIR_THRESHOLD) {
      smallKeys.push(key);
    }
  }

  // How many buckets would remain if we merged all small ones?
  // (They collapse into a single "其他" bucket, so subtract smallKeys.length - 1)
  const remainingCount = buckets.size - smallKeys.length + (smallKeys.length > 0 ? 1 : 0);
  if (remainingCount < MIN_DIRECTORIES_AFTER_MERGE) {
    // Merging would leave too few directories — skip
    return buckets;
  }

  if (smallKeys.length === 0) {
    return buckets;
  }

  const merged = new Map<string, GraphNode[]>(buckets);
  const otherNodes: GraphNode[] = merged.get(OTHER_BUCKET_KEY) ?? [];

  for (const key of smallKeys) {
    const nodes = merged.get(key)!;
    otherNodes.push(...nodes);
    merged.delete(key);
  }

  merged.set(OTHER_BUCKET_KEY, otherNodes);
  return merged;
}

// ---------------------------------------------------------------------------
// Sprint 13: Category detection
// ---------------------------------------------------------------------------

/** Path segment patterns that indicate frontend territory */
const FRONTEND_PATTERNS = ['frontend', 'client', 'web', 'app/src'];

/** Path segment patterns that indicate backend territory */
const BACKEND_PATTERNS = ['backend', 'server', 'api', 'routes', 'models', 'services'];

/**
 * Determine whether a project has explicit top-level frontend/backend
 * split by inspecting the bucket keys.
 */
function detectTopLevelSplit(bucketKeys: string[]): { hasFrontend: boolean; hasBackend: boolean } {
  return {
    hasFrontend: bucketKeys.some((k) => k === 'frontend' || k.startsWith('frontend/')),
    hasBackend: bucketKeys.some((k) => k === 'backend' || k.startsWith('backend/')),
  };
}

/**
 * Sprint 13: Classify a directory key into a high-level category.
 *
 * Rules (applied in order):
 *   1. If the project has both a `frontend/` and a `backend/` top-level dir,
 *      any key that starts with one of those takes that category directly.
 *   2. Otherwise infer from well-known path patterns.
 *   3. Anything that doesn't match → 'infra'
 */
function detectCategory(
  dirKey: string,
  hasFrontendBackendSplit: boolean,
  hasFrontend: boolean,
  hasBackend: boolean,
): DirectoryCategory {
  const lower = dirKey.toLowerCase();

  // Rule 1 — explicit top-level split
  if (hasFrontendBackendSplit) {
    if (lower === 'frontend' || lower.startsWith('frontend/')) return 'frontend';
    if (lower === 'backend' || lower.startsWith('backend/')) return 'backend';
  }

  // Rule 2 — infer from path patterns
  for (const pattern of FRONTEND_PATTERNS) {
    if (lower.includes(pattern)) return 'frontend';
  }

  // backend patterns only qualify as 'backend' when there is also a frontend
  // sibling (otherwise a standalone `services/` folder is not "backend" per se —
  // it is the whole application; we classify those as 'infra' to avoid mislabelling).
  if (hasFrontend || hasBackend) {
    for (const pattern of BACKEND_PATTERNS) {
      if (lower.includes(pattern)) return 'backend';
    }
  }

  return 'infra';
}

// ---------------------------------------------------------------------------
// Sprint 13: Smart expansion
// ---------------------------------------------------------------------------

/** Percentage threshold: directories above this share get auto-expanded */
const EXPANSION_THRESHOLD = 0.7;

/** Maximum card count target (expansion stops when we reach this) */
const MAX_CARD_COUNT = 17;

/**
 * "Passthrough" directory names that are never useful as sub-bucket labels
 * on their own — when the first segment after the bucket key is one of these,
 * we consume it and look one level deeper.
 *
 * E.g. `frontend/src/components/Button.tsx` → skip `src` → sub-bucket
 * becomes `frontend/src/components` rather than `frontend/src`.
 */
const PASSTHROUGH_SEGMENTS = new Set(['src', 'lib', 'app', 'dist']);

/**
 * Given a set of file paths that all belong to a specific bucket (e.g. all
 * files under `frontend/`), derive their meaningful sub-directory keys.
 *
 * Returns a Map: subDirKey → array of file paths that belong to it.
 * Files that sit at the top level of the bucket (no further nesting) are
 * grouped under a synthetic key `{bucketKey}/_root`.
 *
 * Passthrough segments (`src`, `lib`, `app`, `dist`) are skipped so that,
 * e.g., `frontend/src/components/Button.tsx` maps to `frontend/src/components`
 * rather than the unhelpful `frontend/src`.
 */
function getSubDirectoryBuckets(
  bucketKey: string,
  filePaths: string[],
): Map<string, string[]> {
  const subBuckets = new Map<string, string[]>();

  for (const filePath of filePaths) {
    const normalised = filePath.replace(/\\/g, '/');

    // Strip the bucket key prefix to get the remainder path.
    const prefix = bucketKey + '/';
    let rest = normalised;
    if (rest.startsWith(prefix)) {
      rest = rest.slice(prefix.length);
    }

    // Walk through passthrough segments to reach a meaningful sub-directory.
    // We accumulate the consumed passthrough segments into `consumed` so that
    // the final subKey still contains the full relative path.
    let consumed = '';
    let remaining = rest;
    let slashIdx = remaining.indexOf('/');

    while (slashIdx !== -1) {
      const segment = remaining.slice(0, slashIdx);
      if (PASSTHROUGH_SEGMENTS.has(segment)) {
        consumed += segment + '/';
        remaining = remaining.slice(slashIdx + 1);
        slashIdx = remaining.indexOf('/');
      } else {
        break;
      }
    }

    slashIdx = remaining.indexOf('/');
    const subKey = slashIdx === -1
      ? `${bucketKey}/_root`
      : `${bucketKey}/${consumed}${remaining.slice(0, slashIdx)}`;

    const existing = subBuckets.get(subKey);
    if (existing !== undefined) {
      existing.push(filePath);
    } else {
      subBuckets.set(subKey, [filePath]);
    }
  }

  return subBuckets;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Aggregate file-level graph nodes and edges into a directory-level graph.
 *
 * Returns `null` when the project is "flat" (≤ 2 distinct directories),
 * signalling callers to skip the directory view.
 *
 * Sprint 13: After initial aggregation, directories that contain >70% of
 * total files are automatically expanded into sub-directory cards so no
 * single node dominates the graph.
 */
export function aggregateByDirectory(
  nodes: GraphNode[],
  edges: GraphEdge[],
): DirectoryGraph | null {
  // Guard: empty input
  if (nodes.length === 0) return null;

  // --- Step 1 & 2: group file nodes by directory ---
  // Only consider file-type nodes for directory grouping; function/class nodes
  // carry a parentFileId and should not be treated as independent files.
  const fileNodes = nodes.filter(
    (n) => n.type === 'file' && n.metadata.parentFileId === undefined,
  );

  if (fileNodes.length === 0) return null;

  // dirKey → array of file nodes
  const buckets = new Map<string, GraphNode[]>();
  for (const node of fileNodes) {
    const key = getDirKey(node.filePath);
    const existing = buckets.get(key);
    if (existing !== undefined) {
      existing.push(node);
    } else {
      buckets.set(key, [node]);
    }
  }

  // --- Step 2b: merge small directories into "其他" ---
  const mergedBuckets = mergeSmallDirectories(buckets);

  // --- Step 7 (flat project fallback) ---
  if (mergedBuckets.size <= 2) return null;

  // Build a lookup: file node id → directory key
  const nodeIdToDir = new Map<string, string>();
  for (const [dirKey, dirNodes] of mergedBuckets) {
    for (const n of dirNodes) {
      nodeIdToDir.set(n.id, dirKey);
    }
  }

  // --- Step 3: compute directory edges with aggregated weight ---
  // Only consider import/export/data-flow edges between file nodes.
  const edgeWeights = new Map<string, number>();

  for (const edge of edges) {
    if (edge.type === 'call') continue; // skip function-level call edges

    const sourceDir = nodeIdToDir.get(edge.source);
    const targetDir = nodeIdToDir.get(edge.target);

    if (sourceDir === undefined || targetDir === undefined) continue;

    // --- Step 4: remove self-loops ---
    if (sourceDir === targetDir) continue;

    const edgeKey = `${sourceDir}__→__${targetDir}`;
    edgeWeights.set(edgeKey, (edgeWeights.get(edgeKey) ?? 0) + 1);
  }

  // --- Step 5 & 6: build DirectoryNode list ---
  const totalFiles = fileNodes.length;
  const allBucketKeys = Array.from(mergedBuckets.keys());

  // Sprint 13: detect frontend/backend split for category assignment
  const { hasFrontend, hasBackend } = detectTopLevelSplit(allBucketKeys);
  const hasFrontendBackendSplit = hasFrontend && hasBackend;

  const directoryNodes: DirectoryNode[] = [];

  for (const [dirKey, dirNodes] of mergedBuckets) {
    const basenames = dirNodes.map((n) => {
      const normalised = n.filePath.replace(/\\/g, '/');
      const lastSlash = normalised.lastIndexOf('/');
      return lastSlash === -1 ? normalised : normalised.slice(lastSlash + 1);
    });

    const type = classifyDirectory(dirKey, basenames);
    const role = computeDirectoryRole(dirNodes, type);
    const category = detectCategory(dirKey, hasFrontendBackendSplit, hasFrontend, hasBackend);

    directoryNodes.push({
      id: dirKey,
      label: dirSegment(dirKey),
      type,
      fileCount: dirNodes.length,
      files: dirNodes.map((n) => n.filePath),
      role,
      sublabel: `${dirKey}/`,
      category,
    });
  }

  // --- Build DirectoryEdge list ---
  const directoryEdges: DirectoryEdge[] = [];
  for (const [key, weight] of edgeWeights) {
    const separatorIdx = key.indexOf('__→__');
    const source = key.slice(0, separatorIdx);
    const target = key.slice(separatorIdx + 5);
    directoryEdges.push({ source, target, weight });
  }

  // ---------------------------------------------------------------------------
  // Sprint 13: Smart expansion
  // ---------------------------------------------------------------------------
  // Check whether any directory dominates (>70% of files) and, if so, expand
  // it into its immediate sub-directories.  We apply this iteratively so that
  // multiple dominant directories in the same graph are each expanded, but we
  // stop expanding once the card count reaches MAX_CARD_COUNT.

  let finalNodes = directoryNodes;
  let finalEdges = directoryEdges;

  // We iterate over a snapshot — expansion of one node may affect subsequent
  // passes, so we keep looping until nothing changes or we hit the cap.
  let changed = true;
  while (changed) {
    changed = false;

    if (finalNodes.length >= MAX_CARD_COUNT) break;

    for (let i = 0; i < finalNodes.length; i++) {
      const candidate = finalNodes[i]!;
      const share = candidate.fileCount / totalFiles;

      if (share <= EXPANSION_THRESHOLD) continue;
      if (finalNodes.length >= MAX_CARD_COUNT) break;

      // --- Expand this node ---
      const subBuckets = getSubDirectoryBuckets(candidate.id, candidate.files);

      // Only proceed if expansion actually produces more than one sub-bucket
      // (otherwise we would loop forever on a flat directory).
      if (subBuckets.size <= 1) break;

      // Build child directory nodes
      const childNodes: DirectoryNode[] = [];
      for (const [subKey, subFilePaths] of subBuckets) {
        // Look up the original GraphNode objects for the files in this sub-bucket
        // so we can compute type and role correctly.
        const subGraphNodes = subFilePaths
          .map((fp) => fileNodes.find((n) => n.filePath === fp))
          .filter((n): n is GraphNode => n !== undefined);

        const subBasenames = subFilePaths.map((fp) => {
          const norm = fp.replace(/\\/g, '/');
          const lastSlash = norm.lastIndexOf('/');
          return lastSlash === -1 ? norm : norm.slice(lastSlash + 1);
        });

        const subType = classifyDirectory(subKey, subBasenames);
        const subRole = computeDirectoryRole(subGraphNodes, subType);
        const subCategory = detectCategory(subKey, hasFrontendBackendSplit, hasFrontend, hasBackend);

        childNodes.push({
          id: subKey,
          label: dirSegment(subKey),
          type: subType,
          fileCount: subFilePaths.length,
          files: subFilePaths,
          role: subRole,
          sublabel: `${subKey}/`,
          category: subCategory,
          autoExpand: true,
        });
      }

      // Reassign edges: any edge that references the expanded parent must be
      // redirected to the appropriate child.  Because edges go between
      // directories (not individual files), we have to decide which child
      // "owns" the edge.  We do this by checking which child directory
      // contains at least one of the files involved in the original file-level
      // edges.  For simplicity we assign the edge to whichever child has the
      // most files (largest sub-directory) when we can't determine the exact
      // child from the original file-level data.

      // Build a helper: file path → child node id
      const fileToChildId = new Map<string, string>();
      for (const child of childNodes) {
        for (const fp of child.files) {
          fileToChildId.set(fp, child.id);
        }
      }

      // Rebuild edges, redirecting any reference to candidate.id
      const newEdges: DirectoryEdge[] = [];

      // Re-derive edges for the expanded parent using original file-level edges
      // Build a fresh file→dirId map that reflects the expansion
      const updatedNodeIdToDir = new Map<string, string>();
      for (const dirNode of finalNodes) {
        if (dirNode.id === candidate.id) {
          // Map files in expanded parent to their child dirs
          for (const [fp, childId] of fileToChildId) {
            updatedNodeIdToDir.set(fp, childId);
          }
        } else {
          for (const fp of dirNode.files) {
            updatedNodeIdToDir.set(fp, dirNode.id);
          }
        }
      }

      // Recompute all directory edges from scratch using the updated mapping
      const freshEdgeWeights = new Map<string, number>();
      for (const edge of edges) {
        if (edge.type === 'call') continue;
        const srcDir = updatedNodeIdToDir.get(edge.source);
        const tgtDir = updatedNodeIdToDir.get(edge.target);
        if (srcDir === undefined || tgtDir === undefined) continue;
        if (srcDir === tgtDir) continue;
        const ek = `${srcDir}__→__${tgtDir}`;
        freshEdgeWeights.set(ek, (freshEdgeWeights.get(ek) ?? 0) + 1);
      }

      for (const [k, w] of freshEdgeWeights) {
        const sepIdx = k.indexOf('__→__');
        newEdges.push({ source: k.slice(0, sepIdx), target: k.slice(sepIdx + 5), weight: w });
      }

      // Replace the candidate node with child nodes in the final list
      finalNodes = [
        ...finalNodes.slice(0, i),
        ...childNodes,
        ...finalNodes.slice(i + 1),
      ];
      finalEdges = newEdges;
      changed = true;
      break; // restart the loop with the updated list
    }
  }

  // ---------------------------------------------------------------------------
  // Sprint 13 SF-3: Add structural tree edges when import edges are sparse
  // ---------------------------------------------------------------------------
  // When cross-directory import edges are sparse (common in Python projects),
  // the graph has no visible connections. Build a minimum spanning tree based
  // on shared path prefixes so the directory hierarchy is always visible.
  //
  // Strategy: for each node, find the "closest relative" — the other node with
  // the longest shared path prefix — and connect them. This produces a tree
  // structure that reveals the project's directory layout.
  if (finalEdges.length === 0 && finalNodes.length > 1) {
    const existingEdgeKeys = new Set<string>();
    const connected = new Set<string>();
    const nodeIds = finalNodes.map((n) => n.id);

    // Helper: count shared path segments between two IDs
    function sharedPrefixLen(a: string, b: string): number {
      const sa = a.split('/');
      const sb = b.split('/');
      let i = 0;
      while (i < sa.length && i < sb.length && sa[i] === sb[i]) i++;
      return i;
    }

    // Sort by path depth (shorter first) so root-level dirs are processed first
    const sorted = [...nodeIds].sort((a, b) => a.split('/').length - b.split('/').length);
    connected.add(sorted[0]!);

    // Greedy: for each unconnected node, attach to the connected node with most shared prefix
    for (let pass = 0; pass < sorted.length; pass++) {
      let bestNode: string | null = null;
      let bestTarget: string | null = null;
      let bestScore = -1;
      for (const cand of sorted) {
        if (connected.has(cand)) continue;
        for (const anchor of connected) {
          const score = sharedPrefixLen(cand, anchor);
          if (score > bestScore) {
            bestScore = score;
            bestNode = cand;
            bestTarget = anchor;
          }
        }
      }
      if (bestNode && bestTarget) {
        const key = `${bestTarget}__→__${bestNode}`;
        if (!existingEdgeKeys.has(key)) {
          finalEdges.push({ source: bestTarget, target: bestNode, weight: 0 });
          existingEdgeKeys.add(key);
        }
        connected.add(bestNode);
      }
    }
  }

  return {
    nodes: finalNodes,
    edges: finalEdges,
  };
}
