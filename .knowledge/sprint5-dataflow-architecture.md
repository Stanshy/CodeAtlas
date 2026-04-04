# Sprint 5 — 資料流動視覺化架構設計

> **版本**: v1.0
> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **Sprint**: 5
> **對應功能**: F33~F40

---

## 1. 設計目標

在 Sprint 4 的 2D/3D 雙模式基礎上，新增資料流動視覺化功能：

1. **邊上 symbol 標籤**（F33）— hover 邊線顯示搬運的 symbol
2. **路徑追蹤模式**（F34）— 點擊 symbol 追蹤完整傳遞鏈
3. **節點 I/O 標記**（F35）— 節點顯示 import/export 數量
4. **資料流熱力圖**（F36）— 邊粗細/亮度反映 symbol 數量
5. **2D+3D 雙模式適配**（F37）— 所有功能雙模式可用
6. **粒子 symbol 類型**（F38）— 粒子依 symbol 類型著色
7. **路徑追蹤面板**（F39）— 右側面板顯示追蹤路徑
8. **熱力圖開關**（F40）— Toolbar 按鈕控制

---

## 2. 資料來源（已備，不需新增）

所有 Sprint 5 功能基於 Sprint 1 core 已解析的資料：

```typescript
// data-model.md — EdgeMetadata
interface EdgeMetadata {
  importedSymbols?: string[];  // ← 邊標籤、路徑追蹤、熱力圖的數據來源
  isDefault?: boolean;
  isDynamic?: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

// data-model.md — NodeMetadata
interface NodeMetadata {
  exportCount?: number;  // ← I/O 標記（出）
  importCount?: number;  // ← I/O 標記（入）
  // ...其他欄位
}
```

**不需修改 core 層**。所有功能為純前端（web package）。

---

## 3. ViewStateContext 擴充

### 3.1 新增狀態欄位

```typescript
export interface ViewState {
  // === 既有欄位（Sprint 4，12 個）===
  mode: ViewMode;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  searchResults: string[];
  isSearchOpen: boolean;
  isPanelOpen: boolean;
  focusNodeId: string | null;
  cameraPreset: CameraPresetName;

  // === Sprint 5 新增欄位 ===
  /** 正在追蹤的 symbol 名稱（null = 非追蹤模式） */
  tracingSymbol: string | null;
  /** 追蹤路徑中的 node ID 列表（有序） */
  tracingPath: string[];
  /** 追蹤路徑中的 edge ID 列表 */
  tracingEdges: string[];
  /** 熱力圖開關（預設 false） */
  isHeatmapEnabled: boolean;
  /** 當前 hover 的 edge ID（用於邊標籤顯示） */
  hoveredEdgeId: string | null;
}
```

### 3.2 新增 Action

```typescript
export type ViewAction =
  // ...existing 12 actions...
  | { type: 'START_TRACING'; symbol: string; path: string[]; edges: string[] }
  | { type: 'STOP_TRACING' }
  | { type: 'TOGGLE_HEATMAP' }
  | { type: 'HOVER_EDGE'; edgeId: string | null };
```

### 3.3 Reducer 邏輯

```typescript
case 'START_TRACING':
  return {
    ...state,
    tracingSymbol: action.symbol,
    tracingPath: action.path,
    tracingEdges: action.edges,
    isPanelOpen: true,  // 自動開啟面板顯示追蹤結果
  };

case 'STOP_TRACING':
  return {
    ...state,
    tracingSymbol: null,
    tracingPath: [],
    tracingEdges: [],
  };

case 'TOGGLE_HEATMAP':
  return { ...state, isHeatmapEnabled: !state.isHeatmapEnabled };

case 'HOVER_EDGE':
  return { ...state, hoveredEdgeId: action.edgeId };
```

### 3.4 初始值

