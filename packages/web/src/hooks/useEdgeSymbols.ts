/**
 * CodeAtlas — useEdgeSymbols Hook
 *
 * Formats imported symbols for edge label display.
 * Pure computation hook — no side effects, no context dependencies.
 * Used by EdgeSymbolLabel (2D) and available for future renderers.
 *
 * Sprint 5 — T3/T4: Edge Symbol Labels
 * Design: .knowledge/sprint5-dataflow-architecture.md §5.1
 */

import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EdgeSymbolsResult {
  /** Formatted symbol text e.g. "UserService, AuthMiddleware, +3 more" (null when 0 symbols) */
  label: string | null;
  /** Symbols shown in the label (up to 3) */
  symbols: string[];
  /** Full symbol list (used when clicking to start tracing) */
  allSymbols: string[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Formats edge importedSymbols for display:
 * - 0 symbols  → null (do not render label)
 * - 1–3 symbols → comma-separated
 * - >3 symbols  → first 3 + "+N more"
 */
export function useEdgeSymbols(importedSymbols: string[] | undefined): EdgeSymbolsResult {
  return useMemo(() => {
    const allSymbols = importedSymbols ?? [];

    if (allSymbols.length === 0) {
      return { label: null, symbols: [], allSymbols: [] };
    }

    const symbols = allSymbols.slice(0, 3);

    let label: string;
    if (allSymbols.length <= 3) {
      label = symbols.join(', ');
    } else {
      const remainder = allSymbols.length - 3;
      label = `${symbols.join(', ')}, +${remainder} more`;
    }

    return { label, symbols, allSymbols };
  }, [importedSymbols]);
}
