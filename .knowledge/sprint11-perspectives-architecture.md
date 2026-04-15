# Sprint 11 — 三種故事視角 架構設計

> **版本**: v1.0
> **撰寫者**: Tech Lead (L1)
> **日期**: 2026-04-01
> **Sprint**: 11
> **提案書**: `proposal/sprint11-proposal.md`

---

## 1. 架構概覽

Sprint 11 純 web 層改動（core/cli 不改）。引入 **Perspective（故事視角）** 概念完全取代 Sprint 9 的 **ViewMode（技術視圖模式）**。

```
web 層（新增）
  types/graph.ts               ← +PerspectiveName, +PerspectivePreset, +LayoutEngine 型別
  adapters/perspective-presets.ts  ← 三種視角預設定義（PERSPECTIVE_PRESETS）
  adapters/layout-router.ts    ← 佈局引擎路由框架（可擴展 LAYOUT_PROVIDERS）
  adapters/dagre-layout.ts     ← dagre 分層佈局 provider
  adapters/path-tracing-layout.ts  ← 路徑鎖定佈局 provider
  hooks/useBfsHoverHighlight.ts    ← BFS 多跳 hover 高亮
  hooks/useStaggerAnimation.ts     ← Stagger animation 控制
  styles/stagger-animation.css     ← 邊流動動畫 CSS

web 層（修改）
  contexts/ViewStateContext.tsx ← activeViewMode → activePerspective + SET_PERSPECTIVE
  adapters/graph-adapter.ts    ← +applyPerspective() 替代 applyViewMode()
  adapters/view-modes.ts       ← 標記 deprecated
  components/ControlPanel.tsx  ← 四選一 → 三選一視角 UI
  components/Toolbar.tsx       ← Perspective label + 色標
  components/GraphCanvas.tsx   ← 佈局路由 + 色調切換
  components/Graph3DCanvas.tsx ← 3D 視角適配 + Bloom(P1)
  components/NeonNode.tsx      ← 色調切換 + 目錄群組卡片
  components/NeonEdge.tsx      ← 邊色調 + stagger dash
  components/E2EPanel.tsx      ← stagger 同步 + 重播按鈕
  hooks/useHoverHighlight.ts   ← 整合 BFS 多跳
  styles/theme.ts              ← +Cyan/Green 單色調
```

**資料流**：
```
core analyze（不改）→ API /api/graph（不改）
  ↓
web useGraphData → applyPerspective → applyCuration → filterNodes/filterEdges → styled output
                   ^^^^^^^^^^^^^^^^^^^^
                   Sprint 11 替代 applyViewMode
```

---

## 2. 故事視角系統

### 2.1 型別定義

```typescript
// packages/web/src/types/graph.ts

export type PerspectiveName = 'system-framework' | 'logic-operation' | 'data-journey';

export type LayoutEngine = 'dagre-hierarchical' | 'force-directed' | 'path-tracing';
export type ColorScheme = 'cyan-monochrome' | 'neon-multicolor' | 'green-monochrome';
export type InteractionMode = 'static-hierarchy' | 'bfs-hover-highlight' | 'stagger-playback';

export interface PerspectivePreset {
  name: PerspectiveName;
  label: string;
  description: string;
  layout: LayoutEngine;
  colorScheme: ColorScheme;
  interaction: InteractionMode;
  supports3D: boolean;
  filter: {
    nodeTypes: NodeType[];
    edgeTypes: EdgeType[];
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

### 2.2 三種視角預設

| 視角 | 佈局 | 色調 | 互動 | 3D | Filter |
|------|------|------|------|-----|--------|
| system-framework | dagre-hierarchical | cyan-monochrome (#00d4ff) | static-hierarchy | ❌ | edgeTypes: import, export |
| logic-operation | force-directed | neon-multicolor | bfs-hover-highlight | ✅ | 全選 |
| data-journey | path-tracing | green-monochrome (#00ff88) | stagger-playback | ✅ | 全選 |

```typescript
// packages/web/src/adapters/perspective-presets.ts

