# Sprint 9 — 控制面板 + 視圖模式 + 端到端追蹤 架構設計

> **版本**: v1.0
> **撰寫者**: Tech Lead
> **日期**: 2026-03-31
> **狀態**: 設計完成

---

## 1. 設計目標

Sprint 1-8 累積了大量功能，但入口分散：右鍵選單（影響分析）、Ctrl+K（搜尋）、FilterPanel（左側獨立）、HeatmapToggle（右下角浮動）、ViewToggle（右下角浮動）。Sprint 9 統一為「一面板 + 一工具列」，新增四種視圖模式和端到端追蹤。

**設計原則**：
1. **歸一**：所有功能入口收歸 ControlPanel + Toolbar
2. **預設組合**：視圖模式 = filter + display 的預設組合，減少使用者認知負擔
3. **復用**：BFS 演算法復用 Sprint 5/8 架構、FilterPanel 嵌入而非重寫
4. **分層**：業務邏輯（純函式）→ hook → 元件，方便測試

---

## 2. ControlPanel 元件架構

### 2.1 結構

```
ControlPanel (left fixed, 280px / 44px collapsed)
├── Header: logo + collapse toggle
├── ControlPanelSection "視圖模式" (defaultOpen: true)
│   └── ViewModeRadioGroup (panorama/dependency/dataflow/callchain)
├── ControlPanelSection "顯示偏好" (defaultOpen: false)
│   └── DisplayPrefsSection
│       ├── HeatmapToggle (復用既有 TOGGLE_HEATMAP)
│       ├── EdgeLabelsToggle (SET_DISPLAY_PREFS)
│       ├── ParticlesToggle (SET_DISPLAY_PREFS)
│       ├── LabelDensitySelector (all/smart/none)
│       └── ImpactDepthSlider
├── ControlPanelSection "分析工具" (defaultOpen: false)
│   ├── E2ETracingButton → 進入選取模式
│   └── AiOverviewButton → 觸發 AI 概述
├── ControlPanelSection "過濾器" (defaultOpen: false)
│   └── FilterPanel (embedded mode)
└── ControlPanelSection "AI 設定" (defaultOpen: false, P1)
    └── AiSettingsSection
```

### 2.2 ControlPanelSection 子元件

```typescript
interface ControlPanelSectionProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}
```

- 點擊 header toggle 展開/收合（local state）
- Chevron icon 旋轉動畫（Framer Motion 90deg）
- 收合時 content height: 0 + overflow: hidden

### 2.3 收合模式（icon 列）

ControlPanel 收合後顯示 5 個 icon（一個 icon = 一個區段），點擊 icon 同時展開面板 + 展開對應區段。

### 2.4 z-index 堆疊

| 元素 | z-index |
|------|---------|
| ControlPanel | 35 |
| Toolbar | 40 |
| SearchBar modal | 45 |
| ContextMenu | 50 |
| Onboarding overlay | 100 |

### 2.5 FilterPanel 嵌入

```typescript
// FilterPanel.tsx 新增 embedded prop
interface FilterPanelProps {
  embedded?: boolean;  // true 時去掉外框/背景/position
}
```

embedded=true 時：
- 去掉 position: fixed
- 去掉背景色和邊框
- 去掉 header（收合按鈕由 ControlPanelSection 處理）
- 保留內部所有過濾控制

---

## 3. Toolbar 三區段佈局

```
┌──────────────────────────────────────────────────────┐
│  ☰  │            🔍 Search (Ctrl+K)         │ 📊 🗺 2D │
│     │                                        │        │
└──────────────────────────────────────────────────────┘
 左區     中區                                   右區
```

### 左區
- ControlPanel toggle 按鈕（☰ hamburger icon）
- dispatch TOGGLE_CONTROL_PANEL

### 中區
- SearchBar trigger 區域
- 點擊 dispatch SET_SEARCH_OPEN(true)
- 顯示 "Search (Ctrl+K)" placeholder

### 右區
- 當前 ViewMode badge（小文字指示器）
- 2D/3D toggle（復用既有 SET_MODE）
- OverviewPanel trigger（📊 icon，連接 AI 概述）

---

## 4. 視圖模式設計

### 4.1 ViewModePreset 型別

```typescript
export type ViewModeName = 'panorama' | 'dependency' | 'dataflow' | 'callchain';

export interface ViewModePreset {
  name: ViewModeName;
  label: string;
  description: string;
  icon: string;  // icon name for ControlPanel
  filter: {
    nodeTypes: NodeType[];   // 空陣列 = 全選
    edgeTypes: EdgeType[];   // 空陣列 = 全選
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;
  };
}
```

