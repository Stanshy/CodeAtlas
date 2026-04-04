/**
 * @codeatlas/core — Node Role Classifier
 *
 * Sprint 10: Pure-function heuristic classifier that assigns a semantic
 * `NodeRole` to each GraphNode based on file-path patterns, file-name
 * patterns, directory-name patterns, and dependency-degree statistics.
 *
 * The algorithm has 5 ordered steps; the first rule that fires wins:
 *   1. Path / filename noise patterns   → "noise"
 *   2. Filename config / type patterns  → "infrastructure" | "utility"
 *   3. Directory-name patterns          → one of the four non-noise roles
 *   4. Dependency-degree analysis       → "business-logic" | "utility" | "infrastructure"
 *   5. Default fallback                 → "infrastructure"
 */

import type { GraphNode, NodeRole } from '../types.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Pre-computed percentile statistics derived from all file nodes in the graph.
 * Used by Step 4 (dependency-degree analysis).
 */
export interface DependencyStats {
  /** 75th-percentile inDegree (dependencyCount) across all file nodes. */
  inDegreeP75: number;
  /** Median outDegree (importCount) across all file nodes. */
  outDegreeMedian: number;
}

// ---------------------------------------------------------------------------
// Internal pattern constants
// ---------------------------------------------------------------------------

/** Step 1 — directory segments that indicate generated / test / noise paths. */
const NOISE_DIR_SEGMENTS = new Set([
  '__tests__',
  'test',
  'tests',
  'spec',
  'specs',
  '__mocks__',
  'fixtures',
  'dist',
  'build',
  '.github',
  'scripts',
  'coverage',
]);

/** Step 1 — filename suffixes/patterns that indicate test/spec noise. */
const NOISE_FILENAME_RE = /\.(test|spec|e2e)\./i;

/** Step 2 — config-like basenames → infrastructure. */
const INFRA_BASENAME_RE =
  /^(package\.json|tsconfig(\..+)?\.json|jest\.config\..+|vite\.config\..+|webpack\.config\..+|babel\.config\..+|.*\.config\..+|\.env.*|\.eslintrc(\..+)?|\.prettierrc.*)$/i;

/** Step 2 — setup file pattern (*.setup.*) → infrastructure. */
const INFRA_SETUP_RE = /\.setup\./i;

/** Step 2 — type/constant definition files → utility. */
const UTILITY_BASENAME_RE = /^(types\.ts|interfaces\.ts|enums\.ts|constants\.ts|consts\.ts)$/i;

/** Step 2 — TypeScript declaration files → utility. */
const UTILITY_DTS_RE = /\.d\.ts$/i;

/** Step 3 — directory names → business-logic. */
const BUSINESS_LOGIC_DIRS = new Set([
  'routes',
  'controllers',
  'services',
  'models',
  'handlers',
  'pages',
  'views',
  'features',
  'modules',
  'api',
  'domains',
  'commands',
  'components',
  'screens',
]);

/** Step 3 — directory names → cross-cutting. */
const CROSS_CUTTING_DIRS = new Set([
  'middleware',
  'middlewares',
  'auth',
  'logging',
  'validation',
  'validators',
  'guards',
  'interceptors',
  'pipes',
  'filters',
  'decorators',
  'plugins',
]);

/** Step 3 — directory names → infrastructure. */
const INFRA_DIRS = new Set([
  'config',
  'configs',
  'database',
  'db',
  'migrations',
  'seeds',
  'setup',
  'bootstrap',
  'server',
  'infra',
  'infrastructure',
]);

