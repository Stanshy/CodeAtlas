# 開發計畫書: Sprint 11 — 三種故事視角

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-04-01
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint11-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 10 讓畫面「看得清楚」（500 個節點策展至 30~50 個核心節點），Sprint 11 讓使用者「看得懂」。新增三種故事視角取代 Sprint 9 的四種技術視圖模式（全景/依賴/資料流/呼叫鏈），用故事引導使用者理解專案：

- **系統框架**（System Framework）：dagre 分層佈局，Cyan `#00d4ff` 色調，目錄群組卡片 — 2D 專用
- **邏輯運作**（Logic Operation）：力導向佈局，多色霓虹，BFS hover 多跳高亮 — 2D + 3D
- **資料旅程**（Data Journey）：力導向 + 路徑鎖定，Green `#00ff88` 色調，stagger animation 350ms — 2D + 3D

每種視角有獨立的佈局引擎、色調、互動行為，切換時平滑過渡。純 web 層改動，core/cli 不改動。

**一句話驗收**：打開 CodeAtlas → 選「系統框架」→ 分層圖 30 秒看懂架構 → 切「邏輯運作」→ hover 看呼叫鏈 → 切「資料旅程」→ 選入口逐步亮起 → 「5 分鐘看懂了這個專案」。

### 確認的流程

需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **有 G1** — 三種視角涉及全新佈局和互動方式，需設計審核確認圖稿與核准方向一致。
> **G1 阻斷** — 圖稿審核通過前不得開始實作。
> **純 web 層改動** — core/cli 不改動。

---

## 2. 技術方案

### 2.1 視角系統架構

Sprint 11 引入 **Perspective（故事視角）** 概念，完全取代 Sprint 9 的 **ViewMode（技術視圖模式）**。

#### Perspective 型別定義

```typescript
// packages/web/src/types/graph.ts — 新增
export type PerspectiveName = 'system-framework' | 'logic-operation' | 'data-journey';

export interface PerspectivePreset {
  name: PerspectiveName;
  label: string;
  description: string;
  layout: LayoutEngine;          // 佈局引擎
  colorScheme: ColorScheme;      // 色調
  interaction: InteractionMode;   // 互動行為
  supports3D: boolean;            // 是否支援 3D 模式
  filter: {
    nodeTypes: NodeType[];        // 空 = 全選
    edgeTypes: EdgeType[];        // 空 = 全選
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;
  };
}

export type LayoutEngine = 'dagre-hierarchical' | 'force-directed' | 'path-tracing';
export type ColorScheme = 'cyan-monochrome' | 'neon-multicolor' | 'green-monochrome';
export type InteractionMode = 'static-hierarchy' | 'bfs-hover-highlight' | 'stagger-playback';
```

#### 三種故事視角預設

```typescript
// packages/web/src/adapters/perspective-presets.ts — 新增
export const PERSPECTIVE_PRESETS: Record<PerspectiveName, PerspectivePreset> = {
  'system-framework': {
    name: 'system-framework',
    label: '系統框架',
    description: '分層結構一目了然',
    layout: 'dagre-hierarchical',
    colorScheme: 'cyan-monochrome',
    interaction: 'static-hierarchy',
    supports3D: false,               // 2D 專用
    filter: { nodeTypes: [], edgeTypes: ['import', 'export'] },
    display: {
      showHeatmap: false, showEdgeLabels: false,
      showParticles: false, labelDensity: 'all', expandFiles: false,
    },
  },
  'logic-operation': {
    name: 'logic-operation',
    label: '邏輯運作',
    description: '從入口追呼叫鏈',
    layout: 'force-directed',
    colorScheme: 'neon-multicolor',
    interaction: 'bfs-hover-highlight',
    supports3D: true,                // 2D + 3D
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false, showEdgeLabels: true,
      showParticles: true, labelDensity: 'smart', expandFiles: false,
    },
  },
  'data-journey': {
    name: 'data-journey',
    label: '資料旅程',
    description: '逐步追蹤資料路徑',
    layout: 'path-tracing',
    colorScheme: 'green-monochrome',
    interaction: 'stagger-playback',
    supports3D: true,                // 2D + 3D
    filter: { nodeTypes: [], edgeTypes: [] },
    display: {
      showHeatmap: false, showEdgeLabels: true,
      showParticles: true, labelDensity: 'smart', expandFiles: false,
    },
  },
};
```

### 2.2 視圖模式遷移策略

#### 四種視圖 → 三種視角對照