export const PERSPECTIVE_PRESETS: Record<PerspectiveName, PerspectivePreset> = {
  'system-framework': {
    name: 'system-framework',
    label: '系統框架',
    description: '分層結構一目了然',
    layout: 'dagre-hierarchical',
    colorScheme: 'cyan-monochrome',
    interaction: 'static-hierarchy',
    supports3D: false,
    filter: { nodeTypes: [], edgeTypes: ['import', 'export'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: false,
      labelDensity: 'all',
      expandFiles: false,
    },
  },
  'logic-operation': {
    name: 'logic-operation',
    label: '邏輯運作',
    description: '從入口追呼叫鏈',
    layout: 'force-directed',
    colorScheme: 'neon-multicolor',
    interaction: 'bfs-hover-highlight',
    supports3D: true,
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  'data-journey': {
    name: 'data-journey',
    label: '資料旅程',
    description: '逐步追蹤資料路徑',
    layout: 'path-tracing',
    colorScheme: 'green-monochrome',
    interaction: 'stagger-playback',
    supports3D: true,
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
};
```

---

## 3. 視圖模式遷移策略

### 3.1 四對三對照表

| Sprint 9 ViewMode | 過濾邏輯 | Sprint 11 Perspective | 如何遷移 |
|-------------------|---------|----------------------|---------|
| **panorama** | nodeTypes: 全選, edgeTypes: 全選, labels: smart | **logic-operation** | filter 全選 + 策展減少節點 + BFS hover 提供焦點 |
| **dependency** | edgeTypes: import/export only | **system-framework** | edgeTypes 同，加 dagre 分層佈局提升可讀性 |
| **dataflow** | edgeTypes: data-flow/export, showHeatmap | **data-journey** | 資料流追蹤 + stagger animation + Green 色調。heatmap 可在顯示偏好手動開啟 |
| **callchain** | edgeTypes: call, nodeTypes: function/class, expandFiles | **logic-operation** | BFS hover 涵蓋 call edges，function/class 節點在 hover 高亮時自動可見 |

### 3.2 功能遷移完整清單

| # | 現有功能 | 原 ViewMode | 遷移至 | 實作方式 | 遷移驗證 |
|---|---------|------------|--------|---------|---------|
| 1 | 全節點/邊顯示 | panorama | logic-operation | filter 全選，策展減少節點 | ✅ |
| 2 | import/export 聚焦 | dependency | system-framework | filter.edgeTypes = import/export | ✅ |
| 3 | data-flow 聚焦 | dataflow | data-journey | 路徑追蹤聚焦 | ✅ |
| 4 | heatmap 顯示 | dataflow | 顯示偏好 | 使用者可手動開啟 heatmap | ✅ |
| 5 | call 邊聚焦 | callchain | logic-operation | BFS hover 涵蓋 all edge types | ✅ |
| 6 | function/class 展開 | callchain | logic-operation | expandFiles 在 hover 高亮時自動 | ✅ |
| 7 | SET_VIEW_MODE 清除衝突 | all | SET_PERSPECTIVE | 同邏輯：清除 impact/searchFocus/e2e/filter | ✅ |
| 8 | displayPrefs 同步 | all | perspective display | 每個 preset 有獨立 display 定義 | ✅ |
| 9 | applyViewMode 過濾 | graph-adapter | applyPerspective | 同邏輯，查 PERSPECTIVE_PRESETS 取代 VIEW_MODE_PRESETS | ✅ |
| 10 | Toolbar badge 顯示 | Toolbar | Toolbar | perspectiveLabel + 色標 | ✅ |

### 3.3 程式碼遷移步驟

```
Step 1: types/graph.ts
  + PerspectiveName, LayoutEngine, ColorScheme, InteractionMode, PerspectivePreset
  ViewModeName 加 @deprecated JSDoc

Step 2: perspective-presets.ts（新檔案）
  + PERSPECTIVE_PRESETS

Step 3: ViewStateContext.tsx
  activeViewMode → activePerspective (default: 'logic-operation')
  SET_VIEW_MODE → SET_PERSPECTIVE
  displayPrefs 預設值改用 perspective display

Step 4: graph-adapter.ts
  + applyPerspective() — 查 PERSPECTIVE_PRESETS 取代 VIEW_MODE_PRESETS
  applyViewMode() 加 @deprecated

Step 5: ControlPanel.tsx
  VIEW_MODE_OPTIONS → PERSPECTIVE_OPTIONS (3 items + color)
  四選一 radio → 三選一

Step 6: Toolbar.tsx
  viewModeLabel → perspectiveLabel + 色標 pill

Step 7: GraphCanvas.tsx + Graph3DCanvas.tsx
  applyViewMode → applyPerspective
  + computeLayout(preset.layout, input)

Step 8: view-modes.ts
  加 @deprecated 不刪除（漸進式）
```

---

## 4. 佈局引擎框架

### 4.1 可擴展設計

```typescript
// packages/web/src/adapters/layout-router.ts

export interface LayoutInput {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface LayoutOutput {
  nodes: ReactFlowNode[];  // 帶 position
  edges: ReactFlowEdge[];
}

export interface LayoutProvider {
  name: LayoutEngine;
  compute(input: LayoutInput): LayoutOutput;
}

// 註冊表 — 未來新增佈局只需加一行
const LAYOUT_PROVIDERS: Record<string, LayoutProvider> = {};

export function registerLayout(provider: LayoutProvider): void {
  LAYOUT_PROVIDERS[provider.name] = provider;
}

export function computeLayout(engine: LayoutEngine, input: LayoutInput): LayoutOutput {
  const provider = LAYOUT_PROVIDERS[engine];
  if (!provider) {
    console.warn(`Layout engine "${engine}" not found, falling back to force-directed`);
    return LAYOUT_PROVIDERS['force-directed']?.compute(input) ?? { nodes: input.nodes, edges: input.edges };
  }
  try {
    return provider.compute(input);
  } catch (error) {
    console.warn(`Layout engine "${engine}" failed, falling back to force-directed`, error);
    return LAYOUT_PROVIDERS['force-directed']?.compute(input) ?? { nodes: input.nodes, edges: input.edges };
  }
}
```

### 4.2 三種佈局 Provider

#### dagre-hierarchical（系統框架）

```typescript
// packages/web/src/adapters/dagre-layout.ts

import dagre from 'dagre';

export const dagreLayoutProvider: LayoutProvider = {
  name: 'dagre-hierarchical',
  compute(input) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: 40, marginy: 40 });

    for (const node of input.nodes) {
      g.setNode(node.id, { width: 180, height: 50 });
    }
    for (const edge of input.edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    const layoutNodes = input.nodes.map(node => {
      const pos = g.node(node.id);
      if (!pos) return node; // dagre 未計算到的節點保持原位
      return { ...node, position: { x: pos.x - 90, y: pos.y - 25 } };
    });

    return { nodes: layoutNodes, edges: input.edges };
  },
};
```

**回退**：dagre 失敗 → computeLayout catch → 回退 force-directed。

#### force-directed（邏輯運作）

```typescript
// 現有 D3 force simulation，包裝為 LayoutProvider
export const forceDirectedLayoutProvider: LayoutProvider = {
  name: 'force-directed',
  compute(input) {
    // 力導向由 React Flow / useForceLayout hook 處理
    // 此 provider 回傳原始位置，由 React Flow 控制佈局
    return { nodes: input.nodes, edges: input.edges };
  },
};
```

#### path-tracing（資料旅程）

```typescript
// packages/web/src/adapters/path-tracing-layout.ts

export const pathTracingLayoutProvider: LayoutProvider = {
  name: 'path-tracing',
  compute(input) {
    // 基礎力導向 + 選中路徑節點線性排列
    // 實際路徑鎖定由 useStaggerAnimation 控制
    return { nodes: input.nodes, edges: input.edges };
  },
};
```

---

## 5. 視角互動行為

### 5.1 系統框架 — 靜態分層

- dagre 計算完佈局後，節點位置固定
- 無力導向 simulation（靜態圖）
- 目錄群組卡片：
  - background: `rgba(0, 212, 255, 0.05)`
  - border: `1px dashed rgba(0, 212, 255, 0.2)`
  - border-radius: 12px
  - 標題：`{dirName}/ ({childCount})`
  - 子節點在卡片內自動排列

### 5.2 邏輯運作 — BFS Hover 高亮

```typescript
// packages/web/src/hooks/useBfsHoverHighlight.ts

export function useBfsHoverHighlight(
  hoveredNodeId: string | null,
  edges: GraphEdge[],
  maxDepth: number = 5,
): { highlightedNodes: Set<string>; highlightedEdges: Set<string> } {
  return useMemo(() => {
    if (!hoveredNodeId) return { highlightedNodes: new Set(), highlightedEdges: new Set() };

    const visited = new Set<string>([hoveredNodeId]);
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: hoveredNodeId, depth: 0 }];

    // 建立快速查找表
    const edgesBySource = new Map<string, GraphEdge[]>();
    const edgesByTarget = new Map<string, GraphEdge[]>();
    for (const edge of edges) {
      if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
      edgesBySource.get(edge.source)!.push(edge);
      if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, []);
      edgesByTarget.get(edge.target)!.push(edge);
    }

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      // Forward edges
      for (const edge of edgesBySource.get(nodeId) ?? []) {
        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          visitedEdges.add(edge.id);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        } else {
          visitedEdges.add(edge.id); // 邊仍然標記高亮
        }
      }

      // Backward edges
      for (const edge of edgesByTarget.get(nodeId) ?? []) {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          visitedEdges.add(edge.id);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        } else {
          visitedEdges.add(edge.id);
        }
      }
    }

    return { highlightedNodes: visited, highlightedEdges: visitedEdges };
  }, [hoveredNodeId, edges, maxDepth]);
}
```

**非相關淡化**：
```typescript
// NeonNode.tsx — 邏輯運作視角
const isHighlighted = highlightedNodes.has(nodeId);
const isAnyHovered = hoveredNodeId !== null;
const opacity = !isAnyHovered ? 1.0 : (isHighlighted ? 1.0 : 0.15);
```

### 5.3 資料旅程 — Stagger Animation

```typescript
// packages/web/src/hooks/useStaggerAnimation.ts

