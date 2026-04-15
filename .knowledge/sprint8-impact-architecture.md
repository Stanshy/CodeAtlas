# Sprint 8 架構設計：影響分析 + 搜尋強化

> **版本**: v1.0
> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **Sprint**: 8

---

## 1. 設計目標

從「看」升級到「預測」。選一個節點 → BFS 遍歷下游影響或上游依賴 → 高亮整條影響鏈。搜尋後整張圖聚焦到相關路徑。模組過濾面板讓使用者縮小視野。AI 一鍵概述專案架構。

**核心約束**：
- 不改既有 Sprint 1-7 邏輯（import-extractor / graph-builder / function-extractor 等）
- 影響分析、搜尋聚焦、過濾均為**純前端邏輯**，不需 API 呼叫
- AI 概述需 core（prompt 組裝）+ cli（API 端點）配合
- 所有功能必須在 2D + 3D 雙模式下運作

---

## 2. 影響分析 BFS 演算法

### 2.1 純函式設計

```typescript
// packages/web/src/hooks/useImpactAnalysis.ts

export interface ImpactAnalysisResult {
  impactedNodes: string[];       // 影響到的節點 ID 列表（含起點）
  impactedEdges: string[];       // 影響到的邊 ID 列表
  depthMap: Record<string, number>; // nodeId → BFS 深度（起點 = 0）
  truncated: boolean;            // 是否被截斷
}

/**
 * BFS 影響分析純函式
 *
 * @param startNodeId - 起始節點 ID
 * @param edges       - 圖中所有邊（含 import/export/data-flow/call）
 * @param direction   - 'forward'（下游影響）| 'reverse'（上游依賴）
 * @param maxDepth    - 最大遍歷深度（預設 5）
 * @returns ImpactAnalysisResult
 */
export function analyzeImpact(
  startNodeId: string,
  edges: GraphEdge[],
  direction: 'forward' | 'reverse',
  maxDepth: number = 5,
): ImpactAnalysisResult {
  const visited = new Set<string>();
  const impactedEdges: string[] = [];
  const depthMap = new Map<string, number>();
  const queue: Array<{ nodeId: string; depth: number }> = [];

  // 起點入隊
  visited.add(startNodeId);
  depthMap.set(startNodeId, 0);
  queue.push({ nodeId: startNodeId, depth: 0 });

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
      // 正向：source → target（找被影響者）
      // 反向：target → source（找依賴者）
      const [from, to] = direction === 'forward'
        ? [edge.source, edge.target]
        : [edge.target, edge.source];

      if (from === nodeId && !visited.has(to)) {
        visited.add(to);
        depthMap.set(to, depth + 1);
        impactedEdges.push(edge.id);
        queue.push({ nodeId: to, depth: depth + 1 });
      }
    }
  }

  // 截斷：超過 50 個影響節點（不含起點）
  const impactedNodes = Array.from(visited);
  const truncated = impactedNodes.length > 51; // 51 = 起點 + 50 個影響節點
  if (truncated) {
    impactedNodes.length = 51;
  }

  return {
    impactedNodes,
    impactedEdges,
    depthMap: Object.fromEntries(depthMap),
    truncated,
  };
}
```

### 2.2 設計重點

| 面向 | 設計 |
|------|------|
| 純函式 | 不依賴 React，可獨立單元測試 |
| 全 edge type | import / export / data-flow / call 全部參與 BFS |
| 防循環 | `visited` Set 確保每個節點只訪問一次 |
| 截斷保護 | > 50 個影響節點 → truncated=true + 截斷提示 |
| depth limit | 預設 5，可透過 slider 調整 1-10 |
| 效能 | O(V+E) 標準 BFS，大型專案有截斷保護 |

### 2.3 React Hook 封裝