| Sprint 9 ViewMode | 過濾邏輯 | Sprint 11 遷移目標 | 說明 |
|-------------------|---------|-------------------|------|
| **panorama**（全景） | 全選 nodeTypes + edgeTypes | **邏輯運作** | 全景模式的「全部顯示」行為融入邏輯運作，策展已減少節點數 |
| **dependency**（依賴） | import/export edges only | **系統框架** | 依賴結構 + dagre 分層 = 更好的依賴視圖 |
| **dataflow**（資料流） | data-flow + export edges + heatmap | **資料旅程** | 資料流追蹤 + stagger animation = 更好的資料流視圖 |
| **callchain**（呼叫鏈） | call edges + function/class + expandFiles | **邏輯運作** | 呼叫鏈高亮融入邏輯運作的 BFS hover 高亮 |

#### 功能遷移清單（確保零丟失）

| 現有功能 | 所在 ViewMode | 遷移至 | 實作方式 |
|---------|-------------|--------|---------|
| 全節點/邊顯示 | panorama | 邏輯運作 | 邏輯運作 filter 為全選，搭配策展減少節點 |
| import/export 邊聚焦 | dependency | 系統框架 | 系統框架 filter.edgeTypes = ['import', 'export'] |
| data-flow 邊聚焦 + heatmap | dataflow | 資料旅程 | 資料旅程聚焦路徑節點，heatmap 可在顯示偏好開啟 |
| call 邊聚焦 + 檔案展開 | callchain | 邏輯運作 | BFS hover 涵蓋 call edges，檔案展開保留在邏輯運作 |
| SET_VIEW_MODE 清除衝突狀態 | 所有 | SET_PERSPECTIVE | 同邏輯遷移：清除 impact/searchFocus/e2eTracing/filter |
| displayPrefs 同步切換 | 所有 | perspective display | 每個 perspective 有自己的 display 預設 |
| applyViewMode 過濾函式 | graph-adapter | applyPerspective | 替換函式，同邏輯（preset filter → filterNodes/filterEdges） |

#### 程式碼遷移步驟

1. **新增** `PerspectiveName` 型別 + `PERSPECTIVE_PRESETS`
2. **新增** `applyPerspective()` 函式（替代 `applyViewMode()`）
3. **ViewState**: `activeViewMode: ViewModeName` → `activePerspective: PerspectiveName`，預設值 `'logic-operation'`
4. **Action**: `SET_VIEW_MODE` → `SET_PERSPECTIVE`，同清除邏輯
5. **ControlPanel**: 四選一 radio → 三選一視角切換 UI
6. **Toolbar**: `viewModeLabel` → `perspectiveLabel`
7. **GraphCanvas/Graph3DCanvas**: `applyViewMode` → `applyPerspective`
8. **view-modes.ts**: 保留但標記 deprecated（未來移除），邏輯已遷移至 `perspective-presets.ts`
9. **測試**: ViewMode 相關測試重構為 Perspective 測試

### 2.3 佈局引擎框架

#### 佈局路由器

```typescript
// packages/web/src/adapters/layout-router.ts — 新增
import { type LayoutEngine } from '../types/graph';

export interface LayoutInput {
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface LayoutOutput {
  nodes: ReactFlowNode[];  // 帶計算好的 position
  edges: ReactFlowEdge[];
}

export interface LayoutProvider {
  name: LayoutEngine;
  compute(input: LayoutInput): LayoutOutput;
}

// 路由函式
export function computeLayout(
  engine: LayoutEngine,
  input: LayoutInput,
): LayoutOutput {
  const provider = LAYOUT_PROVIDERS[engine];
  if (!provider) {
    // fallback to force-directed
    return LAYOUT_PROVIDERS['force-directed'].compute(input);
  }
  return provider.compute(input);
}

// 註冊表（可擴展）
const LAYOUT_PROVIDERS: Record<LayoutEngine, LayoutProvider> = {
  'dagre-hierarchical': dagreLayoutProvider,
  'force-directed': forceDirectedLayoutProvider,
  'path-tracing': pathTracingLayoutProvider,
};
```

#### 可擴展設計

- `LAYOUT_PROVIDERS` 為 Record 註冊表，未來新增佈局只需 register 一個新 provider
- 每個 LayoutProvider 獨立檔案（`dagre-layout.ts`、`force-directed-layout.ts`、`path-tracing-layout.ts`）
- 統一 `LayoutInput` / `LayoutOutput` 介面

### 2.4 dagre 分層佈局（系統框架）