### 4.2 四種預設

| 視圖 | nodeTypes | edgeTypes | heatmap | edgeLabels | particles | labelDensity | expandFiles |
|------|-----------|-----------|---------|------------|-----------|-------------|-------------|
| panorama | [] | [] | false | false | true | smart | false |
| dependency | [] | import, export | false | false | true | smart | false |
| dataflow | [] | data-flow, export | true | true | true | all | false |
| callchain | function, class, file | call | false | true | false | all | true |

### 4.3 applyViewMode 函式

```typescript
// graph-adapter.ts 新增
export function applyViewMode(
  nodes: GraphNode[],
  edges: GraphEdge[],
  mode: ViewModeName,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const preset = VIEW_MODE_PRESETS[mode];

  // 用 filterNodes + filterEdges 函式（Sprint 8 已有）
  const filterState: FilterState = {
    directories: [],  // 視圖模式不過濾目錄
    nodeTypes: preset.filter.nodeTypes,
    edgeTypes: preset.filter.edgeTypes,
  };

  const filteredNodes = filterNodes(nodes, filterState);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = filterEdges(edges, filteredNodeIds, filterState);

  return { nodes: filteredNodes, edges: filteredEdges };
}
```

### 4.4 切換邏輯（SET_VIEW_MODE reducer）

```typescript
case 'SET_VIEW_MODE':
  return {
    ...state,
    activeViewMode: action.mode,
    // 清除衝突狀態
    impactAnalysis: null,
    isSearchFocused: false,
    searchFocusNodes: [],
    searchFocusEdges: [],
    e2eTracing: null,
    filter: { directories: [], nodeTypes: [], edgeTypes: [] },
    // 不清除：selectedNodeId, hoveredNodeId, tracingSymbol
  };
```

### 4.5 雙層過濾

```
raw nodes/edges
  → applyViewMode(nodes, edges, activeViewMode)   // 視圖預設過濾
  → filterNodes(nodes, manualFilter)               // 手動過濾疊加
  → toReactFlowNodes/Edges                         // 轉 RF 格式
  → styledNodes/styledEdges                        // 高亮/dim 處理
```

---

## 5. 端到端追蹤設計

### 5.1 資料結構

```typescript
export interface E2EStep {
  nodeId: string;
  nodeLabel: string;
  edgeId: string | null;      // 起點為 null
  edgeType: string | null;    // import/call/export/data-flow
  symbols: string[];           // 此步傳遞的 symbol
  depth: number;
}

export interface E2ETracingResult {
  path: string[];              // node ID 有序列表
  edges: string[];             // edge ID 有序列表
  steps: E2EStep[];            // 面板顯示用
  truncated: boolean;
}

export interface E2ETracingState {
  active: boolean;
  startNodeId: string | null;
  path: string[];
  edges: string[];
  steps: E2EStep[];
  maxDepth: number;
  truncated: boolean;
}
```

### 5.2 traceE2E 純函式

```typescript
export function traceE2E(
  startNodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth: number = 10,
): E2ETracingResult {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const queue: Array<{ nodeId: string; depth: number }> = [
    { nodeId: startNodeId, depth: 0 },
  ];
  const visited = new Set<string>([startNodeId]);

  const startNode = nodeMap.get(startNodeId);
  const result: E2ETracingResult = {
    path: [startNodeId],
    edges: [],
    steps: [{
      nodeId: startNodeId,
      nodeLabel: startNode?.label ?? startNodeId,
      edgeId: null,
      edgeType: null,
      symbols: [],
      depth: 0,
    }],
    truncated: false,
  };

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;
    if (result.path.length >= 30) {
      result.truncated = true;
      break;
    }

    // Forward: follow edges where source === current node
    const outEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outEdges) {
      if (visited.has(edge.target)) continue;
      visited.add(edge.target);

      const targetNode = nodeMap.get(edge.target);
      result.path.push(edge.target);
      result.edges.push(edge.id);
      result.steps.push({
        nodeId: edge.target,
        nodeLabel: targetNode?.label ?? edge.target,
        edgeId: edge.id,
        edgeType: edge.type,
        symbols: edge.metadata.importedSymbols ?? [],
        depth: depth + 1,
      });
      queue.push({ nodeId: edge.target, depth: depth + 1 });
    }
  }

  return result;
}
```

**與 analyzeImpact 差異**：
1. analyzeImpact 支援 forward/reverse，traceE2E 只 forward
2. traceE2E 記錄每步的 symbol + edgeType（面板顯示需要）
3. traceE2E 截斷閾值 30（路徑面板可讀性），analyzeImpact 是 50
4. traceE2E 保留 BFS 路徑順序（steps 陣列），analyzeImpact 是 set

