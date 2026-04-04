/**
 * @codeatlas/cli — Fastify local HTTP server
 *
 * Serves the web UI static files and exposes a JSON API for the analysis
 * graph produced by the `analyze` command.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import type { AnalysisResult } from '@codeatlas/core';
import {
  createProvider,
  extractStructureInfo,
  buildOverviewPrompt,
  aggregateByDirectory,
  detectEndpoints,
} from '@codeatlas/core';
import { getCachedSummary, setCachedSummary } from './cache.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerOptions {
  port: number;
  analysisPath: string;  // absolute path to .codeatlas/analysis.json
  staticDir: string;     // absolute path to packages/web/
  aiKey?: string;        // API key for AI provider
  aiProvider?: string;   // 'ollama' | 'openai' | 'anthropic' | 'disabled'
  ollamaModel?: string;  // Ollama model name (default: 'codellama')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Read and parse analysis.json from disk on every call (no cache),
 * so a re-analyze followed by a browser refresh always returns fresh data.
 */
async function readAnalysis(analysisPath: string): Promise<AnalysisResult> {
  let raw: string;
  try {
    raw = await fs.readFile(analysisPath, 'utf-8');
  } catch {
    const err = new Error(`analysis.json not found at "${analysisPath}"`);
    (err as NodeJS.ErrnoException).code = 'ENOENT';
    throw err;
  }
  try {
    return JSON.parse(raw) as AnalysisResult;
  } catch {
    const err = new Error(`analysis.json is malformed at "${analysisPath}"`);
    (err as NodeJS.ErrnoException).code = 'EPARSE';
    throw err;
  }
}

