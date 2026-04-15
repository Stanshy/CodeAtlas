# Sprint 4 — 3D 架構設計 + 共享狀態層

> **版本**: v1.0
> **日期**: 2026-03-31
> **作者**: tech-lead (L1)
> **任務**: T1
> **狀態**: 完成

---

## 1. 設計目標

在不破壞現有 2D 架構的前提下，新增 3D 渲染器並實現 2D/3D 一鍵切換。核心策略：**抽出共享狀態層**，讓兩個渲染器（React Flow + 3d-force-graph）讀寫同一份狀態。

---

## 2. ViewState 型別定義

```typescript
/** 渲染模式 */
type ViewMode = '2d' | '3d';

/** 共享狀態 — 兩個渲染器 + 面板/搜尋共用 */
interface ViewState {
  /** 當前渲染模式 */
  mode: ViewMode;
  /** 被選中的節點 ID（面板開啟對象），null = 未選中 */
  selectedNodeId: string | null;
  /** hover 中的節點 ID，null = 未 hover */
  hoveredNodeId: string | null;
  /** 搜尋關鍵字 */
  searchQuery: string;
  /** 搜尋結果的節點 ID 清單 */
  searchResults: string[];
  /** 搜尋框是否開啟 */
  isSearchOpen: boolean;
  /** 面板是否開啟 */
  isPanelOpen: boolean;
  /**
   * 觸發式飛入：寫入 nodeId 後，對應渲染器執行相機飛入動畫，
   * 完成後由渲染器清空此欄位。
   */
  focusNodeId: string | null;
}

/** 初始值 */
const initialViewState: ViewState = {
  mode: '2d',
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  searchResults: [],
  isSearchOpen: false,
  isPanelOpen: false,
  focusNodeId: null,
};

/** Action 定義 — useReducer pattern */
type ViewAction =
  | { type: 'SET_MODE'; mode: ViewMode }
  | { type: 'SELECT_NODE'; nodeId: string | null }
  | { type: 'HOVER_NODE'; nodeId: string | null }
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_RESULTS'; results: string[] }
  | { type: 'SET_SEARCH_OPEN'; open: boolean }
  | { type: 'FOCUS_NODE'; nodeId: string }
  | { type: 'CLEAR_FOCUS' }
  | { type: 'OPEN_PANEL' }
  | { type: 'CLOSE_PANEL' };
```

### 狀態流轉規則

| 操作 | 行為 | 備註 |
|------|------|------|
| 切換 mode | `SET_MODE` — 只切換 mode，其餘狀態不變 | 保留選中節點、搜尋結果 |
| 點擊節點 | `SELECT_NODE` + `OPEN_PANEL` | 兩個渲染器都走同一路徑 |
| Hover 節點 | `HOVER_NODE` | 2D 用 DOM event，3D 用 raycaster |
| 搜尋選中 | `FOCUS_NODE` + `SELECT_NODE` + `CLOSE_PANEL=false` | 飛入 + 選中 |
| 飛入完成 | `CLEAR_FOCUS` | 由渲染器在動畫結束後呼叫 |
| 關閉面板 | `SELECT_NODE(null)` + `CLOSE_PANEL` | — |

---

## 3. 元件介面（Props 定義）

### ViewStateProvider

```typescript
interface ViewStateProviderProps {
  children: React.ReactNode;
}

// Context value
interface ViewStateContextValue {
  state: ViewState;
  dispatch: React.Dispatch<ViewAction>;
}

// Hook
function useViewState(): ViewStateContextValue;
```

### GraphContainer

```typescript
interface GraphContainerProps {
  /** React Flow 格式的 nodes（2D 用） */
  nodes: Node<NeonNodeData>[];
  /** React Flow 格式的 edges（2D 用） */
  edges: Edge<NeonEdgeData>[];
  /** 原始 graph data（3D 用） */
  graphData: { nodes: GraphNode[]; edges: GraphEdge[] };
}
```

