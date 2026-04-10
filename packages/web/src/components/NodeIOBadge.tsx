/**
 * CodeAtlas — NodeIOBadge Component
 *
 * Overlay badge displayed on 2D graph nodes showing import/export counts.
 *   Left side:  ↓{importCount}  (files importing this node)
 *   Right side: ↑{exportCount}  (symbols exported from this node)
 *
 * Rules:
 *   - importCount=0 AND exportCount=0 → returns null (nothing rendered)
 *   - count > 99 → displays "99+"
 *   - all colour values from theme.ts ioBadge (no hard-coding)
 *
 * Sprint 5 — T6: 節點 I/O 標記
 * Design: .knowledge/sprint5-dataflow-architecture.md §9 ioBadge
 */

import { memo, type CSSProperties } from 'react';
import { ioBadge } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface NodeIOBadgeProps {
  importCount: number;
  exportCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cap display value at 99, show "99+" for anything larger */
function formatCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

// ---------------------------------------------------------------------------
// Shared badge styles
// ---------------------------------------------------------------------------

const badgeBase: CSSProperties = {
  background: ioBadge.background,
  fontSize: ioBadge.fontSize,
  padding: ioBadge.padding,
  borderRadius: ioBadge.borderRadius,
  color: ioBadge.textColor,
  lineHeight: 1,
  whiteSpace: 'nowrap',
  userSelect: 'none',
  pointerEvents: 'none',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function NodeIOBadgeInner({ importCount, exportCount }: NodeIOBadgeProps) {
  // Nothing to show when both counts are zero
  if (importCount === 0 && exportCount === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '-14px',
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {/* Import count — left side */}
      {importCount > 0 && (
        <span
          style={{
            ...badgeBase,
            color: ioBadge.importColor,
          }}
        >
          {'\u2193'}{formatCount(importCount)}
        </span>
      )}

      {/* Spacer when only one badge is shown */}
      {importCount === 0 && <span />}

      {/* Export count — right side */}
      {exportCount > 0 && (
        <span
          style={{
            ...badgeBase,
            color: ioBadge.exportColor,
          }}
        >
          {'\u2191'}{formatCount(exportCount)}
        </span>
      )}

      {exportCount === 0 && <span />}
    </div>
  );
}

export const NodeIOBadge = memo(NodeIOBadgeInner);
