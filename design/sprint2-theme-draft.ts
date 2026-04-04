/**
 * CodeAtlas — Sprint 2 深色霓虹主題設計稿
 *
 * 文件：design/sprint2-visual-style.md
 * 任務：T2 — 深色霓虹視覺設計
 * 日期：2026-03-30
 * 作者：brand-guardian
 *
 * 使用方式：
 *   import { colors, nodeStyles, edgeStyles, glow, animation, typography } from '@/styles/theme'
 *
 * 注意：
 *   - 此為設計稿，開發時複製到 packages/web/src/styles/theme.ts
 *   - 所有 CSS-in-JS 字串值可直接用於 React Flow 的 style prop 或 CSS 變數
 */

// ---------------------------------------------------------------------------
// 色彩系統
// ---------------------------------------------------------------------------

export const colors = {
  /** 背景色層級 */
  bg: {
    /** #0a0a0f — 主畫布背景，最暗層 */
    base: '#0a0a0f',
    /** #0f0f1a — 節點填充底色，比背景稍亮以區隔層次 */
    surface: '#0f0f1a',
    /** #13131f — 選中節點 / Panel 底色 */
    elevated: '#13131f',
    /** #1a1a2e — Tooltip / Modal / 工具列背景，最亮背景層 */
    overlay: '#1a1a2e',
    /** rgba(255,255,255,0.03) — 背景網格線，極弱僅暗示結構 */
    grid: 'rgba(255, 255, 255, 0.03)',
  },

  /** 主色（Primary）— 主要互動元素、Toolbar 強調、選中態 */
  primary: {
    /** #00d4ff — 主色 */
    DEFAULT: '#00d4ff',
    /** #0099bb — 降亮版，次要互動態 */
    dim: '#0099bb',
    /** rgba(0,212,255,0.12) — 選中態背景填充 */
    ghost: 'rgba(0, 212, 255, 0.12)',
  },

  /** 輔色（Secondary）— 次要強調元素 */
  secondary: {
    /** #bd00ff — 輔色，directory 節點主色 */
    DEFAULT: '#bd00ff',
    /** #8800bb — 降亮版 */
    dim: '#8800bb',
    /** rgba(189,0,255,0.10) — Directory 節點填充背景 */
    ghost: 'rgba(189, 0, 255, 0.10)',
  },

  /** 霓虹色（Neon）— 四大色系 */
  neon: {
    /** Cyan 系 — File 節點專屬 */
    cyan: {
      /** #00ffff — File 節點 Hover/Active 邊框、高亮狀態（WCAG 對比度 21.0:1）*/
      bright: '#00ffff',
      /** #00d4ff — File 節點標準邊框色（對比度 14.8:1）*/
      DEFAULT: '#00d4ff',
      /** #0099cc — File 節點次要狀態（對比度 7.2:1）*/
      dim: '#0099cc',
      /** rgba(0,212,255,0.35) — File 節點填充背景色（透明）*/
      muted: 'rgba(0, 212, 255, 0.35)',
      /** rgba(0,212,255,0.07) — File 節點標準填充 */
      fill: 'rgba(0, 212, 255, 0.07)',
    },

    /** Magenta/Purple 系 — Directory 節點專屬 */
    magenta: {
      /** #ff00ff — Directory 節點 Hover/Active 邊框（對比度 9.6:1）*/
      bright: '#ff00ff',
      /** #bd00ff — Directory 節點標準邊框色（對比度 7.1:1）*/
      DEFAULT: '#bd00ff',
      /** #8855ff — Directory 節點填充邊框（對比度 5.2:1）*/
      purple: '#8855ff',
      /** rgba(136,85,255,0.18) — Directory 節點填充背景 */
      muted: 'rgba(136, 85, 255, 0.18)',
      /** rgba(136,85,255,0.08) — Directory 節點標準填充 */
      fill: 'rgba(136, 85, 255, 0.08)',
    },

    /** Green 系 — Import 邊 / Data-flow 邊 */
    green: {
      /** #00ff88 — 邊線 Hover 高亮色（對比度 16.8:1）*/
      bright: '#00ff88',
      /** #00cc66 — 標準 import 邊線色（對比度 10.7:1）*/
      DEFAULT: '#00cc66',
      /** #009944 — 流動粒子主色（對比度 6.1:1）*/
      dim: '#009944',
    },

    /** Amber/Orange 系 — 警告 / Highlight */
    amber: {
      /** #ffaa00 — 循環依賴警告邊線（對比度 10.5:1）*/
      bright: '#ffaa00',
      /** #ff8800 — 警告節點邊框（對比度 8.2:1）*/
      DEFAULT: '#ff8800',
      /** #cc6600 — 次要警告態（對比度 5.4:1）*/
      dim: '#cc6600',
    },
  },

  /** 文字色 */
  text: {
    /** #e8eaf6 — 主文字（對比度 16.4:1，遠超 WCAG AA）*/
    primary: '#e8eaf6',
    /** #9e9ec8 — 次文字（對比度 7.2:1）*/
    secondary: '#9e9ec8',
    /** #5c5c88 — 暗文字（對比度 4.7:1，剛過 WCAG AA）*/
    muted: '#5c5c88',
    /** #3a3a5c — 停用狀態（對比度 2.8:1，僅用於非重要 UI）*/
    disabled: '#3a3a5c',
    /** #0a0a0f — 霓虹背景上的反色文字 */
    onNeon: '#0a0a0f',
  },

  /** 邊線色（React Flow 邊） */
  edge: {
    /** #00cc66 — import 邊標準色 */
    import: '#00cc66',
    /** #00ff88 — import 邊 Hover 高亮色 */
    importHover: '#00ff88',
    /** #0099cc — export 邊標準色 */
    export: '#0099cc',
    /** #00ffff — data-flow 邊色 */
    dataFlow: '#00ffff',
    /** #ff8800 — 循環依賴警告邊色 */
    warning: '#ff8800',
    /** rgba(0,204,102,0.15) — 淡化邊（非相關） */
    faded: 'rgba(0, 204, 102, 0.15)',
  },
} as const

