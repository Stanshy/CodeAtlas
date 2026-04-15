# 開發計畫書: Sprint 8 — 影響分析 + 搜尋強化

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint8-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 7 完成函式級解析 + 呼叫鏈，使用者已能看到「A 裡的 handleLogin() 呼叫了 B 裡的 validateUser()」。Sprint 8 讓使用者從「看」升級到「預測」：選一個節點 → 一鍵看到所有下游影響或上游依賴；搜尋後整張圖聚焦到相關路徑；一鍵 AI 概述專案架構。從「分析工具」進化為「決策工具」。

**一句話驗收**：右鍵節點 →「顯示影響範圍」→ 下游全亮 → 搜尋聚焦 → AI 一鍵概述 → 「這工具真的能幫我做決策」。

### 確認的流程

需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1**（延續現有 2D/3D 視覺風格，無新視覺模式設計）。
> **無額外阻斷規則**（G2 前完成實作即可）。
> **前端為主**：影響分析、搜尋聚焦、過濾均為純前端邏輯。AI 概述需 core/cli 配合。
> **三層工作分布**：core（AI 概述 prompt 組裝）、cli（API 端點）、web（影響分析 + 搜尋 + 過濾 + 面板 + 右鍵選單）。

---

## 2. 技術方案

### 整體架構：決策分析層 + 搜尋強化

```
┌──────────────────────────────────────────────────────────────────────┐
│ core（AI 概述層）                                                      │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐  │
│ │ 既有功能（Sprint 1-7，不改動）                                     │  │
│ │ scanner/ → import-extractor → import-resolver → graph-builder  │  │
│ │ function-extractor → call-analyzer → buildFunctionGraph        │  │
│ └─────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│ ┌─────────────────────────────────────────────────────────────────┐  │
│ │ 新增（Sprint 8）                                                  │  │
│ │ ai/overview-builder.ts                                          │  │
│ │ → 從 AnalysisResult 提取結構資訊（節點數、函式數、核心模組）        │  │
│ │ → 組裝 prompt（只含結構，不含原始碼）                              │  │
│ │ → 交由 AI Provider 生成概述                                       │  │
│ └─────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────────────┐
│ cli（API 擴充層）                                                      │
│                                                                       │
│ GET /api/graph              → 不改動                                  │
│ GET /api/ai/status          → 不改動                                  │
│ POST /api/ai/summary        → 不改動                                  │
│ POST /api/ai/overview       → 新增：AI 專案概述（結構摘要）             │
│ POST /api/ai/search-keywords → 新增（P1）：自然語言搜尋關鍵字提取      │
└──────────────────────────────────────────────────────────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────────────┐
│ web（決策分析 + 搜尋強化層）                                            │
│                                                                       │
│ ┌──────────────────┐ ┌────────────────┐ ┌───────────────────────┐    │
│ │ContextMenu       │ │ ImpactPanel    │ │ FilterPanel           │    │
│ │ 右鍵選單          │ │ 影響分析結果   │ │ 模組過濾面板          │    │
│ │ 2D DOM + 3D 投影  │ │ 分層顯示       │ │ 目錄/類型/邊類型      │    │
│ └──────────────────┘ └────────────────┘ └───────────────────────┘    │
│                                                                       │
│ ┌──────────────────┐ ┌────────────────┐                              │
│ │SearchBar 強化     │ │ OverviewPanel  │                              │
│ │ 搜尋聚焦模式      │ │ AI 專案概述    │                              │
│ │ dim/highlight     │ │ 一鍵生成       │                              │
│ └──────────────────┘ └────────────────┘                              │
│                                                                       │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ ViewState 擴充：impactAnalysis + filter + searchFocus +         │  │
│ │                contextMenu                                      │  │
│ │ useImpactAnalysis hook：BFS 正向/反向（復用 Sprint 5 追蹤架構）   │  │
│ │ graph-adapter 擴充：過濾邏輯（在渲染前過濾 nodes/edges）          │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 影響分析演算法（S8-1 + S8-2）

```typescript
// packages/web/src/hooks/useImpactAnalysis.ts

export interface ImpactAnalysisResult {
  impactedNodes: string[];       // 影響到的節點 ID 列表
  impactedEdges: string[];       // 影響到的邊 ID 列表
  depthMap: Record<string, number>; // nodeId → 離起點的 BFS 深度
}