export interface StaggerState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
}

export function useStaggerAnimation(
  path: string[],
  pathEdges: string[],
  stepDuration: number = 350,  // 老闆核准 350ms
): StaggerState & {
  play: () => void;
  pause: () => void;
  replay: () => void;
} {
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // > 30 節點加速
  const effectiveDuration = path.length > 30 ? 100 : stepDuration;

  const play = useCallback(() => {
    setIsPlaying(true);
    let step = currentStep < 0 ? 0 : currentStep;

    intervalRef.current = setInterval(() => {
      step++;
      if (step >= path.length) {
        clearInterval(intervalRef.current!);
        setIsPlaying(false);
        return;
      }
      setCurrentStep(step);
    }, effectiveDuration);
  }, [currentStep, path.length, effectiveDuration]);

  const pause = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const replay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setCurrentStep(-1);
    setIsPlaying(false);
    // 下一 tick 開始播放
    setTimeout(() => {
      setCurrentStep(0);
      setIsPlaying(true);
      // ... restart interval
    }, 0);
  }, []);

  const visibleNodes = useMemo(() => {
    if (currentStep < 0) return new Set<string>();
    return new Set(path.slice(0, currentStep + 1));
  }, [path, currentStep]);

  const visibleEdges = useMemo(() => {
    if (currentStep < 1) return new Set<string>();
    return new Set(pathEdges.slice(0, currentStep));
  }, [pathEdges, currentStep]);

  // Cleanup
  useEffect(() => {
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  return {
    currentStep,
    totalSteps: path.length,
    isPlaying,
    visibleNodes,
    visibleEdges,
    play,
    pause,
    replay,
  };
}
```

**邊流動 CSS**：
```css
.data-journey-edge {
  stroke-dasharray: 8 4;
  animation: dash-flow 1s linear infinite;
}
@keyframes dash-flow {
  to { stroke-dashoffset: -12; }
}
```

---

## 6. 色調系統

### 6.1 三種色調定義

```typescript
// styles/theme.ts 擴充

export const PERSPECTIVE_COLORS = {
  'cyan-monochrome': {
    primary: '#00d4ff',
    bright: '#00ffff',
    dim: '#0099cc',
    bg: 'rgba(0, 212, 255, 0.05)',
    border: 'rgba(0, 212, 255, 0.2)',
    glow: '0 0 12px rgba(0, 212, 255, 0.4)',
  },
  'neon-multicolor': {
    // 現有 Sprint 2 配色，不改動
  },
  'green-monochrome': {
    primary: '#00ff88',
    bright: '#00ffaa',
    dim: '#00cc66',
    bg: 'rgba(0, 255, 136, 0.05)',
    border: 'rgba(0, 255, 136, 0.2)',
    glow: '0 0 12px rgba(0, 255, 136, 0.4)',
  },
} as const;
```

### 6.2 色調切換邏輯

GraphCanvas / NeonNode / NeonEdge 根據 `activePerspective` 的 `colorScheme` 切換色調：

```typescript
const { colorScheme } = PERSPECTIVE_PRESETS[activePerspective];
const colors = PERSPECTIVE_COLORS[colorScheme];
// 套用到 node style / edge style
```

---

## 7. 視角切換 UI

### 7.1 ControlPanel 視角區段

取代四選一 ViewMode radio group：

```typescript
const PERSPECTIVE_OPTIONS = [
  { id: 'system-framework', label: '系統框架', description: '分層結構一目了然', color: '#00d4ff', icon: LayersIcon },
  { id: 'logic-operation', label: '邏輯運作', description: '從入口追呼叫鏈', color: '#ff00ff', icon: GitBranchIcon },
  { id: 'data-journey', label: '資料旅程', description: '逐步追蹤資料路徑', color: '#00ff88', icon: RouteIcon },
];
```

每個按鈕：
- 左側色標圓點（8px circle，color 填充）
- 標題 + 描述
- 選中狀態：左邊框 color accent + 背景微亮

### 7.2 過渡動畫

```typescript
// Framer Motion AnimatePresence
<AnimatePresence mode="wait">
  <motion.div
    key={activePerspective}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
  >
    {/* 圖譜內容 */}
  </motion.div>
</AnimatePresence>

// 節點位置過渡
// React Flow nodesDraggable + 動態 position 更新
// dagre → force-directed：節點從分層位置平滑移動到力導向位置
```

### 7.3 Toolbar 顯示

```typescript
const perspectiveLabel = PERSPECTIVE_PRESETS[activePerspective]?.label ?? activePerspective;
const perspectiveColor = PERSPECTIVE_OPTIONS.find(o => o.id === activePerspective)?.color;

// JSX
<span style={{ ...pillStyle, borderColor: perspectiveColor }}>
  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: perspectiveColor }} />
  {perspectiveLabel}
