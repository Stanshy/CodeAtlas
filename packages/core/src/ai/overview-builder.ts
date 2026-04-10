/**
 * AI Overview Builder
 *
 * Extracts structural information from an AnalysisResult and assembles
 * an AI prompt for generating a concise project architecture overview.
 *
 * Privacy guarantee: only names, types, and counts are extracted.
 * No source code is ever included in the output.
 */

import type { AnalysisResult, GraphEdge } from '../types.js';

// === Types ===

export interface StructureInfo {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  topModules: Array<{
    path: string;
    dependencyCount: number;
    importCount: number;
    exportCount: number;
  }>;
  moduleRelationships: Array<{
    source: string;
    target: string;
    edgeCount: number;
  }>;
}

// === Constants ===

const TOP_MODULES_LIMIT = 20;
const MODULE_RELATIONSHIPS_LIMIT = 30;

// === Functions ===

/**
 * extractStructureInfo
 *
 * Derives structural metadata from an AnalysisResult.  Only names,
 * types, and numeric counts are retained — no source code.
 *
 * - fileNodes      : nodes where type === 'file'
 * - functionNodes  : nodes where type === 'function'
 * - classNodes     : nodes where type === 'class'
 * - topModules     : file nodes sorted descending by dependencyCount, capped at 20
 * - moduleRelationships: non-call edges between file nodes, grouped by source→target
 *                        pair, sorted descending by edgeCount, capped at 30
 */
export function extractStructureInfo(result: AnalysisResult): StructureInfo {
  const { nodes, edges } = result.graph;

  // Partition nodes by type
  const fileNodes = nodes.filter((n) => n.type === 'file');
  const functionNodes = nodes.filter((n) => n.type === 'function');
  const classNodes = nodes.filter((n) => n.type === 'class');

  // Build a set of file node ids for relationship filtering
  const fileNodeIds = new Set(fileNodes.map((n) => n.id));

  // Top modules: sort by dependencyCount descending, take up to 20
  const topModules = fileNodes
    .slice()
    .sort((a, b) => (b.metadata.dependencyCount ?? 0) - (a.metadata.dependencyCount ?? 0))
    .slice(0, TOP_MODULES_LIMIT)
    .map((n) => ({
      path: n.filePath,
      dependencyCount: n.metadata.dependencyCount ?? 0,
      importCount: n.metadata.importCount ?? 0,
      exportCount: n.metadata.exportCount ?? 0,
    }));

  // Module relationships: edges between file nodes, excluding call edges
  const nonCallEdges = edges.filter(
    (e: GraphEdge) =>
      e.type !== 'call' && fileNodeIds.has(e.source) && fileNodeIds.has(e.target),
  );

  // Group by source→target pair and count edges
  const relationshipMap = new Map<string, { source: string; target: string; edgeCount: number }>();
  for (const edge of nonCallEdges) {
    const key = `${edge.source}||${edge.target}`;
    const existing = relationshipMap.get(key);
    if (existing) {
      existing.edgeCount += 1;
    } else {
      relationshipMap.set(key, { source: edge.source, target: edge.target, edgeCount: 1 });
    }
  }

  const moduleRelationships = Array.from(relationshipMap.values())
    .sort((a, b) => b.edgeCount - a.edgeCount)
    .slice(0, MODULE_RELATIONSHIPS_LIMIT);

  return {
    totalFiles: fileNodes.length,
    totalFunctions: functionNodes.length,
    totalClasses: classNodes.length,
    topModules,
    moduleRelationships,
  };
}

/**
 * buildOverviewPrompt
 *
 * Assembles an English prompt string suitable for sending to any AI
 * provider.  The prompt contains only structural statistics — no source
 * code is included.
 *
 * The caller is responsible for trimming the module list before calling
 * this function if a smaller context is desired; this function enforces
 * the 20-module cap itself as a safety net.
 */
export function buildOverviewPrompt(info: StructureInfo): string {
  // Safety cap: never exceed 20 modules in the prompt
  const modules = info.topModules.slice(0, TOP_MODULES_LIMIT);

  const moduleLines = modules
    .map(
      (m) =>
        `  - ${m.path} (depended on by ${m.dependencyCount}, imports ${m.importCount}, exports ${m.exportCount})`,
    )
    .join('\n');

  const relationshipLines = info.moduleRelationships
    .map((r) => `  - ${r.source} → ${r.target} (${r.edgeCount} edges)`)
    .join('\n');

  return [
    'You are a software architecture analyst. Based on the following project structure information, write a concise 1-2 paragraph overview of the project architecture.',
    '',
    'Project Statistics:',
    `- Total files: ${info.totalFiles}`,
    `- Total functions: ${info.totalFunctions}`,
    `- Total classes: ${info.totalClasses}`,
    '',
    'Top Modules (by dependency count):',
    moduleLines || '  (none)',
    '',
    'Key Module Relationships:',
    relationshipLines || '  (none)',
    '',
    'Instructions:',
    '1. Describe the overall architecture pattern',
    '2. Identify the core modules and their responsibilities',
    '3. Note any notable patterns or potential concerns',
    '4. Keep it concise: 1-2 paragraphs maximum',
    '5. Do NOT mention file sizes, line counts, or other metrics not provided',
  ].join('\n');
}