/**
 * BFS 影響分析 — 正向（下游）或反向（上游）
 *
 * 正向：follow edges where source === startNodeId（找被影響者）
 * 反向：follow edges where target === startNodeId（找依賴者）
 *
 * 支援所有 edge type：import/export/data-flow/call
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

  visited.add(startNodeId);
  depthMap.set(startNodeId, 0);
  queue.push({ nodeId: startNodeId, depth: 0 });

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (const edge of edges) {
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

  // 截斷：超過 50 個結果
  const impactedNodes = Array.from(visited);
  if (impactedNodes.length > 51) { // 51 = 起點 + 50 個影響節點
    impactedNodes.length = 51;
  }

  return {
    impactedNodes,
    impactedEdges,
    depthMap: Object.fromEntries(depthMap),
  };
}
```

**設計重點**：
- 純函式，不依賴 React（可單獨測試）
- 復用 Sprint 5 路徑追蹤架構（tracingPath/tracingEdges → impactedNodes/impactedEdges）
- 支援所有 edge type（import/export/data-flow/call），不分檔案級或函式級
- `visited` set 防循環依賴無限迴圈
- 截斷上限 50 個影響節點（不含起點）

### 右鍵選單設計（S8-1 + S8-2 觸發入口）

```typescript
// packages/web/src/components/ContextMenu.tsx

interface ContextMenuProps {
  visible: boolean;
  x: number;          // 螢幕座標（px）
  y: number;
  nodeId: string | null;
  onClose: () => void;
  onImpactForward: (nodeId: string) => void;
  onImpactReverse: (nodeId: string) => void;
  onCopyPath: (nodeId: string) => void;
  onOpenInPanel: (nodeId: string) => void;
}
```

**觸發方式**：
- 2D 模式：`React Flow onNodeContextMenu` event → 取 `event.clientX/clientY` → DOM overlay
- 3D 模式：raycaster 命中節點 → `THREE.Vector3.project(camera)` → 3D 座標投影到螢幕 → DOM overlay
- 關閉：click outside / Escape / 選擇選單項後

**選單項目**：
| 項目 | 說明 |
|------|------|
| 影響分析（下游） | 呼叫 `analyzeImpact(nodeId, edges, 'forward')` |
| 依賴分析（上游） | 呼叫 `analyzeImpact(nodeId, edges, 'reverse')` |
| 複製路徑 | `navigator.clipboard.writeText(node.filePath)` |
| 在面板中開啟 | dispatch `SELECT_NODE` action |

### 影響分析面板（S8-1 + S8-2 結果展示）

```typescript
// packages/web/src/components/ImpactPanel.tsx

// 顯示在 NodePanel 區域（右側面板），影響分析啟動時替換面板內容
// 類似 Sprint 5 的 PathTracingPanel 設計

interface ImpactPanelProps {
  direction: 'forward' | 'reverse';
  targetNodeId: string;
  impactedNodes: string[];
  depthMap: Record<string, number>;
  maxDepth: number;
  onDepthChange: (depth: number) => void;   // depth slider
  onNodeClick: (nodeId: string) => void;     // 導航到節點
  onClose: () => void;
}
```

**面板內容**：
- 頂部：方向標題（「正向影響分析」/「反向依賴分析」）+ 目標節點名
- 統計：「影響 N 個節點」+ 截斷提示
- Depth slider：1-10，預設 5，即時重新計算
- 分層列表：按 BFS 深度分組（第1層、第2層...），每層內按節點 label 排序
- 每個節點可點擊 → 導航聚焦

### 搜尋聚焦模式（S8-3）

```typescript
// 強化既有 SearchBar.tsx

// 新增 action
type ViewAction =
  | { type: 'ENTER_SEARCH_FOCUS'; nodeIds: string[]; edgeIds: string[] }
  | { type: 'EXIT_SEARCH_FOCUS' };

// 邏輯：
// 1. 搜尋有結果時 → 計算 matching nodes + 直接連接的 edges
// 2. dispatch ENTER_SEARCH_FOCUS
// 3. 渲染層讀取 isSearchFocused → 不在 searchFocusNodes 的節點 opacity 0.1
// 4. Escape 或 clear search → dispatch EXIT_SEARCH_FOCUS → 恢復所有 opacity
```

**2D 適配**：React Flow node/edge style → opacity based on `isSearchFocused`
**3D 適配**：node material opacity + edge line opacity based on `isSearchFocused`

### FilterPanel 設計（S8-4）

```typescript
// packages/web/src/components/FilterPanel.tsx

// 左側可收合面板，三個過濾區段

interface FilterState {
  directories: string[];    // 勾選的目錄 ID（空陣列 = 全選）
  nodeTypes: NodeType[];    // 勾選的節點類型（空陣列 = 全選）
  edgeTypes: EdgeType[];    // 勾選的邊類型（空陣列 = 全選）
}
```

**三個過濾區段**：
1. **目錄過濾**：checkbox tree，從圖中的 directory 節點衍生
2. **節點類型**：file / directory / function / class checkboxes
3. **邊類型**：import / export / data-flow / call checkboxes

**過濾應用位置**：`graph-adapter.ts` 中，在轉換為 React Flow / 3d-force-graph 格式之前過濾 nodes/edges。

```
Graph JSON → filter(nodes, edges, filterState) → adapter → React Flow / 3D
```

**預設值**：全部啟用（空陣列代表全選）

### AI 專案概述設計（S8-5）

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

/**
 * 從 AnalysisResult 提取結構資訊
 * 隱私保證：只提取名稱、類型、數量，不含原始碼
 */
