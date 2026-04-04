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
 * Design: .knowledge/sprint5-dataflow-architecture.md §6.2, §10
 */

import { useRef, useEffect, useMemo } from 'react';
import { useViewState } from '../contexts/ViewStateContext';
import { applyPerspective, applyCuration } from '../adapters/graph-adapter';
import ForceGraph3D from '3d-force-graph';
import type { ForceGraph3DInstance } from '3d-force-graph';
import type { NodeObject, LinkObject } from '3d-force-graph';
import * as THREE from 'three';
import { THEME, threeD, edgeLabel as edgeLabelTheme, tracing as tracingTheme, colors } from '../styles/theme';
import type { HeatmapStyle } from '../hooks/useHeatmap';
import type { GraphNode, GraphEdge } from '../types/graph';
import type { CameraPresetName } from '../contexts/ViewStateContext';
import { hexToRgba, resolveLinkEndId } from '../utils/three-helpers';

// ---------------------------------------------------------------------------
// Internal 3d-force-graph node/link types
// We use the base NodeObject/LinkObject for the instance and cast where needed.
// ---------------------------------------------------------------------------

interface FG3DNode extends NodeObject {
  id: string;
  name: string;
  // Sprint 7: extended to include function/class
  nodeType: 'file' | 'directory' | 'function' | 'class';
  depth: number;
  filePath: string;
  metadata: GraphNode['metadata'];
}

interface FG3DLink extends LinkObject {
  source: string | FG3DNode;
  target: string | FG3DNode;
  edgeType: GraphEdge['type'];
  /** Imported symbol names for edge label display (Sprint 5 T4) */
  importedSymbols?: string[];
}

// Typed instance using the base NodeObject/LinkObject generics
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
// Helpers — build canvas glow texture for sprites
// ---------------------------------------------------------------------------

function createGlowTexture(color: string): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2,
    );
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

// ---------------------------------------------------------------------------
// Helpers — build Canvas-texture text sprite for edge labels (Sprint 5 T4)
// ---------------------------------------------------------------------------

/**
 * Creates a THREE.Sprite with text rendered via Canvas2D API.
 * No external three-spritetext dependency — avoids new package addition.
 * Uses edgeLabel theme constants for consistent colours/sizing.
 */
