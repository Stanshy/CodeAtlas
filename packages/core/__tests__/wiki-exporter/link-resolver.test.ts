/**
 * Unit tests for wiki-exporter/link-resolver.ts
 *
 * Coverage:
 *   - Formats wiki-link correctly: [[slug|displayName]]
 *   - Skips edges with unresolved targets (zero dead links)
 *   - Groups links by edge type (relates/depends/implements/extends/uses)
 *   - Uses edge.label for display name when available
 *
 * Sprint 19 — T17: Testing and Regression
 */

import { describe, it, expect } from 'vitest';
import { resolveLinks, formatWikiLink } from '../../src/wiki-exporter/link-resolver.js';
import { SlugRegistry } from '../../src/wiki-exporter/slug-registry.js';
import type { WikiNode, WikiEdge } from '../../src/wiki-exporter/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEdge(
  targetId: string,
  type: WikiEdge['type'],
  label?: string,
): WikiEdge {
  return { type, targetId, targetSlug: '', label };
}

function makeWikiNode(id: string, edges: WikiEdge[] = []): WikiNode {
  return {
    id,
    slug: id.replace(/[:/]/g, '--'),
    type: 'feature',
    displayName: 'test-node',
    summary: 'A test knowledge node',
    sourceFiles: ['src/test.ts'],
    edges,
    mdPath: `concepts/${id}.md`,
  };
}

function makeRegistryWithEntry(canonicalId: string, slug: string): SlugRegistry {
  const registry = new SlugRegistry();
  registry.register(canonicalId, slug, 'feature', 'display');
  return registry;
}

// ---------------------------------------------------------------------------
// formatWikiLink tests
// ---------------------------------------------------------------------------

describe('formatWikiLink', () => {
  it('formats a resolved edge as [[slug|displayName]]', () => {
    const registry = makeRegistryWithEntry('concept:authentication-system', 'authentication-system');
    const edge = makeEdge('concept:authentication-system', 'relates');

    const result = formatWikiLink(edge, registry);

    expect(result).not.toBeNull();
    expect(result!.wikiLink).toBe('[[authentication-system|authentication-system]]');
  });

  it('uses edge.label as display name when label is provided', () => {
    const registry = makeRegistryWithEntry('concept:authentication-system', 'authentication-system');
    const edge = makeEdge('concept:authentication-system', 'implements', '實作認證');

    const result = formatWikiLink(edge, registry);

    expect(result!.wikiLink).toBe('[[authentication-system|實作認證]]');
    expect(result!.displayName).toBe('實作認證');
  });

  it('falls back to slug as display name when label is undefined', () => {
    const registry = makeRegistryWithEntry('concept:jwt-token', 'jwt-token');
    const edge = makeEdge('concept:jwt-token', 'depends');

    const result = formatWikiLink(edge, registry);

    expect(result!.displayName).toBe('jwt-token');
  });

  it('returns null when the target ID is not registered', () => {
    const registry = new SlugRegistry();
    const edge = makeEdge('concept:missing-concept', 'relates');

    const result = formatWikiLink(edge, registry);

    expect(result).toBeNull();
  });

  it('returns the correct edgeType in the resolved link', () => {
    const registry = makeRegistryWithEntry('concept:authentication-system', 'authentication-system');
    const edge = makeEdge('concept:authentication-system', 'depends');

    const result = formatWikiLink(edge, registry);

    expect(result!.edgeType).toBe('depends');
  });

  it('returns correct edgeType for implements', () => {
    const registry = makeRegistryWithEntry('concept:pattern', 'pattern');
    const edge = makeEdge('concept:pattern', 'implements');

    const result = formatWikiLink(edge, registry);

    expect(result!.edgeType).toBe('implements');
  });

  it('returns correct edgeType for extends', () => {
    const registry = makeRegistryWithEntry('concept:base', 'base');
    const edge = makeEdge('concept:base', 'extends');

    const result = formatWikiLink(edge, registry);

    expect(result!.edgeType).toBe('extends');
  });

  it('returns correct edgeType for uses', () => {
    const registry = makeRegistryWithEntry('concept:util', 'util');
    const edge = makeEdge('concept:util', 'uses');

    const result = formatWikiLink(edge, registry);

    expect(result!.edgeType).toBe('uses');
  });
});