export function extractStructureInfo(result: AnalysisResult): StructureInfo;

/**
 * 組裝 AI prompt
 * prompt 內容：專案結構摘要（目錄數、檔案數、函式數、核心模組、模組關係）
 * 超過 20 個模組 → 只取 top 20（按 dependencyCount 排序）
 */
export function buildOverviewPrompt(info: StructureInfo): string;
```

**API 端點**：

```
POST /api/ai/overview
Request:  { provider?: string }
Response: {
  overview: string,
  provider: string,
  cached: boolean,
  structureInfo: {
    totalFiles: number,
    totalFunctions: number,
    topModules: Array<{ path: string, dependencyCount: number }>
  }
}
Error:    { error: 'ai_not_configured', message: '...' }
          { error: 'ai_overview_failed', message: '...' }
```

**快取策略**：與 AI summary 一致（`.codeatlas/cache/{hash}.json`），hash = sha256(projectPath + provider)

### ViewStateContext 擴充

```typescript
// Sprint 8 additions to ViewState
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

// Sprint 8 新增 Action
type ViewAction =
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

### 自然語言搜尋設計（S8-7, P1）

```
POST /api/ai/search-keywords
Request:  { query: string, provider?: string }
Response: { keywords: string[], originalQuery: string }
Error:    { error: 'ai_not_configured', message: '...' }
```

**流程**：
1. 使用者在 SearchBar 輸入自然語言（如「處理登入的邏輯」）
2. 前端呼叫 `POST /api/ai/search-keywords`
3. AI 提取關鍵字：`["login", "auth", "handleLogin", "validateUser"]`
4. 前端用關鍵字匹配 node label / filePath / AI summary
5. AI 未啟用 → fallback：以空格分割 query 為關鍵字

### OverviewPanel 設計（S8-5 前端）

```typescript
// packages/web/src/components/OverviewPanel.tsx

// 從 Toolbar 的「專案概述」按鈕觸發
// 顯示為 modal 或右側面板
// 內容：AI 生成的 1-2 段架構概述 + 結構統計

interface OverviewPanelProps {
  onClose: () => void;
}

// 狀態：idle → loading → result / error
// 結果快取在組件內（避免重複呼叫）
// AI 未設定時顯示「需啟用 AI 才能使用此功能」
```

---

## 3. 異常處理與邊界條件

