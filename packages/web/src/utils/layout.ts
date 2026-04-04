/**
 * CodeAtlas — Layout Utilities
 *
 * Node layering logic: zoom level controls node visibility granularity.
 * - Level 1 (zoom < threshold): show only directory nodes
 * - Level 2 (zoom >= threshold): show all nodes (directories + files)
 *
 * Edge case: flat projects (no directories) always show all files.
 */

import type { Node } from '@xyflow/react';
import type { NeonNodeData } from '../adapters/graph-adapter';

/** Zoom threshold for switching between directory and file view */
export const ZOOM_THRESHOLD = 0.5;

/** Maximum directory nesting depth to display */
export const MAX_DIRECTORY_DEPTH = 1;

export type LayerLevel = 'directory' | 'file';

/**
 * Determine current layer level based on zoom.
 */
export function getLayerLevel(zoom: number): LayerLevel {
  return zoom < ZOOM_THRESHOLD ? 'directory' : 'file';
}

/**
 * Filter nodes based on current zoom layer.
 *
 * - directory level: only show directory nodes (+ root-level files if no directories)
 * - file level: show all nodes
 *
 * Handles edge cases:
 * - Flat project (0 directory nodes) → show all files regardless of zoom
 * - Deep nesting → only show directories up to MAX_DIRECTORY_DEPTH
 */
export function filterNodesByLayer(
  nodes: Node<NeonNodeData>[],
  level: LayerLevel,
): Node<NeonNodeData>[] {
  // Check if project has any directory nodes
  const hasDirectories = nodes.some((n) => n.data.nodeType === 'directory');

  // Flat project — always show all files
  if (!hasDirectories) {
    return nodes;
  }

  // File level — show everything
  if (level === 'file') {
    return nodes;
  }

  // Directory level — show only directories (up to max depth) + root-level files
  return nodes.filter((n) => {
    if (n.data.nodeType === 'directory') {
      const depth = getDirectoryDepth(n.data.filePath);
      return depth <= MAX_DIRECTORY_DEPTH;
    }
    // Show root-level files (no parent directory)
    return !n.parentId;
  });
}

/**
 * Calculate directory depth from file path.
 * e.g. "src" → 1, "src/utils" → 2, "src/utils/helpers" → 3
 */
export function getDirectoryDepth(filePath: string): number {
  if (!filePath) return 0;
  return filePath.split('/').length;
}

/**
 * Get visible edges: only keep edges where both source and target are visible.
 */
export function filterEdgesByVisibleNodes<E extends { source: string; target: string }>(
  edges: E[],
  visibleNodeIds: Set<string>,
): E[] {
  return edges.filter((e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));
}
