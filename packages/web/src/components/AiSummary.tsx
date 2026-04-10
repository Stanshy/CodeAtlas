/**
 * CodeAtlas — AiSummary Component
 *
 * AI-generated summary block in the NodePanel.
 * Three states: loading, success (with cached/provider badges), not configured.
 */

import { memo } from 'react';
import { useAiSummary } from '../hooks/useAiSummary';
import { PrivacyBadge } from './PrivacyBadge';
import { colors } from '../styles/theme';

interface AiSummaryProps {
  nodeId: string;
}

const containerStyles: React.CSSProperties = {
  background: colors.bg.elevated,
  borderRadius: 8,
  border: '1px solid rgba(255, 255, 255, 0.06)',
  padding: '14px 16px',
};

const headerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 10,
};

const titleStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

const badgeStyles: React.CSSProperties = {
  fontSize: 10,
  padding: '1px 6px',
  borderRadius: 3,
  fontWeight: 500,
};

const regenButtonStyles: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.text.disabled}`,
  color: colors.text.secondary,
  fontSize: 11,
  padding: '2px 8px',
  borderRadius: 4,
  cursor: 'pointer',
};

const summaryTextStyles: React.CSSProperties = {
  color: colors.text.primary,
  fontSize: 13,
  lineHeight: 1.6,
};

const notConfiguredStyles: React.CSSProperties = {
  color: colors.text.muted,
  fontSize: 12,
  lineHeight: 1.5,
};

export const AiSummary = memo(function AiSummary({ nodeId }: AiSummaryProps) {
  const { summary, isLoading, error, isConfigured, cached, provider, mode, model, regenerate } =
    useAiSummary(nodeId);

  return (
    <div style={containerStyles}>
      <PrivacyBadge mode={mode} provider={provider ?? ''} model={model} />
      <div style={headerStyles}>
        <div style={titleStyles}>
          <span>&#10024;</span> AI Summary
        </div>
        {summary && (
          <button style={regenButtonStyles} onClick={regenerate} type="button">
            Regenerate
          </button>
        )}
      </div>

      {/* Not configured */}
      {isConfigured === false && !isLoading && !error && !summary && (
        <div style={notConfiguredStyles}>
          AI not configured. Use <code style={{ color: colors.primary.DEFAULT }}>--ai-key</code>{' '}
          flag when starting the server to enable AI summaries.
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="codeatlas-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
          <span style={{ color: colors.text.muted, fontSize: 12 }}>Generating summary...</span>
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ color: '#ff4466', fontSize: 12 }}>
          {error}
          <button
            style={{ ...regenButtonStyles, marginLeft: 8 }}
            onClick={regenerate}
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Success */}
      {summary && !isLoading && (
        <>
          <p style={summaryTextStyles}>{summary}</p>
          <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
            {provider && (
              <span
                style={{
                  ...badgeStyles,
                  background: colors.primary.ghost,
                  color: colors.primary.DEFAULT,
                }}
              >
                {provider}
              </span>
            )}
            {cached && (
              <span
                style={{
                  ...badgeStyles,
                  background: 'rgba(0, 204, 102, 0.12)',
                  color: '#00cc66',
                }}
              >
                cached
              </span>
            )}
            <span
              style={{
                ...badgeStyles,
                background: 'rgba(255, 255, 255, 0.04)',
                color: colors.text.disabled,
              }}
            >
              AI generated
            </span>
          </div>
        </>
      )}
    </div>
  );
});
