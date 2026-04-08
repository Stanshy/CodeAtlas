/**
 * @codeatlas/core — Graph Builder
 *
 * Receives the Scanner's ScanResult, reads each file's source code,
 * delegates to the Parser for import/export extraction and edge resolution,
 * and assembles the complete node + edge graph with updated metadata.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import type { GraphNode, GraphEdge, AnalysisError, AnalysisStats, SupportedLanguage } from '../types.js';
import type { ScanResult } from '../scanner/index.js';
import { parseFileImports } from '../parser/import-extractor.js';
import { resolveAllEdges } from '../parser/import-resolver.js';
import { parseSource } from '../parser/parser-factory.js';
import { extractFunctions } from '../parser/function-extractor.js';
import { analyzeCallRelations } from './call-analyzer.js';
import { classifyNodeRole, computeDependencyStats } from './role-classifier.js';
import { classifyMethodRole } from '../ai/method-role-classifier.js';
import type { MethodClassificationInput } from '../ai/method-role-classifier.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BuildGraphOptions {
  projectRoot: string;
  scanResult: ScanResult;
}

export interface GraphBuildResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  errors: AnalysisError[];
  stats: Partial<AnalysisStats>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** The set of scan-phase error messages that indicate a file was skipped. */
const SKIP_ERROR_PATTERN = /exceeds 1 MB/;

/**
 * Build an absolute path from the project root and a POSIX-relative file path.
 * On Windows, `resolve` normalises separators correctly.
 */