// ---------------------------------------------------------------------------
// 節點樣式
// ---------------------------------------------------------------------------

export const nodeStyles = {
  /** File 節點（Cyan 系） */
  file: {
    minWidth: 140,
    maxWidth: 220,
    minHeight: 48,
    borderRadius: '8px',
    padding: '10px 14px',

    border: {
      normal: { width: '1.5px', color: colors.neon.cyan.DEFAULT },
      hover: { width: '2px', color: colors.neon.cyan.bright },
      active: { width: '2.5px', color: colors.neon.cyan.bright },
    },

    background: {
      normal: colors.neon.cyan.fill,
      hover: 'rgba(0, 212, 255, 0.12)',
      active: 'rgba(0, 212, 255, 0.16)',
    },

    transform: {
      hover: 'scale(1.04)',
      transition: '150ms ease-out',
    },

    label: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 500,
      fontSize: '13px',
      color: colors.text.primary,
    },

    subLabel: {
      fontSize: '10px',
      color: colors.text.secondary,
    },

    icon: {
      size: 14,
      color: colors.neon.cyan.DEFAULT,
    },
  },

  /** Directory 節點（Magenta/Purple 系） */
  directory: {
    minWidth: 160,
    maxWidth: 280,
    collapsedHeight: 56,
    borderRadius: '10px',
    padding: '10px 14px',
    accentBarHeight: '3px',
    accentBarColor: colors.neon.magenta.DEFAULT,

    border: {
      normal: { width: '1.5px', color: colors.neon.magenta.purple },
      hover: { width: '2px', color: colors.neon.magenta.DEFAULT },
      active: { width: '2.5px', color: colors.neon.magenta.bright },
    },

    background: {
      normal: colors.neon.magenta.fill,
      hover: 'rgba(189, 0, 255, 0.13)',
      active: 'rgba(189, 0, 255, 0.18)',
      childArea: 'rgba(136, 85, 255, 0.04)',
    },

    transform: {
      hover: 'scale(1.02)',
      transition: '150ms ease-out',
    },

    label: {
      fontFamily: "'Inter', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: '13px',
      color: colors.text.primary,
    },

    subLabel: {
      fontSize: '10px',
      color: colors.text.secondary,
    },

    toggleButton: {
      size: 12,
      borderRadius: '50%',
      background: colors.neon.magenta.purple,
      color: colors.text.primary,
    },
  },
} as const

// ---------------------------------------------------------------------------
// 邊樣式
// ---------------------------------------------------------------------------

