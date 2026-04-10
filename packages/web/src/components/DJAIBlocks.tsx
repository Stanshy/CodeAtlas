/**
 * CodeAtlas — DJAIBlocks Component (Sprint 16)
 *
 * DJ perspective four-block color component.
 * Each block has a distinct left-border color and background per data journey stage.
 *
 * Design source: proposal/references/sprint16/g1-ai-experience-mockup.html
 * CSS classes: .dj-ai-block.input-validation / .processing-logic / .data-operations / .response-formatting
 *
 * Block color tokens:
 *   input:      bg rgba(21,101,192,0.06),  border-left #1565c0
 *   processing: bg rgba(123,31,162,0.06),  border-left #7b1fa2
 *   data:       bg rgba(78,52,46,0.06),    border-left #4e342e
 *   response:   bg rgba(46,125,50,0.06),   border-left #2e7d32
 *
 * Footer: 11px, color #8888aa
 */

import { memo, type CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DJAIBlocksProps {
  blocks: Array<{
    type: 'input' | 'processing' | 'data' | 'response';
    title: string;
    description: string;
  }>;
  /** AI 提供者名稱 */
  provider?: string;
  /** 分析完成時間 (ISO string) */
  analyzedAt?: string;
  /** 重新分析回調 */
  onReanalyze?: () => void;
}

// ---------------------------------------------------------------------------
// Block color tokens (from mockup)
// ---------------------------------------------------------------------------

interface BlockColors {
  background: string;
  borderLeftColor: string;
  headerColor: string;
}

const BLOCK_COLORS: Record<'input' | 'processing' | 'data' | 'response', BlockColors> = {
  input: {
    background: 'rgba(21, 101, 192, 0.06)',
    borderLeftColor: '#1565c0',
    headerColor: '#1565c0',
  },
  processing: {
    background: 'rgba(123, 31, 162, 0.06)',
    borderLeftColor: '#7b1fa2',
    headerColor: '#7b1fa2',
  },
  data: {
    background: 'rgba(78, 52, 46, 0.06)',
    borderLeftColor: '#4e342e',
    headerColor: '#4e342e',
  },
  response: {
    background: 'rgba(46, 125, 50, 0.06)',
    borderLeftColor: '#2e7d32',
    headerColor: '#2e7d32',
  },
};

// ---------------------------------------------------------------------------
// Block icons (fixed per type)
// ---------------------------------------------------------------------------

const BLOCK_ICONS: Record<'input' | 'processing' | 'data' | 'response', string> = {
  input:      '📥',
  processing: '⚙️',
  data:       '💾',
  response:   '📤',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(isoString: string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes} 分鐘前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小時前`;
    const days = Math.floor(hours / 24);
    return `${days} 天前`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SingleBlockProps {
  type: 'input' | 'processing' | 'data' | 'response';
  title: string;
  description: string;
}

const SingleBlock = memo(function SingleBlock({ type, title, description }: SingleBlockProps) {
  const colors = BLOCK_COLORS[type];
  const icon = BLOCK_ICONS[type];

  const blockStyle: CSSProperties = {
    background: colors.background,
    borderRadius: 6,
    padding: '10px 12px',
    borderLeft: `3px solid ${colors.borderLeftColor}`,
  };

  const headerStyle: CSSProperties = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: colors.headerColor,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  };

  const descStyle: CSSProperties = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 13,
    fontWeight: 400,
    color: '#4a4a6a',
    lineHeight: 1.4,
  };

  return (
    <div style={blockStyle}>
      <div style={headerStyle}>
        <span aria-hidden="true">{icon}</span>
        {title}
      </div>
      <div style={descStyle}>{description}</div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const DJAIBlocks = memo(function DJAIBlocks({
  blocks,
  provider,
  analyzedAt,
  onReanalyze,
}: DJAIBlocksProps) {
  const relativeTime = analyzedAt ? getRelativeTime(analyzedAt) : '';

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  };

  const footerStyle: CSSProperties = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
    color: '#8888aa',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  };

  const reanalyzeStyle: CSSProperties = {
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    fontFamily: 'inherit',
    fontSize: 11,
    color: '#8888aa',
    cursor: 'pointer',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  };

  const footerParts: string[] = [];
  if (provider) footerParts.push(`✨ ${provider}`);
  if (relativeTime) footerParts.push(relativeTime);

  return (
    <div style={containerStyle}>
      {blocks.map((block, i) => (
        <SingleBlock
          key={i}
          type={block.type}
          title={block.title}
          description={block.description}
        />
      ))}

      {/* Footer */}
      {(provider || analyzedAt || onReanalyze) && (
        <div style={footerStyle}>
          {footerParts.join(' · ')}
          {footerParts.length > 0 && ' · '}
          {onReanalyze ? (
            <button style={reanalyzeStyle} onClick={onReanalyze} type="button">
              🔄 重新分析
            </button>
          ) : (
            <span>🔄 重新分析</span>
          )}
        </div>
      )}
    </div>
  );
});