```typescript
const initialState: ViewState = {
  // ...existing...
  tracingSymbol: null,
  tracingPath: [],
  tracingEdges: [],
  isHeatmapEnabled: false,
  hoveredEdgeId: null,
};
```

---

## 4. 路徑追蹤演算法

### 4.1 介面

```typescript
// packages/web/src/utils/path-tracer.ts

interface TraceInput {
  /** 要追蹤的 symbol 名稱 */
  symbol: string;
  /** graph 的所有節點（需要 id） */
  nodes: Array<{ id: string }>;
  /** graph 的所有邊（需要 id, source, target, metadata.importedSymbols） */
  edges: Array<{
    id: string;
    source: string;
    target: string;
    metadata: { importedSymbols?: string[] };
  }>;
}

interface TraceResult {
  /** 追蹤路徑中的 node ID（有序，從起點到終點） */
  path: string[];
  /** 追蹤路徑中的 edge ID */
  edges: string[];
}
```

### 4.2 演算法虛擬碼

```
function traceSymbolPath(input: TraceInput): TraceResult
  symbol = input.symbol

  // Step 1: 過濾含有此 symbol 的邊
  relevantEdges = input.edges.filter(e =>
    e.metadata.importedSymbols?.includes(symbol)
  )

  if relevantEdges is empty:
    return { path: [], edges: [] }

  // Step 2: 建立鄰接表（只含相關邊）
  adjacency = new Map<string, Array<{nodeId, edgeId}>>()
  for each edge in relevantEdges:
    adjacency[edge.source].push({nodeId: edge.target, edgeId: edge.id})
    adjacency[edge.target].push({nodeId: edge.source, edgeId: edge.id})

  // Step 3: BFS 遍歷（從第一條相關邊的 source 開始）
  startNode = relevantEdges[0].source
  visited = new Set<string>()
  visitedEdges = new Set<string>()
  queue = [{ nodeId: startNode, depth: 0 }]
  path = []
  MAX_DEPTH = 10

  while queue is not empty:
    { nodeId, depth } = queue.shift()

    if visited.has(nodeId): continue
    if depth > MAX_DEPTH: continue

    visited.add(nodeId)
    path.push(nodeId)

    for each neighbor in adjacency[nodeId]:
      visitedEdges.add(neighbor.edgeId)
      if not visited.has(neighbor.nodeId):
        queue.push({ nodeId: neighbor.nodeId, depth: depth + 1 })

  return { path, edges: Array.from(visitedEdges) }
```

### 4.3 邊界條件處理

| 情境 | 處理方式 |
|------|---------|
| symbol 不存在於任何邊 | 回傳 `{ path: [], edges: [] }` |
| 只出現在一條邊 | 回傳兩個端點 node + 該 edge |
| 循環依賴（A→B→C→A） | visited set 防重複，不會無限迴圈 |
| 超深路徑（>10 跳） | depth > MAX_DEPTH 截斷 |
| 空 graph | 回傳空結果 |
| importedSymbols 為 undefined/空 | 安全處理（`?.includes` + `?? []`） |

---

## 5. 共用 Hook 介面

### 5.1 useEdgeSymbols

```typescript
// packages/web/src/hooks/useEdgeSymbols.ts

interface EdgeSymbolsResult {
  /** 格式化後的 symbol 文字（如 "UserService, AuthMiddleware, +3 more"） */
  label: string | null;
  /** 原始 symbol 陣列 */
  symbols: string[];
  /** 完整 symbol 清單（點擊時用） */
  allSymbols: string[];
}

/**
 * 格式化邊的 symbol 名稱。
 * - 0 個 symbol → null（不顯示）
 * - 1~3 個 → 逗號分隔
 * - >3 個 → 前 3 個 + "+N more"
 */
function useEdgeSymbols(importedSymbols: string[] | undefined): EdgeSymbolsResult
```

**純計算 hook**，不依賴渲染模式。2D/3D 共用。

### 5.2 usePathTracing

