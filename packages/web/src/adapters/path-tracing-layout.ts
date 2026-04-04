/**
 * CodeAtlas — Path Tracing Layout Provider + Force-Directed Passthrough
 *
 * Sprint 11 — T7.
 *
 * pathTracingLayoutProvider: passthrough layout — actual path animation
 * is handled by useStaggerAnimation hook and E2EPanel.
 *
 * forceDirectedLayoutProvider: passthrough layout — D3 force simulation
 * is handled by useForceLayout hook.
 */

import type { LayoutProvider, LayoutInput, LayoutOutput } from './layout-router';

/**
 * Force-directed: passthrough — D3 useForceLayout handles actual positions.
 */
export const forceDirectedLayoutProvider: LayoutProvider = {
  name: 'force-directed',
  compute(input: LayoutInput): LayoutOutput {
    // React Flow + useForceLayout handles node positions
    return { nodes: input.nodes, edges: input.edges };
  },
};

/**
 * Path-tracing: passthrough — stagger animation locked path is
 * managed by useStaggerAnimation hook, not layout computation.
 */
export const pathTracingLayoutProvider: LayoutProvider = {
  name: 'path-tracing',
  compute(input: LayoutInput): LayoutOutput {
    // useStaggerAnimation hook controls visible nodes and edges
    return { nodes: input.nodes, edges: input.edges };
  },
};
