/**
 * CodeAtlas — LOCategoryGroup Component (Sprint 13)
 *
 * Displays LO perspective as 5 category group cards in dagre TB layout.
 * Methods are grouped by file path category (routes / middleware / services / models / utils).
 * Each card is collapsible (>5 items shows "expand more" toggle).
 * Group dependency arrows are rendered as dashed SVG lines between cards.
 *
 * Sprint 13 — T5.
 */

import { useState, useMemo, useCallback, useRef, useEffect, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { GraphNode, GraphEdge, EndpointGraph, LoCategory } from '../types/graph';
import { THEME, canvas as canvasTheme } from '../styles/theme';

// Re-export for consumers that import LoCategory from this file
export type { LoCategory };

export interface MethodItem {
  name: string;
  filePath: string;
  nodeId: string;
  /** Whether this method appears in an endpoint call chain (clickable for chain view) */
  hasChain?: boolean;
}

export interface CategoryGroupData {
  category: LoCategory;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  methods: MethodItem[];
}

export interface LOCategoryGroupProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  endpointGraph: EndpointGraph | null;
  onMethodClick: (methodName: string, category: LoCategory) => void;
}

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_W = 240;
const ROW_H = 24;
const HEADER_H = 36;
const PAD_Y = 12;
const LAYER_GAP_Y = 44;
const COL_GAP = 50;

// ---------------------------------------------------------------------------
// Category config
// ---------------------------------------------------------------------------

export const CATEGORY_CONFIG: Record<LoCategory, { label: string; color: string; bgColor: string; icon: string }> = {
  routes:     { label: 'lo.category.routes',      color: '#1565c0', bgColor: '#e3f2fd', icon: '🔵' },
  middleware: { label: 'lo.category.middleware',   color: '#00838f', bgColor: '#e0f7fa', icon: '🟢' },
  services:   { label: 'lo.category.services',     color: '#7b1fa2', bgColor: '#f3e5f5', icon: '🟣' },
  models:     { label: 'lo.category.models',       color: '#4e342e', bgColor: '#efebe9', icon: '🟤' },
  utils:      { label: 'lo.category.utils',        color: '#546e7a', bgColor: '#eceff1', icon: '⚫' },
};

// Group dependency arrows (source → target)
const GROUP_ARROWS: Array<[LoCategory, LoCategory]> = [
  ['routes', 'middleware'],
  ['middleware', 'services'],
  ['services', 'models'],
  ['routes', 'services'],
  ['services', 'utils'],
];

// ---------------------------------------------------------------------------
// Classify a file path → category
// ---------------------------------------------------------------------------

