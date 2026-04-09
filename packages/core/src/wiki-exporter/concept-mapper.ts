/**
 * @codeatlas/core — Wiki Concept Mapper
 *
 * Maps AI-extracted knowledge concepts (ExtractedConcept[]) to WikiNode[].
 * Replaces the old page-generator.ts which mapped code-structure artifacts
 * (files, modules, endpoints, methods) to wiki nodes.
 *
 * Each ExtractedConcept becomes exactly one WikiNode with a flat mdPath
 * under concepts/. Edge targetIds use the canonical "concept:{slug}"
 * format and are resolved by the slug registry in the export pipeline.
 *
 * Canonical ID rules:
 *   concept:{slug}  — all lowercase (e.g. "concept:authentication-system")
 *
 * mdPath rules:
 *   concepts/{slug}.md  — flat, no subdirectories by type
 *
 * Sprint 19 correction: AI-extracted concept mapping
 */

import type { ExtractedConcept, WikiNode, WikiEdge } from './types.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map an array of AI-extracted concepts to WikiNode[].
 *
 * Edge cases handled:
 *   - Empty concepts array → returns []
 *   - Concepts with no edges → returns node with edges: []
 *   - Concepts with no sourceFiles → returns node with sourceFiles: []
 *   - Edges with missing target or type are silently filtered out
 *
 * @param concepts  Raw concepts produced by the AI concept-extraction phase.
 * @returns         Flat WikiNode[] ready for slug registration and link resolution.
 */
export function mapConceptsToNodes(concepts: ExtractedConcept[]): WikiNode[] {
  if (concepts.length === 0) {
    return [];
  }

  return concepts.map((concept) => {
    const id = `concept:${concept.slug}`.toLowerCase();

    // Map concept edges to WikiEdge[], filtering out malformed entries
    const edges: WikiEdge[] = concept.edges
      .filter((e) => e.target.trim().length > 0 && e.type)
      .map((e) => {
        const edge: WikiEdge = {
          type: e.type,
          targetId: `concept:${e.target}`.toLowerCase(),
          targetSlug: e.target, // resolved by slug registry in export pipeline
        };
        if (e.label !== undefined) {
          edge.label = e.label;
        }
        return edge;
      });

    return {
      id,
      slug: concept.slug,
      type: concept.type,
      displayName: concept.name,
      summary: concept.summary,
      sourceFiles: concept.sourceFiles,
      edges,
      mdPath: `concepts/${concept.slug}.md`,
    };
  });
}
