/**
 * CodeAtlas — Graph3DCanvas Component
 *
 * Encapsulates 3d-force-graph using useRef + useEffect (imperative API).
 * Renders a 3D force-directed graph with neon sphere nodes and glowing edges.
 *
 * Sprint 4 — T3: 3d-force-graph Integration
 * Sprint 5 — T4: 3D edge symbol label (Canvas-texture sprite on link hover)
 * Sprint 5 — T5: path tracing highlight (tracingPath / tracingEdges props)
 * Sprint 5 — T7: heatmap edge width/opacity (isHeatmapEnabled prop)
 * Sprint 9 — T12: view mode filtering, E2E tracing highlight, display preferences
 * Sprint 17 — T7: refactored — pure helpers → utils/three-scene-helpers.ts,
 *                              highlight effects → hooks/use3DHighlightEffects.ts
 * Design: .knowledge/sprint5-dataflow-architecture.md §6.2, §10
 */

import { useRef, useEffect, useMemo } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { applyPerspective, applyCuration } from '../adapters/graph-adapter';
import ForceGraph3D from '3d-force-graph';
import type { ForceGraph3DInstance } from '3d-force-graph';
import type { NodeObject, LinkObject } from '3d-force-graph';
import * as THREE from 'three';
import { threeD } from '../styles/theme';
import type { HeatmapStyle } from '../hooks/useHeatmap';
import type { GraphNode, GraphEdge } from '../types/graph';
import type { CameraPresetName } from '../contexts/ViewStateContext';
import { hexToRgba } from '../utils/three-helpers';
import {
  createGlowTexture,
  createTextSprite,
  buildNodeObject,
  addSpatialReference,
  getLinkParticleColor,
  getLinkParticleWidth,
  FUNC_EMISSIVE,
  FUNC_GLOW_COLOR,
  CLASS_GLOW_COLOR,
  type FG3DNode,
  type FG3DLink,
  type GlowTextureMap,
} from '../utils/three-scene-helpers';
import { use3DHighlightEffects } from '../hooks/use3DHighlightEffects';
import { useGraphAdjacency } from '../hooks/useGraphAdjacency';
import { useHighlightPriority } from '../hooks/useHighlightPriority';

// ---------------------------------------------------------------------------
// Typed instance using the base NodeObject/LinkObject generics
// ---------------------------------------------------------------------------