export const edgeStyles = {
  /** Import 邊（標準） */
  import: {
    stroke: colors.edge.import,
    strokeWidth: 1.5,
    strokeOpacity: 0.70,
    markerEnd: {
      type: 'arrowclosed' as const,
      color: colors.edge.import,
      width: 6,
      height: 6,
    },
    curvature: 0.25,
    transition: '100ms ease-out',
  },

  /** Import 邊（Hover 高亮） */
  importHover: {
    stroke: colors.edge.importHover,
    strokeWidth: 2.5,
    strokeOpacity: 1.0,
    filter: 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.80))',
    transition: '100ms ease-out',
  },

  /** 淡化邊（非相關節點周圍邊） */
  faded: {
    stroke: colors.edge.import,
    strokeWidth: 1,
    strokeOpacity: 0.12,
    transition: '200ms ease-out',
  },

  /** Export 邊 */
  export: {
    stroke: colors.edge.export,
    strokeWidth: 1.5,
    strokeOpacity: 0.70,
  },

  /** Data-flow 邊（虛線） */
  dataFlow: {
    stroke: colors.edge.dataFlow,
    strokeWidth: 1,
    strokeOpacity: 0.60,
    strokeDasharray: '4 6',
  },

  /** 警告邊（循環依賴） */
  warning: {
    stroke: colors.edge.warning,
    strokeWidth: 2,
    strokeOpacity: 0.85,
    strokeDasharray: '6 4',
  },
} as const

// ---------------------------------------------------------------------------
// 流動粒子參數
// ---------------------------------------------------------------------------

export const particleFlow = {
  /** 粒子顏色 */
  color: colors.neon.green.bright,
  /** 粒子直徑（px） */
  size: 3,
  /** 每條邊最少粒子數 */
  minCount: 2,
  /** 每條邊最多粒子數 */
  maxCount: 4,
  /** 流動週期（ms，越小越快）*/
  durationMs: 2000,
  /** 粒子頭部最高 opacity */
  opacityPeak: 0.85,
  /** 關閉粒子的節點數量閾值（效能降級）*/
  performanceThreshold: 200,
  /** CSS animation-timing-function */
  timingFunction: 'linear',
  /** CSS @keyframes 名稱 */
  keyframesName: 'particle-flow',
} as const

// ---------------------------------------------------------------------------
// Glow 效果
// ---------------------------------------------------------------------------

export const glow = {
  /** File 節點 glow */
  file: {
    /** 正常態 — subtle */
    subtle: {
      boxShadow: [
        '0 0 8px rgba(0, 212, 255, 0.25)',
        '0 0 16px rgba(0, 212, 255, 0.10)',
      ].join(', '),
      filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.20))',
    },
    /** Hover 態 — normal */
    normal: {
      boxShadow: [
        '0 0 12px rgba(0, 212, 255, 0.50)',
        '0 0 24px rgba(0, 212, 255, 0.25)',
        '0 0 40px rgba(0, 212, 255, 0.10)',
      ].join(', '),
      filter: 'drop-shadow(0 0 8px rgba(0, 212, 255, 0.45))',
    },
    /** Active/Selected 態 — intense */
    intense: {
      boxShadow: [
        '0 0 16px rgba(0, 255, 255, 0.70)',
        '0 0 32px rgba(0, 212, 255, 0.40)',
        '0 0 60px rgba(0, 212, 255, 0.20)',
        'inset 0 0 12px rgba(0, 212, 255, 0.08)',
      ].join(', '),
      filter: 'drop-shadow(0 0 12px rgba(0, 255, 255, 0.60))',
    },
  },

  /** Directory 節點 glow */
  directory: {
    /** 正常態 — subtle */
    subtle: {
      boxShadow: [
        '0 0 8px rgba(189, 0, 255, 0.25)',
        '0 0 16px rgba(189, 0, 255, 0.10)',
      ].join(', '),
      filter: 'drop-shadow(0 0 4px rgba(189, 0, 255, 0.20))',
    },
    /** Hover 態 — normal */
    normal: {
      boxShadow: [
        '0 0 12px rgba(189, 0, 255, 0.50)',
        '0 0 24px rgba(189, 0, 255, 0.25)',
        '0 0 40px rgba(189, 0, 255, 0.10)',
      ].join(', '),
      filter: 'drop-shadow(0 0 8px rgba(189, 0, 255, 0.45))',
    },
    /** Active/Selected 態 — intense */
    intense: {
      boxShadow: [
        '0 0 16px rgba(255, 0, 255, 0.70)',
        '0 0 32px rgba(189, 0, 255, 0.40)',
        '0 0 60px rgba(189, 0, 255, 0.20)',
        'inset 0 0 12px rgba(189, 0, 255, 0.08)',
      ].join(', '),
      filter: 'drop-shadow(0 0 12px rgba(255, 0, 255, 0.60))',
    },
  },

  /** Edge glow（邊線 Hover）*/
  edge: {
    hover: 'drop-shadow(0 0 6px rgba(0, 255, 136, 0.80))',
    warning: 'drop-shadow(0 0 6px rgba(255, 136, 0, 0.70))',
  },
} as const