`GraphContainer` 根據 `state.mode` 條件渲染：
- `mode === '2d'` → `<GraphCanvas />`
- `mode === '3d'` → `<Graph3DCanvas />`
- 過渡：CSS opacity transition 300ms

### Graph3DCanvas

```typescript
interface Graph3DCanvasProps {
  /** 原始 graph nodes（core 格式） */
  graphNodes: GraphNode[];
  /** 原始 graph edges（core 格式） */
  graphEdges: GraphEdge[];
}
```

內部職責：
1. useRef 持有 DOM container
2. useEffect 建立 3d-force-graph 實例（imperative）
3. 監聽 ViewState：
   - `focusNodeId` → 相機飛入（cameraPosition）
   - `hoveredNodeId` → 高亮/暗淡
   - `selectedNodeId` → 節點 active 狀態
4. 回寫 ViewState：
   - onNodeClick → `dispatch({ type: 'SELECT_NODE' })`
   - onNodeHover → `dispatch({ type: 'HOVER_NODE' })`
5. cleanup：unmount 時呼叫 `graphInstance._destructor()`

### ViewToggle

```typescript
interface ViewToggleProps {
  // 無 props — 讀取 ViewStateContext
}
```

按鈕顯示當前模式圖示（2D/3D），點擊 dispatch `SET_MODE`。

### CameraPresets（P1）

```typescript
interface CameraPresetsProps {
  // 無 props — 讀取 ViewStateContext，只在 3D 模式顯示
}
```

---

## 4. 資料流圖

```
                    ┌─────────────────────────────┐
                    │      ViewStateProvider       │
                    │  (React Context + Reducer)   │
                    │                             │
                    │  state: ViewState           │
                    │  dispatch: ViewAction       │
                    └────────┬────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌──────────────────┐
     │ GraphCont- │  │ ViewToggle │  │ 共用 UI          │
     │ ainer      │  │ (2D/3D)   │  │                  │
     │            │  └────────────┘  │ NodePanel        │
     │ mode='2d'? │                  │ SearchBar        │
     │ ┌────────┐ │                  │ CodePreview      │
     │ │GraphCa-│ │                  │ AiSummary        │
     │ │nvas 2D │ │                  └──────────────────┘
     │ └────────┘ │                         │
     │ mode='3d'? │                         │
     │ ┌────────┐ │                  reads: selectedNodeId
     │ │Graph3D-│ │                  reads: isSearchOpen
     │ │Canvas  │ │                  writes: focusNodeId
     │ └────────┘ │                  writes: selectedNodeId
     └────────────┘
           │
           │ writes: selectedNodeId, hoveredNodeId
           │ reads:  focusNodeId, hoveredNodeId
           │
```

### 資料流細節

1. **使用者切換 mode**：
   - ViewToggle → dispatch `SET_MODE('3d')` → GraphContainer 條件渲染切換
   - selectedNodeId 不變 → NodePanel 保持開啟

2. **使用者在 3D 點擊節點**：
   - Graph3DCanvas onNodeClick → dispatch `SELECT_NODE(id)` + `OPEN_PANEL`
   - NodePanel 監聽 selectedNodeId → fetch /api/node/:id → 顯示詳情

3. **使用者搜尋並定位**：
   - SearchBar → dispatch `FOCUS_NODE(id)` + `SELECT_NODE(id)`
   - Graph3DCanvas 監聽 focusNodeId → cameraPosition 飛入 → dispatch `CLEAR_FOCUS`
   - 或 GraphCanvas（2D）監聯 focusNodeId → setCenter 飛入 → dispatch `CLEAR_FOCUS`

---

## 5. 檔案結構規劃