### 5.3 useE2ETracing hook

```typescript
export function useE2ETracing() {
  const { state, dispatch } = useViewState();
  const { nodes, edges } = useGraphContext(); // 或透過 props

  const startTracing = useCallback((nodeId: string) => {
    const maxDepth = state.e2eTracing?.maxDepth ?? 10;
    const result = traceE2E(nodeId, nodes, edges, maxDepth);
    dispatch({
      type: 'START_E2E_TRACING',
      startNodeId: nodeId,
      path: result.path,
      edges: result.edges,
      steps: result.steps,
      truncated: result.truncated,
    });
  }, [nodes, edges, state.e2eTracing?.maxDepth, dispatch]);

  const updateDepth = useCallback((maxDepth: number) => {
    if (!state.e2eTracing?.startNodeId) return;
    const result = traceE2E(state.e2eTracing.startNodeId, nodes, edges, maxDepth);
    dispatch({
      type: 'UPDATE_E2E_DEPTH',
      maxDepth,
      path: result.path,
      edges: result.edges,
      steps: result.steps,
      truncated: result.truncated,
    });
  }, [nodes, edges, state.e2eTracing?.startNodeId, dispatch]);

  const clearTracing = useCallback(() => {
    dispatch({ type: 'CLEAR_E2E_TRACING' });
  }, [dispatch]);

  return { e2eTracing: state.e2eTracing, startTracing, updateDepth, clearTracing };
}
```

### 5.4 觸發方式

1. **ControlPanel**：分析工具區段 → 「端到端追蹤」按鈕 → dispatch SET_E2E_SELECTING(true) → cursor 變為 crosshair → 點擊節點 → startTracing(nodeId)
2. **ContextMenu**：新增「端到端追蹤」選項 → startTracing(nodeId)

### 5.5 渲染優先順序

```
filter → viewMode → searchFocus → e2eTracing → impact → tracing → hover
```

在 styledNodes 計算中：
```typescript
// 優先順序由低到高，後面覆蓋前面
let opacity = 1.0;
let glow = false;

// 1. viewMode 過濾（已在 applyViewMode 處理，不在這裡）
// 2. searchFocus
if (isSearchFocused && !searchFocusNodes.includes(nodeId)) opacity = 0.1;
// 3. e2eTracing
if (e2eTracing?.active) {
  opacity = e2eTracing.path.includes(nodeId) ? 1.0 : 0.1;
  glow = e2eTracing.path.includes(nodeId);
}
// 4. impact
if (impactAnalysis?.active) {
  opacity = impactAnalysis.impactedNodes.includes(nodeId) ? 1.0 : 0.1;
}
// 5. tracing (Sprint 5 path tracing)
// 6. hover
```

---

## 6. ViewState 第 5 次擴充

### 6.1 新增 State

```typescript
// ViewState 新增欄位
activeViewMode: ViewModeName;        // 預設 'panorama'
isControlPanelOpen: boolean;         // 預設 true
displayPrefs: DisplayPrefs;          // 預設見下
e2eTracing: E2ETracingState | null;  // 預設 null
```

### 6.2 新增 Actions

```typescript
| { type: 'SET_VIEW_MODE'; mode: ViewModeName }
| { type: 'TOGGLE_CONTROL_PANEL' }
| { type: 'SET_DISPLAY_PREFS'; prefs: Partial<DisplayPrefs> }
| { type: 'START_E2E_TRACING'; startNodeId: string;
    path: string[]; edges: string[]; steps: E2EStep[]; truncated: boolean }
| { type: 'UPDATE_E2E_DEPTH'; maxDepth: number;
    path: string[]; edges: string[]; steps: E2EStep[]; truncated: boolean }
| { type: 'CLEAR_E2E_TRACING' }
| { type: 'SET_E2E_SELECTING'; selecting: boolean }
```

### 6.3 Reducer 關鍵邏輯

**SET_VIEW_MODE**：切換視圖 + 清除所有分析狀態
```typescript
case 'SET_VIEW_MODE':
  return {
    ...state,
    activeViewMode: action.mode,
    impactAnalysis: null,
    isSearchFocused: false,
    searchFocusNodes: [],
    searchFocusEdges: [],
    e2eTracing: null,
    filter: { directories: [], nodeTypes: [], edgeTypes: [] },
  };
```

**TOGGLE_CONTROL_PANEL**：
```typescript
case 'TOGGLE_CONTROL_PANEL':
  return { ...state, isControlPanelOpen: !state.isControlPanelOpen };
```

