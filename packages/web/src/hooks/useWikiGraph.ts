/**
 * CodeAtlas Web — useWikiGraph Hook
 *
 * Fetches the wiki manifest, builds a D3 force simulation, and exposes
 * interactive state (selection, hover, zoom, level visibility) to the
 * WikiGraph component.
 *
 * Sprint 19 — T13: Wiki Knowledge Graph Tab
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceRadial,
  type Simulation,
} from 'd3-force';
import { fetchWikiManifest } from '../api/wiki';
import type {
  WikiManifest,
  WikiSimNode,
  WikiSimLink,
  WikiPageMeta,
} from '../types/wiki';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RADIUS_BY_TYPE: Record<string, number> = {
  architecture: 16,
  pattern:      12,
  feature:      14,
  integration:  10,
  concept:       8,
};

const LINK_DISTANCE = 45;
const CHARGE_STRENGTH = -40;

/** Compute node radius based on type */
function nodeRadius(node: WikiPageMeta): number {
  return RADIUS_BY_TYPE[node.type] ?? 10;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface WikiGraphState {
  /** Whether the initial manifest fetch is in flight */
  isLoading: boolean;
  /** Null = network/server error. 'not_generated' = wiki never built. */
  manifestStatus: 'ready' | 'not_generated' | 'error' | null;
  /** All visible nodes */
  visibleNodes: WikiSimNode[];
  /** All visible links */
  visibleLinks: WikiSimLink[];
  /** All nodes (for the simulation) */
  allNodes: WikiSimNode[];
  /** Currently selected node slug */
  selectedSlug: string | null;
  /** Currently hovered node slug */
  hoveredSlug: string | null;
  /** Total page count (for tab badge) */
  totalCount: number;
  /** Tick counter — increments on each simulation tick to trigger re-render */
  tick: number;
  /** Select a node (click) */
  selectNode: (slug: string | null) => void;
  /** Hover a node */
  hoverNode: (slug: string | null) => void;
  /** Fix a node position (drag start) */
  fixNode: (slug: string, x: number, y: number) => void;
  /** Release a fixed node (drag end) */
  releaseNode: (slug: string) => void;
  /** Move a fixed node during drag */
  dragNode: (slug: string, x: number, y: number) => void;
  /** Reheat the simulation */
  reheat: () => void;
  /** Re-fetch manifest (e.g. after wiki generation) */
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWikiGraph(
  width: number,
  height: number,
): WikiGraphState {
  const [isLoading, setIsLoading] = useState(true);
  const [manifest, setManifest] = useState<WikiManifest | null>(null);
  const [manifestStatus, setManifestStatus] = useState<'ready' | 'not_generated' | 'error' | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Mutable node array that d3-force writes position into
  const simNodesRef = useRef<WikiSimNode[]>([]);
  const simLinksRef = useRef<WikiSimLink[]>([]);
  const simRef = useRef<Simulation<WikiSimNode, WikiSimLink> | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch manifest
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const result = await fetchWikiManifest();

      if (cancelled) return;

      if (result === null) {
        setManifestStatus('error');
        setIsLoading(false);
        return;
      }

      if (result.status === 'not_generated') {
        setManifestStatus('not_generated');
        setIsLoading(false);
        return;
      }

      setManifest(result);
      setManifestStatus('ready');
      setIsLoading(false);
    };

    void load();
    return () => { cancelled = true; };
  }, [fetchTrigger]);

  // ---------------------------------------------------------------------------
  // Build simulation nodes + links when manifest arrives
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!manifest) return;

    // Build WikiSimNode array — scatter initial positions near centre
    const cx = width / 2;
    const cy = height / 2;
    const nodes: WikiSimNode[] = manifest.pages.map((page) => ({
      ...page,
      radius: nodeRadius(page),
      x: cx + (Math.random() - 0.5) * 200,
      y: cy + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));

    // Index by slug for link resolution
    const bySlug = new Map<string, WikiSimNode>(nodes.map((n) => [n.slug, n]));

    // Build link array from manifest.nodes (each node carries its own edges
    // with targetSlug). The flattened manifest.edges loses source context,
    // so we reconstruct links from nodes to preserve source→target mapping.
    const links: WikiSimLink[] = [];
    if (manifest.nodes) {
      for (const srcNode of manifest.nodes) {
        for (const edge of srcNode.edges) {
          if (edge.targetSlug && bySlug.has(srcNode.slug) && bySlug.has(edge.targetSlug)) {
            links.push({
              source: srcNode.slug,
              target: edge.targetSlug,
              relation: edge.label,
            });
          }
        }
      }
    }

    simNodesRef.current = nodes;
    simLinksRef.current = links;

    // Stop existing simulation
    simRef.current?.stop();

    // Compact radius: scale with node count so larger graphs stay tight
    const compactRadius = Math.min(width, height) * 0.25;

    const sim = forceSimulation<WikiSimNode, WikiSimLink>(nodes)
      .force(
        'link',
        forceLink<WikiSimNode, WikiSimLink>(links)
          .id((d) => d.slug)
          .distance(LINK_DISTANCE)
          .strength(0.7),
      )
      .force('charge', forceManyBody<WikiSimNode>().strength(CHARGE_STRENGTH))
      .force('center', forceCenter<WikiSimNode>(cx, cy).strength(0.2))
      .force('radial', forceRadial<WikiSimNode>(compactRadius, cx, cy).strength(0.08))
      .force('collision', forceCollide<WikiSimNode>().radius((d) => d.radius + 4))
      .velocityDecay(0.4)
      .on('tick', () => {
        setTick((t) => t + 1);
      })
      .on('end', () => {
        setTick((t) => t + 1);
      });

    simRef.current = sim;

    return () => {
      sim.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manifest]);

  // ---------------------------------------------------------------------------
  // Visible nodes/links — all nodes are always visible
  // ---------------------------------------------------------------------------
  const { visibleNodes, visibleLinks } = useMemo(() => {
    return { visibleNodes: simNodesRef.current, visibleLinks: simLinksRef.current };
    // Re-compute whenever tick changes (node positions updated)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // ---------------------------------------------------------------------------
  // Interaction handlers
  // ---------------------------------------------------------------------------

  const selectNode = useCallback((slug: string | null) => {
    setSelectedSlug(slug);
  }, []);

  const hoverNode = useCallback((slug: string | null) => {
    setHoveredSlug(slug);
  }, []);

  const fixNode = useCallback((slug: string, x: number, y: number) => {
    const node = simNodesRef.current.find((n) => n.slug === slug);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
    simRef.current?.alphaTarget(0.3).restart();
  }, []);

  const releaseNode = useCallback((slug: string) => {
    const node = simNodesRef.current.find((n) => n.slug === slug);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    simRef.current?.alphaTarget(0);
  }, []);

  const dragNode = useCallback((slug: string, x: number, y: number) => {
    const node = simNodesRef.current.find((n) => n.slug === slug);
    if (node) {
      node.fx = x;
      node.fy = y;
    }
  }, []);

  const reheat = useCallback(() => {
    simRef.current?.alpha(0.5).restart();
  }, []);

  return {
    isLoading,
    manifestStatus,
    visibleNodes,
    visibleLinks,
    allNodes: simNodesRef.current,
    selectedSlug,
    hoveredSlug,
    totalCount: manifest?.pages.length ?? 0,
    tick,
    selectNode,
    hoverNode,
    fixNode,
    releaseNode,
    dragNode,
    reheat,
    refetch: useCallback(() => setFetchTrigger((n) => n + 1), []),
  };
}
