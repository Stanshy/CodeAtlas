/**
 * CodeAtlas — Sprint 12 White-Paper Theme
 *
 * Design tokens extracted from approved mockup:
 * proposal/references/sprint12/three-perspectives-mockup.html
 *
 * All values must match the mockup :root CSS variables exactly.
 */

export const THEME = {
  // Background
  bgPaper: '#fafafa',
  bgGrid: '#f0f0f0',
  gridLine: '#d8d8d8',
  gridLineMajor: '#c8c8c8',

  // Ink (text)
  inkPrimary: '#1a1a2e',
  inkSecondary: '#4a4a6a',
  inkMuted: '#8888aa',
  inkFaint: '#bbbbcc',

  // Border & Shadow
  borderDefault: '#d0d0d8',
  shadowCard: '0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
  shadowHover: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',

  // System Framework — blue
  sfBorder: '#1565c0',
  sfBg: '#e3f2fd',
  sfAccent: '#1976d2',
  sfLine: '#1e88e5',

  // Logic Operation — multi-color categories
  loRoutes: '#1565c0',
  loServices: '#7b1fa2',
  loControllers: '#e65100',
  loModels: '#4e342e',
  loUtils: '#546e7a',
  loMiddleware: '#00838f',

  // Logic Operation — category backgrounds
  loBgRoutes: '#e3f2fd',
  loBgServices: '#f3e5f5',
  loBgControllers: '#fff3e0',
  loBgModels: '#efebe9',
  loBgUtils: '#eceff1',
  loBgMiddleware: '#e0f7fa',
  loEntryColor: '#f59e0b',
  loExitColor: '#ef4444',

  // Data Journey — green
  djBorder: '#2e7d32',
  djBg: '#e8f5e9',
  djAccent: '#388e3c',
  djLine: '#43a047',
  djGlow: 'rgba(46, 125, 50, 0.2)',
  djExitBorder: '#ef6c00',
  djExitBg: '#fff3e0',

  // Spacing
  radiusSm: '6px',
  radiusMd: '10px',
  radiusLg: '16px',

  // Typography
  fontUi: "'Inter', sans-serif",
  fontMono: "'JetBrains Mono', monospace",

  // Edge
  edgeDefault: '#9aa8bc',
  edgeWidth: 1.5,

  // Node defaults
  nodeFill: '#ffffff',
  nodeStrokeWidth: 1.5,
  nodeRadius: 6,
} as const;

// Re-export for backward compatibility (other files import these)
// These map old names to new THEME values so existing code doesn't break immediately
export const colors = {
  bg: {
    base: THEME.bgPaper,
    surface: '#ffffff',
    elevated: '#ffffff',
    overlay: THEME.bgGrid,
    grid: THEME.gridLine,
  },
  primary: { DEFAULT: THEME.sfAccent, dim: THEME.sfBorder, ghost: THEME.sfBg },
  secondary: { DEFAULT: THEME.loServices, dim: '#5c2d91', ghost: THEME.loBgServices },
  neon: {
    cyan: { bright: THEME.sfLine, DEFAULT: THEME.sfBorder, dim: '#0d47a1', muted: THEME.sfBg, fill: THEME.sfBg },
    magenta: { bright: THEME.loServices, DEFAULT: THEME.loServices, purple: THEME.loServices, muted: THEME.loBgServices, fill: THEME.loBgServices },
    green: { bright: THEME.djAccent, DEFAULT: THEME.djBorder, dim: '#1b5e20' },
    amber: { bright: '#f59e0b', DEFAULT: '#e65100', dim: '#cc6600' },
  },
  text: {
    primary: THEME.inkPrimary,
    secondary: THEME.inkSecondary,
    muted: THEME.inkMuted,
    disabled: THEME.inkFaint,
    onNeon: '#ffffff',
  },
  edge: {
    import: THEME.edgeDefault,
    importHover: THEME.sfLine,
    export: THEME.edgeDefault,
    dataFlow: THEME.djLine,
    warning: '#e65100',
    faded: 'rgba(154, 168, 188, 0.15)',
  },
} as const;