type GraphInstance = ForceGraph3DInstance<NodeObject, LinkObject<NodeObject>>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface Graph3DCanvasProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string | null) => void;
  focusNodeId?: string | null;
  onFocusComplete?: () => void;
  hoveredNodeId?: string | null;
  selectedNodeId?: string | null;
  cameraPreset?: CameraPresetName;
  onCameraPresetApplied?: () => void;
  /** Currently hovered edge ID (from ViewStateContext) */
  hoveredEdgeId?: string | null;
  /** Callback when user hovers over/off a link (Sprint 5 T4) */
  onEdgeHover?: (edgeId: string | null) => void;
  // --- Sprint 5 T5: path tracing ---
  /** Symbol currently being traced (null = not tracing) */
  tracingSymbol?: string | null;
  /** Ordered node IDs on the traced path */
  tracingPath?: string[];
  /** Edge IDs on the traced path */
  tracingEdges?: string[];
  // --- Sprint 5 T7: heatmap ---
  /** Whether the heatmap is currently enabled */
  isHeatmapEnabled?: boolean;
  /** Per-edge heatmap style lookup: importedSymbols.length → HeatmapStyle */
  getHeatmapEdgeStyle?: (symbolCount: number) => HeatmapStyle;
  // --- Sprint 7 T12: zoom into file ---
  /** ID of the currently expanded file (triggers camera flyTo) */
  expandedFileId?: string | null;
  // --- Sprint 8: Impact analysis + search focus + filter + context menu ---
  /** Impact analysis result */
  impactAnalysis?: {
    active: boolean;
    impactedNodes: string[];
    impactedEdges: string[];
  } | null;
  /** Whether search focus mode is active */
  isSearchFocused?: boolean;
  /** Node IDs in search focus */
  searchFocusNodes?: string[];
  /** Edge IDs in search focus */
  searchFocusEdges?: string[];
  /** Context menu handler */
  onNodeContextMenu?: (nodeId: string, screenX: number, screenY: number) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Graph3DCanvas({
  graphNodes,
  graphEdges,
  onNodeClick,
  onNodeHover,
  focusNodeId,
  onFocusComplete,
  hoveredNodeId,
  selectedNodeId,
  cameraPreset,
  onCameraPresetApplied,
  hoveredEdgeId: _hoveredEdgeId, // consumed externally; sprite lifecycle managed via onLinkHover
  onEdgeHover,
  // Sprint 5 T5
  tracingSymbol,
  tracingPath = [],
  tracingEdges = [],
  // Sprint 5 T7
  isHeatmapEnabled = false,
  getHeatmapEdgeStyle,
  // Sprint 7 T12
  expandedFileId,
  // Sprint 8
  impactAnalysis,
  isSearchFocused = false,
  searchFocusNodes = [],
  searchFocusEdges = [],
  onNodeContextMenu,
}: Graph3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<GraphInstance | null>(null);
  // Sprint 7 T12: store camera position before zooming in (for flyBack)
  const preFlyPositionRef = useRef<{ x: number; y: number; z: number } | null>(null);

  // Sprint 9 + 11: read perspective, E2E tracing, and display preferences from ViewState
  const { state } = useViewState();
  const { activePerspective, e2eTracing, displayPrefs } = state;

  // Sprint 11: filter nodes/edges by active perspective before passing to 3D graph
  // logic-operation selects all — skip for performance
  const viewFilteredData = useMemo(() => {
    if (activePerspective === 'logic-operation') {
      return { nodes: graphNodes, edges: graphEdges };
    }
    return applyPerspective(graphNodes, graphEdges, activePerspective);
  }, [graphNodes, graphEdges, activePerspective]);

  // Sprint 10: apply smart curation after view mode filtering
  const curatedData = useMemo(() => {
    return applyCuration(viewFilteredData.nodes, viewFilteredData.edges, new Set(state.pinnedNodeIds));
  }, [viewFilteredData, state.pinnedNodeIds]);

  // Precomputed adjacency for hover highlight (based on filtered data)
  // Sprint 17 T9: delegated to shared useGraphAdjacency hook
  const adjacency = useGraphAdjacency(curatedData.edges);

  // Convert curated data to 3d-force-graph format
  const fg3dNodes = useMemo<FG3DNode[]>(
    () =>
      curatedData.nodes.map((n) => {
        // Compute directory depth from filePath segments (normalise separators)
        const segments = n.filePath.replace(/\\/g, '/').split('/').filter(Boolean);
        const depth = Math.max(0, segments.length - 1);
        return {
          id: n.id,
          name: n.label,
          // Sprint 7: preserve function/class type instead of collapsing to 'file'
          nodeType: n.type as FG3DNode['nodeType'],
          depth,
          filePath: n.filePath,
          metadata: n.metadata,
        };
      }),
    [curatedData.nodes],
  );

  const fg3dLinks = useMemo<FG3DLink[]>(
    () =>
      curatedData.edges.map((e) => {
        const link: FG3DLink = {
          source: e.source,
          target: e.target,
          edgeType: e.type,
        };
        // Only set importedSymbols when defined to satisfy exactOptionalPropertyTypes
        if (e.metadata.importedSymbols !== undefined) {
          link.importedSymbols = e.metadata.importedSymbols;
        }
        return link;
      }),
    [curatedData.edges],
  );

  // Glow textures — created once
  const glowTexturesRef = useRef<GlowTextureMap | null>(null);

  // Sprint 5 T4 — currently displayed edge label sprite (one at a time)
  const edgeLabelSpriteRef = useRef<THREE.Sprite | null>(null);

  // ---------------------------------------------------------------------------
  // Initialize graph
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    // Create glow textures (Sprint 7: added function/class glow textures)
    if (!glowTexturesRef.current) {
      glowTexturesRef.current = {
        file: createGlowTexture(threeD.glowSprite.file.color),
        directory: createGlowTexture(threeD.glowSprite.directory.color),
        function: createGlowTexture(FUNC_GLOW_COLOR),
        class: createGlowTexture(CLASS_GLOW_COLOR),
      };
    }
    const glowTextures = glowTexturesRef.current;

    const enableParticles = graphNodes.length <= threeD.performance.particleDisableThreshold;

    let graph: GraphInstance;

    try {
      graph = new ForceGraph3D(containerRef.current)
        .backgroundColor(threeD.backgroundColor)
        .nodeId('id')
        .nodeThreeObject((node) => buildNodeObject(node, glowTextures))
        .nodeThreeObjectExtend(false)
        // Sprint 7: call edges use lime color, import/export/data-flow use green
        .linkColor((rawLink: LinkObject) => {
          const link = rawLink as FG3DLink;
          if (link.edgeType === 'call') {
            return hexToRgba(FUNC_EMISSIVE, threeD.edge.opacity.normal);
          }
          return hexToRgba(threeD.edge.color, threeD.edge.opacity.normal);
        })
        .linkOpacity(1) // opacity baked into linkColor rgba
        .linkDirectionalArrowLength(4)
        .linkDirectionalArrowRelPos(1)
        .linkDirectionalParticles(enableParticles ? threeD.particle.count : 0)
        .linkDirectionalParticleWidth((rawLink: LinkObject) =>
          getLinkParticleWidth(rawLink as FG3DLink),
        )
        .linkDirectionalParticleSpeed(threeD.particle.speed)
        .linkDirectionalParticleColor((rawLink: LinkObject) =>
          getLinkParticleColor(rawLink as FG3DLink),
        )
        .onNodeClick((node: NodeObject, _event: MouseEvent) => {
          try {
            const n = node as FG3DNode;
            onNodeClick?.(n.id);
          } catch {
            // ignore click handler errors
          }
        })
        .onNodeHover((node: NodeObject | null, _prevNode: NodeObject | null) => {
          try {
            const n = node as FG3DNode | null;
            onNodeHover?.(n ? n.id : null);
          } catch {
            // ignore hover handler errors
          }
        })
        // Sprint 8: right-click context menu via 3d-force-graph native API
        .onNodeRightClick((node: NodeObject, event: MouseEvent) => {
          try {
            event.preventDefault();
            const n = node as FG3DNode;
            onNodeContextMenu?.(n.id, event.clientX, event.clientY);
          } catch {
            // ignore right-click handler errors
          }
        })
        // Sprint 5 T4 — link hover: build/remove text sprite label
        .onLinkHover((link: LinkObject | null) => {
          try {
            const scene = graphRef.current?.scene();
            if (!scene) return;

            // Remove previous sprite
            if (edgeLabelSpriteRef.current) {
              scene.remove(edgeLabelSpriteRef.current);
              edgeLabelSpriteRef.current.material.map?.dispose();
              edgeLabelSpriteRef.current.material.dispose();
              edgeLabelSpriteRef.current = null;
            }

            if (!link) {
              onEdgeHover?.(null);
              return;
            }

            const l = link as FG3DLink;
            const symbols = l.importedSymbols ?? [];
            if (symbols.length === 0) {
              onEdgeHover?.(null);
              return;
            }

            // Format label text (mirrors useEdgeSymbols logic — no hook in non-React context)
            const shown = symbols.slice(0, 3);
            let labelText: string;
            if (symbols.length <= 3) {
              labelText = shown.join(', ');
            } else {
              labelText = `${shown.join(', ')}, +${symbols.length - 3} more`;
            }

            // Compute sprite position = midpoint between source and target
            const src = l.source as FG3DNode & { x?: number; y?: number; z?: number };
            const tgt = l.target as FG3DNode & { x?: number; y?: number; z?: number };
            const mx = ((src.x ?? 0) + (tgt.x ?? 0)) / 2;
            const my = ((src.y ?? 0) + (tgt.y ?? 0)) / 2;
            const mz = ((src.z ?? 0) + (tgt.z ?? 0)) / 2;

            const sprite = createTextSprite(labelText);
            sprite.position.set(mx, my + 4, mz); // offset 4 units above midpoint
            scene.add(sprite);
            edgeLabelSpriteRef.current = sprite;

            // Derive a stable edge ID from source/target ids for context
            const srcId = typeof l.source === 'string' ? l.source : (l.source as FG3DNode).id;
            const tgtId = typeof l.target === 'string' ? l.target : (l.target as FG3DNode).id;
            onEdgeHover?.(`${srcId}->${tgtId}`);
          } catch (err) {
            console.error('[Graph3DCanvas] link hover error:', err);
          }
        })
        .graphData({ nodes: fg3dNodes as NodeObject[], links: fg3dLinks });

      // Add lights to scene — white-paper: neutral lighting with no colored tinting
      try {
        const scene = graph.scene();
        const ambientLight = new THREE.AmbientLight(
          threeD.lights.ambient.color,
          threeD.lights.ambient.intensity,
        );
        // Use white directional lights instead of colored point lights to avoid
        // color contamination on the white-paper background
        const keyLight = new THREE.DirectionalLight('#ffffff', 0.6);
        keyLight.position.set(...threeD.lights.cyan.position);
        const fillLight = new THREE.DirectionalLight('#ffffff', 0.3);
        fillLight.position.set(...threeD.lights.magenta.position);
        scene.add(ambientLight, keyLight, fillLight);

        // Add linear fog — gentle fade at extreme distance, won't eat nearby nodes
        scene.fog = new THREE.Fog(threeD.backgroundColor, 800, 3000);
      } catch {
        // scene setup errors are non-fatal
      }

      // Sprint 10 T8: 3D spatial reference (grid + axes + labels)
      addSpatialReference(graph);
    } catch (err) {
      console.error('[Graph3DCanvas] Failed to initialise ForceGraph3D:', err);
      return;
    }

    // Apply Y-axis layering: custom force that pushes nodes toward depth-based Y
    try {
      const strength = threeD.layering.forceStrength;
      const ySpacing = threeD.layering.ySpacing;

      // Custom d3-compatible force function
      let forceNodes: FG3DNode[] = [];
      function yLayerForce(alpha: number) {
        for (const node of forceNodes) {
          const targetY = node.depth * ySpacing;
          const vy = (node as FG3DNode & { vy?: number }).vy ?? 0;
          (node as FG3DNode & { vy: number }).vy = vy + (targetY - ((node as FG3DNode & { y?: number }).y ?? 0)) * strength * alpha;
        }
      }
      yLayerForce.initialize = (nodes: FG3DNode[]) => {
        forceNodes = nodes;
      };

      graph.d3Force('yLayer', yLayerForce as any);
    } catch {
      // forceY setup is non-fatal
    }

    // Sprint 10 T9: Improve 3D layout — increase spacing for curated (fewer) nodes
    try {
      graph.d3Force('charge')?.strength(-300);  // 增加斥力（預設約 -120），使節點分散
      graph.d3Force('link')?.distance(120);     // 增加連結距離（預設約 30），避免擠成一團
    } catch {
      // force parameter adjustment is non-fatal
    }

    graphRef.current = graph;

    // Set initial camera far enough to see all nodes
    try {
      graph.cameraPosition({ x: 0, y: 200, z: 600 }, { x: 0, y: 0, z: 0 }, 0);
    } catch {
      // camera setup is non-fatal
    }

    // Set OrbitControls zoom limits so user cannot zoom out infinitely
    try {
      const controls = (graph as GraphInstance & { controls?: () => { minDistance?: number; maxDistance?: number } }).controls?.();
      if (controls) {
        controls.minDistance = 50;
        controls.maxDistance = 2000;
      }
    } catch {
      // controls setup is non-fatal
    }

    return () => {
      try {
        graphRef.current?._destructor();
      } catch {
        // ignore destructor errors
      }
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only — data updates handled separately

  // ---------------------------------------------------------------------------
  // Update graph data when nodes/edges change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    try {
      graph.graphData({ nodes: fg3dNodes as NodeObject[], links: fg3dLinks });
    } catch (err) {
      console.error('[Graph3DCanvas] Failed to update graphData:', err);
    }
  }, [fg3dNodes, fg3dLinks]);

  // ---------------------------------------------------------------------------
  // Handle focusNodeId changes — fly camera to node
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !focusNodeId) return;

    let cleanup: (() => void) | undefined;

    try {
      const data = graph.graphData();
      const targetNode = (data.nodes as FG3DNode[]).find((n) => n.id === focusNodeId);
      if (targetNode) {
        const nx = (targetNode as FG3DNode & { x?: number }).x ?? 0;
        const ny = (targetNode as FG3DNode & { y?: number }).y ?? 0;
        const nz = (targetNode as FG3DNode & { z?: number }).z ?? 0;
        const distance = 50;

        graph.cameraPosition(
          { x: nx + distance, y: ny + distance, z: nz + distance },
          { x: nx, y: ny, z: nz },
          threeD.camera.focusDuration,
        );

        if (onFocusComplete) {
          const timer = window.setTimeout(onFocusComplete, threeD.camera.focusDuration);
          cleanup = () => window.clearTimeout(timer);
        }
      }
    } catch (err) {
      console.error('[Graph3DCanvas] cameraPosition error:', err);
    }

    return cleanup;
  }, [focusNodeId, onFocusComplete]);

  // ---------------------------------------------------------------------------
  // Handle cameraPreset changes — fly camera to preset position
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !cameraPreset) return;

    let cleanup: (() => void) | undefined;

    try {
      const preset = threeD.camera.presets[cameraPreset];
      if (preset) {
        graph.cameraPosition(
          preset.position,
          preset.lookAt,
          threeD.camera.focusDuration,
        );

        if (onCameraPresetApplied) {
          const timer = window.setTimeout(onCameraPresetApplied, threeD.camera.focusDuration);
          cleanup = () => window.clearTimeout(timer);
        }
      }
    } catch (err) {
      console.error('[Graph3DCanvas] cameraPreset error:', err);
    }

    return cleanup;
  }, [cameraPreset, onCameraPresetApplied]);

  // ---------------------------------------------------------------------------
  // Sprint 7 T12 — Zoom into file: fly camera to expanded file node
  // When expandedFileId is set → flyTo; when cleared → flyBack
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    if (!expandedFileId) {
      // Zoom out — fly back to stored position
      if (preFlyPositionRef.current) {
        try {
          graph.cameraPosition(
            preFlyPositionRef.current,
            { x: 0, y: 0, z: 0 },
            threeD.camera.focusDuration,
          );
        } catch {
          // non-fatal
        }
        preFlyPositionRef.current = null;
      }
      return;
    }

    // Zoom into file — fly camera close to the file node
    try {
      const data = graph.graphData();
      const targetNode = (data.nodes as FG3DNode[]).find((n) => n.id === expandedFileId);
      if (!targetNode) return;

      const nx = (targetNode as FG3DNode & { x?: number }).x ?? 0;
      const ny = (targetNode as FG3DNode & { y?: number }).y ?? 0;
      const nz = (targetNode as FG3DNode & { z?: number }).z ?? 0;

      // Save current camera position for flyBack
      const camPos = graph.cameraPosition();
      preFlyPositionRef.current = { x: camPos.x ?? 0, y: camPos.y ?? 0, z: camPos.z ?? 0 };

      // Fly close to the node (distance 30 — smaller than focusNode's 50)
      const dist = 30;
      graph.cameraPosition(
        { x: nx + dist, y: ny + dist, z: nz + dist },
        { x: nx, y: ny, z: nz },
        threeD.camera.focusDuration,
      );
    } catch (err) {
      console.error('[Graph3DCanvas] zoom-into-file camera error:', err);
    }
  }, [expandedFileId]);

  // ---------------------------------------------------------------------------
  // Sprint 17 T9: Shared highlight priority — computes the active highlight mode
  // from the same priority chain as use3DHighlightEffects.
  // use3DHighlightEffects remains the authoritative renderer for visual output;
  // useHighlightPriority exposes the mode as a typed value for consumers
  // (e.g. analytics, future conditional rendering, testing).
  // ---------------------------------------------------------------------------
  const _activeHighlight = useHighlightPriority({
    e2eTracing,
    impactAnalysis,
    tracingSymbol,
    tracingPath,
    tracingEdges,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
    hoveredNodeId,
    connectedNodes: adjacency.connectedNodes,
  });

  // ---------------------------------------------------------------------------
  // All visual highlight effects (hover, tracing, heatmap, impact, search, E2E,
  // display preferences) — delegated to use3DHighlightEffects hook
  // ---------------------------------------------------------------------------
  use3DHighlightEffects({
    graphRef,
    glowTexturesRef,
    graphEdges,
    hoveredNodeId,
    selectedNodeId,
    adjacency,
    tracingSymbol,
    tracingPath,
    tracingEdges,
    isHeatmapEnabled,
    getHeatmapEdgeStyle,
    impactAnalysis,
    isSearchFocused,
    searchFocusNodes,
    searchFocusEdges,
    e2eTracing,
    displayPrefs,
  });

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