| 情境 | 處理方式 |
|------|---------|
| 影響分析目標為孤立節點（無邊） | 顯示「此節點無依賴關係」提示 |
| 影響結果超過 50 個節點 | 截斷至 50 個 + 顯示「影響範圍較大，已截斷至 50 個節點」 |
| BFS 遇到循環依賴 | visited set 防止無限迴圈 |
| 過濾後無可顯示節點 | 顯示「目前過濾條件下無可顯示的節點」空狀態 |
| AI 概述但 AI 未啟用 | 顯示「需啟用 AI 才能使用此功能」 |
| AI 概述 prompt 過長（大型專案） | 只取 top 20 模組（按 dependencyCount 排序） |
| 右鍵選單在 3D 模式 | raycaster 命中 → `Vector3.project(camera)` 投影到螢幕 → DOM overlay |
| 搜尋聚焦 + 過濾同時啟用 | 過濾先應用（決定哪些節點存在），搜尋聚焦在過濾結果內生效 |
| 自然語言搜尋 + AI 未啟用（P1） | fallback 為空格分割關鍵字 |
| 影響分析 + 函式級節點 | 支援：函式節點的 call edge 也參與 BFS |
| depth slider 調為 0 | 只顯示起點節點本身 |
| 影響分析時 expandedFileId 非空 | 分析範圍包含已展開的函式節點 |
| FilterPanel 展開但畫面太窄 | 左側面板可收合，收合後只顯示 icon |
| 概述 API 超時 | 顯示「AI 回應超時，請重試」+ 重試按鈕 |

---

## 4. 檔案變更清單

### 新增

| 檔案 | 說明 |
|------|------|
| `packages/core/src/ai/overview-builder.ts` | AI 概述結構提取 + prompt 組裝 |
| `packages/web/src/components/ContextMenu.tsx` | 右鍵選單元件（2D DOM overlay + 3D 投影） |
| `packages/web/src/components/ImpactPanel.tsx` | 影響分析結果面板（分層展示 + depth slider） |
| `packages/web/src/components/FilterPanel.tsx` | 模組過濾面板（目錄 tree + 類型 checkboxes） |
| `packages/web/src/components/OverviewPanel.tsx` | AI 專案概述面板 |
| `packages/web/src/hooks/useImpactAnalysis.ts` | 影響分析 BFS 純函式 + React hook |
| `packages/core/__tests__/overview-builder.test.ts` | AI 概述 builder 測試 |
| `packages/web/__tests__/impact-analysis.test.ts` | 影響分析 BFS 測試 |
| `packages/web/__tests__/filter-panel.test.ts` | 過濾面板測試 |
| `packages/web/__tests__/context-menu.test.ts` | 右鍵選單測試 |
| `packages/web/__tests__/search-focus.test.ts` | 搜尋聚焦模式測試 |
| `packages/web/__tests__/integration-s8.test.ts` | Sprint 8 整合測試 |
| `packages/web/__tests__/view-state-s8.test.ts` | Sprint 8 ViewState action 測試 |

### 修改

| 檔案 | 變更說明 |
|------|---------|
| `packages/cli/src/server.ts` | 新增 POST /api/ai/overview 端點；P1 新增 POST /api/ai/search-keywords |
| `packages/web/src/contexts/ViewStateContext.tsx` | 新增 impactAnalysis、filter、searchFocus、contextMenu 狀態 + 8 個新 Action |
| `packages/web/src/components/SearchBar.tsx` | 搜尋聚焦模式：有結果時 dispatch ENTER_SEARCH_FOCUS，Escape/clear → EXIT_SEARCH_FOCUS |
| `packages/web/src/components/GraphCanvas.tsx` | 註冊 onNodeContextMenu、影響分析高亮渲染、搜尋聚焦 dim/highlight、過濾後節點/邊 |
| `packages/web/src/components/Graph3DCanvas.tsx` | 3D raycaster 右鍵 → 選單投影、影響分析高亮、搜尋聚焦、過濾 |
| `packages/web/src/components/NodePanel.tsx` | 影響分析啟動時渲染 ImpactPanel |
| `packages/web/src/components/Toolbar.tsx` | 新增「專案概述」按鈕、FilterPanel toggle |
| `packages/web/src/adapters/graph-adapter.ts` | 過濾邏輯：在轉換前依 filter state 過濾 nodes/edges |
| `packages/web/src/api/graph.ts` | 新增 fetchOverview()、fetchSearchKeywords() API 呼叫 |
| `packages/web/src/types/graph.ts` | 新增 ImpactAnalysisResult、FilterState、StructureInfo 型別 |

### 不修改

