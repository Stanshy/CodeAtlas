/**
 * CodeAtlas — Three.js Scene Helper Functions
 *
 * Pure helper functions and constants extracted from Graph3DCanvas.tsx.
 * No React, no component state — pure data-in / Three.js objects-out functions.
 *
 * Sprint 17 — T7: Graph3DCanvas refactoring (extracted module)
 */

import * as THREE from 'three';
import type { NodeObject, LinkObject } from '3d-force-graph';
import { THEME, threeD, edgeLabel as edgeLabelTheme, tracing as tracingTheme, colors } from '../styles/theme';
import type { GraphNode, GraphEdge } from '../types/graph';
import { hexToRgba, resolveLinkEndId } from './three-helpers';

// ---------------------------------------------------------------------------
// Internal 3d-force-graph node/link types (shared with Graph3DCanvas)
// ---------------------------------------------------------------------------

export interface FG3DNode extends NodeObject {
  id: string;
  name: string;
  nodeType: 'file' | 'directory' | 'function' | 'class';
  depth: number;
  filePath: string;
  metadata: GraphNode['metadata'];
}

export interface FG3DLink extends LinkObject {
  source: string | FG3DNode;
  target: string | FG3DNode;
  edgeType: GraphEdge['type'];
  /** Imported symbol names for edge label display (Sprint 5 T4) */
  importedSymbols?: string[];
}

// ---------------------------------------------------------------------------
// Color constants
// Sprint 7: lime/yellow emissive colors for function/class spheres
// ---------------------------------------------------------------------------

export const FUNC_EMISSIVE = '#84cc16';   // lime-500
export const CLASS_EMISSIVE = '#facc15';  // yellow-400
export const FUNC_GLOW_COLOR = 'rgba(163, 230, 53, 0.30)';
export const CLASS_GLOW_COLOR = 'rgba(250, 204, 21, 0.28)';

// ---------------------------------------------------------------------------
// Helpers — build canvas glow texture for sprites
// ---------------------------------------------------------------------------

export function createGlowTexture(color: string): THREE.Texture {
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
export function createTextSprite(text: string): THREE.Sprite {
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
export function inferSymbolType(symbolName: string): 'class' | 'function' | 'variable' {
  if (/^[A-Z][a-zA-Z0-9]*$/.test(symbolName)) {
    return 'class';
  }
  if (/^[a-z]/.test(symbolName) && symbolName.length > 2) {
    return 'function';
  }
  return 'variable';
}

/** Particle visual attributes keyed by symbol type */
export const particleVisual = {
  class:    { color: colors.neon.cyan.DEFAULT,  size: 2 },   // THEME.sfBorder (#1565c0)
  function: { color: colors.neon.green.bright,  size: 3 },   // THEME.djAccent (#388e3c)
  variable: { color: '#ffffff',                 size: 1 },
} as const;

/**
 * Returns the particle color for a link based on the first importedSymbol.
 * Falls back to the default particle color when no symbols are present.
 */
export function getLinkParticleColor(link: FG3DLink): string {
  const first = link.importedSymbols?.[0];
  if (!first) return threeD.particle.color;
  return particleVisual[inferSymbolType(first)].color;
}

/**
 * Returns the particle width for a link based on the first importedSymbol.
 * Falls back to the default particle width when no symbols are present.
 */
export function getLinkParticleWidth(link: FG3DLink): number {
  const first = link.importedSymbols?.[0];
  if (!first) return threeD.particle.width;
  return particleVisual[inferSymbolType(first)].size;
}

// ---------------------------------------------------------------------------
// Helpers — glow texture map type (used by node builders)
// ---------------------------------------------------------------------------

export type GlowTextureMap = {
  file: THREE.Texture;
  directory: THREE.Texture;
  function: THREE.Texture;
  class: THREE.Texture;
};

// ---------------------------------------------------------------------------
// Helpers — build node Three.js object
// ---------------------------------------------------------------------------

export function buildNodeObject(
  rawNode: NodeObject,
  glowTextures: GlowTextureMap,
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
// Helpers — build highlighted node Three.js object
// ---------------------------------------------------------------------------

export function buildHighlightedNodeObject(
  rawNode: NodeObject,
  glowTextures: GlowTextureMap,
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
// Helpers — 3D spatial reference: GridHelper + custom axes + axis label sprites
// Sprint 10 T8
// ---------------------------------------------------------------------------

/**
 * Creates a Canvas-texture sprite for an axis label ("X", "Y", "Z").
 * The sprite billboards automatically (always faces the camera) because
 * THREE.Sprite is inherently view-aligned.
 */
export function createAxisLabelSprite(label: string): THREE.Sprite {
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

// Typed instance — must match the GraphInstance type in Graph3DCanvas
import type { ForceGraph3DInstance } from '3d-force-graph';
type GraphInstance = ForceGraph3DInstance<NodeObject, LinkObject<NodeObject>>;

/**
 * Adds spatial reference helpers to the 3d-force-graph scene:
 * 1. Semi-transparent GridHelper beneath the nodes
 * 2. Custom XYZ axes drawn with LineBasicMaterial (colour-coded, semi-transparent)
 * 3. Billboard axis label sprites at each axis tip
 *
 * Only called in 3D mode — the scene is owned by 3d-force-graph and will be
 * cleaned up automatically when the graph instance is destroyed.
 */
export function addSpatialReference(graph: GraphInstance): void {
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

// Re-export helpers from three-helpers for consumers who only import this module
export { hexToRgba, resolveLinkEndId };

// Re-export theme constants needed by highlight effects
export { threeD, tracingTheme, THEME };