function toAbsolute(projectRoot: string, relPath: string): string {
  return resolve(projectRoot, relPath);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build the dependency graph from a completed scan result.
 *
 * Flow per file node:
 *   1. Read source code from disk
 *   2. Detect language from existing node metadata
 *   3. parseFileImports  → imports[], exports[], parse errors
 *   4. resolveAllEdges   → GraphEdge[], resolve errors
 *   5. Mutate the node's metadata with importCount, exportCount
 *
 * After all files are processed:
 *   6. Compute dependencyCount for each node (in-edge count)
 *
 * @param options  projectRoot and scanResult from scanDirectory()
 */
export async function buildGraph(
  options: BuildGraphOptions,
): Promise<GraphBuildResult> {
  const { projectRoot, scanResult } = options;

  // Deep-clone nodes so we can mutate metadata without affecting the caller's
  // reference.  Edges are newly constructed, errors accumulated fresh.
  const nodes: GraphNode[] = scanResult.nodes.map((n) => ({
    ...n,
    metadata: { ...n.metadata },
  }));

  const allEdges: GraphEdge[] = [];
  const allErrors: AnalysisError[] = [];

  // Identify which scan errors are "skip" warnings (large files).
  const skippedPaths = new Set<string>(
    scanResult.errors
      .filter((e) => e.phase === 'scan' && SKIP_ERROR_PATTERN.test(e.error))
      .map((e) => e.filePath),
  );

  // Collect file nodes only.
  const fileNodes = nodes.filter((n) => n.type === 'file');

  // Build the existingFiles Set with absolute paths so that the resolver's
  // resolveExtension() can match candidates against it.
  // The resolver calls resolve(baseDir, importPath) → absolute path, then
  // checks existingFiles.has(absoluteCandidate).  We therefore store both
  // the raw OS-absolute path and its POSIX form for cross-platform safety.
  const existingFiles = new Set<string>();
  for (const node of fileNodes) {
    const abs = toAbsolute(projectRoot, node.filePath);
    existingFiles.add(abs);
    existingFiles.add(node.filePath); // relative POSIX path as fallback
  }

  let analyzedFiles = 0;
  let failedFiles = 0;

  for (const node of fileNodes) {
    const relPath = node.filePath;
    const absPath = toAbsolute(projectRoot, relPath);

    // Skip large files — they were flagged during scan.
    if (skippedPaths.has(relPath)) continue;

    // Determine language from scanner-populated metadata.
    const language: SupportedLanguage =
      (node.metadata.language as SupportedLanguage | undefined) ?? 'javascript';

    // --- Read source ---
    let sourceCode: string;
    try {
      sourceCode = await readFile(absPath, 'utf8');
    } catch (err) {
      allErrors.push({
        filePath: relPath,
        error: err instanceof Error ? err.message : String(err),
        phase: 'analyze',
      });
      failedFiles++;
      continue;
    }

    // --- Parse imports / exports ---
    let parseResult: Awaited<ReturnType<typeof parseFileImports>>;
    try {
      parseResult = await parseFileImports(absPath, sourceCode, language);
    } catch (err) {
      allErrors.push({
        filePath: relPath,
        error: err instanceof Error ? err.message : String(err),
        phase: 'parse',
      });
      failedFiles++;
      continue;
    }

    // Surface any parser-internal errors as analysis errors.
    for (const msg of parseResult.errors) {
      allErrors.push({ filePath: relPath, error: msg, phase: 'parse' });
    }

    // --- Resolve edges ---
    const resolveResult = resolveAllEdges(
      absPath,
      parseResult.imports,
      parseResult.exports,
      projectRoot,
      existingFiles,
      language,
    );

    for (const msg of resolveResult.errors) {
      allErrors.push({ filePath: relPath, error: msg, phase: 'analyze' });
    }

    allEdges.push(...resolveResult.edges);

    // --- Update node metadata ---
    node.metadata.importCount = parseResult.imports.length;
    node.metadata.exportCount = parseResult.exports.length;

    analyzedFiles++;
  }

  // --- Compute dependencyCount (in-degree) per target node ---
  const inDegree = new Map<string, number>();
  for (const edge of allEdges) {
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  for (const node of fileNodes) {
    const count = inDegree.get(node.filePath);
    if (count !== undefined) {
      node.metadata.dependencyCount = count;
    }
  }

  // --- Sprint 10: Classify node roles ---
  const depStats = computeDependencyStats(fileNodes);
  for (const node of nodes) {
    if (node.type === 'file' || node.type === 'directory') {
      node.metadata.role = classifyNodeRole(node, depStats);
    }
  }

  // --- Deduplicate edges (same id = same source→target relation) ---
  const seenEdgeIds = new Set<string>();
  const uniqueEdges: GraphEdge[] = [];
  for (const edge of allEdges) {
    if (!seenEdgeIds.has(edge.id)) {
      seenEdgeIds.add(edge.id);
      uniqueEdges.push(edge);
    }
  }

  const totalFiles = fileNodes.length;
  const skippedFiles = skippedPaths.size;

  const stats: Partial<AnalysisStats> = {
    totalFiles,
    analyzedFiles,
    skippedFiles,
    failedFiles,
    totalNodes: nodes.length,
    totalEdges: uniqueEdges.length,
  };

  return { nodes, edges: uniqueEdges, errors: allErrors, stats };
}

// ---------------------------------------------------------------------------
// Sprint 7 / T5 — Second pass: function/class nodes + call edges
// ---------------------------------------------------------------------------

export interface FunctionGraphResult {
  functionNodes: GraphNode[];
  callEdges: GraphEdge[];
  stats: {
    totalFunctions: number;
    totalClasses: number;
    totalCallEdges: number;
  };
  errors: AnalysisError[];
}

/**
 * Second analysis pass: extract function/class nodes and call edges.
 *
 * Must be called AFTER buildGraph() so that importEdges are available for
 * cross-file call resolution.
 *
 * @param fileNodes    File-type GraphNodes from buildGraph()
 * @param projectRoot  Absolute project root path
 * @param importEdges  Import GraphEdges produced by buildGraph()
 */
export async function buildFunctionGraph(
  fileNodes: GraphNode[],
  projectRoot: string,
  importEdges: GraphEdge[],
): Promise<FunctionGraphResult> {
  const functionNodes: GraphNode[] = [];
  const callEdges: GraphEdge[] = [];
  const errors: AnalysisError[] = [];

  // Build a lookup: fileId → list of exported symbol names from that file
  // using importEdges (which have metadata.importedSymbols)
  // key: "sourceFileId::symbolName" → targetFileId
  // We build importedFunctions per file below

  // Build a map: fileId → { symbolName → { fileId, functionName } }
  // from all import edges pointing TO each file
  // importEdge.source = importer file, importEdge.target = imported file
  // importEdge.metadata.importedSymbols = symbols brought in
  const fileImportMap = new Map<string, Map<string, { fileId: string; functionName: string }>>();
  for (const edge of importEdges) {
    if (edge.type !== 'import') continue;
    const symbols = edge.metadata.importedSymbols ?? [];
    if (symbols.length === 0) continue;

    if (!fileImportMap.has(edge.source)) {
      fileImportMap.set(edge.source, new Map());
    }
    const symMap = fileImportMap.get(edge.source)!;
    for (const sym of symbols) {
      symMap.set(sym, { fileId: edge.target, functionName: sym });
    }
  }

  // Process each file
  for (const fileNode of fileNodes) {
    const relPath = fileNode.filePath;
    const absPath = toAbsolute(projectRoot, relPath);
    const fileId = fileNode.id;

    try {
      // Read source
      let sourceCode: string;
      try {
        sourceCode = await readFile(absPath, 'utf8');
      } catch (err) {
        errors.push({
          filePath: relPath,
          error: err instanceof Error ? err.message : String(err),
          phase: 'analyze',
        });
        continue;
      }

      // Detect language
      const language: SupportedLanguage =
        (fileNode.metadata.language as SupportedLanguage | undefined) ?? 'javascript';

      // Parse source → AST
      let parseResult: Awaited<ReturnType<typeof parseSource>>;
      try {
        parseResult = await parseSource(sourceCode, language);
      } catch (err) {
        errors.push({
          filePath: relPath,
          error: err instanceof Error ? err.message : String(err),
          phase: 'parse',
        });
        continue;
      }

      const { root } = parseResult;

      // Extract functions and classes
      const { functions, classes } = extractFunctions(root, language);

      // Build imported functions map for this file
      const importedFunctions: Map<string, { fileId: string; functionName: string }> =
        fileImportMap.get(fileId) ?? new Map();

      // --- Create GraphNodes for top-level functions ---
      const seenIds = new Set<string>();
      for (const fn of functions) {
        let nodeId = `${fileId}#${fn.name}`;
        // Handle duplicate IDs (overloaded names)
        if (seenIds.has(nodeId)) {
          let seq = 2;
          while (seenIds.has(`${nodeId}$${seq}`)) seq++;
          nodeId = `${nodeId}$${seq}`;
        }
        seenIds.add(nodeId);

        const fnMeta: GraphNode['metadata'] = {
          parentFileId: fileId,
          kind: fn.kind,
          parameters: fn.parameters,
          lineCount: fn.endLine - fn.startLine + 1,
          startLine: fn.startLine,
          endLine: fn.endLine,
          language,
        };
        if (fn.returnType !== undefined) fnMeta.returnType = fn.returnType;
        if (fn.isAsync) fnMeta.isAsync = true;
        if (fn.isExported) fnMeta.isExported = true;

        const fnNode: GraphNode = {
          id: nodeId,
          type: 'function',
          label: fn.name,
          filePath: relPath,
          metadata: fnMeta,
        };
        functionNodes.push(fnNode);
      }

      // --- Create GraphNodes for classes ---
      for (const cls of classes) {
        let classNodeId = `${fileId}#${cls.name}`;
        if (seenIds.has(classNodeId)) {
          let seq = 2;
          while (seenIds.has(`${classNodeId}$${seq}`)) seq++;
          classNodeId = `${classNodeId}$${seq}`;
        }
        seenIds.add(classNodeId);

        const clsMeta: GraphNode['metadata'] = {
          parentFileId: fileId,
          kind: 'class',
          lineCount: cls.endLine - cls.startLine + 1,
          startLine: cls.startLine,
          endLine: cls.endLine,
          methodCount: cls.methods.length,
          language,
        };
        if (cls.isExported) clsMeta.isExported = true;

        const classNode: GraphNode = {
          id: classNodeId,
          type: 'class',
          label: cls.name,
          filePath: relPath,
          metadata: clsMeta,
        };
        functionNodes.push(classNode);

        // --- Create GraphNodes for class methods ---
        for (const method of cls.methods) {
          const methodNodeId = `${fileId}#${cls.name}.${method.name}`;
          if (seenIds.has(methodNodeId)) continue; // skip duplicate method names
          seenIds.add(methodNodeId);

          const methodMeta: GraphNode['metadata'] = {
            parentFileId: fileId,
            kind: method.kind,
            parameters: method.parameters,
            lineCount: method.endLine - method.startLine + 1,
            startLine: method.startLine,
            endLine: method.endLine,
            language,
          };
          if (method.returnType !== undefined) methodMeta.returnType = method.returnType;
          if (method.isAsync) methodMeta.isAsync = true;

          const methodNode: GraphNode = {
            id: methodNodeId,
            type: 'function',
            label: `${cls.name}.${method.name}`,
            filePath: relPath,
            metadata: methodMeta,
          };
          functionNodes.push(methodNode);
        }
      }

      // --- Analyze call relations ---
      const allLocalFunctions = [
        ...functions,
        ...classes.flatMap((cls) => cls.methods),
      ];

      const callRelations = analyzeCallRelations(
        root,
        fileId,
        allLocalFunctions,
        importedFunctions,
        language,
      );

      // --- Create call GraphEdges ---
      const seenEdgeIds = new Set<string>();
      for (const rel of callRelations) {
        const callerId = `${rel.callerFileId}#${rel.callerName}`;
        const calleeId = `${rel.calleeFileId}#${rel.calleeName}`;
        const edgeId = `${callerId}--call--${calleeId}`;

        if (seenEdgeIds.has(edgeId)) continue;
        seenEdgeIds.add(edgeId);

        const edge: GraphEdge = {
          id: edgeId,
          source: callerId,
          target: calleeId,
          type: 'call',
          metadata: {
            callerName: rel.callerName,
            calleeName: rel.calleeName,
            callType: rel.callType,
            confidence: rel.confidence,
          },
        };
        callEdges.push(edge);
      }
    } catch (err) {
      // Error isolation: don't let one file's failure affect others
      errors.push({
        filePath: relPath,
        error: err instanceof Error ? err.message : String(err),
        phase: 'analyze',
      });
    }
  }

  // --- Sprint 15.1: Classify method roles (rule engine, zero cost) ---
  for (const node of functionNodes) {
    if (node.type === 'function') {
      const input: MethodClassificationInput = {
        name: node.label,
        filePath: node.filePath,
        isExported: node.metadata.isExported,
        isAsync: node.metadata.isAsync,
        parameters: node.metadata.parameters?.map((p) => ({
          name: p.name,
          type: p.type,
        })),
        returnType: node.metadata.returnType,
        callOutDegree: callEdges.filter((e) => e.source === node.id).length,
      };
      const result = classifyMethodRole(input);
      node.metadata.methodRole = result.role;
      node.metadata.roleConfidence = result.confidence;
    }
  }

  const totalFunctions = functionNodes.filter((n) => n.type === 'function').length;
  const totalClasses = functionNodes.filter((n) => n.type === 'class').length;

  return {
    functionNodes,
    callEdges,
    stats: {
      totalFunctions,
      totalClasses,
      totalCallEdges: callEdges.length,
    },
    errors,
  };
}