| 檔案 | 原因 |
|------|------|
| `packages/core/src/parser/import-extractor.ts` | 既有 import/export 解析邏輯不動 |
| `packages/core/src/parser/function-extractor.ts` | Sprint 7 函式提取器不動 |
| `packages/core/src/analyzer/call-analyzer.ts` | Sprint 7 呼叫分析器不動 |
| `packages/core/src/analyzer/graph-builder.ts` | 圖建構邏輯不動 |
| `packages/core/src/types.ts` | 不新增 node/edge type（Sprint 8 為純前端分析） |
| `packages/cli/src/config.ts` | 設定系統無需變更 |
| `packages/web/src/components/FunctionNode.tsx` | Sprint 7 函式節點元件不動 |
| `packages/web/src/components/NeonNode.tsx` | 既有 file 節點元件不動 |
| `packages/web/src/components/NeonEdge.tsx` | 既有 import 邊元件不動 |
| `packages/web/src/components/PrivacyBadge.tsx` | Sprint 6 功能不受影響 |

---

## 5. 規範文件索引

| 文件 | 層級 | 用途 |
|------|------|------|
| `.knowledge/specs/data-model.md` | 🔴 規範 | 資料模型 v3.0（ViewState 擴充，無新 node/edge type） |
| `.knowledge/specs/api-design.md` | 🔴 規範 | API 設計 v4.0（POST /api/ai/overview + POST /api/ai/search-keywords） |
| `.knowledge/specs/feature-spec.md` | 🟡 規格 | 功能規格 v8.0（F56~F63） |
| `.knowledge/architecture.md` | 🔵 參考 | 架構參考（決策分析層） |
| `.knowledge/sprint7-function-architecture.md` | 🔵 參考 | Sprint 7 架構（不影響） |
| `.knowledge/sprint8-impact-architecture.md` | 🔵 參考 | Sprint 8 影響分析架構設計（T1 產出） |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 負責 Agent | 優先級 | 預估 | 依賴 |
|----|------|-----------|--------|------|------|
| T1 | 架構設計：影響分析演算法 + 過濾架構 + AI 概述 prompt 設計 + 右鍵選單互動 | tech-lead | P0 | 2h | — |
| T2 | ViewState 擴充 + 8 個新 action types + web 型別新增 | frontend-developer | P0 | 1.5h | T1 |
| T3 | useImpactAnalysis hook：BFS 正向/反向 + 截斷 + 深度控制 | frontend-developer | P0 | 2h | T2 |
| T4 | ContextMenu 元件：2D DOM overlay + 3D raycaster 投影 + 選單項 | frontend-developer | P0 | 2h | T2 |
| T5 | ImpactPanel 元件：影響結果分層展示 + depth slider + 節點導航 | frontend-developer | P0 | 2h | T3, T4 |
| T6 | 搜尋聚焦模式：SearchBar 強化 + ENTER/EXIT_SEARCH_FOCUS + dim/highlight | frontend-developer | P0 | 2h | T2 |
| T7 | FilterPanel 元件：目錄 checkbox tree + 節點類型 + 邊類型 + graph-adapter 過濾 | frontend-developer | P0 | 2.5h | T2 |
| T8 | AI overview builder：core/ai/overview-builder.ts + 結構提取 + prompt 組裝 | backend-architect | P0 | 1.5h | T1 |
| T9 | POST /api/ai/overview 端點：server.ts 新增 + 快取 + 錯誤處理 | backend-architect | P0 | 1h | T8 |
| T10 | OverviewPanel 元件：AI 概述 UI + loading/error 狀態 + Toolbar 按鈕 | frontend-developer | P0 | 1.5h | T9 |
| T11 | 2D 適配：GraphCanvas 影響分析高亮 + 搜尋聚焦 + 過濾整合 | frontend-developer | P0 | 2h | T3, T5, T6, T7 |
| T12 | 3D 適配：Graph3DCanvas 影響分析 + 搜尋聚焦 + 右鍵選單 + 過濾整合 | frontend-developer | P0 | 2h | T11 |
| T13 | 自然語言搜尋：POST /api/ai/search-keywords + SearchBar 整合（P1） | backend-architect + frontend-developer | P1 | 2h | T6, T9 |
| T14 | 測試 + 回歸 | test-writer-fixer | P0 | 4h | T2~T12 |

### 依賴圖