**SET_DISPLAY_PREFS**：
```typescript
case 'SET_DISPLAY_PREFS':
  return {
    ...state,
    displayPrefs: { ...state.displayPrefs, ...action.prefs },
  };
```

**START_E2E_TRACING**：
```typescript
case 'START_E2E_TRACING':
  return {
    ...state,
    e2eTracing: {
      active: true,
      startNodeId: action.startNodeId,
      path: action.path,
      edges: action.edges,
      steps: action.steps,
      maxDepth: state.e2eTracing?.maxDepth ?? 10,
      truncated: action.truncated,
    },
    // 清除其他分析模式
    impactAnalysis: null,
    tracingSymbol: null,
    tracingPath: [],
    tracingEdges: [],
  };
```

### 6.4 Initial State 預設值

```typescript
activeViewMode: 'panorama',
isControlPanelOpen: true,
displayPrefs: {
  showEdgeLabels: false,
  showParticles: true,
  labelDensity: 'smart',
  impactDefaultDepth: 5,
},
e2eTracing: null,
```

---

## 7. 標籤密度 Smart 模式

```typescript
function getVisibleLabels(
  nodes: GraphNode[],
  zoom: number,
  labelDensity: 'all' | 'smart' | 'none',
): Set<string> {
  if (labelDensity === 'none') return new Set();
  if (labelDensity === 'all') return new Set(nodes.map(n => n.id));

  // smart 模式
  if (zoom > 0.8) return new Set(nodes.map(n => n.id));

  if (zoom > 0.4) {
    // 只顯示 dependencyCount > median 的節點
    const counts = nodes
      .map(n => n.metadata.dependencyCount ?? 0)
      .sort((a, b) => a - b);
    const median = counts[Math.floor(counts.length / 2)] ?? 0;

    return new Set(
      nodes
        .filter(n => (n.metadata.dependencyCount ?? 0) > median)
        .map(n => n.id),
    );
  }

  // zoom < 0.4: 只顯示 directory
  return new Set(
    nodes.filter(n => n.type === 'directory').map(n => n.id),
  );
}
```

median 用 `useMemo` 快取，只在 nodes 變化時重算。

---

## 8. 2D + 3D 適配策略

| 功能 | 2D 實作 | 3D 實作 |
|------|---------|---------|
| ControlPanel | DOM overlay（fixed position） | 同 2D（DOM 不在 3D 空間） |
| 視圖模式過濾 | graph-adapter 層處理 | 同 2D（共用 applyViewMode） |
| 端到端追蹤高亮 | styledNodes opacity + glow CSS | material emissive + opacity |
| 邊標籤控制 | NeonEdge label 顯隱 | edge label sprite 建立/銷毀 |
| 粒子控制 | CSS animation class toggle | linkDirectionalParticles(0) |
| 標籤密度 | NeonNode label opacity | node label sprite visibility |
| Toolbar | DOM overlay | 同 2D |

**共用層**（2D/3D 無關）：
- applyViewMode()
- traceE2E()
- filterNodes() / filterEdges()
- ViewState + reducer
- useE2ETracing hook
- ControlPanel / Toolbar / E2EPanel 元件

**各自適配層**：
- GraphCanvas.tsx：2D 高亮邏輯
- Graph3DCanvas.tsx：3D 高亮邏輯

---

## 9. App.tsx 整合後 Layout

```typescript
// App.tsx 新 layout
<>
  <Toolbar />
  <ControlPanel graphNodes={rawNodes} graphEdges={rawEdges} />
  <GraphContainer rfNodes={nodes} rfEdges={edges} graphNodes={rawNodes} graphEdges={rawEdges} />
  <CameraPresets />  {/* 3D 專屬，保留右下角 */}
  <SearchBar search={search} />
  {/* 右側面板互斥 */}
  {e2eTracing?.active ? (
    <E2EPanel />
  ) : tracingSymbol !== null ? (
    <TracingPanel />
  ) : (
    <NodePanel ... />
  )}
</>
```

移除：`<ViewToggle />`、`<HeatmapToggle />`（已整合進 ControlPanel/Toolbar）

---

## 10. 風險與緩解

| 風險 | 緩解 |
|------|------|
| ControlPanel 資訊過載 | 預設只展開視圖模式，其他收合 |
| 視圖切換時閃爍 | 先清除狀態 → 再 apply 新 filter |
| smart label density 效能 | useMemo 快取 median，throttle zoom 事件 |
| E2E 追蹤路徑過長 | 30 節點截斷 + 面板虛擬滾動（如需） |
| 呼叫鏈視圖 expandFiles 大量 API 請求 | 只展開含 function/class 的檔案，batch 載入 |
