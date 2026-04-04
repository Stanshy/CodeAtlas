/**
 * CodeAtlas — Layout Router
 *
 * Extensible layout engine registry and routing function.
 * Sprint 11 — T4.
 *
 * Usage:
 *   import { computeLayout, registerLayout } from './layout-router';
 *   registerLayout(myLayoutProvider);
 *   const output = computeLayout('dagre-hierarchical', { nodes, edges });
 */

import type { Node, Edge } from '@xyflow/react';
import type { LayoutEngine } from '../types/graph';
import type { NeonNodeData } from './graph-adapter';
import type { NeonEdgeData } from './graph-adapter';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface LayoutInput {
  nodes: Node<NeonNodeData>[];
  edges: Edge<NeonEdgeData>[];
}

export interface LayoutOutput {
  nodes: Node<NeonNodeData>[];  // with positions set
  edges: Edge<NeonEdgeData>[];
}

export interface LayoutProvider {
  name: LayoutEngine;
  compute(input: LayoutInput): LayoutOutput;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const LAYOUT_PROVIDERS: Map<string, LayoutProvider> = new Map();

/**
 * Register a layout provider. Call this during module initialization.
 */
export function registerLayout(provider: LayoutProvider): void {
  LAYOUT_PROVIDERS.set(provider.name, provider);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/**
 * Compute layout using the named engine.
 * Falls back to force-directed (passthrough) if the engine is unknown or throws.
 */
export function computeLayout(engine: LayoutEngine, input: LayoutInput): LayoutOutput {
  const provider = LAYOUT_PROVIDERS.get(engine);

  if (!provider) {
    console.warn(`[layout-router] Layout engine "${engine}" not registered, falling back to force-directed`);
    return fallbackLayout(input);
  }

  try {
    return provider.compute(input);
  } catch (error) {
    console.warn(`[layout-router] Layout engine "${engine}" failed, falling back to force-directed`, error);
    return fallbackLayout(input);
  }
}

/**
 * Passthrough fallback: return nodes/edges as-is (force-directed handles positioning).
 */
function fallbackLayout(input: LayoutInput): LayoutOutput {
  const fdProvider = LAYOUT_PROVIDERS.get('force-directed');
  if (fdProvider) {
    try {
      return fdProvider.compute(input);
    } catch {
      // If even force-directed fails, just pass through
    }
  }
  return { nodes: input.nodes, edges: input.edges };
}
