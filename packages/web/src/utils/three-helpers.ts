/**
 * CodeAtlas — Three.js Helper Utilities
 *
 * Pure helper functions extracted from Graph3DCanvas for testability.
 * No UI, no React, no Three.js imports — pure transformations only.
 *
 * Sprint 4 — T9: Unit + Integration Tests
 */

import type { NodeObject } from '3d-force-graph';

// ---------------------------------------------------------------------------
// hexToRgba
// ---------------------------------------------------------------------------

/**
 * Convert a CSS hex colour (#rrggbb) and an alpha value to an rgba() string.
 * Used for 3d-force-graph linkColor which accepts colour strings.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// resolveLinkEndId
// ---------------------------------------------------------------------------

/**
 * Resolve a 3d-force-graph link endpoint to a plain string id.
 * After simulation resolves, source/target may be a NodeObject instead of string.
 */
export function resolveLinkEndId(endpoint: NodeObject | string | number | undefined): string {
  if (typeof endpoint === 'string') return endpoint;
  if (typeof endpoint === 'number') return String(endpoint);
  if (endpoint && typeof endpoint === 'object') {
    const n = endpoint as NodeObject;
    return n.id !== undefined ? String(n.id) : '';
  }
  return '';
}
