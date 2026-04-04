/**
 * @codeatlas/cli — analyze command
 *
 * Orchestrates the core `analyze()` function and writes the result to
 * `.codeatlas/analysis.json` relative to the target project directory.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { analyze } from '@codeatlas/core';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnalyzeCommandOptions {
  verbose?: boolean;
  ignore?: string[];
}

/**
 * Implementation of the `codeatlas analyze [path]` CLI sub-command.
 *
 * @param targetPath  Directory to analyse. Defaults to `process.cwd()`.
 * @param options     CLI flag values.
 */
export async function analyzeCommand(
  targetPath: string | undefined,
  options: AnalyzeCommandOptions,
): Promise<void> {
  const resolvedPath = path.resolve(targetPath ?? process.cwd());

  // --- Guard: target must exist ---
  try {
    const stat = await fs.stat(resolvedPath);
    if (!stat.isDirectory()) {
      console.error(`Error: "${resolvedPath}" is not a directory.`);
      process.exit(1);
    }
  } catch {
    console.error(`Error: Path does not exist — "${resolvedPath}"`);
    process.exit(1);
  }

  const startTime = Date.now();

  console.log('CodeAtlas v0.1.0');
  console.log('');
  console.log(`Scanning: ${resolvedPath}`);

  if (options.verbose) {
    console.log(`Options: ignore=[${(options.ignore ?? []).join(', ')}]`);
  }

  // --- Run core analysis ---
  let result;
  try {
    result = await analyze(resolvedPath, {
      ignoreDirs: options.ignore ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Analysis failed — ${message}`);
    process.exit(1);
  }

  // --- Write output file ---
  const outputDir = path.join(resolvedPath, '.codeatlas');
  const outputFile = path.join(outputDir, 'analysis.json');

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(result, null, 2), 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: Could not write output — ${message}`);
    process.exit(1);
  }

  // --- Print summary ---
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  const { stats } = result;

  console.log(`Files found: ${stats.totalFiles}`);
  console.log(`Analyzed: ${stats.analyzedFiles} ✓`);
  console.log(`Skipped: ${stats.skippedFiles}`);

  const failedSuffix =
    stats.failedFiles > 0 ? ' (see .codeatlas/analysis.json)' : '';
  console.log(`Failed: ${stats.failedFiles}${failedSuffix}`);
  console.log('');

  const dirCount = result.graph.nodes.filter((n: { type: string }) => n.type === 'directory').length;
  const fileCount = result.graph.nodes.filter((n: { type: string }) => n.type === 'file').length;
  console.log(`Nodes: ${fileCount} files, ${dirCount} directories`);
  console.log(`Edges: ${stats.totalEdges} imports`);
  console.log('');
  console.log(`Analysis saved to .codeatlas/analysis.json`);
  console.log(`Duration: ${durationSec}s`);
}