</span>
```

---

## 8. 三層過濾架構（更新）

### 8.1 過濾順序

```
原始資料 (rawNodes/rawEdges)
  │
  ▼
① applyPerspective(nodes, edges, activePerspective)   ← Sprint 11 取代 applyViewMode
  │  根據 PerspectivePreset.filter 過濾
  ▼
② applyCuration(nodes, edges, pinnedNodeIds)           ← Sprint 10 不變
  │  根據 NodeRole 策展
  ▼
③ filterNodes/filterEdges(nodes, filter)               ← Sprint 8 不變
  │  使用者手動過濾
  ▼
styled output → computeLayout(engine, input) → 渲染
```

### 8.2 applyPerspective 實作

```typescript
// packages/web/src/adapters/graph-adapter.ts

export function applyPerspective(
  nodes: GraphNode[],
  edges: GraphEdge[],
  perspective: PerspectiveName,
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const preset = PERSPECTIVE_PRESETS[perspective];

  const presetFilter: FilterState = {
    directories: [],
    nodeTypes: preset.filter.nodeTypes,
    edgeTypes: preset.filter.edgeTypes,
  };

  const filteredNodes = filterNodes(nodes, presetFilter);
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = filterEdges(edges, filteredNodeIds, presetFilter);

  return { nodes: filteredNodes, edges: filteredEdges };
}
```

### 8.3 GraphCanvas useMemo Pipeline（更新）

```typescript
const { curationFilteredNodes, curationFilteredEdges } = useMemo(() => {
  // Stage 1: Manual filter (Sprint 8)
  const filtered = filterNodes(rawGraphNodes, filter);
  const filteredIds = new Set(filtered.map(n => n.id));
  const filteredEdgesRaw = filterEdges(rawGraphEdges, filteredIds, filter);

  // Stage 2: Perspective filter (Sprint 11 — 取代 ViewMode)
  let stageNodes = filtered;
  let stageEdges = filteredEdgesRaw;
  if (activePerspective !== 'logic-operation') {
    // logic-operation 全選，無需額外過濾
    const perspectiveFiltered = applyPerspective(stageNodes, stageEdges, activePerspective);
    stageNodes = perspectiveFiltered.nodes;
    stageEdges = perspectiveFiltered.edges;
  }

  // Stage 3: Smart curation (Sprint 10)
  const curated = applyCuration(stageNodes, stageEdges, new Set(state.pinnedNodeIds));

  const allowedNodeIds = new Set(curated.nodes.map(n => n.id));
  const allowedEdgeIds = new Set(curated.edges.map(e => e.id));

  return {
    curationFilteredNodes: initialNodes.filter(n => allowedNodeIds.has(n.id)),
    curationFilteredEdges: initialEdges.filter(e => allowedEdgeIds.has(e.id)),
  };
}, [rawGraphNodes, rawGraphEdges, initialNodes, initialEdges, filter, activePerspective, state.pinnedNodeIds]);
```

---

## 9. 2D/3D 適配策略

### 9.1 適配矩陣

| 視角 | 2D 佈局 | 3D 佈局 | 互動 |
|------|---------|---------|------|
| system-framework | dagre TB | ❌ 不支援 | 靜態分層 |
| logic-operation | D3 force | 3d-force-graph | BFS hover |
| data-journey | D3 force + path lock | 3d-force-graph + path glow | Stagger |

### 9.2 3D 模式限制

```typescript
// ViewStateContext.tsx — SET_PERSPECTIVE reducer