```typescript
export function useImpactAnalysis() {
  const { state, dispatch } = useViewState();
  const graphData = useGraphData(); // 從 GraphContext 取得

  const analyze = useCallback((nodeId: string, direction: 'forward' | 'reverse') => {
    const result = analyzeImpact(
      nodeId,
      graphData.edges,
      direction,
      state.impactAnalysis?.maxDepth ?? 5,
    );
    dispatch({
      type: 'IMPACT_ANALYZE',
      direction,
      targetNodeId: nodeId,
      impactedNodes: result.impactedNodes,
      impactedEdges: result.impactedEdges,
      depthMap: result.depthMap,
    });
  }, [graphData.edges, state.impactAnalysis?.maxDepth, dispatch]);

  const updateDepth = useCallback((maxDepth: number) => {
    if (!state.impactAnalysis?.targetNodeId) return;
    const result = analyzeImpact(
      state.impactAnalysis.targetNodeId,
      graphData.edges,
      state.impactAnalysis.direction!,
      maxDepth,
    );
    dispatch({
      type: 'UPDATE_IMPACT_DEPTH',
      maxDepth,
      impactedNodes: result.impactedNodes,
      impactedEdges: result.impactedEdges,
      depthMap: result.depthMap,
    });
  }, [state.impactAnalysis, graphData.edges, dispatch]);

  const clearImpact = useCallback(() => {
    dispatch({ type: 'CLEAR_IMPACT' });
  }, [dispatch]);

  return { analyze, updateDepth, clearImpact, impactState: state.impactAnalysis };
}
```

---

## 3. 右鍵選單設計

### 3.1 元件介面

```typescript
// packages/web/src/components/ContextMenu.tsx

interface ContextMenuProps {
  visible: boolean;
  x: number;          // 螢幕 px
  y: number;          // 螢幕 px
  nodeId: string | null;
  onClose: () => void;
  onImpactForward: (nodeId: string) => void;
  onImpactReverse: (nodeId: string) => void;
  onCopyPath: (nodeId: string) => void;
  onOpenInPanel: (nodeId: string) => void;
}
```

### 3.2 選單項目

| # | 項目 | Handler | Icon 描述 |
|---|------|---------|-----------|
| 1 | 影響分析（下游） | `onImpactForward(nodeId)` | arrow-right |
| 2 | 依賴分析（上游） | `onImpactReverse(nodeId)` | arrow-left |
| 3 | 複製路徑 | `navigator.clipboard.writeText(filePath)` | copy |
| 4 | 在面板中開啟 | `dispatch SELECT_NODE` | panel-open |

### 3.3 觸發方式

#### 2D 模式
```
React Flow onNodeContextMenu event
→ event.preventDefault()
→ dispatch SHOW_CONTEXT_MENU { x: event.clientX, y: event.clientY, nodeId }
→ ContextMenu 元件渲染在 document body level（portal）
```

#### 3D 模式
```
Canvas onContextMenu event
→ event.preventDefault()
→ raycaster.intersectObjects(nodeObjects)
→ 命中 → node.position → THREE.Vector3.project(camera)
→ screenX = (projected.x + 1) / 2 * containerWidth
→ screenY = (-projected.y + 1) / 2 * containerHeight
→ dispatch SHOW_CONTEXT_MENU { x: screenX, y: screenY, nodeId }
```

#### 關閉邏輯
- `mousedown` on document（click outside） → `HIDE_CONTEXT_MENU`
- `keydown` Escape → `HIDE_CONTEXT_MENU`
- 選擇選單項 → execute handler → `HIDE_CONTEXT_MENU`

---

## 4. 搜尋聚焦模式設計

### 4.1 流程

```
使用者輸入搜尋 → matchingNodes = nodes.filter(label/path matches query)
→ directEdges = edges.filter(source OR target in matchingNodes)
→ dispatch ENTER_SEARCH_FOCUS { nodeIds: matchingNodes, edgeIds: directEdges }
→ 渲染層：
    - matchingNodes → opacity 1.0
    - directEdges → opacity 1.0
    - 其他所有 nodes/edges → opacity 0.1 (dimmed)

退出（任一）：
  - Escape 鍵 → dispatch EXIT_SEARCH_FOCUS
  - 清空搜尋框 → dispatch EXIT_SEARCH_FOCUS
  - 恢復所有 opacity 為預設
```

### 4.2 2D 適配
- React Flow node style: `opacity: isSearchFocused && !inFocusSet ? 0.1 : 1.0`
- React Flow edge style: `opacity: isSearchFocused && !inFocusEdges ? 0.1 : 1.0`

### 4.3 3D 適配
- `node.material.opacity`: same logic
- `edge.lineOpacity`: same logic
- `node.material.transparent = true` when dimmed

---

## 5. FilterPanel 架構設計

### 5.1 過濾位置：graph-adapter

```
Graph JSON
  → filterNodes(nodes, filterState)         ← FilterPanel 控制
  → filterEdges(edges, filteredNodeIds)     ← 邊跟隨節點過濾
  → toReactFlowNodes() / toReactFlowEdges()
  → React Flow / 3D render
```

**關鍵**：過濾在 adapter 層（渲染前），不在渲染元件內。避免 re-render 效能問題。