```
packages/web/src/
├── contexts/
│   └── ViewStateContext.tsx      # NEW: ViewState Context + Provider + Reducer
├── hooks/
│   ├── useViewState.ts           # NEW: useContext(ViewStateContext) 封裝
│   ├── use3DInteraction.ts       # NEW: 3D click/hover/focus 邏輯
│   ├── useGraphData.ts           # 不變：fetch /api/graph
│   ├── useForceLayout.ts         # 不變：2D D3 force（只 2D 用）
│   ├── useHoverHighlight.ts      # 修改：讀寫 ViewStateContext.hoveredNodeId
│   ├── useSearch.ts              # 修改：讀寫 ViewStateContext
│   ├── useNodeDetail.ts          # 不變
│   ├── useAiSummary.ts           # 不變
│   └── useViewportAnimation.ts   # 不變
├── components/
│   ├── GraphContainer.tsx        # NEW: mode 切換容器
│   ├── Graph3DCanvas.tsx         # NEW: 3d-force-graph 封裝
│   ├── ViewToggle.tsx            # NEW: 2D/3D 切換按鈕
│   ├── CameraPresets.tsx         # NEW: 預設相機視角（P1）
│   ├── GraphCanvas.tsx           # 不變：2D React Flow 渲染器
│   ├── NeonNode.tsx              # 不變
│   ├── NeonEdge.tsx              # 不變
│   ├── DirectoryNode.tsx         # 不變
│   ├── NodePanel.tsx             # 修改：props → ViewStateContext
│   ├── SearchBar.tsx             # 修改：props → ViewStateContext
│   ├── CodePreview.tsx           # 不變
│   └── AiSummary.tsx             # 不變
├── utils/
│   ├── three-helpers.ts          # NEW: camera tween、glow material 工具
│   └── layout.ts                 # 不變
├── styles/
│   └── theme.ts                  # 修改：新增 3D 色彩常數
├── App.tsx                       # 修改：引入 ViewStateProvider + GraphContainer
└── types/
    └── graph.ts                  # 不變
```

### 修改程度分類

| 類別 | 檔案 | 說明 |
|------|------|------|
| 新增 | contexts/ViewStateContext.tsx | 核心共享狀態 |
| 新增 | hooks/useViewState.ts | Context hook 封裝 |
| 新增 | hooks/use3DInteraction.ts | 3D 互動邏輯 |
| 新增 | components/GraphContainer.tsx | 模式切換容器 |
| 新增 | components/Graph3DCanvas.tsx | 3D 渲染器 |
| 新增 | components/ViewToggle.tsx | 切換按鈕 |
| 新增 | components/CameraPresets.tsx | 預設視角（P1） |
| 新增 | utils/three-helpers.ts | Three.js 工具 |
| 小改 | App.tsx | 引入 Provider + 替換 GraphCanvas → GraphContainer |
| 小改 | NodePanel.tsx | selectedNodeId 改從 Context 讀 |
| 小改 | SearchBar.tsx | search state 改從 Context 讀寫 |
| 小改 | useHoverHighlight.ts | hoveredNodeId 改從 Context 讀寫 |
| 小改 | useSearch.ts | 搜尋結果寫入 Context |
| 小改 | styles/theme.ts | 新增 3D 常數 |
| 不動 | GraphCanvas.tsx | 2D 渲染器保持不變 |
| 不動 | NeonNode/Edge/Directory | 2D 視覺元件不動 |
| 不動 | core/cli 層 | 完全不動 |

---

## 6. 3d-force-graph 整合策略

### 實例化模式

```typescript
// Graph3DCanvas.tsx — imperative 封裝
import ForceGraph3D from '3d-force-graph';

function Graph3DCanvas({ graphNodes, graphEdges }: Graph3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ReturnType<typeof ForceGraph3D> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = ForceGraph3D()(containerRef.current)
      .graphData({
        nodes: graphNodes.map(n => ({ id: n.id, ...n })),
        links: graphEdges.map(e => ({ source: e.source, target: e.target, ...e })),
      })
      .backgroundColor('#050510')
      // ... more config

    graphRef.current = graph;

    return () => {
      // cleanup
      graph._destructor();
      graphRef.current = null;
    };
  }, []); // 只建立一次

  // 資料更新用 graphData() 方法，不重建實例
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.graphData({
      nodes: graphNodes.map(n => ({ id: n.id, ...n })),
      links: graphEdges.map(e => ({ source: e.source, target: e.target, ...e })),
    });
  }, [graphNodes, graphEdges]);

  return <div ref={containerRef} style={{ width: '100%', height: '100vh' }} />;
}
```

