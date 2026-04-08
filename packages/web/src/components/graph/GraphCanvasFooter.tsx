/**
 * GraphCanvasFooter — extracted from GraphCanvas.tsx (Sprint 17 refactor)
 *
 * Renders the footer bar for all three perspectives:
 *   - SF footer (directory legend + clear button)
 *   - DJ footer (endpoint legend + clear/step info)
 *   - LO footer (category legend + back-to-groups button in chain mode)
 */

import React from 'react';
import type { EndpointChain } from '../../types/graph';
import { THEME } from '../../styles/theme';

interface GraphCanvasFooterProps {
  activePerspective: string;
  // SF
  sfSelectedNodeId: string | null;
  onSfResetSelection: () => void;
  // DJ
  hasEndpointGraph: boolean;
  djMode: 'selector' | 'playing' | 'done';
  djSelectedEndpoint: string | null;
  djSelectedChain: EndpointChain | null;
  djCurrentStep: number;
  onDjEndpointClear: () => void;
  // LO
  loMode: 'groups' | 'chain';
  loEndpointLabel: string;
  loCurrentStep: number;
  loSelectedChain: unknown[] | null;
  onLOClear: () => void;
}

export function GraphCanvasFooter({
  activePerspective,
  sfSelectedNodeId,
  onSfResetSelection,
  hasEndpointGraph,
  djMode,
  djSelectedEndpoint,
  djSelectedChain,
  djCurrentStep,
  onDjEndpointClear,
  loMode,
  loEndpointLabel,
  loCurrentStep,
  loSelectedChain,
  onLOClear,
}: GraphCanvasFooterProps) {
  const isDataJourney = activePerspective === 'data-journey';
  const isLogicOperation = activePerspective === 'logic-operation';
  const isSystemFramework = activePerspective === 'system-framework';

  const footerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 300,
    height: 44,
    background: '#ffffff',
    borderTop: `1px solid ${THEME.borderDefault}`,
    display: 'flex',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    gap: 12,
    fontFamily: THEME.fontUi,
    fontSize: 12,
    color: THEME.inkSecondary,
    zIndex: 15,
    pointerEvents: 'auto',
  };

  // System Framework footer
  if (isSystemFramework) {
    return (
      <div
        style={{
          ...footerStyle,
          paddingLeft: 20,
          paddingRight: 20,
          gap: 20,
          fontSize: 11,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: THEME.sfBorder, flexShrink: 0 }} />
          模組目錄
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 18, height: 3, borderRadius: 2, background: THEME.edgeDefault, flexShrink: 0 }} />
          依賴箭頭
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 18, height: 3, borderRadius: 2, background: THEME.sfLine, flexShrink: 0 }} />
          Hover 高亮路徑
        </span>
        <span style={{ flex: 1 }} />
        {sfSelectedNodeId ? (
          <button
            onClick={() => onSfResetSelection()}
            style={{
              background: 'none',
              border: `1px solid ${THEME.borderDefault}`,
              borderRadius: 4,
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: 11,
              color: THEME.inkSecondary,
              fontFamily: THEME.fontUi,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.sfBorder; (e.currentTarget as HTMLButtonElement).style.color = THEME.sfBorder; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.borderDefault; (e.currentTarget as HTMLButtonElement).style.color = THEME.inkSecondary; }}
          >
            清除選取
          </button>
        ) : (
          <span style={{ fontSize: 11, color: THEME.inkFaint }}>
            點擊目錄卡片查看詳情
          </span>
        )}
      </div>
    );
  }

  // Data Journey footer (endpoint graph only)
  if (isDataJourney && hasEndpointGraph) {
    return (
      <div style={footerStyle}>
        {/* Playing/done mode: clear button + journey title */}
        {(djMode === 'playing' || djMode === 'done') && djSelectedEndpoint && (
          <>
            <button
              onClick={onDjEndpointClear}
              style={{
                background: 'none',
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: 4,
                padding: '4px 12px',
                cursor: 'pointer',
                fontSize: 11,
                color: THEME.inkSecondary,
                fontFamily: THEME.fontUi,
                flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.djBorder; (e.currentTarget as HTMLButtonElement).style.color = THEME.djBorder; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.borderDefault; (e.currentTarget as HTMLButtonElement).style.color = THEME.inkSecondary; }}
            >
              清除選取
            </button>
            <span
              style={{
                fontFamily: THEME.fontMono,
                fontSize: 11,
                fontWeight: 700,
                color: THEME.djBorder,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
            >
              {djSelectedEndpoint}
            </span>
            <span style={{ fontSize: 11, color: THEME.inkFaint, flexShrink: 0 }}>
              {djCurrentStep + 1} / {djSelectedChain?.steps?.length ?? 0} 步驟
            </span>
            <span style={{ width: 1, height: 20, background: THEME.borderDefault, flexShrink: 0 }} />
          </>
        )}
        {/* Legend — always visible */}
        {([
          { label: 'GET', color: THEME.sfAccent },
          { label: 'POST', color: THEME.djBorder },
          { label: 'PUT', color: THEME.loControllers },
          { label: 'DELETE', color: '#d32f2f' },
        ] as const).map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    );
  }

  // Logic Operation footer (groups + chain)
  if (isLogicOperation) {
    return (
      <div style={footerStyle}>
        {/* Chain mode: back button + title */}
        {loMode === 'chain' && (
          <>
            <button
              onClick={onLOClear}
              style={{
                background: 'none',
                border: `1px solid ${THEME.borderDefault}`,
                borderRadius: 4,
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 11,
                color: THEME.inkSecondary,
                fontFamily: THEME.fontUi,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.loRoutes; (e.currentTarget as HTMLButtonElement).style.color = THEME.loRoutes; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = THEME.borderDefault; (e.currentTarget as HTMLButtonElement).style.color = THEME.inkSecondary; }}
            >
              ← 返回群組
            </button>
            {loEndpointLabel && (
              <span
                style={{
                  fontFamily: THEME.fontMono,
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.loRoutes,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 200,
                }}
              >
                {loEndpointLabel}
              </span>
            )}
            <span style={{ fontSize: 11, color: THEME.inkFaint, flexShrink: 0 }}>
              {loCurrentStep + 1} / {loSelectedChain?.length ?? 0} 步驟
            </span>
            <span style={{ width: 1, height: 20, background: THEME.borderDefault, flexShrink: 0 }} />
          </>
        )}
        {/* Legend — always visible */}
        {([
          { label: '路線', color: THEME.loRoutes },
          { label: '服務', color: THEME.loServices },
          { label: '控制器', color: THEME.loControllers },
          { label: '模型', color: THEME.loModels },
          { label: '工具', color: THEME.loUtils },
          { label: '中間層', color: THEME.loMiddleware },
        ] as const).map(({ label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    );
  }

  return null;
}