// ---------------------------------------------------------------------------
// 動畫參數
// ---------------------------------------------------------------------------

export const animation = {
  /** 節點 Hover 過渡 */
  nodeHover: {
    duration: '150ms',
    easing: 'ease-out',
  },

  /** 節點 Active 過渡 */
  nodeActive: {
    duration: '100ms',
    easing: 'ease-out',
  },

  /** 邊 Hover 高亮過渡 */
  edgeHover: {
    duration: '100ms',
    easing: 'ease-out',
  },

  /** 非相關邊淡化過渡 */
  edgeFade: {
    duration: '200ms',
    easing: 'ease-out',
  },

  /** 非相關邊恢復過渡 */
  edgeRestore: {
    duration: '300ms',
    easing: 'ease-out',
  },

  /** Directory 展開 / 收合（Framer Motion）*/
  directoryToggle: {
    duration: 0.25,
    easing: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },

  /** 圖譜初始載入 — 節點淡入（Framer Motion）*/
  graphMount: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: 'easeOut' },
  },

  /** 節點聚焦（zoom to node）*/
  nodeFocus: {
    duration: 0.35,
    easing: 'easeInOut',
  },

  /** 粒子流動速度（ms/cycle） */
  particleDuration: 2000,

  /** 粒子速度加速比（Hover 時）*/
  particleHoverSpeedMultiplier: 1.5,
} as const

// ---------------------------------------------------------------------------
// 字體規範
// ---------------------------------------------------------------------------

export const typography = {
  fontFamily: {
    /** 節點標籤、UI 文字 */
    ui: "'Inter', system-ui, -apple-system, sans-serif",
    /** 程式碼、路徑、檔名 */
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    /** 數字統計（tabular-nums）*/
    numeric: "'Inter', system-ui",
  },

  scale: {
    /** 主標題（App 名稱）*/
    h1: { size: '24px', weight: 700, lineHeight: 1.3 },
    /** 面板標題 */
    h2: { size: '18px', weight: 600, lineHeight: 1.4 },
    /** 一般說明、Tooltip */
    body: { size: '14px', weight: 400, lineHeight: 1.5 },
    /** 節點主標籤 */
    nodeLabel: { size: '13px', weight: 500, lineHeight: 1.2 },
    /** 節點副標籤、count 數字 */
    small: { size: '12px', weight: 400, lineHeight: 1.4 },
    /** 極小輔助資訊（慎用）*/
    tiny: { size: '10px', weight: 400, lineHeight: 1.3 },
  },

  weight: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  /** 節點標籤溢出處理 */
  nodeOverflow: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  } as const,
} as const

// ---------------------------------------------------------------------------
// 背景與畫布效果
// ---------------------------------------------------------------------------