### 5.2 過濾函式

```typescript
// graph-adapter.ts 新增

export function filterNodes(
  nodes: GraphNode[],
  filter: FilterState,
): GraphNode[] {
  return nodes.filter((node) => {
    // 目錄過濾：空 = 全選
    if (filter.directories.length > 0) {
      const matchesDir = filter.directories.some((dir) =>
        node.filePath.startsWith(dir)
      );
      if (!matchesDir) return false;
    }

    // 節點類型過濾：空 = 全選
    if (filter.nodeTypes.length > 0) {
      if (!filter.nodeTypes.includes(node.type)) return false;
    }

    return true;
  });
}

export function filterEdges(
  edges: GraphEdge[],
  filteredNodeIds: Set<string>,
  filter: FilterState,
): GraphEdge[] {
  return edges.filter((edge) => {
    // 邊的兩端必須都在過濾後的節點集中
    if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) {
      return false;
    }

    // 邊類型過濾：空 = 全選
    if (filter.edgeTypes.length > 0) {
      if (!filter.edgeTypes.includes(edge.type)) return false;
    }

    return true;
  });
}
```

### 5.3 FilterPanel 三個區段

| 區段 | 資料來源 | UI |
|------|---------|-----|
| 目錄過濾 | graph 中 `type=directory` 的節點，巢狀結構 | checkbox tree（展開/收合） |
| 節點類型 | 固定：file, directory, function, class | 4 個 checkboxes |
| 邊類型 | 固定：import, export, data-flow, call | 4 個 checkboxes |

### 5.4 空陣列 = 全選設計

```typescript
// FilterState 型別
interface FilterState {
  directories: string[];    // [] = 全選（不過濾）
  nodeTypes: NodeType[];    // [] = 全選
  edgeTypes: EdgeType[];    // [] = 全選
}
```

好處：initialState 直接 `{ directories: [], nodeTypes: [], edgeTypes: [] }` 即為全通過。

---

## 6. AI 專案概述設計

### 6.1 結構提取（core 層）

```typescript
// packages/core/src/ai/overview-builder.ts

export interface StructureInfo {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  topModules: Array<{
    path: string;
    dependencyCount: number;
    importCount: number;
    exportCount: number;
  }>;
  moduleRelationships: Array<{
    source: string;
    target: string;
    edgeCount: number;
  }>;
}

export function extractStructureInfo(result: AnalysisResult): StructureInfo {
  const fileNodes = result.graph.nodes.filter(n => n.type === 'file');
  const functionNodes = result.graph.nodes.filter(n => n.type === 'function');
  const classNodes = result.graph.nodes.filter(n => n.type === 'class');

  // Top modules: 按 dependencyCount 排序，最多 20 個
  const topModules = fileNodes
    .map(n => ({
      path: n.filePath,
      dependencyCount: n.metadata.dependencyCount ?? 0,
      importCount: n.metadata.importCount ?? 0,
      exportCount: n.metadata.exportCount ?? 0,
    }))
    .sort((a, b) => b.dependencyCount - a.dependencyCount)
    .slice(0, 20);

  // Module relationships: 統計模組間的邊數
  const relMap = new Map<string, number>();
  for (const edge of result.graph.edges) {
    if (edge.type === 'call') continue; // 只統計模組級關係
    const key = `${edge.source}→${edge.target}`;
    relMap.set(key, (relMap.get(key) ?? 0) + 1);
  }
  const moduleRelationships = Array.from(relMap.entries())
    .map(([key, count]) => {
      const [source, target] = key.split('→');
      return { source, target, edgeCount: count };
    })
    .sort((a, b) => b.edgeCount - a.edgeCount)
    .slice(0, 30); // 最多 30 個關係

  return {
    totalFiles: fileNodes.length,
    totalFunctions: functionNodes.length,
    totalClasses: classNodes.length,
    topModules,
    moduleRelationships,
  };
}
```

### 6.2 Prompt 組裝

```typescript
export function buildOverviewPrompt(info: StructureInfo): string {
  const moduleList = info.topModules
    .map(m => `  - ${m.path} (被依賴 ${m.dependencyCount} 次, import ${m.importCount}, export ${m.exportCount})`)
    .join('\n');

  const relList = info.moduleRelationships
    .slice(0, 15)
    .map(r => `  - ${r.source} → ${r.target} (${r.edgeCount} edges)`)
    .join('\n');

  return `You are a software architecture analyst. Based on the following project structure information, write a concise 1-2 paragraph overview of the project architecture.

