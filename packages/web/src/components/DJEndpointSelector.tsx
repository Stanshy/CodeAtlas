/**
 * CodeAtlas — DJEndpointSelector
 *
 * Initial DJ screen: endpoint cards organized by URL prefix category.
 * Users pick an API endpoint to begin the stagger-animation journey playback.
 *
 * Auto-categorization rules:
 *   PATH /api/vN/videos/... -> prefix "videos" -> Videos  #1565c0
 *   PATH /api/vN/auth/...   -> prefix "auth"   -> Auth    #00838f
 *   PATH /api/vN/billing/.. -> prefix "billing"-> Billing #7b1fa2
 *   anything else           -> prefix "api"    -> API     #546e7a
 *
 * Sprint 13 — T6
 */

import { memo, useMemo, useState, useEffect, useRef, type CSSProperties } from 'react';
import { THEME, canvas as canvasTheme } from '../styles/theme';
import type { EndpointGraph, EndpointChain, DJChainStep } from '../types/graph';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DJEndpointSelectorProps {
  endpointGraph: EndpointGraph;
  onEndpointClick: (endpointId: string, chain: EndpointChain) => void;
}

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------

interface CategoryMeta {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  videos:        { key: 'videos',        label: 'Videos',        icon: '🎬', color: '#1565c0' },
  auth:          { key: 'auth',          label: 'Auth',          icon: '🔐', color: '#00838f' },
  billing:       { key: 'billing',       label: 'Billing',       icon: '💳', color: '#7b1fa2' },
  users:         { key: 'users',         label: 'Users',         icon: '👤', color: '#2e7d32' },
  admin:         { key: 'admin',         label: 'Admin',         icon: '⚙️', color: '#e65100' },
  dashboard:     { key: 'dashboard',     label: 'Dashboard',     icon: '📊', color: '#1565c0' },
  projects:      { key: 'projects',      label: 'Projects',      icon: '📁', color: '#4527a0' },
  subscriptions: { key: 'subscriptions', label: 'Subscriptions', icon: '🔄', color: '#ad1457' },
  webhooks:      { key: 'webhooks',      label: 'Webhooks',      icon: '🔗', color: '#00695c' },
  system:        { key: 'system',        label: 'System',        icon: '🖥️', color: '#37474f' },
  health:        { key: 'health',        label: 'Health',        icon: '💚', color: '#2e7d32' },
  referral:      { key: 'referral',      label: 'Referral',      icon: '🎁', color: '#558b2f' },
  share:         { key: 'share',         label: 'Share',         icon: '🔗', color: '#00897b' },
  anonymous:     { key: 'anonymous',     label: 'Anonymous',     icon: '👤', color: '#78909c' },
  transcript:    { key: 'transcript',    label: 'Transcript',    icon: '📝', color: '#5d4037' },
  relay:         { key: 'relay',         label: 'Relay',         icon: '📡', color: '#455a64' },
  api:           { key: 'api',           label: 'API',           icon: '📡', color: '#546e7a' },
};

export function parseUrlPrefix(methodPath: string): string {
  // "POST /api/v1/videos/upload" → "videos"
  // "GET /api/v2/auth/google"    → "auth"
  const match = methodPath.match(/\/api\/v\d+\/([^/]+)/);
  if (match && match[1]) {
    const prefix = match[1].toLowerCase();
    if (prefix in CATEGORY_META) return prefix;
    return 'api';
  }
  // Flat URL: extract first meaningful path segment
  // "GET /auth/me" → parts=["auth","me"] → "auth"
  // "POST /users"  → parts=["users"]     → "users"
  const parts = methodPath.replace(/^[A-Z]+ /, '').split('/').filter(Boolean);
  // Skip version-like segments (v1, v2, etc.)
  for (const seg of parts) {
    const s = seg.toLowerCase();
    if (/^v\d+$/.test(s)) continue; // skip version prefix
    if (s === 'api') continue;       // skip generic 'api' prefix
    if (s in CATEGORY_META) return s;
    // First non-version, non-api segment — create a dynamic category
    if (s.length > 1 && !/^\{.*\}$/.test(s) && !/^\d+$/.test(s)) {
      // Auto-register unknown prefix so it groups properly
      if (!(s in CATEGORY_META)) {
        CATEGORY_META[s] = { key: s, label: s.charAt(0).toUpperCase() + s.slice(1), icon: '📂', color: '#546e7a' };
      }
      return s;
    }
  }
  return 'api';
}