```typescript
// packages/web/src/hooks/usePathTracing.ts

interface PathTracingActions {
  /** 開始追蹤指定 symbol */
  startTracing: (symbol: string) => void;
  /** 停止追蹤 */
  stopTracing: () => void;
  /** 當前是否在追蹤模式 */
  isTracing: boolean;
  /** 追蹤中的 symbol 名稱 */
  tracingSymbol: string | null;
  /** 追蹤路徑中的 node ID */
  tracingPath: string[];
  /** 追蹤路徑中的 edge ID */
  tracingEdges: string[];
}

/**
 * 路徑追蹤邏輯 hook。
 * - 接收 graph nodes/edges
 * - 呼叫 traceSymbolPath() 計算路徑
 * - dispatch START_TRACING / STOP_TRACING 到 ViewStateContext
 * - 監聽 Escape 鍵退出追蹤
 */
function usePathTracing(
  nodes: Array<{ id: string }>,
  edges: Array<{ id: string; source: string; target: string; metadata: { importedSymbols?: string[] } }>,
): PathTracingActions
```

### 5.3 useHeatmap

```typescript
// packages/web/src/hooks/useHeatmap.ts

interface HeatmapStyle {
  /** 邊線寬度（px） */
  strokeWidth: number;
  /** 邊線透明度 (0~1) */
  opacity: number;
  /** 粒子速度（3D 用） */
  particleSpeed: number;
}

interface HeatmapActions {
  /** 熱力圖是否啟用 */
  isEnabled: boolean;
  /** 切換開關 */
  toggle: () => void;
  /** 根據 symbol 數量計算邊 style */
  getEdgeStyle: (symbolCount: number) => HeatmapStyle;
}

/**
 * 熱力圖計算 hook。
 * - 讀取 ViewStateContext.isHeatmapEnabled
 * - 提供 symbol 數量 → 邊 style 映射函式
 */
function useHeatmap(): HeatmapActions
```

**映射規則**：

| symbolCount | strokeWidth | opacity | particleSpeed |
|-------------|-------------|---------|---------------|
| 0 | 1 | 0.3 | 0.004 |
| 1~2 | 1 | 0.4 | 0.005 |
| 3~5 | 2 | 0.6 | 0.006 |
| 6~10 | 3 | 0.8 | 0.008 |
| 11+ | 4 | 1.0 | 0.010 |

---

## 6. 邊標籤渲染策略

### 6.1 2D 模式（React Flow）

```
NeonEdge.tsx
  │
  ├── BaseEdge（現有邊線）
  ├── ParticleOverlay（現有粒子）
  └── EdgeSymbolLabel.tsx（新增，條件渲染）
        │
        ├── 顯示條件：hoveredEdgeId === edge.id && importedSymbols.length > 0
        ├── 位置：邊線中點上方 8px（EdgeLabelRenderer）
        ├── 背景：rgba(10, 10, 15, 0.85)（colors.bg.base + 0.85 alpha）
        ├── 文字：colors.text.primary（#e8eaf6）
        ├── 點擊 symbol 名稱 → startTracing(symbolName)
        └── 超過 3 個 → "+N more"（可展開）
```

**React Flow edge hover 機制**：
- `onEdgeMouseEnter` → dispatch HOVER_EDGE
- `onEdgeMouseLeave` → dispatch HOVER_EDGE(null)
- EdgeSymbolLabel 讀取 ViewStateContext.hoveredEdgeId 判斷是否顯示

### 6.2 3D 模式（Three.js）

```
Graph3DCanvas.tsx
  │
  └── onLinkHover callback
        │
        ├── 建立 SpriteText（動態，hover 時才建立）
        │     ├── text = useEdgeSymbols(link.importedSymbols).label
        │     ├── position = link 中點座標
        │     ├── fontSize = 3
        │     ├── color = colors.text.primary
        │     ├── backgroundColor = "rgba(10, 10, 15, 0.85)"
        │     └── padding = 2
        │
        ├── 效能策略：
        │     ├── 不預渲染全部 label
        │     ├── 一次只顯示一個 hover label
        │     └── 離開 hover → 移除 sprite
        │
        └── 點擊 sprite text → startTracing(symbolName)
```