function createTextSprite(text: string): THREE.Sprite {
  // Measure and size canvas
  const fontSize = 12; // px on canvas
  const padding = 6;
  const fontFamily = "'Inter', system-ui, sans-serif";

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (tempCtx) {
    tempCtx.font = `${fontSize}px ${fontFamily}`;
  }
  const textWidth = tempCtx ? tempCtx.measureText(text).width : text.length * 7;

  const canvasWidth = Math.ceil(textWidth + padding * 2);
  const canvasHeight = Math.ceil(fontSize + padding * 2);

  const canvas = document.createElement('canvas');
  // Round up to nearest power-of-two for GPU efficiency
  canvas.width = Math.pow(2, Math.ceil(Math.log2(Math.max(canvasWidth, 1))));
  canvas.height = Math.pow(2, Math.ceil(Math.log2(Math.max(canvasHeight, 1))));

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Background pill
    const bgColor = edgeLabelTheme.background; // 'rgba(10, 10, 15, 0.85)'
    const borderColor = edgeLabelTheme.border.replace('1px solid ', ''); // strip CSS shorthand
    const radius = 4;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw rounded rect background
    ctx.beginPath();
    ctx.moveTo(radius, 0);
    ctx.lineTo(canvasWidth - radius, 0);
    ctx.quadraticCurveTo(canvasWidth, 0, canvasWidth, radius);
    ctx.lineTo(canvasWidth, canvasHeight - radius);
    ctx.quadraticCurveTo(canvasWidth, canvasHeight, canvasWidth - radius, canvasHeight);
    ctx.lineTo(radius, canvasHeight);
    ctx.quadraticCurveTo(0, canvasHeight, 0, canvasHeight - radius);
    ctx.lineTo(0, radius);
    ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath();
    ctx.fillStyle = bgColor;
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw text
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = edgeLabelTheme.textColor; // '#e8eaf6'
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(text, padding, canvasHeight / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  // Scale sprite so it appears roughly the same screen-space size as the canvas
  const aspect = canvas.width / canvas.height;
  // World-unit scale: ~8 units tall matches nearby node radius context
  sprite.scale.set(aspect * 8, 8, 1);

  return sprite;
}

// ---------------------------------------------------------------------------
// Helpers — particle symbol type inference (Sprint 5 T8 / §11)
// ---------------------------------------------------------------------------

/**
 * Infers symbol type from naming convention:
 * - PascalCase (starts with uppercase, alphanumeric only) → class
 * - camelCase (starts with lowercase, length > 2) → function
 * - anything else → variable
 */
function inferSymbolType(symbolName: string): 'class' | 'function' | 'variable' {
  if (/^[A-Z][a-zA-Z0-9]*$/.test(symbolName)) {
    return 'class';
  }
  if (/^[a-z]/.test(symbolName) && symbolName.length > 2) {
    return 'function';
  }
  return 'variable';
}

/** Particle visual attributes keyed by symbol type */
const particleVisual = {
  class:    { color: colors.neon.cyan.DEFAULT,  size: 2 },   // THEME.sfBorder (#1565c0)
  function: { color: colors.neon.green.bright,  size: 3 },   // THEME.djAccent (#388e3c)
  variable: { color: '#ffffff',                 size: 1 },
} as const;

/**
 * Returns the particle color for a link based on the first importedSymbol.
 * Falls back to the default particle color when no symbols are present.
 */
function getLinkParticleColor(link: FG3DLink): string {
  const first = link.importedSymbols?.[0];
  if (!first) return threeD.particle.color;
  return particleVisual[inferSymbolType(first)].color;
}

/**
 * Returns the particle width for a link based on the first importedSymbol.
 * Falls back to the default particle width when no symbols are present.
 */
function getLinkParticleWidth(link: FG3DLink): number {
  const first = link.importedSymbols?.[0];
  if (!first) return threeD.particle.width;
  return particleVisual[inferSymbolType(first)].size;
}

// ---------------------------------------------------------------------------
// Helpers — build node Three.js object
// ---------------------------------------------------------------------------

// Sprint 7: lime/yellow emissive colors for function/class spheres
const FUNC_EMISSIVE = '#84cc16';   // lime-500
const CLASS_EMISSIVE = '#facc15';  // yellow-400
const FUNC_GLOW_COLOR = 'rgba(163, 230, 53, 0.30)';
const CLASS_GLOW_COLOR = 'rgba(250, 204, 21, 0.28)';

function buildNodeObject(
  rawNode: NodeObject,
  glowTextures: { file: THREE.Texture; directory: THREE.Texture; function: THREE.Texture; class: THREE.Texture },
): THREE.Object3D {
  const node = rawNode as FG3DNode;
  const isDir = node.nodeType === 'directory';
  const isFunc = node.nodeType === 'function';
  const isClass = node.nodeType === 'class';

  // Sphere radius: function/class nodes are ~60% of file node size
  const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
  const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;
  const segments = baseSpec.segments;

  let emissiveColor: string;
  let glowMap: THREE.Texture;
  let glowScale: number;

  if (isFunc) {
    emissiveColor = FUNC_EMISSIVE;
    glowMap = glowTextures.function;
    glowScale = threeD.glowSprite.file.scale * 0.6;
  } else if (isClass) {
    emissiveColor = CLASS_EMISSIVE;
    glowMap = glowTextures.class;
    glowScale = threeD.glowSprite.file.scale * 0.6;
  } else if (isDir) {
    emissiveColor = threeD.material.directory.emissive;
    glowMap = glowTextures.directory;
    glowScale = threeD.glowSprite.directory.scale;
  } else {
    emissiveColor = threeD.material.file.emissive;
    glowMap = glowTextures.file;
    glowScale = threeD.glowSprite.file.scale;
  }

  // Sphere geometry
  const geometry = new THREE.SphereGeometry(radius, segments, segments);

  // Material — white-paper: white fill, zero emissive so no neon glow bleeds on light bg
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(threeD.material.color),
    emissive: new THREE.Color(emissiveColor),
    emissiveIntensity: 0,
    transparent: true,
    opacity: threeD.material.opacity.normal,
    metalness: threeD.material.metalness,
    roughness: threeD.material.roughness,
  });

  const sphere = new THREE.Mesh(geometry, material);

  // Glow sprite
  const spriteMaterial = new THREE.SpriteMaterial({
    map: glowMap,
    blending: THREE.NormalBlending,
    depthWrite: false,
    transparent: true,
    opacity: threeD.glowSprite.opacity.normal,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.setScalar(glowScale);

  const group = new THREE.Group();
  group.add(sphere);
  group.add(sprite);

  return group;
}

// ---------------------------------------------------------------------------
// Helpers — 3D spatial reference: GridHelper + custom axes + axis label sprites
// Sprint 10 T8
// ---------------------------------------------------------------------------

/**
 * Creates a Canvas-texture sprite for an axis label ("X", "Y", "Z").
 * The sprite billboards automatically (always faces the camera) because
 * THREE.Sprite is inherently view-aligned.
 */
function createAxisLabelSprite(label: string): THREE.Sprite {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    ctx.font = `bold 36px 'Inter', system-ui, sans-serif`;
    ctx.fillStyle = THEME.inkMuted; // #8888aa — visible on white background
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, size / 2, size / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(30, 15, 1);
  return sprite;
}

/**
 * Adds spatial reference helpers to the 3d-force-graph scene:
 * 1. Semi-transparent GridHelper beneath the nodes
 * 2. Custom XYZ axes drawn with LineBasicMaterial (colour-coded, semi-transparent)
 * 3. Billboard axis label sprites at each axis tip
 *
 * Only called in 3D mode — the scene is owned by 3d-force-graph and will be
 * cleaned up automatically when the graph instance is destroyed.
 */
function addSpatialReference(graph: GraphInstance): void {
  try {
    const scene = graph.scene();

    // 1. GridHelper — subtle floor grid (white-paper: light gray lines)
    const gridColorCenter = new THREE.Color(THEME.gridLineMajor); // #c8c8c8
    const gridColorLine = new THREE.Color(THEME.gridLine);        // #d8d8d8
    const grid = new THREE.GridHelper(1000, 50, gridColorCenter, gridColorLine);
    grid.position.y = -200;
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // 2. Custom colour-coded axes (500 units each direction)
    const axisLength = 500;
    const axisConfigs: Array<{ color: number; from: [number, number, number]; to: [number, number, number] }> = [
      { color: 0xff5050, from: [0, 0, 0], to: [axisLength, 0, 0] }, // X — red
      { color: 0x50ff50, from: [0, 0, 0], to: [0, axisLength, 0] }, // Y — green
      { color: 0x5050ff, from: [0, 0, 0], to: [0, 0, axisLength] }, // Z — blue
    ];

    for (const cfg of axisConfigs) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...cfg.from),
        new THREE.Vector3(...cfg.to),
      ]);
      const material = new THREE.LineBasicMaterial({
        color: cfg.color,
        opacity: 0.4,
        transparent: true,
      });
      scene.add(new THREE.Line(geometry, material));
    }

    // 3. Axis label sprites at each axis tip
    const labelConfigs: Array<{ label: string; position: [number, number, number] }> = [
      { label: 'X', position: [axisLength + 20, 0, 0] },
      { label: 'Y', position: [0, axisLength + 20, 0] },
      { label: 'Z', position: [0, 0, axisLength + 20] },
    ];

    for (const cfg of labelConfigs) {
      const sprite = createAxisLabelSprite(cfg.label);
      sprite.position.set(...cfg.position);
      scene.add(sprite);
    }
  } catch {
    // Spatial reference is non-fatal — graph still works without it
  }
}