Project Statistics:
- Total files: ${info.totalFiles}
- Total functions: ${info.totalFunctions}
- Total classes: ${info.totalClasses}

Top Modules (by dependency count):
${moduleList}

Key Module Relationships:
${relList}

Instructions:
1. Describe the overall architecture pattern (MVC, layered, monorepo, etc.)
2. Identify the core modules and their responsibilities
3. Note any notable patterns or potential concerns
4. Keep it concise: 1-2 paragraphs maximum
5. Do NOT mention file sizes, line counts, or other metrics not provided`;
}
```

### 6.3 隱私保護

| 送出 | 不送出 |
|------|--------|
| 檔案路徑（相對路徑） | 原始碼 |
| 節點類型（file/function/class） | 檔案內容 |
| 依賴數量 | API key / 環境變數 |
| import/export 數量 | 使用者個資 |
| 模組間邊數 | 機密資訊 |

### 6.4 API 端點

```
POST /api/ai/overview
├── Request:  { provider?: string }
├── Success:  { overview: string, provider: string, cached: boolean,
│               structureInfo: { totalFiles, totalFunctions, topModules } }
├── Error:    { error: 'ai_not_configured', message: '...' }
│             { error: 'ai_overview_failed', message: '...' }
└── Cache:    .codeatlas/cache/overview-{hash}.json
              hash = sha256(projectPath + provider)
```

---

## 7. ViewState 擴充設計

### 7.1 新增狀態

```typescript
interface ViewState {
  // ... 既有欄位（Sprint 1-7）

  // === Sprint 8: 影響分析 ===
  impactAnalysis: {
    active: boolean;
    direction: 'forward' | 'reverse' | null;
    targetNodeId: string | null;
    impactedNodes: string[];
    impactedEdges: string[];
    depthMap: Record<string, number>;
    maxDepth: number;
  } | null;

  // === Sprint 8: 過濾 ===
  filter: {
    directories: string[];    // 空 = 全選
    nodeTypes: NodeType[];    // 空 = 全選
    edgeTypes: EdgeType[];    // 空 = 全選
  };

  // === Sprint 8: 搜尋聚焦 ===
  isSearchFocused: boolean;
  searchFocusNodes: string[];
  searchFocusEdges: string[];

  // === Sprint 8: 右鍵選單 ===
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null;
}
```

### 7.2 新增 Actions（9 個）

```typescript
type ViewAction =
  // ... 既有 actions
  // === Sprint 8 ===
  | { type: 'IMPACT_ANALYZE'; direction: 'forward' | 'reverse'; targetNodeId: string;
      impactedNodes: string[]; impactedEdges: string[]; depthMap: Record<string, number> }
  | { type: 'UPDATE_IMPACT_DEPTH'; maxDepth: number; impactedNodes: string[];
      impactedEdges: string[]; depthMap: Record<string, number> }
  | { type: 'CLEAR_IMPACT' }
  | { type: 'SET_FILTER'; filter: Partial<FilterState> }
  | { type: 'RESET_FILTER' }
  | { type: 'ENTER_SEARCH_FOCUS'; nodeIds: string[]; edgeIds: string[] }
  | { type: 'EXIT_SEARCH_FOCUS' }
  | { type: 'SHOW_CONTEXT_MENU'; x: number; y: number; nodeId: string }
  | { type: 'HIDE_CONTEXT_MENU' };
```

### 7.3 初始值

```typescript
const initialState: ViewState = {
  // ... 既有
  impactAnalysis: null,
  filter: { directories: [], nodeTypes: [], edgeTypes: [] },
  isSearchFocused: false,
  searchFocusNodes: [],
  searchFocusEdges: [],
  contextMenu: null,
};
```

---

## 8. 優先級疊加規則

多個功能可能同時啟用，渲染時的優先級：

```
┌─────────────────────────────────────────────┐
│ 1. Filter（最高）                             │
│    → 決定哪些節點/邊「存在」於畫面上           │
│    → 不存在的直接不渲染                       │
├─────────────────────────────────────────────┤
│ 2. Search Focus                              │
│    → 在過濾結果內，dimmed/highlight           │
│    → 非匹配 opacity 0.1，匹配 opacity 1.0    │
├─────────────────────────────────────────────┤
│ 3. Impact Analysis（overlay）                 │
│    → 在過濾結果內，高亮影響鏈                  │
│    → impactedNodes/edges 用特殊色彩           │
├─────────────────────────────────────────────┤
│ 4. Tracing / Heatmap（既有 Sprint 5）         │
│    → 路徑追蹤 / 熱力圖                       │
└─────────────────────────────────────────────┘
```

