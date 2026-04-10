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
import type { GraphEdge, EdgeMetadata, SupportedLanguage } from '../types.js';
import type { ParsedImport, ParsedExport } from './import-extractor.js';

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Extension probe order when an import path has no extension. */
const EXTENSION_PROBES = ['.ts', '.tsx', '.js', '.jsx'] as const;

/** Index-file probe order when an import path resolves to a directory. */
const INDEX_PROBES = ['/index.ts', '/index.js'] as const;

/** Extension probe order for Python files. */
const PYTHON_EXTENSION_PROBES = ['.py', '.pyw'] as const;

/** Index-file probe order for Python packages (directories with __init__.py). */
const PYTHON_INDEX_PROBES = ['/__init__.py'] as const;

/** Extension probe order for Java files. */
const JAVA_EXTENSION_PROBES = ['.java'] as const;

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

/** Returns true for Python relative imports (start with one or more dots). */
function isPythonRelative(source: string): boolean {
  return source.startsWith('.');
}

/**
 * Convert a Java fully-qualified import source to a file-system-style path.
 *
 * Examples:
 *   "com.foo.Bar"  → "com/foo/Bar"
 *   "com.foo.*"    → "com/foo"   (wildcard — resolves to directory, no specific file)
 */
function javaSourceToPath(source: string): string {
  let clean = source;
  if (clean.endsWith('.*')) clean = clean.slice(0, -2);
  return clean.replace(/\./g, '/');
}

/**
 * Convert a Python dotted import source to a file-system-style relative path.
 *
 * Examples:
 *   '.utils'    → './utils'
 *   '..models'  → '../models'
 *   '...pkg.mod'→ '../../pkg/mod'
 *   'foo.bar'   → 'foo/bar'   (absolute package — treated as third-party)
 */
function pythonSourceToPath(source: string): string {
  let dots = 0;
  while (dots < source.length && source[dots] === '.') dots++;
  const modulePart = source.slice(dots).replace(/\./g, '/');
  if (dots === 0) return modulePart; // absolute Python import
  const prefix = dots === 1 ? './' : '../'.repeat(dots - 1);
  return modulePart ? prefix + modulePart : prefix.replace(/\/$/, '');
}

/**
 * Select the appropriate extension / index probes for a given language.
 */
function getProbes(language?: SupportedLanguage): {
  ext: readonly string[];
  idx: readonly string[];
} {
  if (language === 'python') return { ext: PYTHON_EXTENSION_PROBES, idx: PYTHON_INDEX_PROBES };
  if (language === 'java') return { ext: JAVA_EXTENSION_PROBES, idx: [] as const };
  return { ext: EXTENSION_PROBES, idx: INDEX_PROBES };
}

/**
 * Attempt to resolve `importPath` (which may or may not have a file
 * extension) to an existing file path, probing extensions in order.
 *
 * @param baseDir       Absolute directory of the importing file
 * @param importPath    The raw import specifier (relative, no quotes)
 * @param existingFiles Optional set of known file paths for fast lookup
 *                      (paths must use the same OS separator as `resolve`)
 * @param language      Optional language hint to select the correct probe set
 * @returns             Resolved absolute path with correct extension, or
 *                      undefined if no matching file was found
 */
function resolveExtension(
  baseDir: string,
  importPath: string,
  existingFiles: Set<string> | undefined,
  language?: SupportedLanguage,
): string | undefined {
  const absoluteBase = resolve(baseDir, importPath);
  const probes = getProbes(language);

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
  for (const ext of probes.ext) {
    const candidate = absoluteBase + ext;
    if (exists(candidate)) return candidate;
  }

  // 3. Try treating the path as a directory and looking for an index file
  for (const idx of probes.idx) {
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
 * @param language        Optional language hint for path resolution strategy
 */
export function resolveImportEdges(
  sourceFilePath: string,
  imports: ParsedImport[],
  projectRoot: string,
  existingFiles: Set<string>,
  language?: SupportedLanguage,
): GraphEdge[] {
  const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  for (const imp of imports) {
    // Java imports are fully-qualified package paths — resolve against project root
    if (language === 'java') {
      if (imp.isNamespace) continue; // wildcard imports cannot resolve to a single file
      const javaPath = javaSourceToPath(imp.source);
      const resolved = resolveExtension(projectRoot, javaPath, existingFiles, 'java');
      if (!resolved) continue; // stdlib or external dependency — skip silently

      const targetRelative = toProjectRelative(projectRoot, resolved);
      const edgeId = makeEdgeId(sourceRelative, 'import', targetRelative);
      edges.push({
        id: edgeId,
        source: sourceRelative,
        target: targetRelative,
        type: 'import',
        metadata: makeImportMetadata(imp),
      });
      continue;
    }

    // Skip third-party packages and path aliases using language-aware check
    const effectiveRelative =
      language === 'python' ? isPythonRelative(imp.source) : isRelative(imp.source);
    if (!effectiveRelative) continue;

    const effectivePath =
      language === 'python' ? pythonSourceToPath(imp.source) : imp.source;

    const resolved = resolveExtension(sourceDir, effectivePath, existingFiles, language);
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
 * @param language        Optional language hint for path resolution strategy
 */
export function resolveExportEdges(
  sourceFilePath: string,
  exports: ParsedExport[],
  projectRoot: string,
  existingFiles: Set<string>,
  language?: SupportedLanguage,
): GraphEdge[] {
  const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  for (const exp of exports) {
    // Only re-exports (export { foo } from '...' or export * from '...') produce edges
    if (!exp.source) continue;
    // Python has no export_statement — this branch will never fire for Python,
    // but guard defensively anyway
    if (!isRelative(exp.source)) continue;

    const resolved = resolveExtension(sourceDir, exp.source, existingFiles, language);
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
 * @param language        Optional language hint for path resolution strategy
 */
export function resolveAllEdges(
  sourceFilePath: string,
  imports: ParsedImport[],
  exports: ParsedExport[],
  projectRoot: string,
  existingFiles: Set<string>,
  language?: SupportedLanguage,
): ResolveResult {
  const errors: string[] = [];
  const sourceDir = dirname(sourceFilePath);
  const edges: GraphEdge[] = [];

  // --- imports ---
  for (const imp of imports) {
    // Java imports are fully-qualified — resolve against project root
    if (language === 'java') {
      if (imp.isNamespace) continue; // wildcard imports cannot resolve to a single file
      const javaPath = javaSourceToPath(imp.source);
      const resolved = resolveExtension(projectRoot, javaPath, existingFiles, 'java');
      if (!resolved) continue; // stdlib or external dependency — skip silently

      const sourceRelative = toProjectRelative(projectRoot, sourceFilePath);
      const targetRelative = toProjectRelative(projectRoot, resolved);
      edges.push({
        id: makeEdgeId(sourceRelative, 'import', targetRelative),
        source: sourceRelative,
        target: targetRelative,
        type: 'import',
        metadata: makeImportMetadata(imp),
      });
      continue;
    }

    const effectiveRelative =
      language === 'python' ? isPythonRelative(imp.source) : isRelative(imp.source);
    if (!effectiveRelative) continue;

    const effectivePath =
      language === 'python' ? pythonSourceToPath(imp.source) : imp.source;

    const resolved = resolveExtension(sourceDir, effectivePath, existingFiles, language);
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

    const resolved = resolveExtension(sourceDir, exp.source, existingFiles, language);
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

// Re-export path utilities for consumers that need them
export { toPosix, isRelative, isPythonRelative, pythonSourceToPath, javaSourceToPath, toProjectRelative };