```typescript
// packages/web/src/adapters/dagre-layout.ts — 新增
import dagre from 'dagre';

export const dagreLayoutProvider: LayoutProvider = {
  name: 'dagre-hierarchical',
  compute(input: LayoutInput): LayoutOutput {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'TB',          // Top-to-Bottom 分層
      nodesep: 60,             // 節點間距
      ranksep: 100,            // 層間距
      marginx: 40,
      marginy: 40,
    });

    // 加入節點（帶寬高）
    for (const node of input.nodes) {
      g.setNode(node.id, { width: 180, height: 50 });
    }

    // 加入邊
    for (const edge of input.edges) {
      g.setEdge(edge.source, edge.target);
    }

    dagre.layout(g);

    // 回寫 position
    const layoutNodes = input.nodes.map(node => {
      const pos = g.node(node.id);
      return { ...node, position: { x: pos.x - 90, y: pos.y - 25 } };
    });

    return { nodes: layoutNodes, edges: input.edges };
  },
};
```

#### 目錄群組卡片

系統框架視角下，directory 節點渲染為「群組卡片」：
- 背景色：`rgba(0, 212, 255, 0.05)`（淡 Cyan）
- 圓角 + 虛線邊框
- 標題顯示目錄名 + 子元素計數（如 `services/ (8)`）
- 子節點自動歸組到父目錄卡片內

#### 回退機制

dagre 佈局失敗（例如非典型結構無法分層）→ 自動回退為力導向佈局 + console.warn。

### 2.5 BFS Hover 多跳高亮（邏輯運作）

```typescript
// packages/web/src/hooks/useBfsHoverHighlight.ts — 新增
export function useBfsHoverHighlight(
  hoveredNodeId: string | null,
  edges: GraphEdge[],
  maxDepth: number = 5,
): { highlightedNodes: Set<string>; highlightedEdges: Set<string> } {
  return useMemo(() => {
    if (!hoveredNodeId) return { highlightedNodes: new Set(), highlightedEdges: new Set() };

    // BFS from hovered node（雙向：forward + backward）
    const visited = new Set<string>([hoveredNodeId]);
    const visitedEdges = new Set<string>();
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: hoveredNodeId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      for (const edge of edges) {
        if (edge.source === nodeId && !visited.has(edge.target)) {
          visited.add(edge.target);
          visitedEdges.add(edge.id);
          queue.push({ nodeId: edge.target, depth: depth + 1 });
        }
        if (edge.target === nodeId && !visited.has(edge.source)) {
          visited.add(edge.source);
          visitedEdges.add(edge.id);
          queue.push({ nodeId: edge.source, depth: depth + 1 });
        }
      }
    }

    return { highlightedNodes: visited, highlightedEdges: visitedEdges };
  }, [hoveredNodeId, edges, maxDepth]);
}
```

**非相關節點淡化**：未在 highlightedNodes 中的節點 opacity 降至 0.15。

### 2.6 Stagger Animation + 邊流動（資料旅程）

```typescript
// packages/web/src/hooks/useStaggerAnimation.ts — 新增
export interface StaggerState {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  visibleNodes: Set<string>;
  visibleEdges: Set<string>;
}

export function useStaggerAnimation(
  path: string[],         // 有序節點 ID 列表
  pathEdges: string[],    // 有序邊 ID 列表
  stepDuration: number = 350,  // 老闆核准 350ms
): StaggerState & { play: () => void; pause: () => void; replay: () => void; } {
  // ...
  // 每 stepDuration 增加 currentStep
  // visibleNodes = path.slice(0, currentStep + 1)
  // visibleEdges = pathEdges.slice(0, currentStep)
  // > 30 節點時加速至 100ms/步
}
```

#### 邊流動動畫

```css
/* stagger-animation.css */
.data-journey-edge {
  stroke-dasharray: 8 4;
  animation: dash-flow 1s linear infinite;
}

@keyframes dash-flow {
  to { stroke-dashoffset: -12; }
}
```

#### E2E 面板同步

資料旅程視角中，E2EPanel 高亮當前 stagger 步驟：
- `currentStep` → 對應面板中的步驟條目
- 步驟條目滾動跟隨
- 新增「重播」按鈕（dispatch replay action）

### 2.7 視角切換 UI + 過渡動畫

取代 ControlPanel 中的四選一 ViewMode radio group：

```typescript
// ControlPanel.tsx 修改
const PERSPECTIVE_OPTIONS: PerspectiveOption[] = [
  {
    id: 'system-framework',
    label: '系統框架',
    description: '分層結構一目了然',
    icon: <LayersIcon size={14} />,
    color: '#00d4ff',  // Cyan
  },
  {
    id: 'logic-operation',
    label: '邏輯運作',
    description: '從入口追呼叫鏈',
    icon: <GitBranchIcon size={14} />,
    color: '#ff00ff',  // Magenta（多色霓虹代表色）
  },
  {
    id: 'data-journey',
    label: '資料旅程',
    description: '逐步追蹤資料路徑',
    icon: <RouteIcon size={14} />,
    color: '#00ff88',  // Green
  },
];
```