### 注意事項

1. **3d-force-graph 不是 React 元件**：必須用 ref + useEffect 封裝
2. **只建立一次實例**：資料變更用 `.graphData()` 更新，不重新 new
3. **cleanup 必須做**：unmount 時 `_destructor()` 釋放 WebGL context
4. **Three.js 物件自訂**：nodeThreeObject callback 自訂節點外觀（球體 + glow）
5. **相機控制**：cameraPosition(x, y, z, lookAt, ms) 實現飛入動畫

---

## 7. 重構計畫（現有元件改動最小化）

### App.tsx 重構

**Before（Sprint 3）**：
```
<ReactFlowProvider>
  <AppInner>
    <GraphCanvas />
    <SearchBar />
    <NodePanel />
  </AppInner>
</ReactFlowProvider>
```

**After（Sprint 4）**：
```
<ViewStateProvider>
  <ReactFlowProvider>
    <AppInner>
      <ViewToggle />
      <GraphContainer>        ← NEW：依 mode 切換 2D/3D
        <GraphCanvas />       ← 2D（不改）
        <Graph3DCanvas />     ← 3D（新增）
      </GraphContainer>
      <SearchBar />           ← 改讀 Context
      <NodePanel />           ← 改讀 Context
      <CameraPresets />       ← P1 新增
    </AppInner>
  </ReactFlowProvider>
</ViewStateProvider>
```

### NodePanel 重構

- 移除 props: `nodeId`, `onClose`, `onNavigate`
- 改為 `useViewState()` 讀取 `selectedNodeId`、dispatch `SELECT_NODE(null)` 關閉
- `onNavigate` 改為 dispatch `FOCUS_NODE(id)` + `SELECT_NODE(id)`
- 保留 render slots（renderCodePreview、renderAiSummary）不變

### SearchBar 重構

- 移除 prop: `search: UseSearchResult`
- 改為 `useViewState()` + 內部 useSearch（useSearch 改為讀寫 Context）
- 或 useSearch 返回值寫入 Context（更小改動）

### 最小改動原則

現有 GraphCanvas 完全不改——它繼續接收 nodes/edges props 和 onNodeClick callback。
GraphContainer 在 2D 模式下轉發 props 給 GraphCanvas，與 Sprint 3 行為一致。

---

## 8. 與 Feature Spec 對照

| Feature | 架構對應 |
|---------|---------|
| F23: 3D 力導向渲染 | Graph3DCanvas + 3d-force-graph |
| F24: 2D/3D 切換 | ViewStateContext + GraphContainer + ViewToggle |
| F25: 3D 霓虹主題 | Graph3DCanvas nodeThreeObject + theme.ts 3D 常數 |
| F26: 3D 互動 | use3DInteraction hook |
| F27: 3D Hover 高亮 | Graph3DCanvas onNodeHover + ViewState.hoveredNodeId |
| F28: 3D 粒子流動 | Graph3DCanvas linkDirectionalParticles API |
| F29: 面板+搜尋 3D 適配 | NodePanel/SearchBar 讀 ViewStateContext |
| F30: 3D 節點分層 | Graph3DCanvas d3Force('y') 自訂力 |
| F31: 3D 相機預設 | CameraPresets + three-helpers cameraTween |
| F32: 3D 效能基線 | Graph3DCanvas 效能降級邏輯 |

---

*文件產出者: tech-lead | 任務: T1 | Sprint: 4 | 日期: 2026-03-31*