export const nodeStyles = {
  file: {
    minWidth: 140,
    maxWidth: 220,
    minHeight: 40,
    borderRadius: THEME.radiusSm,
    padding: '8px 12px',
    border: {
      normal: { width: '1.5px', color: THEME.borderDefault },
      hover: { width: '2px', color: THEME.sfBorder },
      active: { width: '2.5px', color: THEME.sfBorder },
    },
    background: {
      normal: THEME.nodeFill,
      hover: '#f5f5ff',
      active: THEME.sfBg,
    },
    transform: { hover: 'scale(1.02)', transition: '150ms ease-out' },
    label: {
      fontFamily: THEME.fontUi,
      fontWeight: 500,
      fontSize: '12px',
      color: THEME.inkPrimary,
    },
    subLabel: { fontSize: '10px', color: THEME.inkSecondary },
    icon: { size: 12, color: THEME.sfBorder },
  },
  directory: {
    minWidth: 160,
    maxWidth: 280,
    collapsedHeight: 56,
    borderRadius: THEME.radiusMd,
    padding: '10px 14px',
    accentBarHeight: '3px',
    accentBarColor: THEME.sfBorder,
    border: {
      normal: { width: '1.5px', color: THEME.borderDefault },
      hover: { width: '2px', color: THEME.sfBorder },
      active: { width: '2.5px', color: THEME.sfBorder },
    },
    background: {
      normal: THEME.nodeFill,
      hover: '#f5f5ff',
      active: THEME.sfBg,
      childArea: 'rgba(0, 0, 0, 0.02)',
    },
    transform: { hover: 'scale(1.02)', transition: '150ms ease-out' },
    label: {
      fontFamily: THEME.fontUi,
      fontWeight: 600,
      fontSize: '13px',
      color: THEME.inkPrimary,
    },
    subLabel: { fontSize: '10px', color: THEME.inkSecondary },
    toggleButton: { size: 12, borderRadius: '50%', background: THEME.borderDefault, color: THEME.inkPrimary },
  },
} as const;

export const edgeStyles = {
  import: {
    stroke: THEME.edgeDefault,
    strokeWidth: 1.5,
    strokeOpacity: 0.70,
    markerEnd: { type: 'arrowclosed' as const, color: THEME.edgeDefault, width: 6, height: 6 },
    curvature: 0.25,
    transition: '100ms ease-out',
  },
  importHover: {
    stroke: THEME.sfLine,
    strokeWidth: 2.5,
    strokeOpacity: 1.0,
    filter: 'none',
    transition: '100ms ease-out',
  },
  faded: {
    stroke: THEME.edgeDefault,
    strokeWidth: 1,
    strokeOpacity: 0.12,
    transition: '200ms ease-out',
  },
  export: { stroke: THEME.edgeDefault, strokeWidth: 1.5, strokeOpacity: 0.70 },
  dataFlow: { stroke: THEME.djLine, strokeWidth: 1, strokeOpacity: 0.60, strokeDasharray: '4 6' },
  warning: { stroke: '#e65100', strokeWidth: 2, strokeOpacity: 0.85, strokeDasharray: '6 4' },
} as const;

export const particleFlow = {
  color: THEME.djAccent,
  size: 4,
  minCount: 3,
  maxCount: 4,
  durationMs: 2400,
  opacityPeak: 0.85,
  performanceThreshold: 200,
  timingFunction: 'linear',
  keyframesName: 'particle-flow',
} as const;

export const glow = {
  file: {
    subtle: { boxShadow: THEME.shadowCard, filter: 'none' },
    normal: { boxShadow: THEME.shadowHover, filter: 'none' },
    intense: { boxShadow: THEME.shadowHover, filter: 'none' },
  },
  directory: {
    subtle: { boxShadow: THEME.shadowCard, filter: 'none' },
    normal: { boxShadow: THEME.shadowHover, filter: 'none' },
    intense: { boxShadow: THEME.shadowHover, filter: 'none' },
  },
  edge: { hover: 'none', warning: 'none' },
} as const;

export const animation = {
  nodeHover: { duration: '150ms', easing: 'ease-out' },
  nodeActive: { duration: '100ms', easing: 'ease-out' },
  edgeHover: { duration: '100ms', easing: 'ease-out' },
  edgeFade: { duration: '200ms', easing: 'ease-out' },
  edgeRestore: { duration: '300ms', easing: 'ease-out' },
  directoryToggle: { duration: 0.25, easing: [0.4, 0, 0.2, 1] as [number, number, number, number] },
  graphMount: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, ease: 'easeOut' } },
  nodeFocus: { duration: 0.35, easing: 'easeInOut' },
  particleDuration: 2000,
  particleHoverSpeedMultiplier: 1.5,
} as const;

