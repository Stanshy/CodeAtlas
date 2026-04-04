/**
 * CodeAtlas — PerspectiveHint
 *
 * Shared hint overlay shown in the center of the canvas when no node is
 * selected. Guides the user to interact with the current perspective.
 *
 * Sprint 12 — T6 (logic-operation), T7 (data-journey).
 */

import React from 'react';
import { THEME } from '../styles/theme';

export interface PerspectiveHintProps {
  type: 'logic-operation' | 'data-journey';
  visible: boolean;
}

export function PerspectiveHint({ type, visible }: PerspectiveHintProps) {
  if (type === 'data-journey') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s',
          zIndex: 10,
        }}
        aria-hidden="true"
      >
        <div
          style={{
            background: '#ffffff',
            border: `2px dashed ${THEME.djBorder}`,
            borderRadius: THEME.radiusLg,
            padding: '28px 40px',
            textAlign: 'center',
            maxWidth: 340,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: THEME.djBorder,
              marginBottom: 6,
              fontFamily: THEME.fontUi,
            }}
          >
            選擇資料入口開始追蹤
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.inkMuted,
              fontFamily: THEME.fontUi,
              lineHeight: 1.6,
            }}
          >
            點擊綠色框入口節點
            <br />
            觀察資料如何逐步流動
          </div>
        </div>
      </div>
    );
  }

  // logic-operation variant
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s',
        zIndex: 10,
      }}
    >
      {/* Dashed circle icon */}
      <div
        style={{
          width: 40,
          height: 40,
          border: `2px dashed ${THEME.inkFaint}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      />
      {/* Primary title */}
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: THEME.inkSecondary,
          letterSpacing: '-0.5px',
          fontFamily: THEME.fontUi,
        }}
      >
        點擊任一方法查看呼叫鏈
      </div>
      {/* Sub text */}
      <div
        style={{
          fontSize: 14,
          color: THEME.inkMuted,
          marginTop: 6,
          fontFamily: THEME.fontUi,
        }}
      >
        ★ 為推薦入口
      </div>
    </div>
  );
}