> **不使用 `three-spritetext` 套件**。改用 Canvas texture 自繪文字 sprite，避免新增依賴。Sprint 4 已有 `createGlowTexture()` 使用 Canvas API，擴充為通用 `createTextSprite()` 即可。

---

## 7. 元件互動資料流圖

```
使用者 Hover 邊線
    │
    ▼
[2D] onEdgeMouseEnter → dispatch HOVER_EDGE(edgeId)
[3D] onLinkHover → dispatch HOVER_EDGE(edgeId)
    │
    ▼
ViewStateContext.hoveredEdgeId 更新
    │
    ▼
[2D] EdgeSymbolLabel 讀取 hoveredEdgeId → 條件渲染
[3D] Graph3DCanvas useEffect → 建立/移除 SpriteText
    │
    ▼
使用者點擊 symbol 名稱
    │
    ▼
usePathTracing.startTracing(symbol)
    │
    ├── 呼叫 traceSymbolPath() → 計算 path + edges
    └── dispatch START_TRACING { symbol, path, edges }
    │
    ▼
ViewStateContext 更新：tracingSymbol, tracingPath, tracingEdges
    │
    ├── [2D] GraphCanvas styledNodes/styledEdges → 追蹤高亮/暗淡
    ├── [3D] Graph3DCanvas nodeThreeObject/linkColor → 追蹤高亮/暗淡
    └── TracingPanel 讀取 tracingPath → 顯示路徑列表
    │
    ▼
使用者按 Escape / 點擊「結束追蹤」
    │
    ▼
usePathTracing.stopTracing() → dispatch STOP_TRACING
    │
    ▼
ViewStateContext 清空追蹤狀態 → 恢復正常顯示
```

---

## 8. 檔案結構

```
packages/web/src/
├── utils/
│   └── path-tracer.ts          # 新增：路徑追蹤純函式
├── hooks/
│   ├── useEdgeSymbols.ts       # 新增：邊 symbol 格式化
│   ├── usePathTracing.ts       # 新增：路徑追蹤邏輯
│   └── useHeatmap.ts           # 新增：熱力圖計算
├── components/
│   ├── EdgeSymbolLabel.tsx     # 新增：2D 邊 symbol 標籤
│   ├── NodeIOBadge.tsx         # 新增：節點 I/O 標記
│   ├── TracingPanel.tsx        # 新增：路徑追蹤面板
│   └── HeatmapToggle.tsx       # 新增：熱力圖開關按鈕
├── contexts/
│   └── ViewStateContext.tsx    # 修改：+5 欄位 +4 action
├── styles/
│   └── theme.ts               # 修改：+heatmap/tracing 色彩
└── （以下修改既有元件）
    ├── GraphCanvas.tsx         # 修改：edge hover + 追蹤高亮 + 熱力圖
    ├── Graph3DCanvas.tsx       # 修改：3D 邊標籤 + 追蹤 + 熱力圖 + 粒子
    ├── NeonEdge.tsx            # 修改：熱力圖 style + 標籤掛載
    ├── NeonNode.tsx            # 修改：I/O badge + 追蹤暗淡
    ├── DirectoryNode.tsx       # 修改：I/O badge + 追蹤暗淡
    ├── GraphContainer.tsx      # 修改：傳遞 tracing/heatmap props
    └── App.tsx                 # 修改：HeatmapToggle + TracingPanel
```

---

## 9. theme.ts 擴充