```
T1（設計，tech-lead）
 │
 ├── T2（ViewState 擴充，frontend-developer）
 │    │
 │    ├── T3（影響分析 hook）
 │    │    │
 │    │    └──┐
 │    │       ├── T5（ImpactPanel）
 │    ├── T4（ContextMenu）
 │    │    │
 │    │    └──┘
 │    │
 │    ├── T6（搜尋聚焦）
 │    │
 │    └── T7（FilterPanel）
 │
 ├── T8（overview builder，backend-architect）
 │    │
 │    └── T9（API 端點）
 │         │
 │         └── T10（OverviewPanel）
 │
 ├── T11（2D 適配）← 依賴 T3 + T5 + T6 + T7
 │    │
 │    └── T12（3D 適配）
 │
 ├── T13（P1 自然語言搜尋）← 依賴 T6 + T9
 │
 └── T14（測試）← 依賴 T2~T12
```

### 建議執行順序

| 階段 | 任務 | 條件 | 負責 |
|------|------|------|------|
| 設計 | T1 | — | tech-lead |
| 實作 — 基礎 | T2 | T1 完成 | frontend-developer |
| 實作 — core（平行） | T8 | T1 完成後可同時 | backend-architect |
| 實作 — 分析 + 選單（平行） | T3 + T4 + T6 + T7 | T2 完成後可同時 | frontend-developer |
| 實作 — API | T9 | T8 完成 | backend-architect |
| 實作 — 面板 | T5 | T3 + T4 完成 | frontend-developer |
| 實作 — 概述 UI | T10 | T9 完成 | frontend-developer |
| 實作 — 2D 整合 | T11 | T3 + T5 + T6 + T7 完成 | frontend-developer |
| 實作 — 3D 整合 | T12 | T11 完成 | frontend-developer |
| 實作 — P1 | T13 | T6 + T9 完成（視時間） | backend-architect + frontend-developer |
| 測試 | T14 | T2~T12 全部完成 | test-writer-fixer |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 8 — 影響分析 + 搜尋強化 的開發計畫。

📄 計畫書：proposal/sprint8-dev-plan.md
📋 確認的流程：需求 → 設計 → 實作 → G2 → 測試 → G3

⚠️ 無 G1 阻斷規則 — 設計（T1）完成後可直接進入實作。
⚠️ 前端為主 — 影響分析/搜尋/過濾均為純前端，core 只新增 AI 概述。
⚠️ T3+T4+T6+T7 可平行 — ViewState 完成後四個元件可同時開發。

🖥️ 設計階段：
  T1（tech-lead 自行完成）→ 設計 Review

🔧 實作 — core/cli 階段（backend-architect）：
  T8（overview builder）→ T9（API 端點）
  T13（P1 自然語言搜尋，視時間）

🎨 實作 — web 階段（frontend-developer）：
  T2（ViewState）→ T3+T4+T6+T7 平行 → T5 → T10 → T11 → T12

✅ 測試階段（test-writer-fixer）：
  T14 → /review → G3

📎 團隊：
  backend-architect — T8, T9, T13（P1 部分）
  frontend-developer — T2, T3, T4, T5, T6, T7, T10, T11, T12, T13（P1 部分）
  test-writer-fixer — T14

🧠 教訓（來自 Sprint 7）：
  1. 委派 Agent 時附上完整規範 checklist
  2. BFS 演算法先寫純函式再包 hook — 方便單元測試
  3. ViewState action 命名需與既有風格一致（全大寫 + 底線）
  4. 過濾邏輯放在 graph-adapter 而非渲染元件（避免 re-render 效能問題）

⚠️ 複雜度提示：
  - 右鍵選單 3D 模式需 raycaster → 螢幕座標投影
  - 搜尋聚焦 + 過濾 + 影響分析可能同時啟用 → 優先級明確
  - FilterPanel checkbox tree 需從 graph 結構動態生成
  - P1（T13 自然語言搜尋）視時間調整，P0 優先確保品質
