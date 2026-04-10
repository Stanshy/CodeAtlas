/**
 * @codeatlas/core — File Scanner
 *
 * Recursively scans a target directory and produces GraphNode[]
 * representing all JS/TS files and their parent directories.
 */

import { stat, readdir } from 'fs/promises';
import type { Dirent } from 'fs';
import { join, relative, basename, extname, sep } from 'path';
import type { GraphNode, AnalysisError, NodeMetadata } from '../types.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  'coverage',
  '.cache',
  // Python virtual environments and cache
  '__pycache__',
  '.venv',
  'venv',
  '.tox',
  '.mypy_cache',
  // Java build artifacts and IDE files
  'target',
  '.gradle',
  '.idea',
]);

const DEFAULT_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.py',
  '.pyw',
  '.java',
]);

const LARGE_FILE_THRESHOLD = 1_048_576; // 1 MB in bytes

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScanOptions {
  /** Additional directories to ignore (merged with defaults). */
  ignoreDirs?: string[];
  /** Override the default set of file extensions to include. */
  extensions?: string[];
}

export interface ScanResult {
  nodes: GraphNode[];
  errors: AnalysisError[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a native OS path to a forward-slash separated relative path.
 * Node.js `relative()` uses `sep` which is `\` on Windows.
 */
function toForwardSlash(p: string): string {
  return p.split(sep).join('/');
}

function detectLanguage(ext: string): string {
  if (ext === '.ts' || ext === '.tsx') return 'typescript';
  if (ext === '.py' || ext === '.pyw') return 'python';
  if (ext === '.java') return 'java';
  return 'javascript';
}

// ---------------------------------------------------------------------------
// Core recursive walker
// ---------------------------------------------------------------------------

interface WalkContext {
  rootPath: string;
  ignoreDirs: Set<string>;
  extensions: Set<string>;
  nodes: GraphNode[];
  errors: AnalysisError[];
}

async function walk(dirPath: string, ctx: WalkContext): Promise<void> {
  let entries: Dirent[];

  try {
    // The overload with withFileTypes:true returns Dirent[]; cast is required because
    // the TypeScript overload signature returns Dirent<Buffer|string> depending on the
    // encoding option, but at runtime encoding:'utf8' guarantees string names.
    entries = (await readdir(dirPath, {
      withFileTypes: true,
      encoding: 'utf8',
    })) as Dirent[];
  } catch (err) {
    ctx.errors.push({
      filePath: toForwardSlash(relative(ctx.rootPath, dirPath)),
      error: err instanceof Error ? err.message : String(err),
      phase: 'scan',
    });
    return;
  }

  // Collect child files and directories for this level.
  const childFiles: GraphNode[] = [];

  for (const entry of entries) {
    // Skip symlinks — do not follow them.
    if (entry.isSymbolicLink()) continue;

    // entry.name is always a string when encoding is 'utf8'; cast for type safety.
    const entryName = entry.name as string;
    const fullPath = join(dirPath, entryName);
    const relPath = toForwardSlash(relative(ctx.rootPath, fullPath));

    if (entry.isDirectory()) {
      if (ctx.ignoreDirs.has(entryName)) continue;

      // Recurse first, then check if the subtree produced any nodes before
      // deciding whether to emit the directory node itself.
      const sizeBefore = ctx.nodes.length;
      await walk(fullPath, ctx);
      const hasChildren = ctx.nodes.length > sizeBefore;

      if (hasChildren) {
        const dirNode: GraphNode = {
          id: relPath,
          type: 'directory',
          label: entryName,
          filePath: relPath,
          metadata: {},
        };
        // Insert directory node before its children for logical ordering.
        ctx.nodes.splice(sizeBefore, 0, dirNode);
      }
      // Empty directories are silently skipped per spec.
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = extname(entryName).toLowerCase();
    if (!ctx.extensions.has(ext)) continue;

    // Stat the file to get size and mtime.
    let fileStat: Awaited<ReturnType<typeof stat>>;
    try {
      fileStat = await stat(fullPath);
    } catch (err) {
      ctx.errors.push({
        filePath: relPath,
        error: err instanceof Error ? err.message : String(err),
        phase: 'scan',
      });
      continue;
    }

    const fileSize = fileStat.size;
    const lastModified = fileStat.mtime.toISOString();
    const language = detectLanguage(ext);
    const isLarge = fileSize > LARGE_FILE_THRESHOLD;

    const metadata: NodeMetadata = { fileSize, language, lastModified };

    const fileNode: GraphNode = {
      id: relPath,
      type: 'file',
      label: entryName,
      filePath: relPath,
      metadata,
    };

    // Emit a warning entry for oversized files — the node is still included.
    if (isLarge) {
      ctx.errors.push({
        filePath: relPath,
        error: `File exceeds 1 MB (${fileSize} bytes) — metadata only, content skipped`,
        phase: 'scan',
      });
    }

    childFiles.push(fileNode);
  }

  // Append file nodes collected at this directory level.
  ctx.nodes.push(...childFiles);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Recursively scan `targetPath` for JS/TS files and return a flat list of
 * `GraphNode` entries (directories + files) together with any scan errors.
 *
 * - Directory nodes are only emitted when they contain at least one
 *   qualifying descendant file.
 * - Symlinks are never followed.
 * - Files larger than 1 MB are included in `nodes` but also reported in
 *   `errors` with phase `'scan'`.
 * - Projects with no matching files return `{ nodes: [], errors: [] }`.
 *
 * @param targetPath  Absolute path to the directory to scan.
 * @param options     Optional overrides for ignore list and extensions.
 */
export async function scanDirectory(
  targetPath: string,
  options?: ScanOptions,
): Promise<ScanResult> {
  const ignoreDirs = new Set(DEFAULT_IGNORE_DIRS);
  if (options?.ignoreDirs) {
    for (const d of options.ignoreDirs) ignoreDirs.add(d);
  }

  const extensions =
    options?.extensions != null
      ? new Set(options.extensions.map((e) => e.toLowerCase()))
      : new Set(DEFAULT_EXTENSIONS);

  const ctx: WalkContext = {
    rootPath: targetPath,
    ignoreDirs,
    extensions,
    nodes: [],
    errors: [],
  };

  // Verify the root path is accessible and is a directory.
  let rootStat: Awaited<ReturnType<typeof stat>>;
  try {
    rootStat = await stat(targetPath);
  } catch (err) {
    return {
      nodes: [],
      errors: [
        {
          filePath: '',
          error: err instanceof Error ? err.message : String(err),
          phase: 'scan',
        },
      ],
    };
  }

  if (!rootStat.isDirectory()) {
    return {
      nodes: [],
      errors: [
        {
          filePath: toForwardSlash(basename(targetPath)),
          error: `Target path is not a directory`,
          phase: 'scan',
        },
      ],
    };
  }

  await walk(targetPath, ctx);

  return { nodes: ctx.nodes, errors: ctx.errors };
}