// ---------------------------------------------------------------------------
// Build synthetic EndpointChain from EndpointNode (when no real chain data)
// ---------------------------------------------------------------------------

function buildSyntheticChain(node: EndpointGraph['nodes'][number]): EndpointChain {
  // When the API doesn't provide chain detail, synthesize a minimal chain
  // so the DJ panel still has something to render.
  const httpMethod = node.method ?? 'GET';
  const path = node.path ?? node.label;
  const stepCount = 3;
  const steps: DJChainStep[] = Array.from({ length: stepCount }, (_, i) => ({
    name: `step_${i + 1}()`,
    desc: `處理步驟 ${i + 1}`,
    method: `step_${i + 1}()`,
    file: node.filePath,
  }));
  return {
    id: node.id,
    method: httpMethod,
    path,
    desc: node.label,
    steps,
  };
}

// ---------------------------------------------------------------------------
// Endpoint card item
// ---------------------------------------------------------------------------

interface EndpointCardProps {
  node: EndpointGraph['nodes'][number];
  chain: EndpointChain;
  categoryColor: string;
  onSelect: (id: string, chain: EndpointChain) => void;
}

const EndpointCard = memo(function EndpointCard({
  node,
  chain,
  categoryColor,
  onSelect,
}: EndpointCardProps) {
  const [hovered, setHovered] = useState(false);
  const [pulseVisible, setPulseVisible] = useState(false);

  // Stagger the pulse animation start per card
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    pulseTimerRef.current = setTimeout(() => setPulseVisible(true), Math.random() * 1200);
    return () => { if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current); };
  }, []);

  const httpMethod = node.method ?? chain.method ?? 'GET';
  const path = node.path ?? chain.path ?? node.label;
  const stepCount = chain.steps.length;

  // Color method badge
  const methodColor =
    httpMethod === 'POST' ? '#e65100' :
    httpMethod === 'PUT'  ? '#7b1fa2' :
    httpMethod === 'DELETE' ? '#c62828' :
    '#1565c0'; // GET and others

  const cardStyle: CSSProperties = {
    position: 'relative',
    width: 260,
    minHeight: 64,
    background: '#ffffff',
    border: hovered
      ? `1.5px solid ${THEME.djBorder}`
      : `1.5px dashed ${THEME.djBorder}`,
    borderRadius: THEME.radiusSm,
    padding: '8px 10px 8px 14px',
    cursor: 'pointer',
    transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hovered
      ? '0 6px 20px rgba(46,125,50,0.18), 0 0 0 1px rgba(46,125,50,0.08)'
      : THEME.shadowCard,
    transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out, border 0.15s ease-out',
    overflow: 'hidden',
    userSelect: 'none',
  };

  // Left category color bar
  const barStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    background: categoryColor,
    borderRadius: `${THEME.radiusSm} 0 0 ${THEME.radiusSm}`,
  };

  const methodBadgeStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 700,
    fontFamily: THEME.fontMono,
    color: methodColor,
    background: `${methodColor}18`,
    border: `1px solid ${methodColor}40`,
    borderRadius: 3,
    padding: '1px 4px',
    marginRight: 5,
    letterSpacing: '0.03em',
  };

  const pathStyle: CSSProperties = {
    fontFamily: THEME.fontMono,
    fontSize: 11,
    color: THEME.inkPrimary,
    fontWeight: 600,
    lineHeight: 1.35,
    wordBreak: 'break-all',
  };

  const descStyle: CSSProperties = {
    fontSize: 10,
    color: THEME.inkMuted,
    marginTop: 3,
    fontFamily: THEME.fontUi,
  };

  const badgeStyle: CSSProperties = {
    display: 'inline-block',
    fontSize: 9,
    fontWeight: 600,
    fontFamily: THEME.fontUi,
    color: THEME.djBorder,
    background: THEME.djBg,
    border: `1px solid #a5d6a7`,
    borderRadius: 10,
    padding: '1px 6px',
    marginTop: 3,
  };

  // Pulse ring (CSS animation via inline keyframes workaround)
  const pulseStyle: CSSProperties = pulseVisible && !hovered ? {
    position: 'absolute',
    inset: -3,
    borderRadius: THEME.radiusSm,
    border: `1.5px solid ${THEME.djBorder}`,
    opacity: 0,
    animation: 'dj-card-pulse 2s ease-out infinite',
    pointerEvents: 'none',
  } : { display: 'none' };

  return (
    <div
      style={cardStyle}
      onClick={() => onSelect(node.id, chain)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      aria-label={`選擇端點 ${httpMethod} ${path}`}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(node.id, chain); }}
    >
      <div style={barStyle} />
      <div style={pulseStyle} />
      <div style={pathStyle}>
        <span style={methodBadgeStyle}>{httpMethod}</span>
        {path}
      </div>
      {node.label && node.label !== path && (
        <div style={descStyle}>{node.label}</div>
      )}
      <div style={badgeStyle}>{stepCount} 個步驟</div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Category group