#### 切換過渡動畫

使用 Framer Motion `AnimatePresence` + `layoutAnimation`：
- 佈局切換時節點平滑移動到新位置（300ms ease-out）
- 色調切換時 CSS transition（200ms）
- 避免閃爍：先計算新佈局 → 一次性動畫過渡

### 2.8 策展 + 視角整合

#### 三層過濾順序（更新）

```
原始資料 (rawNodes/rawEdges)
  │
  ▼
① applyPerspective(nodes, edges, activePerspective)    ← Sprint 11 替代 applyViewMode
  │  按故事視角過濾（系統框架/邏輯運作/資料旅程）
  ▼
② applyCuration(nodes, edges, pinnedNodeIds)            ← Sprint 10 不變
  │  按角色過濾（隱藏 utility + noise，淡化 infrastructure）
  ▼
③ filterNodes/filterEdges(nodes, filter)                ← Sprint 8 不變
  │  按使用者手動過濾
  ▼
styled output (React Flow nodes/edges)
```

**關鍵原則**：perspective → curation → manual filter，順序不可逆。

#### 策展在三視角中一致

- 策展後的節點集合在三種視角中相同（同一批核心節點）
- 切換視角只改變佈局和色調，不改變策展結果
- 手動釘選節點在切換視角時保持

### 2.9 2D/3D 適配策略

| 視角 | 2D | 3D |
|------|----|----|
| 系統框架 | ✅ dagre 分層佈局 | ❌ 不支援（3D 下自動切回邏輯運作） |
| 邏輯運作 | ✅ 力導向佈局 | ✅ 3d-force-graph 力導向 |
| 資料旅程 | ✅ 力導向 + 路徑鎖定 + stagger | ✅ 3D 路徑高亮 + stagger |

**3D 模式切換規則**：
- 使用者在 3D 模式下選「系統框架」→ 自動提示「系統框架為 2D 專用」→ 自動切換至 2D
- 使用者從 2D「系統框架」切換至 3D → 自動切回「邏輯運作」

### 2.10 3D Bloom 後處理（P1 — S11-8）

```typescript
// Graph3DCanvas.tsx 修改
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';

// 資料旅程視角 + 選中路徑時啟用 Bloom
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.6,   // strength
  0.4,   // radius
  0.85,  // threshold
);
```

### 2.11 Sprint 10 P1 收尾（P1 — S11-9）

延後 2 Sprint 的項目：
- AI 輔助角色分類（core 層，復用 AI Provider）
- AI 設定 UI（ControlPanel AI 區段）
- Onboarding overlay（首次使用引導）

視時間納入，不阻塞 P0 交付。

---

## 3. UI 圖稿

| 頁面/元件 | Mockup 檔案 | 說明 |
|----------|------------|------|
| 三種視角完整效果 | `proposal/references/sprint11/three-perspectives-mockup.html` | 老闆 2026-04-01 核准的互動式圖稿（三分頁切換） |
| 系統框架視角 | Tab 1 | dagre 分層 + 目錄卡片 + Cyan 色調 + 子元素計數 |
| 邏輯運作視角 | Tab 2 | 力導向 + 粒子 + BFS 多跳 hover 高亮 + 非相關淡化 |
| 資料旅程視角 | Tab 3 | stagger 350ms 逐節點亮起 + 邊流動 + E2E 面板 + 重播 |
| 視覺方向定案 | `proposal/references/sprint11/design-direction-approved.md` | 設計總監確認方案 |

### 圖稿驗收標準

- [ ] 三種視角各有獨立圖稿（細化至互動行為）
- [ ] 可在瀏覽器直接開啟預覽（不需 build）
- [ ] 圖稿與核准方向 `three-perspectives-mockup.html` 一致
- [ ] stagger animation 節奏 350ms（老闆核准）
- [ ] 系統框架：dagre 分層結構清晰可見

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 | 任務 |
|------|------|------|
| `.knowledge/sprint11-perspectives-architecture.md` | Sprint 11 架構設計文件 | T1 |
| `packages/web/src/adapters/perspective-presets.ts` | 三種故事視角預設定義 | T3 |
| `packages/web/src/adapters/layout-router.ts` | 佈局引擎路由框架（可擴展） | T4 |
| `packages/web/src/adapters/dagre-layout.ts` | dagre 分層佈局 provider | T5 |
| `packages/web/src/adapters/path-tracing-layout.ts` | 路徑鎖定佈局 provider | T7 |
| `packages/web/src/hooks/useBfsHoverHighlight.ts` | BFS 多跳 hover 高亮 hook | T6 |
| `packages/web/src/hooks/useStaggerAnimation.ts` | Stagger animation hook | T7 |
| `packages/web/src/styles/stagger-animation.css` | 邊流動動畫 CSS | T7 |