// ---------------------------------------------------------------------------
// resolveLinks tests
// ---------------------------------------------------------------------------

describe('resolveLinks', () => {
  it('produces a NodeLinks entry for every input node', () => {
    const registry = new SlugRegistry();
    const nodes = [
      makeWikiNode('concept:auth'),
      makeWikiNode('concept:jwt'),
    ];

    const result = resolveLinks(nodes, registry);

    expect(result.size).toBe(2);
    expect(result.has('concept:auth')).toBe(true);
    expect(result.has('concept:jwt')).toBe(true);
  });

  it('skips edges whose target is not registered (zero dead links)', () => {
    const registry = new SlugRegistry();
    const edges = [makeEdge('concept:missing', 'relates')];
    const nodes = [makeWikiNode('concept:auth', edges)];

    const result = resolveLinks(nodes, registry);
    const nodeLinks = result.get('concept:auth')!;

    expect(nodeLinks.relates).toHaveLength(0);
    expect(nodeLinks.all).toHaveLength(0);
  });

  it('groups resolved links by edge type (relates)', () => {
    const registry = new SlugRegistry();
    registry.register('concept:jwt', 'jwt-token', 'pattern', 'JWT Token');
    registry.register('concept:session', 'session-management', 'feature', 'Session');
    registry.register('concept:middleware', 'middleware-chain', 'pattern', 'Middleware');

    const edges: WikiEdge[] = [
      makeEdge('concept:jwt', 'relates'),
      makeEdge('concept:session', 'depends'),
      makeEdge('concept:middleware', 'implements'),
    ];
    const nodes = [makeWikiNode('concept:auth', edges)];

    const result = resolveLinks(nodes, registry);
    const nodeLinks = result.get('concept:auth')!;

    expect(nodeLinks.relates).toHaveLength(1);
    expect(nodeLinks.depends).toHaveLength(1);
    expect(nodeLinks.implements).toHaveLength(1);
    expect(nodeLinks.all).toHaveLength(3);
  });

  it('groups resolved links by extends and uses edge types', () => {
    const registry = new SlugRegistry();
    registry.register('concept:base', 'base-concept', 'architecture', 'Base');
    registry.register('concept:util', 'utility', 'concept', 'Util');

    const edges: WikiEdge[] = [
      makeEdge('concept:base', 'extends'),
      makeEdge('concept:util', 'uses'),
    ];
    const nodes = [makeWikiNode('concept:auth', edges)];

    const result = resolveLinks(nodes, registry);
    const nodeLinks = result.get('concept:auth')!;

    expect(nodeLinks.extends).toHaveLength(1);
    expect(nodeLinks.uses).toHaveLength(1);
    expect(nodeLinks.all).toHaveLength(2);
  });

  it('populates the all array as a flat union of all grouped links', () => {
    const registry = new SlugRegistry();
    registry.register('concept:jwt', 'jwt-token', 'pattern', 'JWT Token');
    registry.register('concept:session', 'session', 'feature', 'Session');

    const edges: WikiEdge[] = [
      makeEdge('concept:jwt', 'relates'),
      makeEdge('concept:session', 'relates'),
    ];
    const nodes = [makeWikiNode('concept:auth', edges)];

    const result = resolveLinks(nodes, registry);
    const nodeLinks = result.get('concept:auth')!;

    expect(nodeLinks.all).toHaveLength(2);
    expect(nodeLinks.all.every((l) => l.edgeType === 'relates')).toBe(true);
  });

  it('produces NodeLinks with empty buckets when node has no edges', () => {
    const registry = new SlugRegistry();
    const nodes = [makeWikiNode('concept:auth', [])];

    const result = resolveLinks(nodes, registry);
    const nodeLinks = result.get('concept:auth')!;

    expect(nodeLinks.relates).toHaveLength(0);
    expect(nodeLinks.depends).toHaveLength(0);
    expect(nodeLinks.implements).toHaveLength(0);
    expect(nodeLinks.extends).toHaveLength(0);
    expect(nodeLinks.uses).toHaveLength(0);
    expect(nodeLinks.all).toHaveLength(0);
  });
});