case 'SET_PERSPECTIVE': {
  let perspective = action.perspective;
  const is3D = state.mode === '3d';

  // 系統框架不支援 3D
  if (perspective === 'system-framework' && is3D) {
    // 自動切換至 2D
    return {
      ...state,
      activePerspective: perspective,
      mode: '2d',  // 強制切 2D
      // 清除衝突狀態...
    };
  }

  return {
    ...state,
    activePerspective: perspective,
    // 清除衝突狀態...
  };
}

// SET_3D_MODE reducer
case 'SET_3D_MODE': {
  if (action.mode === '3d' && state.activePerspective === 'system-framework') {
    // 從系統框架切 3D → 自動切回邏輯運作
    return {
      ...state,
      mode: '3d',
      activePerspective: 'logic-operation',
    };
  }
  return { ...state, mode: action.mode };
}
```

---

## 10. 目錄群組卡片（系統框架專用）

### 10.1 渲染邏輯

系統框架視角下，directory 類型節點渲染為群組卡片：

```typescript
// NeonNode.tsx

const isSystemFramework = activePerspective === 'system-framework';
const isDirectory = data.nodeType === 'directory';

if (isSystemFramework && isDirectory) {
  // 群組卡片渲染
  return (
    <div style={{
      background: 'rgba(0, 212, 255, 0.05)',
      border: '1px dashed rgba(0, 212, 255, 0.2)',
      borderRadius: 12,
      padding: '8px 12px',
      minWidth: 180,
    }}>
      <div style={{ color: '#00d4ff', fontSize: 11, fontWeight: 600 }}>
        {data.label}/ <span style={{ opacity: 0.6 }}>({childCount})</span>
      </div>
    </div>
  );
}
```

### 10.2 子元素計數

```typescript
// 計算方式：統計 rawNodes 中 filePath 以該目錄路徑開頭的 file 節點數
const childCount = rawNodes.filter(n =>
  n.type === 'file' && n.filePath.startsWith(directoryPath + '/')
).length;
```

---

## 11. 錯誤處理與邊界條件

| 場景 | 處理 |
|------|------|
| dagre 佈局失敗 | computeLayout catch → fallback force-directed + console.warn |
| 未知 LayoutEngine | LAYOUT_PROVIDERS 查無 → fallback force-directed |
| BFS hoveredNodeId 不在圖中 | 回傳空 Set |
| BFS 孤立節點（無邊） | 回傳只含自身的 Set |
| stagger path 為空 | 不播放，visibleNodes/Edges 為空 Set |
| stagger >30 節點 | stepDuration 自動降至 100ms |
| 3D 選系統框架 | 自動切 2D |
| 2D 系統框架切 3D | 自動切回邏輯運作 |
| perspective filter + curation 節點 < 5 | applyCuration 安全閥不變（Sprint 10） |
| ViewModeName 引用 | deprecated 但保留，不報錯 |

---

## 12. 設計決策記錄

| 決策 | 選擇 | 理由 |
|------|------|------|
| 取代 vs 並存 | 取代 | 三種故事視角是更好的分類，四種技術視圖造成使用者困惑 |
| 預設視角 | logic-operation | 最接近原 panorama 行為，使用者無學習成本 |
| 系統框架 2D only | 限制 | dagre 分層在 3D 空間不適合，強制 2D 保證品質 |
| 佈局引擎註冊表 | LAYOUT_PROVIDERS | 可擴展設計，未來新增佈局零改動路由邏輯 |
| stagger 350ms | 固定 | 老闆核准節奏，>30 節點自動加速是唯一例外 |
| BFS maxDepth 5 | 預設 | 平衡高亮範圍和視覺清晰度 |
| view-modes.ts deprecated | 保留不刪 | 漸進式遷移，Sprint 12+ 移除 |
| 色調切換 | 三套獨立色彩 | 視覺上明確區分三種視角，老闆核准 |