### 修改

| 檔案 | 變更內容 | 任務 |
|------|---------|------|
| `packages/web/src/types/graph.ts` | +PerspectiveName, +PerspectivePreset, +LayoutEngine, +ColorScheme, +InteractionMode 型別。ViewModeName 標記 deprecated | T3 |
| `packages/web/src/contexts/ViewStateContext.tsx` | `activeViewMode` → `activePerspective`，`SET_VIEW_MODE` → `SET_PERSPECTIVE`，預設值 `'logic-operation'` | T3 |
| `packages/web/src/adapters/graph-adapter.ts` | +applyPerspective() 替代 applyViewMode()。applyViewMode 保留但標記 deprecated | T4 |
| `packages/web/src/adapters/view-modes.ts` | 標記 deprecated，邏輯遷移至 perspective-presets.ts | T3 |
| `packages/web/src/components/ControlPanel.tsx` | 四選一 ViewMode radio → 三選一 Perspective 切換 UI，新色標 | T3 |
| `packages/web/src/components/Toolbar.tsx` | viewModeLabel → perspectiveLabel，顯示 Perspective 色標 pill | T3 |
| `packages/web/src/components/GraphCanvas.tsx` | applyViewMode → applyPerspective + computeLayout 佈局路由，目錄群組卡片渲染 | T4, T5 |
| `packages/web/src/components/Graph3DCanvas.tsx` | applyViewMode → applyPerspective，3D 模式視角適配（系統框架回退），BFS 高亮 3D 適配，stagger 3D 適配 | T4, T8 |
| `packages/web/src/components/NeonNode.tsx` | Cyan/Green 色調切換，系統框架目錄卡片樣式 | T5 |
| `packages/web/src/components/NeonEdge.tsx` | 邊色調切換，stagger dash animation | T7 |
| `packages/web/src/components/E2EPanel.tsx` | stagger 步驟同步高亮 + 重播按鈕 | T7 |
| `packages/web/src/hooks/useHoverHighlight.ts` | 整合 BFS 多跳高亮（邏輯運作視角） | T6 |
| `packages/web/src/styles/theme.ts` | +Cyan 單色調 + Green 單色調色彩定義 | T5 |
| `.knowledge/specs/feature-spec.md` | v11.0：+F79-F87 Sprint 11 功能規格 | T1 |

### 不改動

| 檔案 | 原因 |
|------|------|
| `packages/core/**` | Sprint 11 純 web 層改動，core 不改 |
| `packages/cli/**` | CLI 不改動 |
| `.knowledge/specs/data-model.md` | 資料模型不變（v4.0） |
| `.knowledge/specs/api-design.md` | API 端點不變（v4.0） |

---

## 5. 規範文件索引