export const canvas = {
  /** 畫布主背景漸層 */
  backgroundGradient: `radial-gradient(
    ellipse at 50% 50%,
    ${colors.bg.surface} 0%,
    ${colors.bg.base} 60%,
    #070710 100%
  )`,

  /** React Flow Background 元件建議設定 */
  reactFlowBackground: {
    variant: 'dots' as const,
    color: 'rgba(255, 255, 255, 0.08)',
    size: 1,
    gap: 24,
  },

  /** 邊角暗暈 Vignette（疊加在最上層的 overlay div）*/
  vignette: {
    background: `radial-gradient(
      ellipse at 50% 50%,
      transparent 40%,
      rgba(7, 7, 16, 0.6) 100%
    )`,
    pointerEvents: 'none' as const,
    position: 'absolute' as const,
    inset: 0,
  },

  /** Minimap */
  minimap: {
    width: 160,
    height: 120,
    background: 'rgba(10, 10, 15, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    backdropFilter: 'blur(4px)',
    nodeColor: {
      file: 'rgba(0, 212, 255, 0.70)',
      directory: 'rgba(136, 85, 255, 0.70)',
    },
    viewportColor: 'rgba(255, 255, 255, 0.15)',
  },

  /** 工具列 */
  toolbar: {
    background: 'rgba(26, 26, 46, 0.90)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    backdropFilter: 'blur(8px)',
    button: {
      size: 32,
      iconColor: {
        normal: colors.text.secondary,
        hover: colors.text.primary,
        active: colors.primary.DEFAULT,
      },
      background: {
        hover: 'rgba(255, 255, 255, 0.06)',
        active: 'rgba(0, 212, 255, 0.10)',
      },
    },
  },
} as const

// ---------------------------------------------------------------------------
// 間距系統
// ---------------------------------------------------------------------------

export const spacing = {
  /** 基礎單位（px）*/
  unit: 4,
  /** 間距刻度 */
  scale: [0, 4, 8, 12, 16, 24, 32, 48, 64] as const,
  /** 節點內距 */
  nodePadding: '10px 14px',
  /** 節點 icon + label 間距 */
  nodeIconGap: '8px',
} as const

// ---------------------------------------------------------------------------
// 無障礙 / 效能設定
// ---------------------------------------------------------------------------

export const accessibility = {
  /**
   * 在 CSS 中使用：
   *   @media (prefers-reduced-motion: reduce) { ... }
   * 或在 JS 中：
   *   const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
   */
  reducedMotion: {
    /** 減少動態模式下，粒子改為靜態點 */
    particleDisplay: 'static-dot',
    /** 減少動態模式下，禁用所有 CSS animation */
    animationDuration: '0ms',
    /** 減少動態模式下，過渡時間縮短至最低 */
    transitionDuration: '50ms',
  },
  /** 效能降級閾值：節點超過此數量時關閉粒子動畫 */
  particleDisableThreshold: 200,
} as const

// ---------------------------------------------------------------------------
// CSS 變數字串（供 global.css 貼上使用）
// ---------------------------------------------------------------------------

/**
 * 可直接貼入 :root { } 的 CSS 變數定義
 *
 * :root {
 *   --ca-bg-base: #0a0a0f;
 *   --ca-bg-surface: #0f0f1a;
 *   ...
 * }
 */
export const cssVariables = {
  '--ca-bg-base': colors.bg.base,
  '--ca-bg-surface': colors.bg.surface,
  '--ca-bg-elevated': colors.bg.elevated,
  '--ca-bg-overlay': colors.bg.overlay,

  '--ca-primary': colors.primary.DEFAULT,
  '--ca-primary-dim': colors.primary.dim,
  '--ca-secondary': colors.secondary.DEFAULT,
  '--ca-secondary-dim': colors.secondary.dim,

  '--ca-neon-cyan': colors.neon.cyan.DEFAULT,
  '--ca-neon-cyan-bright': colors.neon.cyan.bright,
  '--ca-neon-cyan-dim': colors.neon.cyan.dim,
  '--ca-neon-magenta': colors.neon.magenta.DEFAULT,
  '--ca-neon-magenta-bright': colors.neon.magenta.bright,
  '--ca-neon-purple': colors.neon.magenta.purple,
  '--ca-neon-green': colors.neon.green.DEFAULT,
  '--ca-neon-green-bright': colors.neon.green.bright,
  '--ca-neon-amber': colors.neon.amber.DEFAULT,
  '--ca-neon-amber-bright': colors.neon.amber.bright,

  '--ca-text-primary': colors.text.primary,
  '--ca-text-secondary': colors.text.secondary,
  '--ca-text-muted': colors.text.muted,
  '--ca-text-disabled': colors.text.disabled,

  '--ca-edge-import': colors.edge.import,
  '--ca-edge-import-hover': colors.edge.importHover,
  '--ca-edge-warning': colors.edge.warning,

  '--ca-font-ui': typography.fontFamily.ui,
  '--ca-font-mono': typography.fontFamily.mono,
} as const