// ---------------------------------------------------------------------------
// Helpers — build highlighted node Three.js object
// ---------------------------------------------------------------------------

function buildHighlightedNodeObject(
  rawNode: NodeObject,
  glowTextures: { file: THREE.Texture; directory: THREE.Texture; function: THREE.Texture; class: THREE.Texture },
  isHovered: boolean,
  isRelated: boolean,
): THREE.Object3D {
  const node = rawNode as FG3DNode;
  const isDir = node.nodeType === 'directory';
  const isFunc = node.nodeType === 'function';
  const isClass = node.nodeType === 'class';
  const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
  const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;
  const spec = { ...baseSpec, radius };

  let emissiveNormal: string;
  let emissiveActive: string;
  let glowMap: THREE.Texture;
  let glowScale: number;

  if (isFunc) {
    emissiveNormal = FUNC_EMISSIVE;
    emissiveActive = '#a3e635'; // brighter lime
    glowMap = glowTextures.function;
    glowScale = threeD.glowSprite.file.scale * 0.6;
  } else if (isClass) {
    emissiveNormal = CLASS_EMISSIVE;
    emissiveActive = '#fde047'; // brighter yellow
    glowMap = glowTextures.class;
    glowScale = threeD.glowSprite.file.scale * 0.6;
  } else if (isDir) {
    emissiveNormal = threeD.material.directory.emissive;
    emissiveActive = threeD.material.directory.emissiveActive;
    glowMap = glowTextures.directory;
    glowScale = threeD.glowSprite.directory.scale;
  } else {
    emissiveNormal = threeD.material.file.emissive;
    emissiveActive = threeD.material.file.emissiveActive;
    glowMap = glowTextures.file;
    glowScale = threeD.glowSprite.file.scale;
  }

  const matSpec = { emissive: emissiveNormal, emissiveActive };

  const geometry = new THREE.SphereGeometry(spec.radius, spec.segments, spec.segments);

  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(threeD.material.color),
    emissive: new THREE.Color(isHovered ? matSpec.emissiveActive : matSpec.emissive),
    emissiveIntensity: isRelated
      ? isHovered
        ? threeD.material.intensity.active
        : threeD.material.intensity.hover
      : threeD.material.intensity.faded,
    transparent: true,
    opacity: isRelated
      ? threeD.material.opacity.normal
      : threeD.material.opacity.faded,
    metalness: threeD.material.metalness,
    roughness: threeD.material.roughness,
  });

  const sphere = new THREE.Mesh(geometry, material);

  const spriteOpacity = isRelated
    ? isHovered
      ? threeD.glowSprite.opacity.active
      : threeD.glowSprite.opacity.hover
    : threeD.glowSprite.opacity.faded;

  const spriteMaterial = new THREE.SpriteMaterial({
    map: glowMap,
    blending: THREE.NormalBlending,
    depthWrite: false,
    transparent: true,
    opacity: spriteOpacity,
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.setScalar(glowScale);

  const group = new THREE.Group();
  group.add(sphere);
  group.add(sprite);

  return group;
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
  const adjacency = useMemo(() => {
    const connectedNodes = new Map<string, Set<string>>();
    for (const edge of curatedData.edges) {
      if (!connectedNodes.has(edge.source)) connectedNodes.set(edge.source, new Set());
      if (!connectedNodes.has(edge.target)) connectedNodes.set(edge.target, new Set());
      connectedNodes.get(edge.source)!.add(edge.target);
      connectedNodes.get(edge.target)!.add(edge.source);
    }
    return { connectedNodes };
  }, [curatedData.edges]);

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
  const glowTexturesRef = useRef<{ file: THREE.Texture; directory: THREE.Texture; function: THREE.Texture; class: THREE.Texture } | null>(null);

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
  // Handle hoveredNodeId changes — apply highlight / dim
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;

    const glowTextures = glowTexturesRef.current;

    try {
      if (!hoveredNodeId) {
        // Restore all nodes and edges to normal
        graph
          .nodeThreeObject((node) => buildNodeObject(node, glowTextures))
          .linkColor(() => hexToRgba(threeD.edge.color, threeD.edge.opacity.normal));
        return;
      }

      const connectedSet = adjacency.connectedNodes.get(hoveredNodeId) ?? new Set<string>();
      const relatedIds = new Set([hoveredNodeId, ...connectedSet]);

      // Update node appearances
      graph.nodeThreeObject((rawNode) => {
        const node = rawNode as FG3DNode;
        const isHovered = node.id === hoveredNodeId;
        const isRelated = relatedIds.has(node.id);
        return buildHighlightedNodeObject(rawNode, glowTextures, isHovered, isRelated);
      });

      // Update link colors (opacity encoded in rgba)
      graph.linkColor((rawLink) => {
        const link = rawLink as FG3DLink;
        const src = resolveLinkEndId(link.source);
        const tgt = resolveLinkEndId(link.target);
        const isRelatedLink =
          (src === hoveredNodeId && relatedIds.has(tgt)) ||
          (tgt === hoveredNodeId && relatedIds.has(src));
        return isRelatedLink
          ? hexToRgba(threeD.edge.colorHover, threeD.edge.opacity.hover)
          : hexToRgba(threeD.edge.color, threeD.edge.opacity.faded);
      });
    } catch (err) {
      console.error('[Graph3DCanvas] hover highlight error:', err);
    }
  }, [hoveredNodeId, adjacency]);

  // ---------------------------------------------------------------------------
  // Handle selectedNodeId — restore normal state when no hover active
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;
    if (hoveredNodeId) return; // hover has precedence

    const glowTextures = glowTexturesRef.current;

    try {
      graph.nodeThreeObject((node) => buildNodeObject(node, glowTextures));
    } catch (err) {
      console.error('[Graph3DCanvas] selectedNodeId update error:', err);
    }
  }, [selectedNodeId, hoveredNodeId]);

  // ---------------------------------------------------------------------------
  // Sprint 5 T5 — Path tracing: override hover highlight when active
  // Priority (§10): tracing > hover > heatmap > normal
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;

    const glowTextures = glowTexturesRef.current;
    const isTracing = tracingSymbol !== null;

    if (!isTracing) return; // hover effect handles the normal/hover case

    try {
      const tracingPathSet = new Set(tracingPath);
      const tracingEdgeSet = new Set(tracingEdges);

      // Update node appearances — on-path = bright, off-path = faded
      graph.nodeThreeObject((rawNode) => {
        const node = rawNode as FG3DNode;
        const isOnPath = tracingPathSet.has(node.id);
        const isDir = node.nodeType === 'directory';
        const isFunc = node.nodeType === 'function';
        const isClass = node.nodeType === 'class';
        const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
        const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;

        let emissiveNormal: string;
        let glowMap: THREE.Texture;
        let glowScale: number;

        if (isFunc) {
          emissiveNormal = FUNC_EMISSIVE;
          glowMap = glowTextures.function;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isClass) {
          emissiveNormal = CLASS_EMISSIVE;
          glowMap = glowTextures.class;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isDir) {
          emissiveNormal = threeD.material.directory.emissive;
          glowMap = glowTextures.directory;
          glowScale = threeD.glowSprite.directory.scale;
        } else {
          emissiveNormal = threeD.material.file.emissive;
          glowMap = glowTextures.file;
          glowScale = threeD.glowSprite.file.scale;
        }

        const geometry = new THREE.SphereGeometry(radius, baseSpec.segments, baseSpec.segments);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(threeD.material.color),
          emissive: new THREE.Color(isOnPath ? tracingTheme.nodeHighlight : emissiveNormal),
          emissiveIntensity: isOnPath
            ? threeD.material.intensity.active
            : threeD.material.intensity.faded,
          transparent: true,
          opacity: isOnPath ? threeD.material.opacity.normal : tracingTheme.fadedOpacity,
          metalness: threeD.material.metalness,
          roughness: threeD.material.roughness,
        });
        const sphere = new THREE.Mesh(geometry, material);

        const spriteMaterial = new THREE.SpriteMaterial({
          map: glowMap,
          blending: THREE.NormalBlending,
          depthWrite: false,
          transparent: true,
          opacity: isOnPath ? threeD.glowSprite.opacity.active : threeD.glowSprite.opacity.faded,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.setScalar(glowScale);

        const group = new THREE.Group();
        group.add(sphere);
        group.add(sprite);
        return group;
      });

      // Build a lookup set of "srcId|tgtId" pairs from the traced edge IDs.
      // GraphEdge ids are stored in tracingEdges; we need to resolve them back
      // to source+target by scanning the original graphEdges list.
      const tracingEdgePairs = new Set<string>();
      for (const edgeId of tracingEdgeSet) {
        const found = graphEdges.find((e) => e.id === edgeId);
        if (found) {
          tracingEdgePairs.add(`${found.source}|${found.target}`);
          tracingEdgePairs.add(`${found.target}|${found.source}`); // undirected match
        }
      }

      // Update link colors — on-path = highlight green, off-path = faded
      graph.linkColor((rawLink) => {
        const link = rawLink as FG3DLink;
        const srcId = resolveLinkEndId(link.source);
        const tgtId = resolveLinkEndId(link.target);
        const isOnPath =
          tracingEdgePairs.has(`${srcId}|${tgtId}`) ||
          tracingEdgePairs.has(`${tgtId}|${srcId}`);
        if (isOnPath) {
          return hexToRgba(tracingTheme.edgeHighlight, 1.0);
        }
        return hexToRgba(threeD.edge.color, tracingTheme.fadedOpacity);
      });
    } catch (err) {
      console.error('[Graph3DCanvas] tracing highlight error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracingSymbol, tracingPath, tracingEdges]);

  // ---------------------------------------------------------------------------
  // Sprint 5 T5 — Stop tracing: restore normal state when tracing ends
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;
    if (tracingSymbol !== null) return; // tracing active — handled above
    if (hoveredNodeId) return; // hover has precedence
    if (e2eTracing?.active) return; // E2E tracing takes priority

    const glowTextures = glowTexturesRef.current;

    try {
      graph.nodeThreeObject((node) => buildNodeObject(node, glowTextures));
      graph.linkColor(() => hexToRgba(threeD.edge.color, threeD.edge.opacity.normal));
    } catch (err) {
      console.error('[Graph3DCanvas] restore after tracing error:', err);
    }
  }, [tracingSymbol, hoveredNodeId, e2eTracing]);

  // ---------------------------------------------------------------------------
  // Sprint 5 T7 — Heatmap: adjust link width and particle speed per edge
  // Priority: heatmap is suppressed when tracing is active (§10)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    if (tracingSymbol !== null) return; // tracing takes priority (§10)

    try {
      if (!isHeatmapEnabled || !getHeatmapEdgeStyle) {
        // Restore default link width and particle speed
        graph
          .linkWidth(1)
          .linkDirectionalParticleSpeed(threeD.particle.speed);
        return;
      }

      // Apply per-link width and particle speed based on importedSymbols count
      graph.linkWidth((rawLink) => {
        const link = rawLink as FG3DLink;
        const count = link.importedSymbols?.length ?? 0;
        return getHeatmapEdgeStyle(count).strokeWidth;
      });

      graph.linkOpacity(1); // opacity handled via linkColor alpha below
      graph.linkColor((rawLink) => {
        const link = rawLink as FG3DLink;
        const count = link.importedSymbols?.length ?? 0;
        const style = getHeatmapEdgeStyle(count);
        return hexToRgba(threeD.edge.color, style.opacity);
      });

      // Use median particle speed (per-link not supported; use average of all edges)
      const speeds = graphEdges.map((e) => {
        const count = e.metadata.importedSymbols?.length ?? 0;
        return getHeatmapEdgeStyle(count).particleSpeed;
      });
      const avgSpeed =
        speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : threeD.particle.speed;
      graph.linkDirectionalParticleSpeed(avgSpeed);
    } catch (err) {
      console.error('[Graph3DCanvas] heatmap update error:', err);
    }
  }, [isHeatmapEnabled, getHeatmapEdgeStyle, tracingSymbol, graphEdges]);

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
  // Sprint 8 — Impact analysis: dim non-impacted nodes/edges
  // Priority: impact > tracing > hover > heatmap > normal
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;

    const glowTextures = glowTexturesRef.current;
    const isActive = impactAnalysis?.active === true;

    if (!isActive) return; // other effects restore normal state when not active

    try {
      const impactNodeSet = new Set(impactAnalysis!.impactedNodes);

      // Build edge pair lookup from impactedEdge IDs → source|target strings
      const impactEdgePairs = new Set<string>();
      for (const edgeId of impactAnalysis!.impactedEdges) {
        const found = graphEdges.find((e) => e.id === edgeId);
        if (found) {
          impactEdgePairs.add(`${found.source}|${found.target}`);
          impactEdgePairs.add(`${found.target}|${found.source}`);
        }
      }

      graph.nodeThreeObject((rawNode) => {
        const node = rawNode as FG3DNode;
        const isImpacted = impactNodeSet.has(node.id);
        const isDir = node.nodeType === 'directory';
        const isFunc = node.nodeType === 'function';
        const isClass = node.nodeType === 'class';
        const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
        const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;

        let emissiveColor: string;
        let glowMap: THREE.Texture;
        let glowScale: number;

        if (isFunc) {
          emissiveColor = FUNC_EMISSIVE;
          glowMap = glowTextures.function;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isClass) {
          emissiveColor = CLASS_EMISSIVE;
          glowMap = glowTextures.class;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isDir) {
          emissiveColor = threeD.material.directory.emissive;
          glowMap = glowTextures.directory;
          glowScale = threeD.glowSprite.directory.scale;
        } else {
          emissiveColor = threeD.material.file.emissive;
          glowMap = glowTextures.file;
          glowScale = threeD.glowSprite.file.scale;
        }

        const nodeOpacity = isImpacted ? threeD.material.opacity.normal : 0.15;
        const geometry = new THREE.SphereGeometry(radius, baseSpec.segments, baseSpec.segments);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(threeD.material.color),
          emissive: new THREE.Color(emissiveColor),
          emissiveIntensity: isImpacted
            ? threeD.material.intensity.active
            : threeD.material.intensity.faded,
          transparent: true,
          opacity: nodeOpacity,
          metalness: threeD.material.metalness,
          roughness: threeD.material.roughness,
        });
        const sphere = new THREE.Mesh(geometry, material);

        const spriteMaterial = new THREE.SpriteMaterial({
          map: glowMap,
          blending: THREE.NormalBlending,
          depthWrite: false,
          transparent: true,
          opacity: isImpacted ? threeD.glowSprite.opacity.active : threeD.glowSprite.opacity.faded,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.setScalar(glowScale);

        const group = new THREE.Group();
        group.add(sphere);
        group.add(sprite);
        return group;
      });

      graph.linkColor((rawLink) => {
        const link = rawLink as FG3DLink;
        const srcId = resolveLinkEndId(link.source);
        const tgtId = resolveLinkEndId(link.target);
        const isImpacted =
          impactEdgePairs.has(`${srcId}|${tgtId}`) ||
          impactEdgePairs.has(`${tgtId}|${srcId}`);
        return isImpacted
          ? hexToRgba(threeD.edge.colorHover, threeD.edge.opacity.hover)
          : hexToRgba(threeD.edge.color, 0.08);
      });
    } catch (err) {
      console.error('[Graph3DCanvas] impact analysis highlight error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impactAnalysis]);

  // ---------------------------------------------------------------------------
  // Sprint 8 — Impact analysis off: restore normal state
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;
    if (impactAnalysis?.active) return; // active state handled above
    if (isSearchFocused) return; // search focus handled separately
    if (tracingSymbol !== null) return; // tracing takes priority
    if (hoveredNodeId) return; // hover takes priority
    if (e2eTracing?.active) return; // E2E tracing takes highest priority

    const glowTextures = glowTexturesRef.current;

    try {
      graph.nodeThreeObject((node) => buildNodeObject(node, glowTextures));
      graph.linkColor(() => hexToRgba(threeD.edge.color, threeD.edge.opacity.normal));
    } catch (err) {
      console.error('[Graph3DCanvas] restore after impact analysis error:', err);
    }
  }, [impactAnalysis, isSearchFocused, tracingSymbol, hoveredNodeId, e2eTracing]);

  // ---------------------------------------------------------------------------
  // Sprint 8 — Search focus: dim non-matching nodes/edges
  // Priority: lower than impact analysis, higher than hover
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;
    if (impactAnalysis?.active) return; // impact takes priority
    if (!isSearchFocused || searchFocusNodes.length === 0) return;

    const glowTextures = glowTexturesRef.current;

    try {
      const focusNodeSet = new Set(searchFocusNodes);

      // Build edge pair lookup from searchFocusEdges IDs → source|target strings
      const focusEdgePairs = new Set<string>();
      for (const edgeId of searchFocusEdges) {
        const found = graphEdges.find((e) => e.id === edgeId);
        if (found) {
          focusEdgePairs.add(`${found.source}|${found.target}`);
          focusEdgePairs.add(`${found.target}|${found.source}`);
        }
      }

      graph.nodeThreeObject((rawNode) => {
        const node = rawNode as FG3DNode;
        const isFocused = focusNodeSet.has(node.id);
        const isDir = node.nodeType === 'directory';
        const isFunc = node.nodeType === 'function';
        const isClass = node.nodeType === 'class';
        const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
        const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;

        let emissiveColor: string;
        let glowMap: THREE.Texture;
        let glowScale: number;

        if (isFunc) {
          emissiveColor = FUNC_EMISSIVE;
          glowMap = glowTextures.function;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isClass) {
          emissiveColor = CLASS_EMISSIVE;
          glowMap = glowTextures.class;
          glowScale = threeD.glowSprite.file.scale * 0.6;
        } else if (isDir) {
          emissiveColor = threeD.material.directory.emissive;
          glowMap = glowTextures.directory;
          glowScale = threeD.glowSprite.directory.scale;
        } else {
          emissiveColor = threeD.material.file.emissive;
          glowMap = glowTextures.file;
          glowScale = threeD.glowSprite.file.scale;
        }

        const nodeOpacity = isFocused ? threeD.material.opacity.normal : 0.1;
        const geometry = new THREE.SphereGeometry(radius, baseSpec.segments, baseSpec.segments);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(threeD.material.color),
          emissive: new THREE.Color(emissiveColor),
          emissiveIntensity: isFocused
            ? threeD.material.intensity.active
            : threeD.material.intensity.faded,
          transparent: true,
          opacity: nodeOpacity,
          metalness: threeD.material.metalness,
          roughness: threeD.material.roughness,
        });
        const sphere = new THREE.Mesh(geometry, material);

        const spriteMaterial = new THREE.SpriteMaterial({
          map: glowMap,
          blending: THREE.NormalBlending,
          depthWrite: false,
          transparent: true,
          opacity: isFocused ? threeD.glowSprite.opacity.active : threeD.glowSprite.opacity.faded,
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.setScalar(glowScale);

        const group = new THREE.Group();
        group.add(sphere);
        group.add(sprite);
        return group;
      });

      graph.linkColor((rawLink) => {
        const link = rawLink as FG3DLink;
        const srcId = resolveLinkEndId(link.source);
        const tgtId = resolveLinkEndId(link.target);
        const isFocused =
          focusEdgePairs.has(`${srcId}|${tgtId}`) ||
          focusEdgePairs.has(`${tgtId}|${srcId}`);
        return isFocused
          ? hexToRgba(threeD.edge.colorHover, threeD.edge.opacity.hover)
          : hexToRgba(threeD.edge.color, 0.1);
      });
    } catch (err) {
      console.error('[Graph3DCanvas] search focus highlight error:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearchFocused, searchFocusNodes, searchFocusEdges]);

  // ---------------------------------------------------------------------------
  // Sprint 9 — E2E Tracing: highlight path nodes/edges with bright cyan/green
  // Priority: highest — overrides impact, tracing, search focus, hover
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !glowTexturesRef.current) return;

    const glowTextures = glowTexturesRef.current;

    if (e2eTracing?.active) {
      const pathSet = new Set(e2eTracing.path);
      const edgeSet = new Set(e2eTracing.edges);

      try {
        // Highlight nodes on the E2E path using the same nodeThreeObject pattern
        fg.nodeThreeObject((rawNode) => {
          const node = rawNode as FG3DNode;
          const isOnPath = pathSet.has(node.id);
          const isDir = node.nodeType === 'directory';
          const isFunc = node.nodeType === 'function';
          const isClass = node.nodeType === 'class';
          const baseSpec = isDir ? threeD.node.directory : threeD.node.file;
          const radius = (isFunc || isClass) ? baseSpec.radius * 0.6 : baseSpec.radius;

          let glowMap: THREE.Texture;
          let glowScale: number;

          if (isFunc) {
            glowMap = glowTextures.function;
            glowScale = threeD.glowSprite.file.scale * 0.6;
          } else if (isClass) {
            glowMap = glowTextures.class;
            glowScale = threeD.glowSprite.file.scale * 0.6;
          } else if (isDir) {
            glowMap = glowTextures.directory;
            glowScale = threeD.glowSprite.directory.scale;
          } else {
            glowMap = glowTextures.file;
            glowScale = threeD.glowSprite.file.scale;
          }

          // On path: system-framework blue; off path: very dim
          const emissiveColor = isOnPath ? THEME.sfLine : threeD.material.file.emissive;
          const nodeOpacity = isOnPath ? threeD.material.opacity.normal : 0.1;

          const geometry = new THREE.SphereGeometry(radius, baseSpec.segments, baseSpec.segments);
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(threeD.material.color),
            emissive: new THREE.Color(emissiveColor),
            emissiveIntensity: isOnPath
              ? threeD.material.intensity.active
              : threeD.material.intensity.faded,
            transparent: true,
            opacity: nodeOpacity,
            metalness: threeD.material.metalness,
            roughness: threeD.material.roughness,
          });
          const sphere = new THREE.Mesh(geometry, material);

          const spriteMaterial = new THREE.SpriteMaterial({
            map: glowMap,
            blending: THREE.NormalBlending,
            depthWrite: false,
            transparent: true,
            opacity: isOnPath ? threeD.glowSprite.opacity.active : threeD.glowSprite.opacity.faded,
          });
          const sprite = new THREE.Sprite(spriteMaterial);
          sprite.scale.setScalar(glowScale);

          const group = new THREE.Group();
          group.add(sphere);
          group.add(sprite);
          return group;
        });

        // Highlight edges on the E2E path
        fg.linkColor((rawLink) => {
          const link = rawLink as FG3DLink;
          const srcId = resolveLinkEndId(link.source);
          const tgtId = resolveLinkEndId(link.target);
          // Match edge ID from graphEdges or fall back to source--target pattern
          const found = graphEdges.find(
            (e) => e.source === srcId && e.target === tgtId,
          );
          const linkId = found?.id ?? `${srcId}--${tgtId}`;
          if (edgeSet.has(linkId)) {
            return THEME.djLine; // data-journey green for path edges
          }
          return hexToRgba(threeD.edge.color, 0.06);
        });

        fg.linkWidth((rawLink) => {
          const link = rawLink as FG3DLink;
          const srcId = resolveLinkEndId(link.source);
          const tgtId = resolveLinkEndId(link.target);
          const found = graphEdges.find(
            (e) => e.source === srcId && e.target === tgtId,
          );
          const linkId = found?.id ?? `${srcId}--${tgtId}`;
          return edgeSet.has(linkId) ? 3 : 0.5;
        });
      } catch (err) {
        console.error('[Graph3DCanvas] E2E tracing highlight error:', err);
      }
    }
    // Don't add else clause — separate restore effect handles non-E2E states
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [e2eTracing]);

  // ---------------------------------------------------------------------------
  // Sprint 9 — E2E Tracing off: restore normal state when E2E tracing ends
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph || !glowTexturesRef.current) return;
    if (e2eTracing?.active) return; // active state handled above
    if (impactAnalysis?.active) return; // impact takes priority over restore
    if (isSearchFocused) return; // search focus handles its own restore
    if (tracingSymbol !== null) return; // symbol tracing takes priority
    if (hoveredNodeId) return; // hover takes priority

    const glowTextures = glowTexturesRef.current;

    try {
      graph.nodeThreeObject((node) => buildNodeObject(node, glowTextures));
      graph.linkColor(() => hexToRgba(threeD.edge.color, threeD.edge.opacity.normal));
      graph.linkWidth(1);
    } catch (err) {
      console.error('[Graph3DCanvas] restore after E2E tracing error:', err);
    }
  }, [e2eTracing, impactAnalysis, isSearchFocused, tracingSymbol, hoveredNodeId]);

  // ---------------------------------------------------------------------------
  // Sprint 9 — Display preferences: showParticles
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    try {
      graph.linkDirectionalParticles(displayPrefs.showParticles ? threeD.particle.count : 0);
    } catch (err) {
      console.error('[Graph3DCanvas] displayPrefs.showParticles update error:', err);
    }
  }, [displayPrefs.showParticles]);

  // ---------------------------------------------------------------------------
  // Sprint 9 — Display preferences: labelDensity (node labels)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    try {
      graph.nodeLabel((rawNode: NodeObject) => {
        if (displayPrefs.labelDensity === 'none') return '';
        // 'all' and 'smart' both show labels in 3D
        // (smart zoom-based filtering is complex in 3D; treat same as 'all')
        const node = rawNode as FG3DNode;
        return node.name || node.id;
      });
    } catch (err) {
      console.error('[Graph3DCanvas] displayPrefs.labelDensity update error:', err);
    }
  }, [displayPrefs.labelDensity]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
