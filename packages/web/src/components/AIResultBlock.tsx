/**
 * CodeAtlas — AIResultBlock Component (Sprint 16)
 *
 * Shared AI analysis result display block.
 * Two variants:
 *   compact — for 160px cards: role badge + one-line summary
 *   full    — for right panel (320px): role, summary, responsibilities, confidence bar
 *
 * Design source: proposal/references/sprint16/g1-ai-experience-mockup.html
 * CSS class: .ai-result-block-universal
 *
 * Design tokens:
 *   bg: rgba(21, 101, 192, 0.06)
 *   border-radius: 6px
 *   padding full: 10px 12px
 *   padding compact: 6px 8px
 *   border-left: 3px solid #1976d2
 *   title: ✨ AI 分析結果 (13px, 700, color #1976d2)
 *
 * Confidence bar: width 60px, height 5px, track #e8e8f0, fill #1976d2
 * Footer: 11px, color #8888aa
 */

import { memo, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleBadge } from './RoleBadge';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface AIResultBlockProps {
  /** AI 分析結果 — 結構取決於視角 */
  result: {
    role?: string;
    summary?: string;
    responsibilities?: string[];
    confidence?: number;
  };
  /** AI 提供者名稱 */
  provider?: string;
  /** 分析完成時間 (ISO string) */
  analyzedAt?: string;
  /** 重新分析回調 */
  onReanalyze?: () => void;
  /** 變體：compact (卡片內 160px) / full (右側面板 320px) */
  variant?: 'compact' | 'full';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRelativeTime(isoString: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  try {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t('ai.justNow');
    if (minutes < 60) return t('ai.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t('ai.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    return t('ai.daysAgo', { count: days });
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ConfidenceBarProps {
  confidence: number;
}

const ConfidenceBar = memo(function ConfidenceBar({ confidence }: ConfidenceBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(confidence * 100)));

  const wrapStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const trackStyle: CSSProperties = {
    width: 60,
    height: 5,
    background: '#e8e8f0',
    borderRadius: 3,
    overflow: 'hidden',
    flexShrink: 0,
  };

  const fillStyle: CSSProperties = {
    height: '100%',
    width: `${pct}%`,
    background: '#1976d2',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  };

  const pctTextStyle: CSSProperties = {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    color: '#1976d2',
  };

  return (
    <div style={wrapStyle}>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
      <span style={pctTextStyle}>{pct}%</span>
    </div>
  );
});

interface FooterProps {
  provider?: string | undefined;
  analyzedAt?: string | undefined;
  onReanalyze?: (() => void) | undefined;
}

const Footer = memo(function Footer({ provider, analyzedAt, onReanalyze }: FooterProps) {
  const { t } = useTranslation();
  const relativeTime = analyzedAt ? getRelativeTime(analyzedAt, t) : '';

  const footerStyle: CSSProperties = {
    marginTop: 8,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
    color: '#8888aa',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
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

  const parts: string[] = [];
  if (provider) parts.push(`✨ ${provider}`);
  if (relativeTime) parts.push(relativeTime);

  return (
    <div style={footerStyle}>
      {parts.join(' · ')}
      {parts.length > 0 && ' · '}
      {onReanalyze ? (
        <button style={reanalyzeStyle} onClick={onReanalyze} type="button">
          🔄 {t('ai.reanalyze')}
        </button>
      ) : (
        <span>🔄 {t('ai.reanalyze')}</span>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const AIResultBlock = memo(function AIResultBlock({
  result,
  provider,
  analyzedAt,
  onReanalyze,
  variant = 'full',
}: AIResultBlockProps) {
  const { t } = useTranslation();
  const isCompact = variant === 'compact';

  // Container style — differs per variant
  const containerStyle: CSSProperties = {
    background: 'rgba(21, 101, 192, 0.06)',
    borderRadius: 6,
    padding: isCompact ? '6px 8px' : '10px 12px',
    borderLeft: '3px solid #1976d2',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  };

  const titleStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: '#1976d2',
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  };

  const rowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 5,
    fontSize: 13,
  };

  const labelStyle: CSSProperties = {
    fontWeight: 600,
    color: '#4a4a6a',
    minWidth: 48,
    flexShrink: 0,
    fontSize: 13,
  };

  const valueStyle: CSSProperties = {
    color: '#1a1a2e',
    lineHeight: 1.4,
    fontSize: 13,
  };

  const summaryCompactStyle: CSSProperties = {
    fontSize: 13,
    color: '#4a4a6a',
    lineHeight: 1.4,
    marginTop: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const bulletsStyle: CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    fontSize: 13,
    color: '#4a4a6a',
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
  };

  // Compact variant: role badge + one-line summary
  if (isCompact) {
    return (
      <div style={containerStyle}>
        {result.role && (
          <RoleBadge role={result.role} size="sm" />
        )}
        {result.summary && (
          <div style={summaryCompactStyle} title={result.summary}>
            {result.summary}
          </div>
        )}
        <Footer provider={provider} analyzedAt={analyzedAt} onReanalyze={onReanalyze} />
      </div>
    );
  }

  // Full variant: title + all four columns
  return (
    <div style={containerStyle}>
      {/* Title */}
      <div style={titleStyle}>
        <span aria-hidden="true">✨</span>
        {t('ai.analysisResult')}
      </div>

      {/* Role row */}
      {result.role && (
        <div style={rowStyle}>
          <span style={labelStyle}>{t('ai.role')}</span>
          <div style={valueStyle}>
            <RoleBadge role={result.role} size="lg" />
          </div>
        </div>
      )}

      {/* Summary row */}
      {result.summary && (
        <div style={rowStyle}>
          <span style={labelStyle}>{t('ai.summary')}</span>
          <span style={valueStyle}>{result.summary}</span>
        </div>
      )}

      {/* Responsibilities row */}
      {result.responsibilities && result.responsibilities.length > 0 && (
        <div style={rowStyle}>
          <span style={labelStyle}>{t('ai.responsibilities')}</span>
          <ul style={bulletsStyle}>
            {result.responsibilities.map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ color: '#1976d2', flexShrink: 0 }}>•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence row */}
      {result.confidence !== undefined && (
        <div style={rowStyle}>
          <span style={labelStyle}>{t('ai.confidence')}</span>
          <ConfidenceBar confidence={result.confidence} />
        </div>
      )}

      {/* Footer */}
      <Footer provider={provider} analyzedAt={analyzedAt} onReanalyze={onReanalyze} />
    </div>
  );
});