/** Shared handler for analysis read errors. Returns true if reply was sent. */
async function handleAnalysisError(
  err: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reply: { code: (n: number) => any; send: (body: unknown) => any },
): Promise<boolean> {
  const code = (err as NodeJS.ErrnoException).code;
  if (code === 'ENOENT') {
    await reply.code(503).send({
      error: 'analysis_not_ready',
      message: 'Analysis has not been run yet. Execute `codeatlas analyze` first.',
    });
    return true;
  }
  if (code === 'EPARSE') {
    await reply.code(500).send({
      error: 'analysis_corrupt',
      message: 'analysis.json is malformed. Re-run `codeatlas analyze`.',
    });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function startServer(options: ServerOptions): Promise<void> {
  const { port, analysisPath, staticDir, aiKey, aiProvider = 'disabled', ollamaModel } = options;

  // Derive cache directory from analysisPath (sibling of analysis.json)
  const cacheDir = path.join(path.dirname(analysisPath), 'cache');

  const fastify = Fastify({
    logger: false,
    bodyLimit: 1_048_576,          // 1 MB max request body
    requestTimeout: 30_000,        // 30s request timeout
    connectionTimeout: 60_000,     // 60s connection timeout
  });

  // ---- Static files (packages/web/) ----------------------------------------
  await fastify.register(fastifyStatic, {
    root: staticDir,
    prefix: '/',
  });

  // ---- GET /api/health -------------------------------------------------------
  fastify.get('/api/health', async (_req, reply) => {
    await reply.send({ status: 'ok', version: '0.1.0' });
  });

  // ---- GET /api/graph --------------------------------------------------------
  fastify.get<{ Querystring: { include?: string } }>('/api/graph', async (req, reply) => {
    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // Sprint 7: filter function/class nodes and call edges unless ?include=functions
    const includeFunctions = (req.query.include ?? '').split(',').includes('functions');
    if (!includeFunctions) {
      const filteredNodes = analysis.graph.nodes.filter(
        (n) => n.metadata?.parentFileId === undefined,
      );
      const filteredEdges = analysis.graph.edges.filter(
        (e) => e.type !== 'call',
      );

      // Sprint 12 / T2: compute directory-level graph from filtered nodes/edges
      const directoryGraph = aggregateByDirectory(filteredNodes, filteredEdges);

      // Sprint 13 / T2: detect API endpoints and build request-chain graph
      const endpointGraph = detectEndpoints(analysis);

      await reply.send({
        ...analysis,
        graph: { nodes: filteredNodes, edges: filteredEdges },
        directoryGraph,
        endpointGraph: endpointGraph ?? null,
      });
      return;
    }

    // Sprint 12 / T2: compute directory graph for full (functions-included) response too
    const directoryGraph = aggregateByDirectory(
      analysis.graph.nodes,
      analysis.graph.edges,
    );

    // Sprint 13 / T2: detect API endpoints and build request-chain graph
    const endpointGraph = detectEndpoints(analysis);

    await reply.send({ ...analysis, directoryGraph, endpointGraph: endpointGraph ?? null });
  });

  // ---- GET /api/graph/stats --------------------------------------------------
  fastify.get('/api/graph/stats', async (_req, reply) => {
    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }
    await reply.send(analysis.stats);
  });

  // ---- GET /api/graph/functions/:fileId --------------------------------------
  // Sprint 7: return function/class nodes and call edges for a specific file
  fastify.get<{ Params: { fileId: string } }>('/api/graph/functions/:fileId', async (req, reply) => {
    const fileId = decodeURIComponent(req.params.fileId);

    if (!fileId || fileId.includes('..')) {
      await reply.code(400).send({
        error: 'invalid_file_id',
        message: 'File ID contains invalid characters.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // Check that the file node exists
    const fileNode = analysis.graph.nodes.find(
      (n) => n.id === fileId && n.type === 'file',
    );
    if (!fileNode) {
      await reply.code(404).send({
        error: 'file_not_found',
        message: `File node not found: ${fileId}`,
      });
      return;
    }

    // Filter function/class nodes belonging to this file
    const nodes = analysis.graph.nodes.filter(
      (n) => n.metadata?.parentFileId === fileId,
    );

    // Filter call edges related to this file's functions
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = analysis.graph.edges.filter(
      (e) => e.type === 'call' && (nodeIds.has(e.source) || nodeIds.has(e.target)),
    );

    await reply.send({ fileId, nodes, edges });
  });

  // ---- GET /api/node/:id -----------------------------------------------------
  fastify.get<{ Params: { id: string } }>('/api/node/:id', async (req, reply) => {
    const nodeId = decodeURIComponent(req.params.id);

    // Reject path traversal attempts
    if (!nodeId || nodeId.includes('..')) {
      await reply.code(400).send({
        error: 'invalid_node_id',
        message: 'Node ID contains invalid characters.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    const node = analysis.graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      await reply.code(404).send({
        error: 'node_not_found',
        message: `No node found with id "${nodeId}".`,
      });
      return;
    }

    // Edges where this node is source or target
    const edges = analysis.graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );

    // Read source code for file nodes; directories have no source
    let sourceCode: string | null = null;
    if (node.type === 'file' || node.type === 'function' || node.type === 'class') {
      const absoluteFilePath = path.join(analysis.projectPath, node.filePath);
      try {
        sourceCode = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch {
        // File may have been deleted since analysis — return null rather than crashing
        sourceCode = null;
      }
    }

    await reply.send({ node, edges, sourceCode });
  });

  // ---- GET /api/ai/status ----------------------------------------------------
  fastify.get('/api/ai/status', async (_req, reply) => {
    const provider = createProvider(
      aiProvider,
      aiKey,
      aiProvider === 'ollama' && ollamaModel ? { ollamaModel } : undefined,
    );

    const mode: 'local' | 'cloud' | 'disabled' =
      aiProvider === 'ollama' ? 'local'
      : aiProvider === 'disabled' || aiProvider === undefined ? 'disabled'
      : 'cloud';

    const privacyLevel: 'full' | 'partial' | 'none' =
      mode === 'local' ? 'full'
      : mode === 'disabled' ? 'none'
      : 'partial';

    const model: string | null =
      aiProvider === 'ollama' ? (ollamaModel ?? 'codellama') : null;

    await reply.send({
      enabled: provider.isConfigured(),
      provider: aiProvider,
      mode,
      privacyLevel,
      model,
    });
  });

  // ---- POST /api/ai/summary --------------------------------------------------
  fastify.post<{ Body: { nodeId: string; provider?: string } }>('/api/ai/summary', async (req, reply) => {
    const { nodeId, provider: bodyProvider } = req.body ?? {};
    if (!nodeId) {
      await reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include "nodeId".',
      });
      return;
    }

    // Use server-configured provider, fallback to body-specified provider
    const providerName = aiProvider !== 'disabled' ? aiProvider : (bodyProvider ?? 'disabled');

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    const node = analysis.graph.nodes.find((n) => n.id === nodeId);
    if (!node) {
      await reply.code(404).send({
        error: 'node_not_found',
        message: `No node found with id "${nodeId}".`,
      });
      return;
    }

    const summaryProvider = createProvider(
      providerName,
      aiKey,
      providerName === 'ollama' ? { ollamaModel: ollamaModel ?? 'codellama' } : undefined,
    );
    if (!summaryProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No API key configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    // --- Check cache first ---
    const cached = await getCachedSummary(cacheDir, nodeId, providerName);
    if (cached) {
      await reply.send({
        nodeId,
        summary: cached.summary,
        provider: providerName,
        cached: true,
      });
      return;
    }

    // Read source code for context
    let sourceCode = '';
    if (node.type === 'file') {
      const absoluteFilePath = path.join(analysis.projectPath, node.filePath);
      try {
        sourceCode = await fs.readFile(absoluteFilePath, 'utf-8');
      } catch {
        sourceCode = '';
      }
    }

    // Gather import/export context
    const relatedEdges = analysis.graph.edges.filter(
      (e) => e.source === nodeId || e.target === nodeId,
    );
    const imports = relatedEdges.filter((e) => e.source === nodeId).map((e) => e.target);
    const exports = relatedEdges.filter((e) => e.target === nodeId).map((e) => e.source);

    try {
      const summary = await summaryProvider.summarize(sourceCode, {
        filePath: node.filePath,
        language: node.metadata.language ?? 'javascript',
        imports,
        exports,
      });

      // --- Write to cache (non-blocking) ---
      void setCachedSummary(cacheDir, nodeId, providerName, summary);

      await reply.send({
        nodeId,
        summary,
        provider: providerName,
        cached: false,
      });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_error',
        message: err instanceof Error ? err.message : 'AI summarization failed.',
      });
    }
  });

  // ---- POST /api/ai/overview --------------------------------------------------
  fastify.post<{ Body: { provider?: string } }>('/api/ai/overview', async (req, reply) => {
    const { provider: bodyProvider } = req.body ?? {};

    // Use server-configured provider, fallback to body-specified provider
    const providerName = aiProvider !== 'disabled' ? aiProvider : (bodyProvider ?? 'disabled');

    const overviewProvider = createProvider(
      providerName,
      aiKey,
      providerName === 'ollama' ? { ollamaModel: ollamaModel ?? 'codellama' } : undefined,
    );
    if (!overviewProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No AI provider configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    let analysis: AnalysisResult;
    try {
      analysis = await readAnalysis(analysisPath);
    } catch (err) {
      if (await handleAnalysisError(err, reply)) return;
      throw err;
    }

    // --- Check cache (key = "overview:{provider}") ---
    const cacheKey = 'overview';
    const cached = await getCachedSummary(cacheDir, cacheKey, providerName);
    if (cached) {
      // Re-extract structure info for response (cheap operation)
      const structureInfo = extractStructureInfo(analysis);
      await reply.send({
        overview: cached.summary,
        provider: providerName,
        cached: true,
        structureInfo: {
          totalFiles: structureInfo.totalFiles,
          totalFunctions: structureInfo.totalFunctions,
          topModules: structureInfo.topModules.map((m) => ({
            path: m.path,
            dependencyCount: m.dependencyCount,
          })),
        },
      });
      return;
    }

    // --- Extract structure + build prompt ---
    const structureInfo = extractStructureInfo(analysis);
    const prompt = buildOverviewPrompt(structureInfo);

    try {
      // Reuse summarize() — the prompt is the "code" and context is minimal
      const overview = await overviewProvider.summarize(prompt, {
        filePath: 'project-overview',
        language: 'text',
        imports: [],
        exports: [],
      });

      // --- Write to cache (non-blocking) ---
      void setCachedSummary(cacheDir, cacheKey, providerName, overview);

      await reply.send({
        overview,
        provider: providerName,
        cached: false,
        structureInfo: {
          totalFiles: structureInfo.totalFiles,
          totalFunctions: structureInfo.totalFunctions,
          topModules: structureInfo.topModules.map((m) => ({
            path: m.path,
            dependencyCount: m.dependencyCount,
          })),
        },
      });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_overview_failed',
        message: err instanceof Error ? err.message : 'AI overview generation failed.',
      });
    }
  });

  // ---- POST /api/ai/search-keywords ------------------------------------------
  fastify.post<{ Body: { query: string; provider?: string } }>('/api/ai/search-keywords', async (req, reply) => {
    const { query, provider: bodyProvider } = req.body ?? {};

    if (!query || typeof query !== 'string') {
      await reply.code(400).send({
        error: 'invalid_request',
        message: 'Request body must include "query".',
      });
      return;
    }

    // Use server-configured provider, fallback to body-specified provider
    const providerName = aiProvider !== 'disabled' ? aiProvider : (bodyProvider ?? 'disabled');

    const searchProvider = createProvider(
      providerName,
      aiKey,
      providerName === 'ollama' ? { ollamaModel: ollamaModel ?? 'codellama' } : undefined,
    );
    if (!searchProvider.isConfigured()) {
      await reply.code(400).send({
        error: 'ai_not_configured',
        message: 'No AI provider configured. Set in .codeatlas.json or use --ai-key flag.',
      });
      return;
    }

    const prompt = `Extract code-relevant keywords from the following natural language query.
Return ONLY a JSON array of strings (max 10 keywords).
Keywords should include: file names, function names, module names, technical concepts.

Query: "${query}"

Response format: ["keyword1", "keyword2", ...]`;

    try {
      const aiResponse = await searchProvider.summarize(prompt, {
        filePath: 'search-keywords',
        language: 'text',
        imports: [],
        exports: [],
      });

      let keywords: string[];
      try {
        // Try to extract JSON array from AI response using regex
        const match = /\[.*\]/s.exec(aiResponse);
        if (match) {
          keywords = JSON.parse(match[0]) as string[];
        } else {
          keywords = JSON.parse(aiResponse) as string[];
        }
        // Ensure result is an array of strings
        if (!Array.isArray(keywords)) {
          throw new Error('Parsed value is not an array');
        }
        keywords = keywords.filter((k) => typeof k === 'string').slice(0, 10);
      } catch {
        // Fallback: split query by whitespace
        keywords = query.split(/\s+/).filter((k) => k.length > 0);
      }

      await reply.send({ keywords, originalQuery: query });
    } catch (err) {
      await reply.code(500).send({
        error: 'ai_search_keywords_failed',
        message: err instanceof Error ? err.message : 'AI keyword extraction failed.',
      });
    }
  });

  // ---- SPA Fallback -----------------------------------------------------------
  // All non-API routes serve index.html for client-side routing
  fastify.setNotFoundHandler(async (req, reply) => {
    if (req.url.startsWith('/api/')) {
      await reply.code(404).send({
        error: 'not_found',
        message: `API endpoint not found: ${req.method} ${req.url}`,
      });
      return;
    }
    // SPA fallback — serve index.html
    await reply.sendFile('index.html');
  });

  // ---- Start -----------------------------------------------------------------
  await fastify.listen({ port, host: '127.0.0.1' });
}
