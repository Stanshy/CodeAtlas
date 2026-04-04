/**
 * CodeAtlas — EdgeSymbolLabel Component
 *
 * 2D edge symbol label rendered via React Flow EdgeLabelRenderer.
 * Shows imported symbol names at the edge midpoint on hover.
 * Each symbol name is clickable to start path tracing.
 *
 * Sprint 5 — T3: Edge Symbol Labels (2D)
 * Design: .knowledge/sprint5-dataflow-architecture.md §6.1
 */

import { memo } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import { edgeLabel } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EdgeSymbolLabelProps {
  /** Midpoint X in React Flow viewport coordinates (px) */
  labelX: number;
  /** Midpoint Y in React Flow viewport coordinates (px) */
  labelY: number;
  /** Symbols to display (up to 3 rendered inline, rest as "+N more") */
  symbols: string[];
  /** Full symbol list — used to show the overflow count */
  allSymbols: string[];
  /** Called when user clicks a symbol name */
  onSymbolClick: (symbol: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EdgeSymbolLabelInner({
  labelX,
  labelY,
  symbols,
  allSymbols,
  onSymbolClick,
}: EdgeSymbolLabelProps) {
  const overflowCount = allSymbols.length - symbols.length;

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          transform: `translate(-50%, calc(-100% - 8px)) translate(${labelX}px, ${labelY}px)`,
          pointerEvents: 'all',
          background: edgeLabel.background,
          color: edgeLabel.textColor,
          fontSize: edgeLabel.fontSize,
          padding: edgeLabel.padding,
          borderRadius: edgeLabel.borderRadius,
          border: edgeLabel.border,
          maxWidth: `${edgeLabel.maxWidth}px`,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          // Prevent React Flow from intercepting clicks inside the label
          zIndex: 10,
        }}
        // Prevent edge deselection when clicking inside the label
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {symbols.map((symbol) => (
          <span
            key={symbol}
            onClick={() => onSymbolClick(symbol)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSymbolClick(symbol);
              }
            }}
            style={{
              cursor: 'pointer',
              textDecoration: 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: '2px',
            }}
            aria-label={`Trace symbol ${symbol}`}
          >
            {symbol}
          </span>
        ))}
        {overflowCount > 0 && (
          <span
            style={{
              opacity: 0.65,
              fontStyle: 'italic',
            }}
          >
            +{overflowCount} more
          </span>
        )}
      </div>
    </EdgeLabelRenderer>
  );
}

export const EdgeSymbolLabel = memo(EdgeSymbolLabelInner);