// ---------------------------------------------------------------------------

interface CategoryGroupProps {
  meta: CategoryMeta;
  nodes: EndpointGraph['nodes'];
  chains: Map<string, EndpointChain>;
  onSelect: (id: string, chain: EndpointChain) => void;
}

const CategoryGroup = memo(function CategoryGroup({
  meta,
  nodes,
  chains,
  onSelect,
}: CategoryGroupProps) {
  const groupHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `2px solid ${meta.color}30`,
  };

  const groupLabelStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    fontFamily: THEME.fontUi,
    color: meta.color,
    letterSpacing: '0.01em',
  };

  const countStyle: CSSProperties = {
    fontSize: 11,
    color: THEME.inkMuted,
    fontFamily: THEME.fontUi,
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 260px)',
    gap: '10px 12px',
  };

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={groupHeaderStyle}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <span style={groupLabelStyle}>{meta.label}</span>
        <span style={countStyle}>({nodes.length})</span>
      </div>
      <div style={gridStyle}>
        {nodes.map((node) => {
          const chain = chains.get(node.id) ?? buildSyntheticChain(node);
          return (
            <EndpointCard
              key={node.id}
              node={node}
              chain={chain}
              categoryColor={meta.color}
              onSelect={onSelect}
            />
          );
        })}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// DJEndpointSelector
// ---------------------------------------------------------------------------

