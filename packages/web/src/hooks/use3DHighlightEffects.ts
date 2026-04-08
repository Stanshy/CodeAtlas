/**
 * CodeAtlas — use3DHighlightEffects Hook
 *
 * Encapsulates all useEffect blocks that handle visual highlighting in
 * Graph3DCanvas. Extracted to reduce main component size while preserving
 * identical runtime behaviour.
 *
 * Sprint 17 — T7: Graph3DCanvas refactoring (extracted hook)
 *
 * Priority order (highest → lowest):
 *   E2E tracing > impact analysis > symbol tracing > search focus > hover > normal
 */

import { useEffect } from 'react';
import type { NodeObject, LinkObject } from '3d-force-graph';
import type { ForceGraph3DInstance } from '3d-force-graph';
import * as THREE from 'three';
import { threeD, tracing as tracingTheme, THEME } from '../styles/theme';
import { hexToRgba, resolveLinkEndId } from '../utils/three-helpers';
import {
  buildNodeObject,
  buildHighlightedNodeObject,
  FUNC_EMISSIVE,
  CLASS_EMISSIVE,
  type FG3DNode,
  type FG3DLink,
  type GlowTextureMap,
} from '../utils/three-scene-helpers';
import type { GraphEdge } from '../types/graph';
import type { E2ETracingState, DisplayPrefs } from '../types/graph';
import type { HeatmapStyle } from './useHeatmap';

// ---------------------------------------------------------------------------
// Internal graph instance type (same narrowing as Graph3DCanvas)
// ---------------------------------------------------------------------------

type GraphInstance = ForceGraph3DInstance<NodeObject, LinkObject<NodeObject>>;

// ---------------------------------------------------------------------------
// Hook params
// ---------------------------------------------------------------------------

export interface Use3DHighlightEffectsParams {
  graphRef: React.RefObject<GraphInstance | null>;
  glowTexturesRef: React.RefObject<GlowTextureMap | null>;
  graphEdges: GraphEdge[];
  // hover/selection state
  hoveredNodeId: string | null | undefined;
  selectedNodeId: string | null | undefined;
  adjacency: { connectedNodes: Map<string, Set<string>> };
  // symbol tracing
  tracingSymbol: string | null | undefined;
  tracingPath: string[];
  tracingEdges: string[];
  // heatmap
  isHeatmapEnabled: boolean;
  getHeatmapEdgeStyle: ((symbolCount: number) => HeatmapStyle) | undefined;
  // impact analysis
  impactAnalysis: {
    active: boolean;
    impactedNodes: string[];
    impactedEdges: string[];
  } | null | undefined;
  // search focus
  isSearchFocused: boolean;
  searchFocusNodes: string[];
  searchFocusEdges: string[];
  // E2E tracing
  e2eTracing: E2ETracingState | null | undefined;
  // display preferences
  displayPrefs: DisplayPrefs;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function use3DHighlightEffects({
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
}: Use3DHighlightEffectsParams): void {

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
  }, [hoveredNodeId, adjacency]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [selectedNodeId, hoveredNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [tracingSymbol, hoveredNodeId, e2eTracing]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [isHeatmapEnabled, getHeatmapEdgeStyle, tracingSymbol, graphEdges]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [impactAnalysis, isSearchFocused, tracingSymbol, hoveredNodeId, e2eTracing]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [e2eTracing, impactAnalysis, isSearchFocused, tracingSymbol, hoveredNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [displayPrefs.showParticles]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [displayPrefs.labelDensity]); // eslint-disable-line react-hooks/exhaustive-deps
}
