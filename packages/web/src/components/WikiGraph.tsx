/**
 * CodeAtlas Web — WikiGraph Component
 *
 * Obsidian-style D3 force 2D knowledge graph for the Wiki tab.
 * Renders an SVG with circle nodes, straight-line edges, persistent text
 * labels, drag/zoom/pan, and a level-control toolbar.
 *
 * Layout:
 *  - Center: full-width D3 graph canvas (or WikiContentView when a page tab
 *    is active)
 *  - Right panel (260px): knowledge node list grouped by type
 *
 * Tab state is fully controlled by the parent (App.tsx) so the TabBar
 * can reflect open wiki page tabs independently.
 *
 * Sprint 19 — T13: Wiki Knowledge Graph Tab
 * Sprint 22 — Wiki UI refactor: left sidebar removed, node list moved right,
 *              wiki page tabs added (controlled by parent).
 */

import { useRef, useEffect, useState, useCallback, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../locales';
import { WikiNodeCircle } from './WikiNodeCircle';
import { WikiContentView } from './WikiContentView';
import { useWikiGraph } from '../hooks/useWikiGraph';
import { THEME } from '../styles/theme';
import type { WikiSimNode, WikiSimLink } from '../types/wiki';

// ---------------------------------------------------------------------------
// Colour map for edges and legend
// ---------------------------------------------------------------------------

const NODE_COLORS: Record<string, string> = {
  architecture: '#1565c0',
  pattern:      '#7b1fa2',
  feature:      '#2e7d32',
  integration:  '#f59e0b',
  concept:      '#00838f',
};

// ---------------------------------------------------------------------------
// Wiki page tab shape (exported so App.tsx can import it)
// ---------------------------------------------------------------------------

export interface WikiPageTab {
  slug: string;
  displayName: string;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface WikiGraphProps {
  /** Currently open wiki page tabs (controlled by parent) */
  openPages: WikiPageTab[];
  /** Slug of the active wiki page tab; null = showing the graph */
  activePageSlug: string | null;
  /** Called when user opens a new page (graph node click or node-list click) */
  onOpenPage: (slug: string, displayName: string) => void;
  /** Called when user closes a wiki page tab */
  onClosePage: (slug: string) => void;
  /** Called when user selects an already-open tab */
  onSelectPage: (slug: string) => void;
}

// ---------------------------------------------------------------------------
// Sub-component: NotGeneratedState
// ---------------------------------------------------------------------------

function NotGeneratedState({ onGenerated }: { onGenerated?: () => void }) {
  const { t } = useTranslation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenError(null);
    try {
      const locale = i18n.language || localStorage.getItem('codeatlas-locale') || 'en';
      const res = await fetch('/api/wiki/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || `HTTP ${res.status}`);
      }
      onGenerated?.();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err));
      setIsGenerating(false);
    }
  };

  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyCard}>
        <div style={styles.emptyIcon} aria-hidden="true">
          &#x1F4DA;
        </div>
        <p style={styles.emptyTitle}>{t('wiki.notGenerated')}</p>
        <p style={styles.emptyBody}>
          {t('wiki.notGeneratedWebHint')}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          style={{
            marginTop: 12,
            padding: '10px 24px',
            background: isGenerating ? '#1565c0' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.75 : 1,
          }}
        >
          {isGenerating ? t('wiki.generating') : t('wiki.generateButton')}
        </button>
        {genError && (
          <p style={{ ...styles.emptyBody, color: '#ef4444', marginTop: 8 }}>
            {t('wiki.generateError')}: {genError}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: ErrorState
// ---------------------------------------------------------------------------

function ErrorState() {
  const { t } = useTranslation();
  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyCard}>
        <p style={styles.emptyTitle}>{t('wiki.loadGraphError')}</p>
        <p style={styles.emptyBody}>{t('wiki.loadGraphErrorHint')}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: LoadingState
// ---------------------------------------------------------------------------

function LoadingState() {
  const { t } = useTranslation();
  return (
    <div style={styles.emptyWrap}>
      <div style={styles.emptyCard}>
        <div className="codeatlas-spinner" style={{ marginBottom: 16 }} />
        <p style={styles.emptyBody}>{t('wiki.loadingGraph')}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: GraphLegend
// ---------------------------------------------------------------------------

const LEGEND_ITEMS = [
  { type: 'architecture', labelKey: 'wiki.legendArchitecture', size: 12 },
  { type: 'pattern',      labelKey: 'wiki.legendPattern',      size: 10 },
  { type: 'feature',      labelKey: 'wiki.legendFeature',      size: 11 },
  { type: 'integration',  labelKey: 'wiki.legendIntegration',  size: 9  },
  { type: 'concept',      labelKey: 'wiki.legendConcept',      size: 8  },
];

function GraphLegend() {
  const { t } = useTranslation();
  return (
    <div style={styles.legend}>
      {LEGEND_ITEMS.map(({ type, labelKey, size }) => (
        <div key={type} style={styles.legendItem}>
          <svg width={size * 2} height={size * 2} style={{ flexShrink: 0 }}>
            <circle
              cx={size}
              cy={size}
              r={size - 1}
              fill={NODE_COLORS[type] ?? '#888'}
            />
          </svg>
          <span style={styles.legendLabel}>{t(labelKey)}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

interface TooltipState {
  x: number;
  y: number;
  node: WikiSimNode;
}

function Tooltip({ tip }: { tip: TooltipState }) {
  return (
    <div
      style={{
        ...styles.tooltip,
        left: tip.x + 14,
        top: tip.y - 8,
      }}
      aria-live="polite"
    >
      <strong style={{ fontSize: 12 }}>{tip.node.displayName}</strong>
      <div style={{ fontSize: 11, color: THEME.inkSecondary, marginTop: 2 }}>
        {tip.node.type}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG edge rendering helper
// ---------------------------------------------------------------------------

function renderEdge(link: WikiSimLink, idx: number): React.ReactNode {
  const src = link.source as WikiSimNode;
  const tgt = link.target as WikiSimNode;

  if (
    typeof src === 'string' || typeof tgt === 'string' ||
    src.x === undefined || src.y === undefined ||
    tgt.x === undefined || tgt.y === undefined
  ) {
    return null;
  }

  return (
    <line
      key={idx}
      x1={src.x}
      y1={src.y}
      x2={tgt.x}
      y2={tgt.y}
      stroke="#9aa8bc"
      strokeWidth={1}
      strokeOpacity={0.4}
    />
  );
}

// ---------------------------------------------------------------------------
// Right panel: Knowledge node list
// ---------------------------------------------------------------------------

interface WikiNodeListProps {
  visibleNodes: WikiSimNode[];
  selectedSlug: string | null;
  activePageSlug: string | null;
  onOpenPage: (slug: string, displayName: string) => void;
}

function WikiNodeList({
  visibleNodes,
  selectedSlug,
  activePageSlug,
  onOpenPage,
}: WikiNodeListProps) {
  const { t } = useTranslation();

  return (
    <div style={styles.rightPanel}>
      <div style={styles.rightPanelHeader}>
        <span style={styles.rightPanelTitle}>{t('wiki.knowledgeNodes')}</span>
        <span style={styles.rightPanelCount}>{visibleNodes.length}</span>
      </div>
      <div style={styles.rightPanelList}>
        {(['architecture', 'pattern', 'feature', 'integration', 'concept'] as const).map((type) => {
          const group = visibleNodes.filter((n) => n.type === type);
          if (group.length === 0) return null;
          const legend = LEGEND_ITEMS.find((l) => l.type === type);
          return (
            <div key={type}>
              <div style={styles.groupHeader}>
                <svg width={10} height={10} style={{ flexShrink: 0 }}>
                  <circle cx={5} cy={5} r={4} fill={NODE_COLORS[type] ?? '#888'} />
                </svg>
                <span style={styles.groupLabel}>
                  {legend ? t(legend.labelKey).toUpperCase() : type.toUpperCase()}
                </span>
                <span style={styles.groupCount}>{group.length}</span>
              </div>
              {group.map((node) => {
                const isHighlighted =
                  activePageSlug === node.slug || selectedSlug === node.slug;
                return (
                  <button
                    key={node.slug}
                    type="button"
                    style={{
                      ...styles.nodeItem,
                      ...(isHighlighted ? styles.nodeItemActive : {}),
                    }}
                    onClick={() => onOpenPage(node.slug, node.displayName)}
                    title={node.displayName}
                    aria-label={t('wiki.openPageTab', { name: node.displayName })}
                  >
                    {node.displayName}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main WikiGraph component
// ---------------------------------------------------------------------------

export function WikiGraph({
  openPages,
  activePageSlug,
  onOpenPage,
  onClosePage: _onClosePage,
  onSelectPage: _onSelectPage,
}: WikiGraphProps) {
  // containerRef is always mounted (but hidden when content view is active)
  // so the ResizeObserver keeps valid dimensions for the D3 simulation.
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  // Keep dimensions up-to-date from the graph container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const graph = useWikiGraph(dimensions.width, dimensions.height);

  // ---------------------------------------------------------------------------
  // Pan + zoom state
  // ---------------------------------------------------------------------------

  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const panState = useRef<{
    isPanning: boolean;
    startX: number;
    startY: number;
    startTx: number;
    startTy: number;
  }>({
    isPanning: false,
    startX: 0,
    startY: 0,
    startTx: 0,
    startTy: 0,
  });

  // ---------------------------------------------------------------------------
  // Tooltip
  // ---------------------------------------------------------------------------

  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleHoverStart = useCallback(
    (slug: string) => {
      graph.hoverNode(slug);
      const node = graph.visibleNodes.find((n) => n.slug === slug);
      if (node && node.x !== undefined && node.y !== undefined) {
        const svgX = node.x * transform.k + transform.x;
        const svgY = node.y * transform.k + transform.y;
        setTooltip({ x: svgX, y: svgY, node });
      }
    },
    [graph, transform],
  );

  const handleHoverEnd = useCallback(() => {
    graph.hoverNode(null);
    setTooltip(null);
  }, [graph]);

  // ---------------------------------------------------------------------------
  // Drag handlers
  // ---------------------------------------------------------------------------

  const handleDragStart = useCallback(
    (slug: string, x: number, y: number) => {
      graph.fixNode(slug, x, y);
    },
    [graph],
  );

  const handleDrag = useCallback(
    (slug: string, x: number, y: number) => {
      graph.dragNode(slug, x, y);
    },
    [graph],
  );

  const handleDragEnd = useCallback(
    (slug: string) => {
      graph.releaseNode(slug);
    },
    [graph],
  );

  // ---------------------------------------------------------------------------
  // Node click: highlight in graph + open as content tab
  // ---------------------------------------------------------------------------

  const handleNodeSelect = useCallback(
    (slug: string | null) => {
      if (slug === null) return;
      graph.selectNode(slug);
      const node =
        graph.visibleNodes.find((n) => n.slug === slug) ??
        graph.allNodes.find((n) => n.slug === slug);
      if (node) {
        onOpenPage(node.slug, node.displayName);
      }
    },
    [graph, onOpenPage],
  );

  // ---------------------------------------------------------------------------
  // Background pan
  // ---------------------------------------------------------------------------

  const handleSvgPointerDown = useCallback(
    (e: PointerEvent<SVGSVGElement>) => {
      if (e.target !== e.currentTarget) return;
      panState.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startTx: transform.x,
        startTy: transform.y,
      };
      const onMove = (ev: globalThis.PointerEvent) => {
        if (!panState.current.isPanning) return;
        setTransform((t) => ({
          ...t,
          x: panState.current.startTx + (ev.clientX - panState.current.startX),
          y: panState.current.startTy + (ev.clientY - panState.current.startY),
        }));
      };
      const onUp = () => {
        panState.current.isPanning = false;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    },
    [transform],
  );

  const handleSvgPointerMove = useCallback(
    (_e: PointerEvent<SVGSVGElement>) => {
      // Pan tracking handled by window-level listener
    },
    [],
  );

  const handleSvgPointerUp = useCallback(
    (_e: PointerEvent<SVGSVGElement>) => {
      // Pan tracking handled by window-level listener
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Wheel zoom
  // ---------------------------------------------------------------------------

  const handleWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    const factor = Math.pow(2, delta);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    setTransform((t) => {
      const newK = Math.max(0.1, Math.min(4, t.k * factor));
      const newX = mx - (mx - t.x) * (newK / t.k);
      const newY = my - (my - t.y) * (newK / t.k);
      return { x: newX, y: newY, k: newK };
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Render: loading / error / not-generated states
  // ---------------------------------------------------------------------------

  if (graph.isLoading) return <LoadingState />;
  if (graph.manifestStatus === 'not_generated') return <NotGeneratedState onGenerated={graph.refetch} />;
  if (graph.manifestStatus === 'error') return <ErrorState />;

  const { width, height } = dimensions;
  const groupTransform = `translate(${transform.x},${transform.y}) scale(${transform.k})`;

  const isShowingContent = activePageSlug !== null;

  // Suppress unused-variable warnings for props consumed only by parent
  void openPages;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={styles.root}>
      {/* Center area: wiki content view OR the D3 graph */}
      {isShowingContent ? (
        <WikiContentView
          slug={activePageSlug}
          onOpenPage={onOpenPage}
        />
      ) : null}

      {/*
       * D3 graph canvas — always mounted so the simulation keeps running.
       * Hidden behind the content view when a page tab is active, so node
       * positions are preserved when the user switches back to the graph.
       */}
      <div
        ref={containerRef}
        style={{
          ...styles.canvas,
          display: isShowingContent ? 'none' : 'block',
        }}
        aria-hidden={isShowingContent}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block', background: '#fefefe', cursor: 'grab' }}
          onWheel={handleWheel}
          onPointerDown={handleSvgPointerDown}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
        >
          <g transform={groupTransform}>
            {/* Edges */}
            <g aria-hidden="true">
              {graph.visibleLinks.map((link, i) => renderEdge(link, i))}
            </g>

            {/* Nodes */}
            {graph.visibleNodes.map((node) => (
              <WikiNodeCircle
                key={node.slug}
                node={node}
                isSelected={graph.selectedSlug === node.slug}
                isHovered={graph.hoveredSlug === node.slug}
                onSelect={handleNodeSelect}
                onHoverStart={handleHoverStart}
                onHoverEnd={handleHoverEnd}
                onDragStart={handleDragStart}
                onDrag={handleDrag}
                onDragEnd={handleDragEnd}
              />
            ))}
          </g>
        </svg>

        {/* Legend overlay */}
        <GraphLegend />

        {/* Tooltip */}
        {tooltip && <Tooltip tip={tooltip} />}

        {/* Node count badge */}
        <div style={styles.countBadge}>
          {graph.visibleNodes.length} / {graph.totalCount}
        </div>
      </div>

      {/* Right panel: knowledge node list (always visible) */}
      <WikiNodeList
        visibleNodes={graph.visibleNodes}
        selectedSlug={graph.selectedSlug}
        activePageSlug={activePageSlug}
        onOpenPage={onOpenPage}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  root: {
    position: 'fixed' as const,
    top: 96,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'row' as const,
    background: '#fefefe',
    overflow: 'hidden',
    zIndex: 30,
  },

  canvas: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  },

  // Right panel (knowledge node list)
  rightPanel: {
    width: 260,
    flexShrink: 0,
    background: '#ffffff',
    borderLeft: `1px solid ${THEME.borderDefault}`,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    zIndex: 40,
  },

  rightPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px 10px',
    borderBottom: `1px solid ${THEME.borderDefault}`,
    flexShrink: 0,
  },

  rightPanelTitle: {
    fontFamily: THEME.fontUi,
    fontSize: 13,
    fontWeight: 600,
    color: THEME.inkPrimary,
  } as React.CSSProperties,

  rightPanelCount: {
    fontFamily: THEME.fontMono,
    fontSize: 10,
    color: THEME.inkFaint,
    background: THEME.bgGrid,
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: 10,
    padding: '1px 7px',
  } as React.CSSProperties,

  rightPanelList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '6px 0',
  },

  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px 4px',
  },

  groupLabel: {
    fontFamily: THEME.fontUi,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    color: THEME.inkMuted,
    flex: 1,
  } as React.CSSProperties,

  groupCount: {
    fontFamily: THEME.fontMono,
    fontSize: 9,
    color: THEME.inkFaint,
  } as React.CSSProperties,

  nodeItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    background: 'transparent',
    border: 'none',
    padding: '5px 14px 5px 28px',
    fontFamily: THEME.fontUi,
    fontSize: 12,
    color: THEME.inkSecondary,
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    transition: 'background 0.1s',
    borderRadius: 0,
  } as React.CSSProperties,

  nodeItemActive: {
    background: 'rgba(21, 101, 192, 0.08)',
    color: THEME.inkPrimary,
    fontWeight: 600,
  } as React.CSSProperties,

  // Legend
  legend: {
    position: 'absolute' as const,
    bottom: 16,
    left: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 14px',
    background: 'rgba(255,255,255,0.88)',
    border: `1px solid rgba(0,0,0,0.08)`,
    borderRadius: THEME.radiusSm,
    backdropFilter: 'blur(4px)',
    pointerEvents: 'none' as const,
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },

  legendLabel: {
    fontFamily: THEME.fontUi,
    fontSize: 11,
    color: THEME.inkSecondary,
  } as React.CSSProperties,

  // Tooltip
  tooltip: {
    position: 'absolute' as const,
    zIndex: 100,
    background: 'rgba(255,255,255,0.96)',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: THEME.radiusSm,
    padding: '6px 10px',
    boxShadow: THEME.shadowHover,
    pointerEvents: 'none' as const,
    maxWidth: 240,
    fontFamily: THEME.fontUi,
    color: THEME.inkPrimary,
    fontSize: 12,
    whiteSpace: 'nowrap' as const,
  },

  // Count badge
  countBadge: {
    position: 'absolute' as const,
    bottom: 16,
    right: 16,
    fontFamily: THEME.fontMono,
    fontSize: 10,
    color: THEME.inkFaint,
    background: 'rgba(255,255,255,0.85)',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: 10,
    padding: '3px 10px',
    pointerEvents: 'none' as const,
  },

  // Empty / not-generated states
  emptyWrap: {
    position: 'fixed' as const,
    top: 96,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: THEME.bgPaper,
  },

  emptyCard: {
    background: '#fafafa',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: 16,
    padding: '40px 48px',
    textAlign: 'center' as const,
    boxShadow: THEME.shadowCard,
    maxWidth: 440,
  },

  emptyIcon: {
    fontSize: 40,
    marginBottom: 16,
    display: 'block',
  },

  emptyTitle: {
    fontFamily: THEME.fontUi,
    fontSize: 16,
    fontWeight: 600,
    color: THEME.inkPrimary,
    marginBottom: 12,
  } as React.CSSProperties,

  emptyBody: {
    fontFamily: THEME.fontUi,
    fontSize: 13,
    color: THEME.inkSecondary,
    lineHeight: 1.7,
    marginBottom: 12,
  } as React.CSSProperties,

  emptyCmd: {
    display: 'inline-block',
    fontFamily: THEME.fontMono,
    fontSize: 12,
    background: '#f5f5f8',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: THEME.radiusSm,
    padding: '4px 10px',
    color: THEME.sfBorder,
    marginBottom: 12,
  } as React.CSSProperties,
} as const;
