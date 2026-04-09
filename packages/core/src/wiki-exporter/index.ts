/**
 * @codeatlas/core — Wiki Exporter
 *
 * Main orchestrator for the Wiki Knowledge Export pipeline.
 * Integrates AI concept extraction with slug-registry, link-resolver,
 * and md-renderer to produce a complete in-memory WikiExportResult.
 *
 * Pipeline:
 *   AnalysisResult + DirectoryGraph + EndpointGraph
 *     → buildProjectContext()             — assemble token-budgeted ProjectContext
 *     → buildConceptExtractionPrompt()    — construct AI extraction prompt
 *     → aiProvider.rawPrompt()            — call AI model
 *     → parseConceptExtractionResponse()  — parse ExtractedConcept[]
 *     → mapConceptsToNodes()              — produce flat WikiNode[]
 *     → SlugRegistry.register()           — deduplicate and finalise slugs
 *     → edge targetSlug sync              — resolve slugs, drop dead links
 *     → resolveLinks()                    — Map<nodeId, NodeLinks> for wiki-link formatting
 *     → renderMarkdown()                  — full .md string per node
 *     → WikiManifest + WikiExportResult
 *
 * Design constraints:
 *   - Near-pure function — no file I/O, no side effects beyond AI call
 *   - File writing is the responsibility of the CLI wiki command
 *   - Requires a configured AI provider; throws if provider not ready
 *   - Clarity over micro-optimisation
 *
 * Sprint 19: Wiki 知識輸出 + Obsidian 知識圖
 */

import type { AnalysisResult } from '../types.js';
import type { DirectoryGraph } from '../analyzers/directory-aggregator.js';
import type { EndpointGraph } from '../analyzers/endpoint-detector.js';
import type {
  WikiExportResult,
  WikiManifest,
  WikiExportStats,
  WikiPageMeta,
  WikiNode,
  WikiEdge,
} from './types.js';
import { BaseAnalysisProvider } from '../ai/base-analysis-provider.js';
import {
  buildProjectContext,
  buildConceptExtractionPrompt,
  parseConceptExtractionResponse,
} from './ai-prompts.js';
import { mapConceptsToNodes } from './concept-mapper.js';
import { SlugRegistry } from './slug-registry.js';
import { resolveLinks } from './link-resolver.js';
import { renderMarkdown } from './md-renderer.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WikiExportOptions {
  /** Output directory for .md files. Default: '.codeatlas/wiki' */
  outputDir?: string;
  /** Only include core methods. Default: true */
  coreMethodsOnly?: boolean;
  /** ISO timestamp override for testing. Default: new Date().toISOString() */
  generatedAt?: string;
  /** Output locale for wiki content. Default: 'en' */
  locale?: import('../types.js').Locale;
}

