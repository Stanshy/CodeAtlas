/**
 * Unit tests for wiki-exporter/concept-mapper.ts
 *
 * Coverage:
 *   - Maps valid ExtractedConcept[] to WikiNode[]
 *   - Empty array returns []
 *   - Canonical ID format is "concept:{slug}" lowercase
 *   - Edge mapping with labels preserved
 *   - Edges with empty target are filtered out
 *   - mdPath format is "concepts/{slug}.md"
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import { mapConceptsToNodes } from '../../src/wiki-exporter/concept-mapper.js';
import type { ExtractedConcept } from '../../src/wiki-exporter/types.js';

// ---------------------------------------------------------------------------
// Fixture factories
// ---------------------------------------------------------------------------

function makeConcept(overrides: Partial<ExtractedConcept> = {}): ExtractedConcept {
  return {
    name: '認證機制',
    slug: 'authentication-system',
    type: 'feature',
    summary: '處理使用者認證的核心機制',
    sourceFiles: ['src/auth/service.ts'],
    relatedConcepts: [],
    edges: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// mapConceptsToNodes — basic mapping
// ---------------------------------------------------------------------------

describe('mapConceptsToNodes — basic mapping', () => {
  it('returns an empty array when given an empty concepts array', () => {
    const result = mapConceptsToNodes([]);
    expect(result).toEqual([]);
  });

  it('maps a single concept to a single WikiNode', () => {
    const concept = makeConcept();
    const nodes = mapConceptsToNodes([concept]);
    expect(nodes).toHaveLength(1);
  });

  it('maps multiple concepts to the same number of WikiNodes', () => {
    const concepts = [
      makeConcept({ slug: 'auth', name: '認證' }),
      makeConcept({ slug: 'jwt', name: 'JWT' }),
      makeConcept({ slug: 'session', name: 'Session' }),
    ];
    const nodes = mapConceptsToNodes(concepts);
    expect(nodes).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// mapConceptsToNodes — canonical ID format
// ---------------------------------------------------------------------------

describe('mapConceptsToNodes — canonical ID format', () => {
  it('produces a canonical id with "concept:" prefix', () => {
    const concept = makeConcept({ slug: 'authentication-system' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.id.startsWith('concept:')).toBe(true);
  });

  it('produces a lowercase canonical id', () => {
    const concept = makeConcept({ slug: 'Authentication-System' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.id).toBe(node.id.toLowerCase());
    expect(node.id).toBe('concept:authentication-system');
  });

  it('does not modify the slug casing', () => {
    const concept = makeConcept({ slug: 'authentication-system' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.slug).toBe('authentication-system');
  });
});

// ---------------------------------------------------------------------------
// mapConceptsToNodes — mdPath format
// ---------------------------------------------------------------------------

describe('mapConceptsToNodes — mdPath format', () => {
  it('generates mdPath as "concepts/{slug}.md"', () => {
    const concept = makeConcept({ slug: 'authentication-system' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.mdPath).toBe('concepts/authentication-system.md');
  });

  it('uses the original slug in the mdPath (not lowercased)', () => {
    const concept = makeConcept({ slug: 'jwt-token' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.mdPath).toBe('concepts/jwt-token.md');
  });
});

// ---------------------------------------------------------------------------
// mapConceptsToNodes — field mapping
// ---------------------------------------------------------------------------

describe('mapConceptsToNodes — field mapping', () => {
  it('maps concept.name to node.displayName', () => {
    const concept = makeConcept({ name: '認證機制' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.displayName).toBe('認證機制');
  });

  it('maps concept.summary to node.summary', () => {
    const concept = makeConcept({ summary: '處理 JWT 驗證流程' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.summary).toBe('處理 JWT 驗證流程');
  });

  it('maps concept.type to node.type', () => {
    const concept = makeConcept({ type: 'pattern' });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.type).toBe('pattern');
  });

  it('maps concept.sourceFiles to node.sourceFiles', () => {
    const concept = makeConcept({ sourceFiles: ['src/auth/service.ts', 'src/auth/jwt.ts'] });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.sourceFiles).toEqual(['src/auth/service.ts', 'src/auth/jwt.ts']);
  });

  it('produces an empty sourceFiles array when concept has no sourceFiles', () => {
    const concept = makeConcept({ sourceFiles: [] });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.sourceFiles).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// mapConceptsToNodes — edge mapping
// ---------------------------------------------------------------------------

describe('mapConceptsToNodes — edge mapping', () => {
  it('produces empty edges when concept has no edges', () => {
    const concept = makeConcept({ edges: [] });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges).toHaveLength(0);
  });

  it('maps each concept edge to a WikiEdge', () => {
    const concept = makeConcept({
      edges: [
        { target: 'jwt-token', type: 'implements', label: '實作認證' },
      ],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges).toHaveLength(1);
  });

  it('sets edge targetId as "concept:{target}" lowercase', () => {
    const concept = makeConcept({
      edges: [{ target: 'jwt-token', type: 'implements' }],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges[0].targetId).toBe('concept:jwt-token');
  });

  it('preserves edge label when provided', () => {
    const concept = makeConcept({
      edges: [{ target: 'jwt-token', type: 'implements', label: '實作認證' }],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges[0].label).toBe('實作認證');
  });

  it('omits edge label when not provided', () => {
    const concept = makeConcept({
      edges: [{ target: 'jwt-token', type: 'implements' }],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges[0].label).toBeUndefined();
  });

  it('maps edge type correctly', () => {
    const concept = makeConcept({
      edges: [{ target: 'session-management', type: 'depends' }],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges[0].type).toBe('depends');
  });

  it('filters out edges with empty target strings', () => {
    const concept = makeConcept({
      edges: [
        { target: '', type: 'relates' },
        { target: '   ', type: 'depends' },
        { target: 'valid-target', type: 'uses' },
      ],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges).toHaveLength(1);
    expect(node.edges[0].targetId).toBe('concept:valid-target');
  });

  it('handles multiple edges correctly', () => {
    const concept = makeConcept({
      edges: [
        { target: 'jwt-token', type: 'implements', label: '實作' },
        { target: 'session', type: 'relates' },
        { target: 'oauth', type: 'extends' },
      ],
    });
    const [node] = mapConceptsToNodes([concept]);
    expect(node.edges).toHaveLength(3);
  });
});
