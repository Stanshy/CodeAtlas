/**
 * CodeAtlas — ChainInfoPanel
 *
 * Bottom panel displayed in Logic Operation perspective after a node is clicked.
 * Shows the selected chain name, node count, and a reset button.
 *
 * Sprint 12 — T6.
 */

import React, { useState } from 'react';
import { THEME } from '../styles/theme';

export interface ChainInfoPanelProps {
  visible: boolean;
  chainLabel: string;
  chainNodeCount: number;
  onReset: () => void;
}

export function ChainInfoPanel({
  visible,
  chainLabel,
  chainNodeCount,
  onReset,
}: ChainInfoPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#ffffff',
        border: `1.5px solid ${THEME.borderDefault}`,
        borderRadius: THEME.radiusMd,
        padding: '10px 20px',
        boxShadow: THEME.shadowHover,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 13,
        color: THEME.inkSecondary,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
        pointerEvents: visible ? 'auto' : 'none',
        whiteSpace: 'nowrap',
        zIndex: 20,
        fontFamily: THEME.fontUi,
      }}
    >
      {/* Chain name */}
      <span
        style={{
          fontWeight: 600,
          color: THEME.inkPrimary,
        }}
      >
        {chainLabel}
      </span>
      {/* Node count */}
      <span style={{ color: THEME.inkMuted }}>
        {chainNodeCount} 個節點
      </span>
      {/* Reset button */}
      <button
        onClick={onReset}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          background: isHovered ? '#e8e8ef' : THEME.bgGrid,
          border: `1px solid ${THEME.borderDefault}`,
          borderRadius: 4,
          padding: '3px 10px',
          fontSize: 12,
          cursor: 'pointer',
          color: THEME.inkSecondary,
          fontFamily: THEME.fontUi,
          pointerEvents: 'auto',
          transition: 'background 0.15s',
        }}
      >
        清除選取
      </button>
    </div>
  );
}
