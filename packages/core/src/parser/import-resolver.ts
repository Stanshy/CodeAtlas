/**
 * ImportResolver
 *
 * Resolves relative import paths to actual file paths and converts
 * ParsedImport records into GraphEdge records.
 *
 * Resolution rules:
 *   1. Relative paths (starts with './' or '../') → resolve against the
 *      importing file's directory, then probe for the real extension.
 *   2. Auto-extension probing order:
 *        .ts → .tsx → .js → .jsx → /index.ts → /index.js
 *   3. Third-party packages (no leading '.' or '..') → ignored, no edge.
 *   4. Path aliases (e.g. '@/utils') → ignored, no edge.
 *   5. Resolution failure → recorded in errors, no edge created.
 *
 * All returned paths use '/' separators (POSIX-style), regardless of
 * the host OS, to ensure stable node IDs across platforms.
 */

import { existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import type { GraphEdge, EdgeMetadata } from '../types.js';
import type { ParsedImport, ParsedExport } from './import-extractor.js';

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Extension probe order when an import path has no extension. */
const EXTENSION_PROBES = ['.ts', '.tsx', '.js', '.jsx'] as const;

/** Index-file probe order when an import path resolves to a directory. */
const INDEX_PROBES = ['/index.ts', '/index.js'] as const;

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

/**
 * Convert a file-system path to a POSIX-style path with forward slashes.
 * Node.js `path` module uses backslashes on Windows — this normalises them.
 */
function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Returns true for relative import specifiers ('./' or '../'). */
function isRelative(source: string): boolean {
  return source.startsWith('./') || source.startsWith('../');
}

/**
 * Attempt to resolve `importPath` (which may or may not have a file
 * extension) to an existing file path, probing extensions in order.
 *
 * @param baseDir       Absolute directory of the importing file
 * @param importPath    The raw import specifier (relative, no quotes)
 * @param existingFiles Optional set of known file paths for fast lookup
 *                      (paths must use the same OS separator as `resolve`)
 * @returns             Resolved absolute path with correct extension, or
 *                      undefined if no matching file was found
 */
function resolveExtension(
  baseDir: string,
  importPath: string,
  existingFiles: Set<string> | undefined,
): string | undefined {
  const absoluteBase = resolve(baseDir, importPath);

  /** Check whether a candidate path actually exists. */
  function exists(p: string): boolean {
    if (existingFiles !== undefined) {
      return existingFiles.has(p) || existingFiles.has(toPosix(p));
    }
    return existsSync(p);
  }

  // 1. Try the path as-is (caller may have provided a full extension)
  if (exists(absoluteBase)) return absoluteBase;

  // 2. Try appending each extension
  for (const ext of EXTENSION_PROBES) {
    const candidate = absoluteBase + ext;
    if (exists(candidate)) return candidate;
  }

  // 3. Try treating the path as a directory and looking for an index file
  for (const idx of INDEX_PROBES) {
    const candidate = absoluteBase + idx;
    if (exists(candidate)) return candidate;
  }

  return undefined;
}

/**
 * Convert an absolute resolved path to a project-relative POSIX path.
 *
 * @param projectRoot   Absolute project root directory
 * @param absolutePath  Absolute path to convert
 */
function toProjectRelative(projectRoot: string, absolutePath: string): string {
  const rel = relative(projectRoot, absolutePath);
  return toPosix(rel);
}

// ---------------------------------------------------------------------------
// Edge construction helpers
// ---------------------------------------------------------------------------

/** Build a stable GraphEdge id. */
function makeEdgeId(
  source: string,
  edgeType: 'import' | 'export',
  target: string,
): string {
  return `${source}--${edgeType}--${target}`;
}

/**
 * Build EdgeMetadata for an import edge.
 *
 * `exactOptionalPropertyTypes: true` forbids assigning `undefined` to
 * optional properties — we must conditionally spread to omit absent fields.
 */
function makeImportMetadata(imp: ParsedImport): EdgeMetadata {
  const meta: EdgeMetadata = { confidence: 'high' };
  if (imp.importedSymbols.length > 0) meta.importedSymbols = imp.importedSymbols;
  if (imp.isDefault) meta.isDefault = true;
  if (imp.isDynamic) meta.isDynamic = true;
  return meta;
}

/**
 * Build EdgeMetadata for an export/re-export edge.
 */
function makeExportMetadata(exp: ParsedExport): EdgeMetadata {
  const meta: EdgeMetadata = { confidence: 'high' };
  if (exp.exportedSymbols.length > 0) meta.importedSymbols = exp.exportedSymbols;
  return meta;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResolveResult {
  edges: GraphEdge[];
  errors: string[];
}

/**
 * Convert ParsedImport records into GraphEdge records by resolving each
 * import path to an actual file in the project.
 *
 * @param sourceFilePath  Absolute path of the file that owns the imports
 * @param imports         Array of ParsedImport from parseFileImports()
 * @param projectRoot     Absolute project root directory
 * @param existingFiles   Set of known file paths (from Scanner); used for
 *                        fast existence checks without hitting the FS
 */
export function resolveImportEdges(
  sourceFilePath: string,
  imports: ParsedImport[],
  projectRoot: string,
  existingFiles: Set<string>,
): GraphEdge[] {
  const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  for (const imp of imports) {
    // Skip third-party packages and path aliases
    if (!isRelative(imp.source)) continue;

    const resolved = resolveExtension(sourceDir, imp.source, existingFiles);
    if (!resolved) continue; // unresolvable — skip silently

    const targetRelative = toProjectRelative(projectRoot, resolved);
    const edgeId = makeEdgeId(sourceRelative, 'import', targetRelative);

    edges.push({
      id: edgeId,
      source: sourceRelative,
      target: targetRelative,
      type: 'import',
      metadata: makeImportMetadata(imp),
    });
  }

  return edges;
}

/**
 * Convert ParsedExport records that are re-exports into GraphEdge records.
 * Local exports (no `source`) do not produce edges.
 *
 * @param sourceFilePath  Absolute path of the file that owns the exports
 * @param exports         Array of ParsedExport from parseFileImports()
 * @param projectRoot     Absolute project root directory
 * @param existingFiles   Set of known file paths (from Scanner)
 */
export function resolveExportEdges(
  sourceFilePath: string,
  exports: ParsedExport[],
  projectRoot: string,
  existingFiles: Set<string>,
): GraphEdge[] {
  const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  for (const exp of exports) {
    // Only re-exports (export { foo } from '...' or export * from '...') produce edges
    if (!exp.source) continue;
    if (!isRelative(exp.source)) continue;

    const resolved = resolveExtension(sourceDir, exp.source, existingFiles);
    if (!resolved) continue;

    const targetRelative = toProjectRelative(projectRoot, resolved);
    const edgeId = makeEdgeId(sourceRelative, 'export', targetRelative);

    edges.push({
      id: edgeId,
      source: sourceRelative,
      target: targetRelative,
      type: 'export',
      metadata: makeExportMetadata(exp),
    });
  }

  return edges;
}

/**
 * Resolve both import and export edges for a single file, also collecting
 * errors for paths that could not be resolved.
 *
 * @param sourceFilePath  Absolute path of the file being analysed
 * @param imports         ParsedImport[] from parseFileImports()
 * @param exports         ParsedExport[] from parseFileImports()
 * @param projectRoot     Absolute project root directory
 * @param existingFiles   Set of known file paths (from Scanner)
 */
export function resolveAllEdges(
  sourceFilePath: string,
  imports: ParsedImport[],
  exports: ParsedExport[],
  projectRoot: string,
  existingFiles: Set<string>,
): ResolveResult {
  const errors: string[] = [];
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  // --- imports ---
  for (const imp of imports) {
    if (!isRelative(imp.source)) continue;

    const resolved = resolveExtension(sourceDir, imp.source, existingFiles);
    if (!resolved) {
      errors.push(
        `Cannot resolve import '${imp.source}' in ${sourceFilePath} (line ${imp.line})`,
      );
      continue;
    }

    const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
    const targetRelative = toProjectRelative(projectRoot, resolved);

    edges.push({
      id: makeEdgeId(sourceRelative, 'import', targetRelative),
      source: sourceRelative,
      target: targetRelative,
      type: 'import',
      metadata: makeImportMetadata(imp),
    });
  }

  // --- re-exports ---
  for (const exp of exports) {
    if (!exp.source) continue;
    if (!isRelative(exp.source)) continue;

    const resolved = resolveExtension(sourceDir, exp.source, existingFiles);
    if (!resolved) {
      errors.push(
        `Cannot resolve re-export '${exp.source}' in ${sourceFilePath} (line ${exp.line})`,
      );
      continue;
    }

    const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
    const targetRelative = toProjectRelative(projectRoot, resolved);

    edges.push({
      id: makeEdgeId(sourceRelative, 'export', targetRelative),
      source: sourceRelative,
      target: targetRelative,
      type: 'export',
      metadata: makeExportMetadata(exp),
    });
  }

  return { edges, errors };
}

// Re-export path utility for consumers that need it
export { toPosix, isRelative, toProjectRelative };
