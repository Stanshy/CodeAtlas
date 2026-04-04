/**
 * CodeAtlas — PrivacyBadge Component
 *
 * Displays current AI mode and privacy status.
 * Three modes: disabled (grey), local (green), cloud (amber warning).
 *
 * Sprint 6 — T6: 隱私標示（F45）
 */

import { memo } from 'react';
import { colors } from '../styles/theme';

export interface PrivacyBadgeProps {
  mode: 'disabled' | 'local' | 'cloud' | undefined;
  provider: string;
  model?: string | null;
}

function PrivacyBadgeInner({ mode, provider, model }: PrivacyBadgeProps) {
  // Determine display
  let icon: string;
  let text: string;
  let color: string;

  switch (mode) {
    case 'local':
      icon = '\u2705'; // ✅
      text = model ? `Local mode — code stays local (${model})` : 'Local mode — code stays local';
      color = colors.primary.DEFAULT; // green
      break;
    case 'cloud':
      icon = '\u26A0\uFE0F'; // ⚠️
      text = `Cloud mode — code snippets sent to ${provider}`;
      color = '#ffaa00'; // amber — use inline since theme may not have warning color
      break;
    default: // disabled or undefined
      icon = '';
      text = 'AI disabled';
      color = colors.text.muted;
      break;
  }

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    color,
    background: mode === 'cloud'
      ? 'rgba(255, 170, 0, 0.08)'
      : mode === 'local'
        ? 'rgba(0, 255, 136, 0.08)'
        : 'rgba(255, 255, 255, 0.04)',
    border: `1px solid ${mode === 'cloud'
      ? 'rgba(255, 170, 0, 0.2)'
      : mode === 'local'
        ? 'rgba(0, 255, 136, 0.2)'
        : 'rgba(255, 255, 255, 0.06)'}`,
    marginBottom: 8,
  };

  return (
    <div style={containerStyles} role="status" aria-label={`AI privacy: ${text}`}>
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      <span>{text}</span>
    </div>
  );
}

export const PrivacyBadge = memo(PrivacyBadgeInner);