export interface WikiExporterInput {
  analysisResult: AnalysisResult;
  directoryGraph: DirectoryGraph | null;
  endpointGraph: EndpointGraph | null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Main wiki export orchestrator.
 * Async — calls the AI provider to extract semantic knowledge concepts.
 * Generates all data in memory; does NOT write files.
 * File I/O is handled by the CLI wiki command.
 *
 * @param input       Analysis artifacts: core graph + optional directory and endpoint graphs.
 * @param aiProvider  Configured AI provider used for concept extraction.
 * @param options     Export configuration overrides.
 * @returns           In-memory WikiExportResult ready for the CLI to write to disk.
 *
 * @throws {Error} If the AI provider is not configured.
 * @throws {Error} If the AI call fails.
 * @throws {Error} If the AI response yields no concepts.
 */
export async function exportWiki(
  input: WikiExporterInput,
  aiProvider: BaseAnalysisProvider,
  options?: WikiExportOptions,
): Promise<WikiExportResult> {
  const { analysisResult, directoryGraph, endpointGraph } = input;
  const generatedAt = options?.generatedAt ?? new Date().toISOString();

  // --- Pre-flight: verify the AI provider is ready ---
  if (!aiProvider.isConfigured()) {
    throw new Error(
      'AI provider is not configured. Wiki knowledge export requires an active AI provider.',
    );
  }

  // --- Step 1: Build ProjectContext ---
  // Assembles a token-budgeted snapshot of the project for the AI prompt.
  const context = buildProjectContext(analysisResult, directoryGraph, endpointGraph);

  // --- Step 2: Build concept extraction prompt ---
  const prompt = buildConceptExtractionPrompt(context);

  // --- Step 3: Call the AI model ---
  let rawResponse: string;
  try {
    rawResponse = await aiProvider.rawPrompt(prompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`AI concept extraction call failed: ${message}`);
  }

  // --- Step 4: Parse AI response into ExtractedConcept[] ---
  const concepts = parseConceptExtractionResponse(rawResponse);

  if (concepts.length === 0) {
    throw new Error(
      'AI concept extraction produced no concepts. The AI response may be malformed.',
    );
  }

  // --- Step 5: Map concepts to WikiNode[] ---
  const nodes: WikiNode[] = mapConceptsToNodes(concepts);

  // --- Step 6: Register slugs ---
  // SlugRegistry guarantees globally unique, filesystem-safe slugs.
  // register() may return a suffixed slug when the proposed value collides.
  const registry = new SlugRegistry();

  for (const node of nodes) {
    const finalSlug = registry.register(node.id, node.slug, node.type, node.displayName);

    // If the registry assigned a different (suffixed) slug, update node in place.
    if (finalSlug !== node.slug) {
      node.slug = finalSlug;
      // Rebuild mdPath to stay in sync with the new slug.
      node.mdPath = `concepts/${finalSlug}.md`;
    }
  }

  // --- Step 7: Populate edge targetSlugs + filter dead links ---
  // Edges whose target has no registry entry are dropped (dead link prevention).
  for (const node of nodes) {
    const liveEdges: WikiEdge[] = [];
    for (const edge of node.edges) {
      const resolvedSlug = registry.resolve(edge.targetId);
      if (resolvedSlug === undefined) {
        // Target not registered — drop the edge.
        continue;
      }
      liveEdges.push({ ...edge, targetSlug: resolvedSlug });
    }
    node.edges = liveEdges;
  }

  // --- Step 8: Resolve links ---
  // Produces a Map<nodeId, NodeLinks> with grouped, formatted [[wiki-link]] strings.
  const linksMap = resolveLinks(nodes, registry);

  // --- Step 9: Render Markdown ---
  // Collect { path, content } pairs — path is relative to the wiki root directory.
  const mdFiles: Array<{ path: string; content: string }> = [];

  for (const node of nodes) {
    const nodeLinks = linksMap.get(node.id);
    // resolveLinks guarantees every node has an entry, but guard defensively.
    if (nodeLinks === undefined) continue;

    const content = renderMarkdown(node, nodeLinks, { generatedAt });
    mdFiles.push({ path: node.mdPath, content });
  }

  // --- Step 10: Build stats ---
  const allEdges = nodes.flatMap((n) => n.edges);
  const deadLinkCount = registry.getDeadLinks(allEdges).length;
  const totalLinkCount = allEdges.length;

  // Coverage: ratio of wiki pages to total graph nodes in AnalysisResult.
  const totalGraphNodes = analysisResult.graph.nodes.length;
  const coverage = totalGraphNodes > 0 ? nodes.length / totalGraphNodes : 0;

  const stats: WikiExportStats = {
    pageCount: nodes.length,
    linkCount: totalLinkCount,
    deadLinks: deadLinkCount,
    coverage,
  };

  // --- Step 11: Build manifest ---
  // WikiPageMeta: lightweight metadata list for routing / listing (no .md content).
  const pages: WikiPageMeta[] = nodes.map((node) => ({
    slug: node.slug,
    mdPath: node.mdPath,
    type: node.type,
    displayName: node.displayName,
    sourceFiles: node.sourceFiles,
    hasAiContent: node.summary !== undefined && node.summary.trim().length > 0,
  }));

  const manifest: WikiManifest = {
    status: 'ready',
    generatedAt,
    nodes,
    edges: allEdges,
    stats,
    pages,
  };

  // --- Return WikiExportResult ---
  return { manifest, mdFiles, stats };
}

// ---------------------------------------------------------------------------
// Re-exports for external consumers
// ---------------------------------------------------------------------------

export { SlugRegistry } from './slug-registry.js';
export { mapConceptsToNodes } from './concept-mapper.js';
export { resolveLinks, formatWikiLink } from './link-resolver.js';
export { renderMarkdown } from './md-renderer.js';
export {
  buildConceptExtractionPrompt,
  parseConceptExtractionResponse,
  buildProjectContext,
  buildConceptDeepAnalysisPrompt,
  parseConceptDeepAnalysisResponse,
} from './ai-prompts.js';
export type { ResolvedLink, NodeLinks } from './link-resolver.js';
export type { RenderOptions } from './md-renderer.js';