export function classifyPath(filePath: string): LoCategory {
  const p = filePath.toLowerCase().replace(/\\/g, '/');
  if (/\/routes?\/|\/router\/|\/api\/|\/endpoints?\//.test(p)) return 'routes';
  if (/\/middlewares?\/|\/auth\/|\/guards?\//.test(p)) return 'middleware';
  if (/\/services?\/|\/handlers?\/|\/controllers?\//.test(p)) return 'services';
  if (/\/models?\/|\/db\/|\/database\/|\/entities\/|\/schemas?\/|\/migrations?\//.test(p)) return 'models';
  if (/\/utils?\/|\/helpers?\/|\/lib\/|\/tasks?\/|\/jobs?\/|\/workers?\//.test(p)) return 'utils';
  // Fallback: inspect filename for common patterns
  const fileName = p.split('/').pop() ?? '';
  if (/route|router|controller|endpoint/.test(fileName)) return 'routes';
  if (/service|handler|provider/.test(fileName)) return 'services';
  if (/model|entity|schema|migration/.test(fileName)) return 'models';
  if (/middleware|guard|auth/.test(fileName)) return 'middleware';
  return 'utils';
}

// ---------------------------------------------------------------------------
// Compute card height for N methods (with collapse)
// ---------------------------------------------------------------------------

function cardHeight(totalMethods: number, expanded: boolean): number {
  const COLLAPSE_AT = 5;
  const visibleCount = expanded ? totalMethods : Math.min(totalMethods, COLLAPSE_AT);
  const hasToggle = totalMethods > COLLAPSE_AT;
  return HEADER_H + PAD_Y + visibleCount * ROW_H + (hasToggle ? ROW_H : 0) + PAD_Y;
}

// ---------------------------------------------------------------------------
// Dagre TB layout: compute card positions
// ---------------------------------------------------------------------------

interface CardPosition {
  category: LoCategory;
  x: number;
  y: number;
}

function computeCardPositions(expandedState: Record<LoCategory, boolean>, groups: CategoryGroupData[]): Record<LoCategory, CardPosition> {
  // Layer 0: routes
  // Layer 1: middleware
  // Layer 2: services
  // Layer 3: models + utils (side by side)
  const layers: Array<LoCategory[]> = [
    ['routes'],
    ['middleware'],
    ['services'],
    ['models', 'utils'],
  ];

  const positions: Record<string, CardPosition> = {};
  let currentY = 0;

  for (const layer of layers) {
    const layerWidth = layer.length * CARD_W + (layer.length - 1) * COL_GAP;
    const startX = -layerWidth / 2;

    let maxLayerH = 0;
    layer.forEach((cat, colIdx) => {
      const group = groups.find((g) => g.category === cat);
      const totalMethods = group?.methods.length ?? 0;
      const h = cardHeight(totalMethods, expandedState[cat] ?? false);
      if (h > maxLayerH) maxLayerH = h;

      positions[cat] = {
        category: cat,
        x: startX + colIdx * (CARD_W + COL_GAP),
        y: currentY,
      };
    });

    currentY += maxLayerH + LAYER_GAP_Y;
  }

  return positions as Record<LoCategory, CardPosition>;
}

// ---------------------------------------------------------------------------
// Arrow calculation utilities
// ---------------------------------------------------------------------------

function getCardCenterBottom(pos: CardPosition, h: number): { x: number; y: number } {
  return { x: pos.x + CARD_W / 2, y: pos.y + h };
}

function getCardCenterTop(pos: CardPosition): { x: number; y: number } {
  return { x: pos.x + CARD_W / 2, y: pos.y };
}

function getCardRightMiddle(pos: CardPosition, h: number): { x: number; y: number } {
  return { x: pos.x + CARD_W, y: pos.y + h / 2 };
}

function getCardLeftMiddle(pos: CardPosition, h: number): { x: number; y: number } {
  return { x: pos.x, y: pos.y + h / 2 };
}

// ---------------------------------------------------------------------------
// Single card component
// ---------------------------------------------------------------------------

interface CategoryCardProps {
  group: CategoryGroupData;
  position: CardPosition;
  expanded: boolean;
  onToggle: () => void;
  onMethodClick: (name: string) => void;
}

const COLLAPSE_AT = 5;

function CategoryCard({ group, position, expanded, onToggle, onMethodClick }: CategoryCardProps) {
  const { t } = useTranslation();
  const { category, label, color, bgColor, icon, methods } = group;
  const resolvedLabel = t(label, { defaultValue: label });
  const totalMethods = methods.length;
  const hasToggle = totalMethods > COLLAPSE_AT;
  const visibleMethods = expanded ? methods : methods.slice(0, COLLAPSE_AT);
  const h = cardHeight(totalMethods, expanded);

  const cardStyle: CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: CARD_W,
    height: h,
    background: '#ffffff',
    border: `1.5px solid ${color}`,
    borderRadius: 8,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    userSelect: 'none',
    fontFamily: "'Inter', sans-serif",
  };

  const headerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 10px',
    height: HEADER_H,
    background: bgColor,
    borderBottom: `1px solid ${color}22`,
  };

  const dotStyle: CSSProperties = {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  };

  const labelStyle: CSSProperties = {
    flex: 1,
    fontWeight: 600,
    fontSize: 11,
    color: color,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const countStyle: CSSProperties = {
    fontSize: 10,
    color: '#757575',
    background: 'rgba(0,0,0,0.06)',
    borderRadius: 10,
    padding: '1px 5px',
    flexShrink: 0,
  };

  const methodRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    height: ROW_H,
    fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#1a1a2e',
    cursor: 'pointer',
    borderBottom: '1px solid #f5f5f5',
    transition: 'background 0.1s',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const toggleRowStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
    height: ROW_H,
    fontSize: 10,
    color: color,
    cursor: 'pointer',
    background: bgColor + '55',
    gap: 4,
  };

  void category; // suppress unused
  void icon;

  return (
    <div style={cardStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={dotStyle} />
        <span style={labelStyle}>{resolvedLabel}</span>
        <span style={countStyle}>{totalMethods}</span>
        <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      </div>
      {/* Method rows */}
      <div style={{ padding: `${PAD_Y / 2}px 0` }}>
        {visibleMethods.map((m) => (
          <div
            key={m.nodeId}
            style={{
              ...methodRowStyle,
              ...(m.hasChain ? {} : { color: '#999', cursor: 'default' }),
            }}
            onClick={() => m.hasChain && onMethodClick(m.name)}
            onMouseEnter={(e) => {
              if (m.hasChain) (e.currentTarget as HTMLDivElement).style.background = bgColor + '88';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '';
            }}
            title={m.hasChain
              ? `${m.name} — ${m.filePath}`
              : `${m.name} — ${m.filePath} (${t('lo.noChain')})`}
          >
            {m.hasChain && <span style={{ marginRight: 4, fontSize: 10 }}>★</span>}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.name.endsWith('()') ? m.name : `${m.name}()`}
            </span>
            {!m.hasChain && <span style={{ marginLeft: 'auto', fontSize: 9, color: '#bbb', flexShrink: 0, paddingLeft: 4 }}>{m.filePath.split('/').pop()}</span>}
          </div>
        ))}
        {hasToggle && (
          <div style={toggleRowStyle} onClick={onToggle}>
            <span style={{ fontSize: 10 }}>{expanded ? '▲' : '▼'}</span>
            <span>
              {expanded ? t('lo.collapse') : t('lo.expandMore', { count: totalMethods - COLLAPSE_AT })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG arrows between cards
// ---------------------------------------------------------------------------

interface ArrowsProps {
  arrows: Array<[LoCategory, LoCategory]>;
  positions: Record<LoCategory, CardPosition>;
  expandedState: Record<LoCategory, boolean>;
  groups: CategoryGroupData[];
  totalW: number;
  totalH: number;
  offsetX: number;
  offsetY: number;
}

function GroupArrows({ arrows, positions, expandedState, groups, totalW, totalH, offsetX, offsetY }: ArrowsProps) {
  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: totalW,
        height: totalH,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        <marker id="lo-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="#bbb" />
        </marker>
      </defs>
      {arrows.map(([from, to]) => {
        const fromPos = positions[from];
        const toPos = positions[to];
        if (!fromPos || !toPos) return null;

        const fromGroup = groups.find((g) => g.category === from);
        const toGroup = groups.find((g) => g.category === to);
        const fromH = cardHeight(fromGroup?.methods.length ?? 0, expandedState[from] ?? false);
        const toH = cardHeight(toGroup?.methods.length ?? 0, expandedState[to] ?? false);

        // Decide direction based on relative position
        const fromCenterX = fromPos.x + CARD_W / 2;
        const toCenterX = toPos.x + CARD_W / 2;
        const fromCenterY = fromPos.y + fromH / 2;
        const toCenterY = toPos.y + toH / 2;

        let x1: number, y1: number, x2: number, y2: number;

        if (Math.abs(toCenterY - fromCenterY) > Math.abs(toCenterX - fromCenterX)) {
          // Vertical connection: bottom → top
          const src = getCardCenterBottom(fromPos, fromH);
          const dst = getCardCenterTop(toPos);
          x1 = src.x + offsetX;
          y1 = src.y + offsetY;
          x2 = dst.x + offsetX;
          y2 = dst.y + offsetY;
        } else {
          // Horizontal connection: right → left (or left → right)
          if (fromCenterX < toCenterX) {
            const src = getCardRightMiddle(fromPos, fromH);
            const dst = getCardLeftMiddle(toPos, toH);
            x1 = src.x + offsetX;
            y1 = src.y + offsetY;
            x2 = dst.x + offsetX;
            y2 = dst.y + offsetY;
          } else {
            const src = getCardLeftMiddle(fromPos, fromH);
            const dst = getCardRightMiddle(toPos, toH);
            x1 = src.x + offsetX;
            y1 = src.y + offsetY;
            x2 = dst.x + offsetX;
            y2 = dst.y + offsetY;
          }
        }

        // Bezier control points
        const midY = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

        return (
          <path
            key={`${from}-${to}`}
            d={d}
            fill="none"
            stroke="#bbb"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.6}
            markerEnd="url(#lo-arrow)"
          />
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LOCategoryGroup({ graphNodes, graphEdges, endpointGraph, onMethodClick }: LOCategoryGroupProps) {
  const { t } = useTranslation();
  // Suppress unused
  void graphEdges;

  // Collapse/expand state per category
  const [expandedState, setExpandedState] = useState<Record<LoCategory, boolean>>({
    routes: false,
    middleware: false,
    services: false,
    models: false,
    utils: false,
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // ---------------------------------------------------------------------------
  // Build category groups from graphNodes + endpointGraph
  // ---------------------------------------------------------------------------

  const groups = useMemo<CategoryGroupData[]>(() => {
    const methodMap = new Map<LoCategory, MethodItem[]>();
    (Object.keys(CATEGORY_CONFIG) as LoCategory[]).forEach((cat) => methodMap.set(cat, []));

    // Build a set of method labels that appear in endpoint chains (clickable)
    const chainMethodLabels = new Set<string>();
    if (endpointGraph) {
      for (const en of endpointGraph.nodes) {
        if (en.kind === 'method' || en.kind === 'handler') {
          chainMethodLabels.add(en.label.replace(/\(\)$/, ''));
        }
      }
    }

    // Collect from graphNodes (function/method nodes)
    graphNodes
      .filter((n) => n.type === 'function' || n.metadata?.kind === 'method' || n.metadata?.kind === 'function')
      .forEach((n) => {
        const cat = classifyPath(n.filePath);
        methodMap.get(cat)!.push({
          name: n.label,
          filePath: n.filePath,
          nodeId: n.id,
          hasChain: chainMethodLabels.has(n.label.replace(/\(\)$/, '')),
        });
      });

    // Also collect from endpointGraph nodes (method + handler only — NOT 'endpoint' which are API paths)
    if (endpointGraph) {
      endpointGraph.nodes
        .filter((en) => en.kind === 'method' || en.kind === 'handler')
        .forEach((en) => {
          const cat = classifyPath(en.filePath);
          const list = methodMap.get(cat)!;
          // Deduplicate by name+filePath
          const dup = list.some((m) => m.name === en.label && m.filePath === en.filePath);
          if (!dup) {
            list.push({
              name: en.label,
              filePath: en.filePath,
              nodeId: en.id,
              hasChain: true,
            });
          }
        });
    }

    // Sort: methods with chains first (★), then alphabetically
    for (const [, list] of methodMap) {
      list.sort((a, b) => {
        if (a.hasChain && !b.hasChain) return -1;
        if (!a.hasChain && b.hasChain) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return (Object.keys(CATEGORY_CONFIG) as LoCategory[]).map((cat) => ({
      category: cat,
      ...CATEGORY_CONFIG[cat],
      methods: methodMap.get(cat) ?? [],
    }));
  }, [graphNodes, endpointGraph]);

  // ---------------------------------------------------------------------------
  // Layout: compute positions
  // ---------------------------------------------------------------------------

  const positions = useMemo(
    () => computeCardPositions(expandedState, groups),
    [expandedState, groups],
  );

  // ---------------------------------------------------------------------------
  // Compute bounding box for the SVG/container
  // ---------------------------------------------------------------------------

  const { minX, minY, maxX, maxY } = useMemo(() => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (Object.keys(positions) as LoCategory[]).forEach((cat) => {
      const pos = positions[cat];
      const group = groups.find((g) => g.category === cat);
      const h = cardHeight(group?.methods.length ?? 0, expandedState[cat] ?? false);
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
      if (pos.x + CARD_W > maxX) maxX = pos.x + CARD_W;
      if (pos.y + h > maxY) maxY = pos.y + h;
    });
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 600; maxY = 400; }
    return { minX, minY, maxX, maxY };
  }, [positions, groups, expandedState]);

  const PADDING = 40;
  const totalW = maxX - minX + PADDING * 2;
  const totalH = maxY - minY + PADDING * 2;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  // Toggle expand/collapse for a category
  const handleToggle = useCallback((cat: LoCategory) => {
    setExpandedState((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  // Fit scroll on mount — defer to after layout paint so clientWidth is available
  useEffect(() => {
    requestAnimationFrame(() => {
      if (containerRef.current) {
        const cw = containerRef.current.clientWidth;
        containerRef.current.scrollLeft = cw > 0 ? Math.max(0, (totalW - cw) / 2) : 0;
        containerRef.current.scrollTop = 0;
      }
    });
  // totalW is stable on mount; re-run if it changes significantly (expand/collapse handled via state)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  const totalMethods = groups.reduce((sum, g) => sum + g.methods.length, 0);

  if (totalMethods === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9e9e9e',
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 28 }}>🔍</span>
        <span>{t('lo.emptyTitle')}</span>
        <span style={{ fontSize: 11, color: '#bdbdbd' }}>{t('lo.emptyHint')}</span>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        overflow: 'auto',
        position: 'relative',
        backgroundColor: THEME.bgPaper,
        backgroundImage: `linear-gradient(to right, ${canvasTheme.reactFlowBackground.color} 1px, transparent 1px), linear-gradient(to bottom, ${canvasTheme.reactFlowBackground.color} 1px, transparent 1px)`,
        backgroundSize: `${canvasTheme.reactFlowBackground.gap}px ${canvasTheme.reactFlowBackground.gap}px`,
      }}
    >
      {/* SVG arrows layer */}
      <div
        style={{
          position: 'relative',
          width: totalW,
          height: totalH,
          minWidth: '100%',
          minHeight: '100%',
        }}
      >
        <GroupArrows
          arrows={GROUP_ARROWS}
          positions={positions}
          expandedState={expandedState}
          groups={groups}
          totalW={totalW}
          totalH={totalH}
          offsetX={offsetX}
          offsetY={offsetY}
        />
        {/* Cards */}
        {groups.map((group) => {
          const pos = positions[group.category];
          const adjustedPos: CardPosition = {
            category: group.category,
            x: pos.x + offsetX,
            y: pos.y + offsetY,
          };
          return (
            <CategoryCard
              key={group.category}
              group={group}
              position={adjustedPos}
              expanded={expandedState[group.category] ?? false}
              onToggle={() => handleToggle(group.category)}
              onMethodClick={(name) => onMethodClick(name, group.category)}
            />
          );
        })}
      </div>
    </div>
  );
}