export const typography = {
  fontFamily: { ui: THEME.fontUi, mono: THEME.fontMono, numeric: THEME.fontUi },
  scale: {
    h1: { size: '24px', weight: 700, lineHeight: 1.3 },
    h2: { size: '18px', weight: 600, lineHeight: 1.4 },
    body: { size: '14px', weight: 400, lineHeight: 1.5 },
    nodeLabel: { size: '13px', weight: 500, lineHeight: 1.2 },
    small: { size: '12px', weight: 400, lineHeight: 1.4 },
    tiny: { size: '10px', weight: 400, lineHeight: 1.3 },
  },
  weight: { light: 300, regular: 400, medium: 500, semibold: 600, bold: 700 },
  nodeOverflow: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const,
} as const;

export const canvas = {
  backgroundGradient: THEME.bgPaper,
  reactFlowBackground: {
    variant: 'lines' as const,
    color: THEME.gridLine,
    size: 1,
    gap: 20,
  },
  vignette: {
    background: 'transparent',
    pointerEvents: 'none' as const,
    position: 'absolute' as const,
    inset: 0,
  },
  minimap: {
    width: 160,
    height: 120,
    background: 'rgba(255, 255, 255, 0.9)',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: '8px',
    backdropFilter: 'blur(4px)',
    nodeColor: {
      file: THEME.sfBorder,
      directory: THEME.loServices,
    },
    viewportColor: 'rgba(0, 0, 0, 0.15)',
  },
  toolbar: {
    background: '#ffffff',
    border: `1px solid ${THEME.borderDefault}`,
    borderRadius: '10px',
    backdropFilter: 'blur(8px)',
    button: {
      size: 32,
      iconColor: { normal: THEME.inkSecondary, hover: THEME.inkPrimary, active: THEME.sfAccent },
      background: { hover: 'rgba(0, 0, 0, 0.04)', active: THEME.sfBg },
    },
  },
} as const;

export const spacing = {
  unit: 4,
  scale: [0, 4, 8, 12, 16, 24, 32, 48, 64] as const,
  nodePadding: '8px 12px',
  nodeIconGap: '8px',
} as const;

export const accessibility = {
  reducedMotion: { particleDisplay: 'static-dot', animationDuration: '0ms', transitionDuration: '50ms' },
  particleDisableThreshold: 200,
} as const;

