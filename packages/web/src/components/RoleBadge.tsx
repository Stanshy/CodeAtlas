/**
 * CodeAtlas — RoleBadge Component (Sprint 16)
 *
 * MethodRole badge shared component for LO perspective.
 * Supports sm (original) and lg (enlarged 11px, 3px 8px) sizes.
 *
 * Design source: proposal/references/sprint16/g1-ai-experience-mockup.html
 * CSS class: .role-badge-lg / .role-badge-sm
 */

import { memo, type CSSProperties } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'lg';
}

// ---------------------------------------------------------------------------
// Role → display label (Chinese)
// ---------------------------------------------------------------------------

const ROLE_LABELS: Record<string, string> = {
  entrypoint:     '入口點',
  business_core:  '業務核心',
  domain_rule:    '領域規則',
  orchestration:  '服務編排',
  io_adapter:     '資料存取',
  validation:     '資料驗證',
  infra:          '基礎設施',
  utility:        '工具函式',
  framework_glue: '框架膠水',
};

// ---------------------------------------------------------------------------
// Role → color tokens (from mockup .role-badge-lg color map)
// ---------------------------------------------------------------------------

interface RoleColors {
  background: string;
  color: string;
}

const ROLE_COLORS: Record<string, RoleColors> = {
  entrypoint:     { background: '#e3f2fd', color: '#1565c0' },
  business_core:  { background: '#e3f2fd', color: '#1565c0' },
  domain_rule:    { background: '#e3f2fd', color: '#1565c0' },
  orchestration:  { background: '#f3e5f5', color: '#7b1fa2' },
  io_adapter:     { background: '#efebe9', color: '#4e342e' },
  validation:     { background: '#fff3e0', color: '#e65100' },
  infra:          { background: '#eceff1', color: '#546e7a' },
  utility:        { background: '#eceff1', color: '#546e7a' },
  framework_glue: { background: '#e0f7fa', color: '#00838f' },
};

const DEFAULT_COLORS: RoleColors = { background: '#eceff1', color: '#546e7a' };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RoleBadge = memo(function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const colors = ROLE_COLORS[role] ?? DEFAULT_COLORS;
  const label = ROLE_LABELS[role] ?? role;

  const badgeStyle: CSSProperties = {
    display: 'inline-block',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 3,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    background: colors.background,
    color: colors.color,
    // lg: 3px 8px (enlarged from mockup), sm: 2px 7px
    padding: size === 'lg' ? '3px 8px' : '2px 7px',
  };

  return (
    <span style={badgeStyle}>
      {label}
    </span>
  );
});
