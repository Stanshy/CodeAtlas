/**
 * CodeAtlas — TabBar Component
 *
 * Perspective switcher tabs displayed at the top of the canvas area.
 * Styled to match the Sprint 12 approved mockup exactly.
 *
 * Sprint 12 — T4.
 * Sprint 19 — T13: Wiki Knowledge Graph tab added.
 */

import { memo } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import type { PerspectiveName } from '../types/graph';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TabBarProps {
  activePerspective: PerspectiveName;
  onPerspectiveChange: (perspective: PerspectiveName) => void;
  counts: { sf: number; lo: number; dj: number; wiki: number };
}

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

const TABS: { key: PerspectiveName; labelKey: string; dotClass: 'blue' | 'multi' | 'green' | 'amber'; countKey: keyof TabBarProps['counts'] }[] = [
  { key: 'system-framework', labelKey: 'tabBar.systemFramework', dotClass: 'blue',  countKey: 'sf'   },
  { key: 'logic-operation',  labelKey: 'tabBar.logicOperation',  dotClass: 'multi', countKey: 'lo'   },
  { key: 'data-journey',     labelKey: 'tabBar.dataJourney',     dotClass: 'green', countKey: 'dj'   },
  { key: 'wiki',             labelKey: 'tabBar.wiki',            dotClass: 'amber', countKey: 'wiki' },
];

// ---------------------------------------------------------------------------
// Inline styles — values taken directly from mockup CSS
// ---------------------------------------------------------------------------

const styles = {
  tabBar: {
    position: 'fixed',
    top: 48,
    left: 0,
    right: 0,
    zIndex: 39,
    height: '48px',
    background: '#ffffff',
    borderBottom: `1.5px solid ${THEME.borderDefault}`,
    display: 'flex',
    alignItems: 'flex-end',
    padding: '0 24px',
    gap: '4px',
    flexShrink: 0,
  } satisfies React.CSSProperties,

  tabBtn: (isActive: boolean): React.CSSProperties => ({
    height: '40px',
    padding: '0 20px',
    border: `1.5px solid ${isActive ? THEME.borderDefault : 'transparent'}`,
    borderBottom: 'none',
    borderRadius: `${THEME.radiusSm} ${THEME.radiusSm} 0 0`,
    background: isActive ? '#ffffff' : 'transparent',
    fontFamily: THEME.fontUi,
    fontSize: '13px',
    fontWeight: isActive ? 600 : 500,
    color: isActive ? THEME.inkPrimary : THEME.inkMuted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'color 0.15s, background 0.15s, border-color 0.15s',
    position: 'relative',
    bottom: '-1.5px',
    whiteSpace: 'nowrap',
    // Active tab white bar (covers the container border-bottom)
    // Rendered via a sibling div below the button content, not ::after
  }),

  tabBtnActiveBar: {
    position: 'absolute',
    bottom: '-2px',
    left: 0,
    right: 0,
    height: '2px',
    background: '#ffffff',
  } satisfies React.CSSProperties,

  dot: (dotClass: 'blue' | 'multi' | 'green' | 'amber'): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      flexShrink: 0,
    };
    if (dotClass === 'blue') {
      return { ...base, background: THEME.sfBorder };
    }
    if (dotClass === 'multi') {
      return {
        ...base,
        background: `conic-gradient(${THEME.loRoutes} 0deg 120deg, ${THEME.loServices} 120deg 240deg, ${THEME.loControllers} 240deg 360deg)`,
      };
    }
    if (dotClass === 'amber') {
      // Wiki amber — matches G1 mockup .tab-dot-amber
      return { ...base, background: '#f59e0b' };
    }
    // green
    return { ...base, background: THEME.djBorder };
  },

  count: {
    fontSize: '11px',
    fontWeight: 600,
    color: THEME.inkFaint,
    background: THEME.bgGrid,
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: '10px',
    padding: '0 6px',
    height: '18px',
    lineHeight: '18px',
    display: 'inline-block',
  } satisfies React.CSSProperties,
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TabBar = memo(function TabBar({
  activePerspective,
  onPerspectiveChange,
  counts,
}: TabBarProps) {
  const { t } = useTranslation();
  return (
    <div style={styles.tabBar} role="tablist" aria-label={t('tabBar.ariaLabel')}>
      {TABS.map(({ key, labelKey, dotClass, countKey }) => {
        const isActive = activePerspective === key;
        const count = counts[countKey];
        const label = t(labelKey);

        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            aria-controls={`perspective-panel-${key}`}
            style={styles.tabBtn(isActive)}
            onClick={() => onPerspectiveChange(key)}
            type="button"
            onMouseEnter={(e) => {
              if (!isActive) {
                const btn = e.currentTarget;
                btn.style.color = THEME.inkSecondary;
                btn.style.background = THEME.bgGrid;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                const btn = e.currentTarget;
                btn.style.color = THEME.inkMuted;
                btn.style.background = 'transparent';
              }
            }}
          >
            <span style={styles.dot(dotClass)} aria-hidden="true" />
            {label}
            {count > 0 && (
              <span style={
                key === 'wiki'
                  ? {
                      ...styles.count,
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderColor: 'rgba(245, 158, 11, 0.3)',
                      color: '#f59e0b',
                    }
                  : styles.count
              }>{count}</span>
            )}
            {/* White bar that covers the container's border-bottom on the active tab */}
            {isActive && <span style={styles.tabBtnActiveBar} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
});