| 規範 | 路徑 | 版本 |
|------|------|------|
| 功能規格 | `.knowledge/specs/feature-spec.md` | v11.0（本 Sprint 更新：+F79-F87） |
| 資料模型 | `.knowledge/specs/data-model.md` | v4.0（不改動） |
| API 設計 | `.knowledge/specs/api-design.md` | v4.0（不改動） |
| 架構設計 | `.knowledge/sprint11-perspectives-architecture.md` | v1.0（新建） |
| Sprint 10 架構 | `.knowledge/sprint10-curation-architecture.md` | v1.0（參考） |
| 已核准視覺方向 | `proposal/references/sprint11/design-direction-approved.md` | — |
| 已核准圖稿 | `proposal/references/sprint11/three-perspectives-mockup.html` | — |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|----|------|------|-----------|------|---------|---------|
| T1 | 架構設計 + 規範文件更新 | Sprint 11 架構文件撰寫（佈局引擎框架、遷移策略、2D/3D 適配）+ feature-spec v11.0 更新（+F79-F87） | tech-lead | — | 設計 | 架構文件完整、遷移策略清晰、feature-spec 已更新 |
| T2 | 三種視角細化圖稿 | 基於已核准方向（three-perspectives-mockup.html），細化三種視角的互動圖稿：系統框架（目錄卡片 + 分層標示）、邏輯運作（BFS 高亮 + 淡化效果）、資料旅程（stagger 350ms 節奏 + 重播按鈕 + E2E 同步） | design-director | T1 | 圖稿 → G1 | 三種視角圖稿完整、與核准方向一致、stagger 350ms 節奏正確 |
| T3 | 視圖模式遷移 + 視角切換 UI | ViewModeName → PerspectiveName 型別替換。ViewState: activeViewMode → activePerspective + SET_PERSPECTIVE action。ControlPanel 四選一 → 三選一 UI。Toolbar viewModeLabel → perspectiveLabel。view-modes.ts deprecated | frontend-developer | T2（G1 通過） | 實作 | 三種視角可切換，舊四種視圖完全取代，SET_PERSPECTIVE 清除衝突狀態，切換動畫平滑 |
| T4 | 佈局引擎框架 + graph-adapter 整合 | layout-router.ts 路由框架（可擴展 LAYOUT_PROVIDERS 註冊表）。graph-adapter applyPerspective() 替代 applyViewMode()。GraphCanvas/Graph3DCanvas 整合佈局路由 | frontend-developer | T3 | 實作 | 佈局路由根據視角選擇引擎，applyPerspective 過濾正確，回退機制可用 |
| T5 | 系統框架視角（dagre 分層） | dagre-layout.ts provider：dagre.layout TB 方向，nodesep 60, ranksep 100。Cyan #00d4ff 色調。目錄群組卡片（目錄名 + 子元素計數）。節點按層次分佈（UI→API→Service→Data）。2D 專用（3D 回退） | frontend-developer | T4 | 實作 | dagre 分層渲染正確，Cyan 色調，目錄卡片顯示計數，層次分明，3D 模式回退為邏輯運作 |
| T6 | 邏輯運作視角（BFS hover 高亮） | useBfsHoverHighlight.ts：BFS 雙向遍歷 maxDepth 5，highlightedNodes/highlightedEdges。非相關節點 opacity 0.15。多色霓虹色調保留。粒子流動保留。2D + 3D 適配 | frontend-developer | T4 | 實作 | hover 節點 → 多跳呼叫鏈全亮，非相關淡化至 0.15，BFS 深度可控，2D+3D 皆可用 |
| T7 | 資料旅程視角（stagger + 邊動畫 + E2E 同步） | useStaggerAnimation.ts：每步 350ms，>30 節點加速至 100ms。Green #00ff88 色調。stroke-dashoffset 邊流動 CSS。E2EPanel 同步高亮 currentStep + 重播按鈕。path-tracing-layout.ts：路徑鎖定佈局。2D + 3D 適配 | frontend-developer | T4 | 實作 | stagger 350ms 逐步亮起，邊流動動畫，E2E 面板同步，重播可用，>30 節點自動加速 |
| T8 | 策展 + 視角整合 + 2D/3D 適配 | 三層過濾驗證：perspective → curation → manual filter。策展節點在三視角一致。手動釘選跨視角保持。影響分析/搜尋聚焦在新視角下正確。3D 模式系統框架回退邏輯。切換 2D/3D 時視角保持（系統框架除外） | frontend-developer | T5, T6, T7 | 實作 | 三層過濾順序正確，策展在三視角一致，影響分析/搜尋聚焦正常，3D 適配無閃爍 |
| T9 | 3D Bloom 後處理（P1） | UnrealBloomPass：資料旅程視角中選中路徑 Bloom 發光效果。strength 0.6, radius 0.4, threshold 0.85 | frontend-developer | T8 | 實作 | 資料旅程 3D 路徑有 Bloom 效果，不影響其他視角 |
| T10 | Sprint 10 P1 收尾（P1） | AI 輔助角色分類（core 層復用 AI Provider） + AI 設定 UI（ControlPanel AI 區段） + Onboarding overlay（首次使用引導）。已延後 2 Sprint | frontend-developer + backend-architect | T8 | 實作 | AI 設定可切換 provider，Onboarding 首次使用顯示，可關閉 |
| T11 | 測試 + 全面回歸 | 視角切換測試（三種視角切換 + 過渡動畫）。佈局引擎測試（dagre / 力導向 / 路徑鎖定）。BFS 高亮測試。stagger 動畫測試。遷移測試（舊 ViewMode → 新 Perspective 功能不丟失）。983+ 回歸測試 | test-writer-fixer | T8 | 測試 | 983+ tests 零回歸 + 新增視角相關測試，pnpm build 全通過 |

### 依賴圖

```
T1（設計，tech-lead）
 ├── T2（圖稿，design-director）
 │    └── [G1 圖稿審核 — 阻斷點]
 │         └── T3（視圖遷移 + 視角 UI，frontend-developer）
 │              └── T4（佈局引擎框架 + graph-adapter，frontend-developer）
 │                   ├── T5（系統框架 dagre，frontend-developer）
 │                   ├── T6（邏輯運作 BFS hover，frontend-developer）
 │                   └── T7（資料旅程 stagger，frontend-developer）
 │                        └── T8（策展整合 + 2D/3D 適配，frontend-developer）
 │                             ├── T9（P1 3D Bloom）
 │                             └── T10（P1 Sprint 10 收尾）
 └── T11（測試 + 回歸）← T8 完成後

T5, T6, T7 可平行（都依賴 T4，彼此獨立）
```

