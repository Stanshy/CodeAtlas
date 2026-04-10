/**
 * Search logic tests
 *
 * Tests the search filtering algorithm used by useSearch hook.
 * We test the pure filtering logic extracted from the hook.
 */

import { describe, it, expect } from 'vitest';
import type { Node } from '@xyflow/react';
import type { NeonNodeData } from '../src/adapters/graph-adapter';

// Extract the search matching logic (mirrors useSearch.ts)
function filterNodes(
  nodes: Node<NeonNodeData>[],
  query: string,
  maxResults: number = 10,
) {
  if (!query.trim()) return [];

  const q = query.toLowerCase();
  const matched: Array<{ id: string; label: string; filePath: string; nodeType: string }> = [];

  for (const node of nodes) {
    const data = node.data;
    if (!data) continue;

    const label = (data.label ?? '').toLowerCase();
    const filePath = (data.filePath ?? '').toLowerCase();

    if (label.includes(q) || filePath.includes(q)) {
      matched.push({
        id: node.id,
        label: data.label ?? node.id,
        filePath: data.filePath ?? node.id,
        nodeType: data.nodeType ?? 'file',
      });
    }

    if (matched.length >= maxResults) break;
  }

  return matched;
}

function makeNode(id: string, label: string, filePath: string, nodeType: 'file' | 'directory' = 'file'): Node<NeonNodeData> {
  return {
    id,
    type: 'neonNode',
    position: { x: 0, y: 0 },
    data: { label, filePath, nodeType, metadata: {} },
  };
}

const nodes: Node<NeonNodeData>[] = [
  makeNode('src/App.tsx', 'App.tsx', 'src/App.tsx'),
  makeNode('src/utils/helper.ts', 'helper.ts', 'src/utils/helper.ts'),
  makeNode('src/components/Button.tsx', 'Button.tsx', 'src/components/Button.tsx'),
  makeNode('src/index.ts', 'index.ts', 'src/index.ts'),
  makeNode('src', 'src', 'src', 'directory'),
];

describe('search filtering', () => {
  it('matches by label (partial)', () => {
    const results = filterNodes(nodes, 'app');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('src/App.tsx');
  });

  it('is case insensitive', () => {
    const results = filterNodes(nodes, 'APP');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('src/App.tsx');
  });

  it('matches by filePath', () => {
    const results = filterNodes(nodes, 'utils');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('src/utils/helper.ts');
  });

  it('returns empty for empty query', () => {
    expect(filterNodes(nodes, '')).toEqual([]);
    expect(filterNodes(nodes, '   ')).toEqual([]);
  });

  it('returns empty for no matches', () => {
    expect(filterNodes(nodes, 'zzzzz')).toEqual([]);
  });

  it('limits results to maxResults', () => {
    const manyNodes = Array.from({ length: 20 }, (_, i) =>
      makeNode(`file${i}.ts`, `file${i}.ts`, `src/file${i}.ts`),
    );
    const results = filterNodes(manyNodes, 'file', 5);
    expect(results).toHaveLength(5);
  });

  it('matches multiple results', () => {
    const results = filterNodes(nodes, '.tsx');
    expect(results).toHaveLength(2); // App.tsx, Button.tsx
  });

  it('matches directory nodes', () => {
    const results = filterNodes(nodes, 'src');
    // Should match: 'src' directory + all files in src/
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('returns correct nodeType', () => {
    const results = filterNodes(nodes, 'src');
    const dirResult = results.find((r) => r.id === 'src');
    expect(dirResult?.nodeType).toBe('directory');
  });
});
