/**
 * CodeAtlas — TabBar Component
 *
 * Perspective switcher tabs displayed at the top of the canvas area.
 * Styled to match the Sprint 12 approved mockup exactly.
 *
 * Sprint 12 — T4.
 * Sprint 19 — T13: Wiki Knowledge Graph tab added.
 * Sprint 22 — Wiki UI refactor: dynamic wiki page tabs added.
 */

import { memo, useCallback } from 'react';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import type { PerspectiveName } from '../types/graph';
import { THEME } from '../styles/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WikiPageTab {
  slug: string;
  displayName: string;
}

interface TabBarProps {
  activePerspective: PerspectiveName;
  onPerspectiveChange: (perspective: PerspectiveName) => void;
  counts: { sf: number; lo: number; dj: number; wiki: number };
  /** Open wiki page tabs to show after the Knowledge Graph tab */
  openWikiPages?: WikiPageTab[];
  /** Slug of the currently active wiki page tab (null = graph is active) */
  activeWikiSlug?: string | null;
  /** Called when user clicks a wiki page tab */
  onSelectWikiPage?: (slug: string) => void;
  /** Called when user clicks the close button on a wiki page tab */
  onCloseWikiPage?: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Tab definitions (static perspective tabs)
// ---------------------------------------------------------------------------

const TABS: { key: PerspectiveName; labelKey: string; dotClass: 'blue' | 'multi' | 'green' | 'amber'; countKey: keyof TabBarProps['counts'] }[] = [
  { key: 'system-framework', labelKey: 'tabBar.systemFramework', dotClass: 'blue',  countKey: 'sf'   },
  { key: 'logic-operation',  labelKey: 'tabBar.logicOperation',  dotClass: 'multi', countKey: 'lo'   },
  { key: 'data-journey',     labelKey: 'tabBar.dataJourney',     dotClass: 'green', countKey: 'dj'   },
  { key: 'wiki',             labelKey: 'tabBar.wiki',            dotClass: 'amber', countKey: 'wiki' },
];

// ---------------------------------------------------------------------------
// Inline styles
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
    overflowX: 'auto' as const,
    overflowY: 'hidden' as const,
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
    flexShrink: 0,
  }),

  wikiPageTabBtn: (isActive: boolean): React.CSSProperties => ({
    height: '40px',
    padding: '0 10px 0 16px',
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
    gap: '6px',
    transition: 'color 0.15s, background 0.15s, border-color 0.15s',
    position: 'relative',
    bottom: '-1.5px',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    maxWidth: 180,
  }),

  wikiPageLabel: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    minWidth: 0,
  } satisfies React.CSSProperties,

  closeBtn: (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    borderRadius: 3,
    border: 'none',
    background: 'transparent',
    color: isActive ? THEME.inkMuted : THEME.inkFaint,
    cursor: 'pointer',
    fontSize: 11,
    padding: 0,
    flexShrink: 0,
    lineHeight: 1,
    opacity: 0.7,
    transition: 'opacity 0.1s, background 0.1s',
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
      return { ...base, background: '#f59e0b' };
    }
    // green
    return { ...base, background: THEME.djBorder };
  },

  wikiPageDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#f59e0b',
    flexShrink: 0,
    opacity: 0.7,
  } satisfies React.CSSProperties,

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

  divider: {
    width: '1px',
    height: '20px',
    background: THEME.borderDefault,
    flexShrink: 0,
    alignSelf: 'center',
    margin: '0 2px',
    opacity: 0.6,
  } satisfies React.CSSProperties,
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TabBar = memo(function TabBar({
  activePerspective,
  onPerspectiveChange,
  counts,
  openWikiPages = [],
  activeWikiSlug = null,
  onSelectWikiPage,
  onCloseWikiPage,
}: TabBarProps) {
  const { t } = useTranslation();

  // The wiki perspective tab is "active" when activePerspective === 'wiki'
  // AND there is no active wiki page tab open (we're viewing the graph).
  const isWikiGraphActive =
    activePerspective === 'wiki' && activeWikiSlug === null;

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, slug: string) => {
      e.stopPropagation();
      onCloseWikiPage?.(slug);
    },
    [onCloseWikiPage],
  );

  return (
    <div style={styles.tabBar} role="tablist" aria-label={t('tabBar.ariaLabel')}>
      {TABS.map(({ key, labelKey, dotClass, countKey }) => {
        // Wiki tab is active only when showing the graph (no wiki page tab active)
        const isActive = key === 'wiki' ? isWikiGraphActive : activePerspective === key;
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
            {isActive && <span style={styles.tabBtnActiveBar} aria-hidden="true" />}
          </button>
        );
      })}

      {/* Divider before wiki page tabs */}
      {openWikiPages.length > 0 && (
        <div style={styles.divider} aria-hidden="true" />
      )}

      {/* Dynamic wiki page tabs */}
      {openWikiPages.map((page) => {
        const isPageActive = activeWikiSlug === page.slug;

        return (
          <button
            key={page.slug}
            role="tab"
            aria-selected={isPageActive}
            aria-label={t('wiki.openPageTab', { name: page.displayName })}
            style={styles.wikiPageTabBtn(isPageActive)}
            onClick={() => onSelectWikiPage?.(page.slug)}
            type="button"
            title={page.displayName}
            onMouseEnter={(e) => {
              if (!isPageActive) {
                const btn = e.currentTarget;
                btn.style.color = THEME.inkSecondary;
                btn.style.background = THEME.bgGrid;
              }
            }}
            onMouseLeave={(e) => {
              if (!isPageActive) {
                const btn = e.currentTarget;
                btn.style.color = THEME.inkMuted;
                btn.style.background = 'transparent';
              }
            }}
          >
            <span style={styles.wikiPageDot} aria-hidden="true" />
            <span style={styles.wikiPageLabel}>{page.displayName}</span>
            <span
              role="button"
              tabIndex={-1}
              aria-label={t('wiki.closePageTab', { name: page.displayName })}
              style={styles.closeBtn(isPageActive)}
              onClick={(e) => handleCloseClick(e, page.slug)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onCloseWikiPage?.(page.slug);
                }
              }}
            >
              &#x2715;
            </span>
            {isPageActive && <span style={styles.tabBtnActiveBar} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
});