### 執行順序建議

```
Phase 0: 設計（tech-lead）
  T1 架構設計 + 規範文件更新

Phase 1: 圖稿 + G1
  T2 圖稿細化（design-director）→ G1 圖稿審核
  ⛔ G1 通過前不得進入 Phase 2

Phase 2: 框架搭建
  T3 視圖模式遷移 + 視角切換 UI → T4 佈局引擎框架

Phase 3: 三種視角實作（可平行）
  T5（系統框架 dagre）‖ T6（邏輯運作 BFS）‖ T7（資料旅程 stagger）

Phase 4: 整合
  T8 策展整合 + 2D/3D 適配

Phase 5: P1 + 測試
  T9（P1 3D Bloom）+ T10（P1 Sprint 10 收尾）— 視時間
  T11 測試 + 全面回歸

→ /review → G2 → G3
```

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 11 — 三種故事視角開發計畫。

📄 計畫書：proposal/sprint11-dev-plan.md
📋 你負責的任務：T1（第 6 節）
🎨 委派 design-director：T2
🔧 委派 frontend-developer：T3, T4, T5, T6, T7, T8, T9, T10
🧪 委派 test-writer-fixer：T11

⛔ 阻斷規則：G1 圖稿審核通過前不得開始實作（T3+）

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/types/graph.ts` | T3 | 中 — 新增型別 + deprecated 舊型別 |
| `packages/web/src/contexts/ViewStateContext.tsx` | T3, T8 | 高 — activeViewMode → activePerspective 核心重構 |
| `packages/web/src/adapters/graph-adapter.ts` | T4 | 高 — applyViewMode → applyPerspective 替換 |
| `packages/web/src/components/GraphCanvas.tsx` | T4, T5, T6, T7, T8 | 高 — 佈局路由 + 色調切換 + 高亮邏輯 |
| `packages/web/src/components/Graph3DCanvas.tsx` | T4, T6, T7, T8, T9 | 高 — 3D 適配 + Bloom |
| `packages/web/src/components/ControlPanel.tsx` | T3 | 中 — radio group → perspective UI |
| `packages/web/src/components/NeonNode.tsx` | T5, T6 | 中 — 色調切換 + 目錄卡片 |

---

## 7. 測試計畫

### 單元測試

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `PERSPECTIVE_PRESETS` | 三種預設值定義正確，欄位完整 | T11 |
| `applyPerspective()` | 三種視角各自過濾結果正確，回退邏輯可用 | T11 |
| `computeLayout()` | dagre / 力導向 / 路徑鎖定各引擎回傳正確 layout output | T11 |
| dagre-layout provider | dagre.layout 成功，節點位置正確，失敗回退 | T11 |
| `useBfsHoverHighlight` | BFS 多跳正確，深度限制有效，空圖/孤立節點不報錯 | T11 |
| `useStaggerAnimation` | 步進邏輯正確，>30 加速，play/pause/replay 狀態切換 | T11 |
| ViewState reducer `SET_PERSPECTIVE` | 清除衝突狀態（impact/searchFocus/e2eTracing/filter） | T11 |
| Perspective → ViewMode 遷移 | 舊 ViewModeName 功能在新 PerspectiveName 中完整覆蓋 | T11 |

### 整合測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| 三層過濾疊加 | applyPerspective → applyCuration → filterNodes → 結果正確 | T11 |
| 策展 + 三視角一致 | 同一組資料在三種視角下策展結果相同 | T11 |
| 視角切換 + pinnedNodeIds | 切換視角後手動釘選保持 | T11 |
| 2D/3D + 視角交互 | 3D 模式下選系統框架 → 回退邏輯正確 | T11 |
| 影響分析 + 視角 | 影響分析在三視角下正確顯示 | T11 |
| 搜尋聚焦 + 視角 | 搜尋聚焦在三視角下正確 | T11 |

### 回歸測試

- 983+ 既有 tests 零回歸
- `pnpm build` 全通過
- Sprint 1-10 所有功能不受影響
- 2D/3D 切換正常
- 策展 + 手動釘選正常
- 影響分析、E2E 追蹤、搜尋聚焦正常

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| dagre 分層在非典型專案結構下不理想 | 中 | 回退機制：dagre 失敗時自動回退為力導向 + console.warn |
| 視圖模式遷移遺漏功能 | 中 | §2.2 逐一對照遷移清單，確保 4 種 ViewMode 的過濾邏輯 100% 遷移到 3 種 Perspective |
| ViewMode → Perspective 重構影響既有測試 | 中 | Sprint 9 ViewMode 相關測試需重構，983 tests 其他部分保護。T11 同步更新測試 |
| 2D/3D 雙模式適配 | 中 | 系統框架 2D only（明確限制），邏輯運作和資料旅程做 2D+3D。降低複雜度 |
| stagger animation 節點多時太慢 | 低 | >30 節點時加速至 100ms/步 |
| 切換視角時佈局閃爍 | 低 | Framer Motion AnimatePresence + layoutAnimation 平滑過渡 |
| GraphCanvas/Graph3DCanvas 多任務共用衝突 | 中 | T5/T6/T7 可平行但操作不同檔案區段，T8 整合時統一驗證 |
| Sprint 10 教訓：useMemo 重構後變數引用遺漏 | 中 | Review 時重點核對所有 useMemo deps 和消費端變數引用 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [ ] `.knowledge/specs/feature-spec.md` → v11.0（+F79-F87）
- [ ] CLAUDE.md（專案文件索引新增 Sprint 11 相關條目）
- [ ] `.knowledge/sprint11-perspectives-architecture.md`（新建架構文件）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-01 | ✅ 完成 | 架構文件 v1.0 + feature-spec v11.0（+F79-F87） |
| T2 | 2026-04-01 | ✅ 完成 | 細化圖稿 detailed-mockups.md — 三視角完整 CSS/動畫規格 |
| T3 | 2026-04-01 | ✅ 完成 | PerspectiveName 型別 + SET_PERSPECTIVE + ControlPanel 三選一 + Toolbar pill + ViewModeName deprecated |
| T4 | 2026-04-01 | ✅ 完成 | layout-router.ts + applyPerspective() + GraphCanvas/Graph3DCanvas 整合 |
| T5 | 2026-04-01 | ✅ 完成 | dagre-layout.ts（BFS rank）+ Cyan 單色調 + 目錄群組卡片 + rank badge |
| T6 | 2026-04-01 | ✅ 完成 | useBfsHoverHighlight.ts（雙向 BFS maxDepth 5）+ 非相關 opacity 0.15/0.08 |
| T7 | 2026-04-01 | ✅ 完成 | useStaggerAnimation.ts（350ms, >30→100ms）+ stagger-animation.css + E2EPanel 同步+重播 |
| T8 | 2026-04-01 | ✅ 完成 | 三層過濾驗證 + pinnedNodeIds 跨視角 + 3D 系統框架回退 + useMemo deps 核對 |
| T9 | — | ⏸ 延後 | P1，視時間 |
| T10 | — | ⏸ 延後 | P1，視時間 |
| T11 | 2026-04-01 | ✅ 完成 | 7 test files，145 new tests，1128 total（+145），零回歸，build 通過 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 架構文件 + 規範文件完整 |
| 實作 Review（第三輪） | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:2 — 修復: dagre 佈局競態條件、節點太小、curation 測試更新。1092 tests 零回歸。背景網格延至 Sprint 12 |
| 實作 Review（第二輪） | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:4 — 修復: NeonEdge data-journey-edge class、GraphCanvas _activeViewMode 清除、pinnedNodeIds 解構。1128 tests 零回歸 |
| UI 圖稿 Review | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 細化規格完整，與核准方向一致 |
| 實作 Review（第一輪） | 2026-04-01 | 不通過 | Blocker:1 Major:2 Minor:4 — NeonEdge 缺 data-journey CSS class（邊動畫不生效）；GraphCanvas _activeViewMode 未清除；state.pinnedNodeIds 未解構 |
| 測試 Review | 2026-04-01 | 通過 | Blocker:0 Major:0 Minor:0 — 1128 tests 零回歸，7 new test files |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-01 | ✅ 通過 | 老闆確認通過，按已核准圖稿方向開發 |
| G1 | 2026-04-01 | ✅ 通過 | 三種視角圖稿規格完整，Cyan/霓虹/Green 色調正確，stagger 350ms，2D/3D 適配明確 |
| G2 | 2026-04-01 | ✅ 通過 | 第一輪 Review 發現 1 Blocker + 2 Major → 修復 → 第二輪通過 Blocker:0 Major:0 Minor:4。修復項：NeonEdge data-journey CSS class、GraphCanvas deprecated 變數清除、pinnedNodeIds 解構。1128 tests 零回歸 |
| G3 | 2026-04-01 | ✅ 通過 | 1128 tests（+145 新增），7 new test files，零回歸。perspective-presets 47 + layout-router 10 + dagre-layout 14 + graph-adapter-perspective 19 + bfs-hover 16 + stagger 20 + viewstate-perspective 19 |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認