/** Step 3 — directory names → utility. */
const UTILITY_DIRS = new Set([
  'utils',
  'helpers',
  'lib',
  'shared',
  'common',
  'tools',
  'utilities',
  'support',
]);

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the lower-cased POSIX path segments of a file path, splitting on
 * both `/` and `\` to be cross-platform safe.
 */
function pathSegments(filePath: string): string[] {
  return filePath.split(/[/\\]/).map((s) => s.toLowerCase());
}

/**
 * Compute the median of a sorted numeric array.
 * Assumes the array has at least one element.
 */
function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return ((sorted[mid - 1]! + sorted[mid]!) / 2);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute dependency statistics (inDegree P75 and outDegree median) from all
 * file-type nodes in the graph.
 *
 * Returns `{ inDegreeP75: 0, outDegreeMedian: 0 }` when there are fewer
 * than 3 file nodes — the dataset is too small for meaningful percentiles.
 *
 * @param nodes  All GraphNodes (mixed types); non-file nodes are ignored.
 */
export function computeDependencyStats(nodes: GraphNode[]): DependencyStats {
  const fileNodes = nodes.filter((n) => n.type === 'file');

  if (fileNodes.length < 3) {
    return { inDegreeP75: 0, outDegreeMedian: 0 };
  }

  const inDegrees = fileNodes
    .map((n) => n.metadata.dependencyCount ?? 0)
    .sort((a, b) => a - b);

  const outDegrees = fileNodes
    .map((n) => n.metadata.importCount ?? 0)
    .sort((a, b) => a - b);

  const p75Index = Math.floor(0.75 * inDegrees.length);
  const inDegreeP75 = inDegrees[p75Index] ?? 0;
  const outDegreeMedian = median(outDegrees);

  return { inDegreeP75, outDegreeMedian };
}

/**
 * Classify a single GraphNode into one of five semantic roles using a
 * 5-step heuristic algorithm.
 *
 * The function is pure (no I/O, no side effects) and runs in O(k) where
 * k is the number of path segments.
 *
 * @param node      The GraphNode to classify.
 * @param depStats  Pre-computed dependency statistics, or `null` to skip
 *                  Step 4 (useful in tests or when stats are unavailable).
 */
export function classifyNodeRole(
  node: GraphNode,
  depStats: DependencyStats | null,
): NodeRole {
  const filePath = node.filePath;
  const segments = pathSegments(filePath);
  const basename = (segments[segments.length - 1] ?? '').toLowerCase();

  // ------------------------------------------------------------------
  // Step 1 — Path / filename noise patterns (highest priority)
  // ------------------------------------------------------------------

  // Check every directory segment (all segments except the last / filename)
  const dirSegments = segments.slice(0, -1);
  for (const seg of dirSegments) {
    if (NOISE_DIR_SEGMENTS.has(seg)) return 'noise';
  }

  // Also handle cases where the path segment appears anywhere (e.g. dist/foo.ts
  // but also src/__tests__/foo.ts — the __tests__ dir segment is already caught
  // by the loop above; this covers e.g. a path like "__tests__/foo.ts" where
  // __tests__ IS the only segment before the file).
  if (NOISE_FILENAME_RE.test(basename)) return 'noise';

  // ------------------------------------------------------------------
  // Step 2 — Filename-based patterns
  // ------------------------------------------------------------------

  if (UTILITY_DTS_RE.test(basename)) return 'utility';
  if (UTILITY_BASENAME_RE.test(basename)) return 'utility';
  if (INFRA_BASENAME_RE.test(basename)) return 'infrastructure';
  if (INFRA_SETUP_RE.test(basename)) return 'infrastructure';

  // ------------------------------------------------------------------
  // Step 3 — Directory-name patterns
  // ------------------------------------------------------------------

  for (const seg of dirSegments) {
    if (BUSINESS_LOGIC_DIRS.has(seg)) return 'business-logic';
  }
  for (const seg of dirSegments) {
    if (CROSS_CUTTING_DIRS.has(seg)) return 'cross-cutting';
  }
  for (const seg of dirSegments) {
    if (INFRA_DIRS.has(seg)) return 'infrastructure';
  }
  for (const seg of dirSegments) {
    if (UTILITY_DIRS.has(seg)) return 'utility';
  }

  // ------------------------------------------------------------------
  // Step 4 — Dependency-degree analysis
  // ------------------------------------------------------------------

  if (depStats !== null) {
    const inDegree = node.metadata.dependencyCount ?? 0;
    const outDegree = node.metadata.importCount ?? 0;

    if (inDegree > depStats.inDegreeP75 && outDegree <= depStats.outDegreeMedian) {
      return 'business-logic';
    }
    if (inDegree <= 1 && outDegree > depStats.outDegreeMedian) {
      return 'utility';
    }
    return 'infrastructure';
  }

  // ------------------------------------------------------------------
  // Step 5 — Default fallback
  // ------------------------------------------------------------------

  return 'infrastructure';
}
