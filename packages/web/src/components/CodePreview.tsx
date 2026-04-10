/**
 * CodeAtlas — CodePreview Component
 *
 * Displays source code in the NodePanel with line numbers.
 * Truncates to first 100 lines for performance.
 * Uses monospace font with neon-theme dark background.
 */

import { memo, useState } from 'react';
import { colors } from '../styles/theme';

const MAX_PREVIEW_LINES = 100;

interface CodePreviewProps {
  sourceCode: string | null;
  language: string;
}

const containerStyles: React.CSSProperties = {
  background: colors.bg.surface,
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.06)',
  overflow: 'hidden',
};

const codeAreaStyles: React.CSSProperties = {
  maxHeight: 320,
  overflowY: 'auto',
  overflowX: 'auto',
  fontSize: 12,
  lineHeight: 1.6,
  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
  padding: '12px 0',
};

const lineStyles: React.CSSProperties = {
  display: 'flex',
  padding: '0 12px',
  minHeight: 19,
};

const lineNumberStyles: React.CSSProperties = {
  color: colors.text.disabled,
  width: 40,
  textAlign: 'right',
  paddingRight: 12,
  flexShrink: 0,
  userSelect: 'none',
};

const lineContentStyles: React.CSSProperties = {
  color: colors.text.primary,
  whiteSpace: 'pre',
};

const truncatedStyles: React.CSSProperties = {
  padding: '8px 16px',
  color: colors.text.muted,
  fontSize: 11,
  borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const expandButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.text.disabled}`,
  color: colors.primary.DEFAULT,
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 4,
  cursor: 'pointer',
};

export const CodePreview = memo(function CodePreview({ sourceCode, language }: CodePreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (sourceCode === null || sourceCode === undefined) {
    return (
      <div style={{ ...containerStyles, padding: '16px', textAlign: 'center' }}>
        <span style={{ color: colors.text.muted, fontSize: 13 }}>
          Source code not available
        </span>
      </div>
    );
  }

  const allLines = sourceCode.split('\n');
  const totalLines = allLines.length;
  const isTruncated = totalLines > MAX_PREVIEW_LINES && !expanded;
  const displayLines = isTruncated ? allLines.slice(0, MAX_PREVIEW_LINES) : allLines;

  return (
    <div style={containerStyles}>
      {/* Language badge */}
      <div
        style={{
          padding: '6px 12px',
          fontSize: 11,
          color: colors.text.muted,
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>{language}</span>
        <span>{totalLines} lines</span>
      </div>

      {/* Code lines */}
      <div style={codeAreaStyles}>
        {displayLines.map((line, i) => (
          <div key={i} style={lineStyles}>
            <span style={lineNumberStyles}>{i + 1}</span>
            <span style={lineContentStyles}>{line}</span>
          </div>
        ))}
      </div>

      {/* Truncation notice */}
      {isTruncated && (
        <div style={truncatedStyles}>
          <span>... {totalLines - MAX_PREVIEW_LINES} more lines</span>
          <button style={expandButtonStyles} onClick={() => setExpanded(true)} type="button">
            Show all
          </button>
        </div>
      )}
    </div>
  );
});