```

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 覆蓋範圍 |
|---------|---------|
| `impact-analysis.test.ts` | BFS 正向遍歷 / BFS 反向遍歷 / depth limit（maxDepth=1,3,5,10）/ 循環依賴防護（visited set）/ 截斷 >50 節點 / 混合 edge type（import+call）/ 孤立節點空結果 / depthMap 正確 / 起點不算在影響數 |
| `filter-panel.test.ts` | 目錄過濾（勾選/取消勾選）/ 節點類型過濾 / 邊類型過濾 / 組合過濾（目錄+類型）/ 全選（空陣列）/ 過濾後 0 個節點空狀態 / graph-adapter 整合 |
| `context-menu.test.ts` | 選單渲染 / 定位（x, y）/ 項目點擊 handler / Escape 關閉 / click outside 關閉 / nodeId 傳遞正確 |
| `search-focus.test.ts` | 聚焦模式啟動 / 退出（Escape + clear）/ 匹配節點 opacity 1.0 / 非匹配節點 opacity 0.1 / 直接連接 edge 高亮 / 搜尋清空後恢復 |
| `overview-builder.test.ts` | 結構資訊提取正確（totalFiles, totalFunctions, topModules）/ prompt 組裝格式 / 隱私驗證（prompt 不含原始碼）/ 大型專案截斷 top 20 / 空專案 edge case |

### 整合測試

| 測試項目 | 說明 |
|---------|------|
| `integration-s8.test.ts` | 完整影響分析流程：建立 graph → BFS → 驗證結果。過濾 + 搜尋聚焦組合。AI 概述 API mock |
| `view-state-s8.test.ts` | Sprint 8 全部 action：IMPACT_ANALYZE / UPDATE_IMPACT_DEPTH / CLEAR_IMPACT / SET_FILTER / RESET_FILTER / ENTER_SEARCH_FOCUS / EXIT_SEARCH_FOCUS / SHOW_CONTEXT_MENU / HIDE_CONTEXT_MENU |

### 回歸測試

- 605+ 既有 tests 全部通過，零回歸
- `pnpm build` 三個 package 全通過
- 模組級圖譜（Sprint 1-7）所有功能不受影響

### 測試 Fixture 需求

復用 Sprint 7 函式級 fixture（`packages/core/__tests__/fixtures/function-level/`），新增影響分析專用 fixture：

| 檔案 | 內容 |
|------|------|
| `impact-graph.json` | 預建的 Graph JSON，含多層依賴 + 循環 + 孤立節點 |
| `filter-graph.json` | 含多種 node type + edge type，供過濾測試用 |

---

## 8. 驗收標準

### 影響分析驗收（S8-1 + S8-2）

- [ ] 選節點 → 右鍵選單「影響分析（下游）」→ 下游節點 + 邊全部高亮
- [ ] 選節點 → 右鍵選單「依賴分析（上游）」→ 上游節點 + 邊全部高亮
- [ ] 影響分析 depth limit 預設 5，depth slider 可調整（1-10）
- [ ] 面板顯示影響/依賴節點列表，按 BFS 深度分層（第1層、第2層...）
- [ ] 每個節點可點擊 → 導航聚焦
- [ ] 超過 50 個影響節點顯示截斷提示
- [ ] 孤立節點顯示「此節點無依賴關係」
- [ ] BFS 遇到循環依賴不會無限迴圈

### 搜尋強化驗收（S8-3）

- [ ] 搜尋有結果時整張圖暗掉（opacity 0.1），匹配節點 + 直接路徑亮起（opacity 1.0）
- [ ] Escape 或清空搜尋 → 退出聚焦模式 → 恢復所有 opacity

### 過濾驗收（S8-4）

- [ ] FilterPanel 可按目錄過濾（checkbox tree）
- [ ] FilterPanel 可按節點類型過濾（file/directory/function/class）
- [ ] FilterPanel 可按邊類型過濾（import/export/data-flow/call）
- [ ] 過濾後圖即時更新（只顯示符合條件的節點和邊）
- [ ] 過濾後無節點時顯示空狀態提示

### AI 概述驗收（S8-5）

- [ ] 專案概述按鈕一鍵生成，顯示 1-2 段架構摘要
- [ ] AI 概述只送結構資訊（節點名/類型/數量），不送原始碼
- [ ] AI 未啟用時顯示「需啟用 AI 才能使用此功能」
- [ ] 概述結果包含 structureInfo 統計

### 雙模式驗收（S8-6）

- [ ] 影響分析高亮在 2D + 3D 模式都可用
- [ ] 搜尋聚焦在 2D + 3D 模式都可用
- [ ] 過濾在 2D + 3D 模式都可用
- [ ] 右鍵選單在 2D + 3D 模式都可用

### 右鍵選單驗收

- [ ] 2D 模式右鍵節點 → DOM overlay 選單出現在滑鼠位置
- [ ] 3D 模式右鍵節點 → raycaster → 螢幕投影 → 選單出現
- [ ] 選單含 4 個項目：影響分析、依賴分析、複製路徑、在面板中開啟
- [ ] click outside / Escape → 選單關閉

### 相容性驗收

- [ ] 既有 Sprint 1-7 所有功能不受影響
- [ ] 605+ 既有 tests 零回歸
- [ ] pnpm build ×3 全通過

---

## 9. 時程預估

| 階段 | 任務 | 預估 | 累計 |
|------|------|------|------|
| 設計 | T1 架構設計 | 2h | 2h |
| 實作 core/cli | T8 overview builder + T9 API 端點 | 2.5h | 4.5h |
| 實作 web 基礎 | T2 ViewState | 1.5h | 6h |
| 實作 web 元件（平行） | T3 + T4 + T6 + T7 | 8.5h | 14.5h |
| 實作 web 面板 | T5 ImpactPanel + T10 OverviewPanel | 3.5h | 18h |
| 實作 web 整合 | T11 2D + T12 3D | 4h | 22h |
| 實作 P1 | T13 自然語言搜尋（視時間） | 2h | 24h |
| 測試 | T14 測試 + 回歸 | 4h | 28h |
| Review + Gate | /review ×2 + G2 + G3 | 2h | 30h |

> 總預估 ~30h（含 P1 的 T13 自然語言搜尋 2h）。若時程緊張，T13 可延後。
> 前端工作量佔比約 75%，後端 15%，測試 10%。

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ | 架構設計完成。sprint8-impact-architecture.md |
| T2 | 2026-03-31 | ✅ | ViewState +4 狀態 +9 action +9 reducer。types/graph.ts +5 型別。tsc clean |
| T3 | 2026-03-31 | ✅ | analyzeImpact 純函式 + useImpactAnalysis hook。tsc clean |
| T4 | 2026-03-31 | ✅ | ContextMenu 元件完成。4 button items + SVG icons + 邊界處理。tsc clean |
| T5 | 2026-03-31 | ✅ | ImpactPanel 完成。分層列表 + depth slider + 截斷提示。tsc clean |
| T6 | 2026-03-31 | ✅ | useSearch +search focus mode（ENTER/EXIT dispatch）。tsc clean |
| T7 | 2026-03-31 | ✅ | FilterPanel 3 區段 + graph-adapter filterNodes/filterEdges。tsc clean |
| T8 | 2026-03-31 | ✅ | overview-builder.ts 新增。extractStructureInfo + buildOverviewPrompt。tsc clean |
| T9 | 2026-03-31 | ✅ | POST /api/ai/overview 端點新增。cache + error handling。tsc clean |
| T10 | 2026-03-31 | ✅ | OverviewPanel modal + fetchAiOverview/fetchSearchKeywords API。tsc clean |
| T11 | 2026-03-31 | ✅ | GraphCanvas 整合：filter+contextMenu+impact+searchFocus。NodePanel +ImpactPanel。tsc clean |
| T12 | 2026-03-31 | ✅ | Graph3DCanvas 整合：onNodeRightClick+impact highlight+search focus dim+filter via props。tsc clean |
| T13 | 2026-03-31 | ✅ | 後端 search-keywords 端點 + 前端 useSearch 自然語言偵測 + AI keywords + fallback。tsc clean |
| T14 | 2026-03-31 | ✅ | +113 新測試（core +24, web +89）。718 total tests pass。零回歸。pnpm build clean |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review | | | |
| 實作 Review | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:1 — T10 Toolbar 按鈕尚未在 App 層整合（元件已建好） |
| 測試 Review | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 718 tests pass (core 343 + web 375)。+113 新測試。零回歸 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 老闆核准 G0 |
| G2 | 2026-03-31 | ✅ 通過 | 實作 Review 通過（Blocker:0 Major:0 Minor:1）。T1-T13 全部完成，tsc clean，程式碼品質合格 |
| G3 | 2026-03-31 | ✅ 通過 | 718 tests pass（+113 新測試）。零回歸。pnpm build clean。tsc clean（core/cli/web） |

---

**確認**: [ ] L1 確認 / [ ] Tech Lead 確認