**計算 opacity 虛擬碼**：
```typescript
function getNodeOpacity(nodeId: string, state: ViewState): number {
  // Filter 已在 adapter 層處理（不在這裡的節點已被移除）

  // Search focus 層
  if (state.isSearchFocused) {
    if (!state.searchFocusNodes.includes(nodeId)) return 0.1;
  }

  // Impact analysis 層
  if (state.impactAnalysis?.active) {
    if (state.impactAnalysis.impactedNodes.includes(nodeId)) return 1.0;
    return 0.15; // dimmed but slightly visible
  }

  // Tracing 層（Sprint 5）
  if (state.tracingSymbol) {
    if (state.tracingPath.includes(nodeId)) return 1.0;
    return 0.2;
  }

  return 1.0; // 預設完全不透明
}
```

---

## 9. 自然語言搜尋設計（P1）

### 9.1 API 端點

```
POST /api/ai/search-keywords
├── Request:  { query: string, provider?: string }
├── Success:  { keywords: string[], originalQuery: string }
└── Error:    { error: 'ai_not_configured' }
```

### 9.2 Prompt

```
Extract search keywords from the following natural language query about a codebase.
Return only the keywords as a JSON array of strings.

Query: "{userInput}"

Example:
  Query: "處理登入的邏輯"
  Keywords: ["login", "auth", "handleLogin", "signIn", "authenticate"]
```

### 9.3 Fallback

AI 未啟用 → 以空格分割 query 為關鍵字：`query.split(/\s+/)`

### 9.4 前端流程

```
自然語言偵測（含中文/空格/句號）
→ debounce 500ms
→ POST /api/ai/search-keywords
→ keywords 逐一匹配 node.label / node.filePath / aiSummary
→ 合併匹配結果 → ENTER_SEARCH_FOCUS
```

---

## 10. 2D + 3D 適配清單

| 功能 | 2D 實作 | 3D 實作 |
|------|---------|---------|
| 右鍵選單觸發 | `onNodeContextMenu` event | raycaster + Vector3.project |
| 右鍵選單渲染 | DOM overlay (portal) | DOM overlay (portal) — 相同 |
| 影響分析高亮 | node/edge style `opacity` + `stroke`/`border` color | node `material.color` + edge `lineColor` |
| 搜尋聚焦 dim | node/edge style `opacity: 0.1` | `material.opacity: 0.1`, `transparent: true` |
| 過濾 | adapter 層過濾後重建 React Flow nodes/edges | adapter 層過濾後重建 3d-force-graph data |
| ImpactPanel | 右側面板 — 相同 | 右側面板 — 相同 |
| FilterPanel | 左側面板 — 相同 | 左側面板 — 相同 |
| OverviewPanel | modal/面板 — 相同 | modal/面板 — 相同 |

---

## 11. 檔案變更矩陣

### 新增（9 個）

| 檔案 | 層 | 說明 |
|------|-----|------|
| `packages/core/src/ai/overview-builder.ts` | core | 結構提取 + prompt 組裝 |
| `packages/web/src/hooks/useImpactAnalysis.ts` | web | BFS 純函式 + React hook |
| `packages/web/src/components/ContextMenu.tsx` | web | 右鍵選單元件 |
| `packages/web/src/components/ImpactPanel.tsx` | web | 影響分析結果面板 |
| `packages/web/src/components/FilterPanel.tsx` | web | 模組過濾面板 |
| `packages/web/src/components/OverviewPanel.tsx` | web | AI 專案概述面板 |
| `packages/web/src/api/graph.ts` 新增函式 | web | fetchOverview + fetchSearchKeywords |

### 修改（7 個）

| 檔案 | 變更 |
|------|------|
| `ViewStateContext.tsx` | +4 狀態區塊 +9 action +9 reducer case |
| `types/graph.ts` | +3 型別 |
| `SearchBar.tsx` | +search focus dispatch |
| `GraphCanvas.tsx` | +contextMenu + highlight/dim |
| `Graph3DCanvas.tsx` | +raycaster contextMenu + highlight/dim |
| `NodePanel.tsx` | +ImpactPanel 整合 |
| `Toolbar.tsx` | +概述按鈕 + filter toggle |
| `graph-adapter.ts` | +filterNodes/filterEdges |
| `cli/server.ts` | +POST /api/ai/overview (+P1: search-keywords) |