```typescript
// 新增到 theme.ts

/** 熱力圖色彩參數 */
export const heatmap = {
  /** 邊線粗細映射 */
  strokeWidth: { min: 1, low: 1, medium: 2, high: 3, max: 4 },
  /** 邊線透明度映射 */
  opacity: { min: 0.3, max: 1.0 },
  /** 粒子速度映射 */
  particleSpeed: { min: 0.004, max: 0.010 },
} as const;

/** 追蹤模式色彩 */
export const tracing = {
  /** 追蹤路徑高亮邊色 */
  edgeHighlight: colors.neon.green.bright,  // '#00ff88'
  /** 追蹤路徑高亮節點邊框 */
  nodeHighlight: colors.neon.cyan.bright,   // '#00ffff'
  /** 無關節點/邊暗淡 opacity */
  fadedOpacity: 0.1,
  /** 面板背景 */
  panelBackground: colors.bg.elevated,      // '#13131f'
} as const;

/** 邊標籤樣式 */
export const edgeLabel = {
  background: 'rgba(10, 10, 15, 0.85)',
  textColor: colors.text.primary,
  fontSize: '11px',
  padding: '4px 8px',
  borderRadius: '4px',
  border: `1px solid ${colors.neon.green.dim}`,
  maxWidth: 200,
} as const;

/** I/O Badge 樣式 */
export const ioBadge = {
  background: 'rgba(10, 10, 15, 0.75)',
  textColor: colors.text.secondary,
  fontSize: '10px',
  padding: '1px 4px',
  borderRadius: '3px',
  importColor: colors.neon.cyan.dim,    // 入箭頭色
  exportColor: colors.neon.green.dim,   // 出箭頭色
} as const;
```

---

## 10. 追蹤模式與 Hover 高亮的優先級

追蹤模式優先於 hover 高亮、熱力圖：

| 狀態 | 節點顯示 | 邊顯示 | 面板 |
|------|---------|--------|------|
| 正常 | 正常 | 正常（或熱力圖 style） | NodePanel |
| Hover 高亮 | 相關亮、無關暗 | 相關亮、無關暗 | NodePanel |
| 追蹤模式 | 追蹤路徑亮、其餘暗淡 | 追蹤邊亮、其餘暗淡 | TracingPanel |
| 追蹤 + Hover | 追蹤優先（hover 被抑制） | 追蹤優先 | TracingPanel |
| 熱力圖 + 追蹤 | 追蹤優先（熱力圖暫停） | 追蹤優先 | TracingPanel |

判斷邏輯：

```typescript
if (tracingSymbol) {
  // 追蹤模式：只亮追蹤路徑
  opacity = tracingPath.includes(node.id) ? 1.0 : tracing.fadedOpacity;
} else if (hoveredNodeId) {
  // Hover 模式：亮相關節點
  opacity = relatedIds.has(node.id) ? 1.0 : 0.35;
} else {
  // 正常模式
  opacity = 1.0;
}
```

---

## 11. 粒子 Symbol 類型推斷

```typescript
/** 根據 symbol 命名推斷類型 */
function inferSymbolType(symbolName: string): 'class' | 'function' | 'variable' {
  // PascalCase（首字母大寫 + 無底線分隔）→ class
  if (/^[A-Z][a-zA-Z0-9]*$/.test(symbolName)) {
    return 'class';
  }
  // camelCase 且以動詞開頭 → function（啟發式）
  if (/^[a-z]/.test(symbolName) && symbolName.length > 2) {
    return 'function';
  }
  return 'variable';
}

/** 粒子視覺映射 */
const particleVisual = {
  class:    { color: colors.neon.cyan.DEFAULT,  size: 2 },   // '#00d4ff' 中粒子
  function: { color: colors.neon.green.bright,  size: 3 },   // '#00ff88' 大粒子
  variable: { color: '#ffffff',                 size: 1 },   // 白色小粒子
};
```

> 僅 3D 模式適用。2D 粒子為 SVG animateMotion，不易區分大小/色彩。