export const DJEndpointSelector = memo(function DJEndpointSelector({
  endpointGraph,
  onEndpointClick,
}: DJEndpointSelectorProps) {
  // Build category → nodes map
  const { groups, categoryOrder } = useMemo(() => {
    const groupMap = new Map<string, EndpointGraph['nodes']>();
    for (const node of endpointGraph.nodes) {
      // Only show endpoint-kind nodes as selectable journeys
      if (node.kind !== 'endpoint') continue;
      const methodPath = node.method
        ? `${node.method} ${node.path ?? node.label}`
        : node.path ?? node.label;
      const prefix = parseUrlPrefix(methodPath);
      if (!groupMap.has(prefix)) groupMap.set(prefix, []);
      groupMap.get(prefix)!.push(node);
    }
    // Stable order: known prefixes first, then unknown alphabetically
    const KNOWN_ORDER = ['videos', 'auth', 'billing', 'users', 'admin', 'dashboard', 'referral', 'health', 'subscriptions', 'system', 'api'];
    const allKeys = Array.from(groupMap.keys());
    const ordered = [
      ...KNOWN_ORDER.filter((k) => groupMap.has(k)),
      ...allKeys.filter((k) => !KNOWN_ORDER.includes(k)).sort(),
    ];
    return { groups: groupMap, categoryOrder: ordered };
  }, [endpointGraph.nodes]);

  // Build chain lookup: for real data the chain should come from endpointGraph.
  // Since EndpointGraph currently stores flat nodes/edges, we synthesize chains
  // from nodes tagged as 'endpoint' by BFS-traversing the edges.
  const chainMap = useMemo<Map<string, EndpointChain>>(() => {
    const map = new Map<string, EndpointChain>();

    // Build adjacency for BFS
    const adj = new Map<string, string[]>();
    for (const edge of endpointGraph.edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, []);
      adj.get(edge.source)!.push(edge.target);
    }

    const nodeById = new Map(endpointGraph.nodes.map((n) => [n.id, n]));

    for (const node of endpointGraph.nodes) {
      if (node.kind !== 'endpoint') continue;

      // BFS to collect ordered step nodes
      const visited = new Set<string>();
      const queue = [node.id];
      visited.add(node.id);
      const stepNodes: EndpointGraph['nodes'] = [];

      while (queue.length > 0) {
        const curr = queue.shift()!;
        const currNode = nodeById.get(curr);
        if (currNode && currNode.kind !== 'endpoint') {
          stepNodes.push(currNode);
        }
        for (const neighbor of adj.get(curr) ?? []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      const steps: DJChainStep[] = stepNodes.map((sn) => ({
        name: sn.label,
        desc: sn.label,
        method: sn.label,
        file: sn.filePath,
      }));

      // Fall back to synthetic if no connected steps found
      if (steps.length === 0) {
        map.set(node.id, buildSyntheticChain(node));
      } else {
        map.set(node.id, {
          id: node.id,
          method: node.method ?? 'GET',
          path: node.path ?? node.label,
          desc: node.label,
          steps,
        });
      }
    }

    return map;
  }, [endpointGraph]);

  // Match React Flow canvas background: paper color + grid lines
  const gridGap = canvasTheme.reactFlowBackground.gap;
  const gridColor = canvasTheme.reactFlowBackground.color;
  const containerStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 30,
    backgroundColor: THEME.bgPaper,
    backgroundImage: `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`,
    backgroundSize: `${gridGap}px ${gridGap}px`,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
    padding: '28px 32px',
  };

  const titleStyle: CSSProperties = {
    fontSize: 17,
    fontWeight: 700,
    color: THEME.inkPrimary,
    fontFamily: THEME.fontUi,
    marginBottom: 4,
  };

  const subtitleStyle: CSSProperties = {
    fontSize: 12,
    color: THEME.inkMuted,
    fontFamily: THEME.fontUi,
    marginBottom: 28,
  };

  const noEndpointsStyle: CSSProperties = {
    textAlign: 'center',
    padding: '60px 20px',
    fontSize: 13,
    color: THEME.inkMuted,
    fontFamily: THEME.fontUi,
    lineHeight: 1.6,
  };

  const hasEndpoints = categoryOrder.length > 0;

  return (
    <>
      {/* Keyframe injection for pulse animation */}
      <style>{`
        @keyframes dj-card-pulse {
          0%   { opacity: 0.55; transform: scale(1); }
          70%  { opacity: 0; transform: scale(1.06); }
          100% { opacity: 0; transform: scale(1.06); }
        }
      `}</style>
      <div style={containerStyle}>
        <div style={titleStyle}>選擇 API 端點 — 資料旅程</div>
        <div style={subtitleStyle}>
          點擊下方端點卡片，以 stagger 動畫逐步追蹤資料流路徑
        </div>

        {!hasEndpoints ? (
          <div style={noEndpointsStyle}>
            此專案未偵測到 API 端點，顯示檔案級資料流
          </div>
        ) : (
          categoryOrder.map((key) => {
            const meta = CATEGORY_META[key] ?? { key, label: key, icon: '📡', color: '#546e7a' };
            const nodes = groups.get(key) ?? [];
            return (
              <CategoryGroup
                key={key}
                meta={meta}
                nodes={nodes}
                chains={chainMap}
                onSelect={onEndpointClick}
              />
            );
          })
        )}
      </div>
    </>
  );
});