export const threeD = {
  backgroundColor: '#fafafa',
  fogDensity: 0.0004,
  node: { file: { radius: 4, segments: 16 }, directory: { radius: 6, segments: 16 } },
  material: {
    color: '#ffffff',
    metalness: 0.1,
    roughness: 0.8,
    file: { emissive: THEME.sfBorder, emissiveHover: THEME.sfBorder, emissiveActive: THEME.sfLine },
    directory: { emissive: THEME.loServices, emissiveHover: THEME.loServices, emissiveActive: THEME.loServices },
    intensity: { normal: 0.3, hover: 0.6, active: 0.8, faded: 0.05 },
    opacity: { normal: 0.9, faded: 0.1 },
  },
  glowSprite: {
    file: { scale: 24, color: 'rgba(21, 101, 192, 0.15)' },
    directory: { scale: 36, color: 'rgba(123, 31, 162, 0.15)' },
    opacity: { normal: 0.15, hover: 0.3, active: 0.4, faded: 0.0 },
  },
  edge: { color: THEME.edgeDefault, colorHover: THEME.sfLine, opacity: { normal: 0.5, hover: 1.0, faded: 0.06 } },
  particle: { color: THEME.djAccent, count: 4, width: 1.5, speed: 0.006, speedHover: 0.009 },
  lights: {
    ambient: { color: '#ffffff', intensity: 0.8 },
    cyan: { color: THEME.sfBorder, intensity: 0.4, position: [100, 100, 100] as const },
    magenta: { color: THEME.loServices, intensity: 0.3, position: [-100, -50, -100] as const },
  },
  camera: {
    focusDuration: 500,
    presets: {
      default: { position: { x: 0, y: 0, z: 300 }, lookAt: { x: 0, y: 0, z: 0 } },
      topDown: { position: { x: 0, y: 300, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
      sideView: { position: { x: 300, y: 50, z: 0 }, lookAt: { x: 0, y: 0, z: 0 } },
    },
  },
  layering: { ySpacing: 40, forceStrength: 0.3 },
  performance: { glowDisableThreshold: 300, particleDisableThreshold: 200 },
} as const;

export const heatmap = {
  strokeWidth: { min: 1, low: 1, medium: 2, high: 3, max: 4 },
  opacity: { min: 0.3, max: 1.0 },
  particleSpeed: { min: 0.004, max: 0.010 },
} as const;

export const tracing = {
  edgeHighlight: THEME.djAccent,
  nodeHighlight: THEME.sfLine,
  fadedOpacity: 0.1,
  panelBackground: '#ffffff',
} as const;

export const edgeLabel = {
  background: 'rgba(255, 255, 255, 0.95)',
  textColor: THEME.inkPrimary,
  fontSize: '11px',
  padding: '4px 8px',
  borderRadius: '4px',
  border: `1px solid ${THEME.borderDefault}`,
  maxWidth: 200,
} as const;

export const ioBadge = {
  background: 'rgba(255, 255, 255, 0.9)',
  textColor: THEME.inkSecondary,
  fontSize: '10px',
  padding: '1px 4px',
  borderRadius: '3px',
  importColor: THEME.sfBorder,
  exportColor: THEME.djBorder,
} as const;

export const PERSPECTIVE_COLORS = {
  'cyan-monochrome': {
    primary: THEME.sfBorder,
    bright: THEME.sfLine,
    dim: '#0d47a1',
    bg: THEME.sfBg,
    bgLit: THEME.sfBg,
    bgDim: '#f5f5f5',
    border: THEME.borderDefault,
    glow: THEME.shadowCard,
    glowIntense: THEME.shadowHover,
    edgeStatic: '0.4',
    accentRgb: '21, 101, 192',
  },
  'neon-multicolor': {
    primary: THEME.sfBorder,
    bright: THEME.sfLine,
    dim: '#0d47a1',
    bg: '#f5f5ff',
    bgLit: THEME.sfBg,
    bgDim: '#f5f5f5',
    border: THEME.borderDefault,
    glow: THEME.shadowCard,
    glowIntense: THEME.shadowHover,
    edgeStatic: '0.35',
    accentRgb: '21, 101, 192',
  },
  'green-monochrome': {
    primary: THEME.djBorder,
    bright: THEME.djAccent,
    dim: '#1b5e20',
    bg: THEME.djBg,
    bgLit: THEME.djBg,
    bgDim: '#f5fff5',
    border: THEME.borderDefault,
    glow: '0 2px 8px rgba(46,125,50,0.15)',
    glowIntense: '0 0 12px rgba(46,125,50,0.3)',
    edgeStatic: '0.4',
    accentRgb: '46, 125, 50',
  },
  // Sprint 12: paper-theme variants (aliases of the above with new naming)
  'blue-paper': {
    primary: THEME.sfBorder,
    bright: THEME.sfLine,
    dim: '#0d47a1',
    bg: THEME.sfBg,
    bgLit: THEME.sfBg,
    bgDim: '#f5f5f5',
    border: THEME.borderDefault,
    glow: THEME.shadowCard,
    glowIntense: THEME.shadowHover,
    edgeStatic: '0.4',
    accentRgb: '21, 101, 192',
  },
  'multi-paper': {
    primary: THEME.sfBorder,
    bright: THEME.sfLine,
    dim: '#0d47a1',
    bg: '#f5f5ff',
    bgLit: THEME.sfBg,
    bgDim: '#f5f5f5',
    border: THEME.borderDefault,
    glow: THEME.shadowCard,
    glowIntense: THEME.shadowHover,
    edgeStatic: '0.35',
    accentRgb: '21, 101, 192',
  },
  'green-paper': {
    primary: THEME.djBorder,
    bright: THEME.djAccent,
    dim: '#1b5e20',
    bg: THEME.djBg,
    bgLit: THEME.djBg,
    bgDim: '#f5fff5',
    border: THEME.borderDefault,
    glow: '0 2px 8px rgba(46,125,50,0.15)',
    glowIntense: '0 0 12px rgba(46,125,50,0.3)',
    edgeStatic: '0.4',
    accentRgb: '46, 125, 50',
  },
} as const;
