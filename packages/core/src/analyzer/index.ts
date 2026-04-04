/**
 * @codeatlas/core — Analyzer
 *
 * Main entry point for dependency analysis.
 * Orchestrates Scanner → Parser → GraphBuilder into a single AnalysisResult.
 */

import type { AnalysisResult, AnalysisStats } from '../types.js';
import { scanDirectory } from '../scanner/index.js';
import type { ScanOptions } from '../scanner/index.js';
import { buildGraph, buildFunctionGraph } from './graph-builder.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AnalyzeOptions {
  /** Additional directories to ignore during scanning. */
  ignoreDirs?: string[];
  /** Override the default set of file extensions to include. */
  extensions?: string[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Analyse the JS/TS dependency graph rooted at `targetPath`.
 *
 * Steps:
 *   1. scanDirectory  — discover all JS/TS files, build file GraphNodes
 *   2. buildGraph     — parse imports/exports, resolve edges, update metadata
 *   3. Assemble       — merge stats, collect errors, return AnalysisResult
 *
 * @param targetPath  Absolute path to the project root to analyse.
 * @param options     Optional scan overrides (ignoreDirs, extensions).
 */
export async function analyze(
  targetPath: string,
  options?: AnalyzeOptions,
): Promise<AnalysisResult> {
  const startTime = Date.now();

  // --- Step 1: Scan ---
  const scanOptions: ScanOptions = {};
  if (options?.ignoreDirs !== undefined) scanOptions.ignoreDirs = options.ignoreDirs;
  if (options?.extensions !== undefined) scanOptions.extensions = options.extensions;

  const scanResult = await scanDirectory(targetPath, scanOptions);

  // --- Step 2: Build module-level graph ---
  const buildResult = await buildGraph({
    projectRoot: targetPath,
    scanResult,
  });

  // --- Step 3: Build function-level graph (second pass) ---
  const fileNodes = buildResult.nodes.filter((n) => n.type === 'file');
  const importEdges = buildResult.edges.filter((e) => e.type === 'import');

  const funcResult = await buildFunctionGraph(fileNodes, targetPath, importEdges);

  // --- Step 4: Assemble stats ---
  const analysisDurationMs = Date.now() - startTime;

  const allNodes = [...buildResult.nodes, ...funcResult.functionNodes];
  const allEdges = [...buildResult.edges, ...funcResult.callEdges];

  const stats: AnalysisStats = {
    totalFiles: buildResult.stats.totalFiles ?? 0,
    analyzedFiles: buildResult.stats.analyzedFiles ?? 0,
    skippedFiles: buildResult.stats.skippedFiles ?? 0,
    failedFiles: buildResult.stats.failedFiles ?? 0,
    totalNodes: allNodes.length,
    totalEdges: allEdges.length,
    analysisDurationMs,
    totalFunctions: funcResult.stats.totalFunctions,
    totalClasses: funcResult.stats.totalClasses,
    totalCallEdges: funcResult.stats.totalCallEdges,
  };

  // Merge all errors.
  const errors = [
    ...scanResult.errors,
    ...buildResult.errors,
    ...funcResult.errors,
  ];

  return {
    version: '0.1.0',
    projectPath: targetPath,
    analyzedAt: new Date().toISOString(),
    stats,
    graph: {
      nodes: allNodes,
      edges: allEdges,
    },
    errors,
  };
}
