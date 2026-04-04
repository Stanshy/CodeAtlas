# 開發計畫書: Sprint 9 — 控制面板 + 視圖模式 + 端到端追蹤

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint9-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 8 完成影響分析 + 搜尋強化 + 過濾面板，功能齊全但入口分散：右鍵選單觸發影響分析、Ctrl+K 搜尋、FilterPanel 左側收合、HeatmapToggle 右下角、ViewToggle 獨立按鈕。Sprint 9 把 8 個 Sprint 累積的功能統一在一個控制面板中，新增四種視圖模式一鍵切換，以及端到端資料流追蹤 — 選一個入口節點，整條資料路線從 input 到 output 全部發亮。從「功能堆疊」進化為「一目了然」。

**一句話驗收**：打開控制面板 → 切換「資料流視圖」→ 選一個入口函式 → 端到端路線全部發亮 → 「一看就懂資料怎麼流的」。

### 確認的流程

需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **需要 G1** — 控制面板和視圖模式是全新 UI 模式，需老闆確認佈局和操作方式。
> **G1 阻斷**：控制面板 + 視圖切換 UI 圖稿審核通過前不得開始實作。
> **純前端 Sprint**：不改 core/cli（除 P1 AI 設定可能需 1 個新端點）。
> **復用架構**：ViewStateContext 擴充模式（第 5 次）、Sprint 8 FilterPanel 過濾架構、Sprint 5 BFS 追蹤。

---

## 2. 技術方案

### 整體架構：控制面板整合層

```
┌──────────────────────────────────────────────────────────────────────┐
│ core / cli（不改動）                                                  │
│ ※ P1 S9-7 可能新增 POST /api/settings — 暫時保留評估                  │
└──────────────────────────────────────────────────────────────────────┘
         │
┌────────┴─────────────────────────────────────────────────────────────┐
│ web（控制面板整合層）                                                  │
│                                                                       │
│ ┌────────────────────────────────────────────────────────────────┐   │
│ │                    Toolbar（重構）                               │   │
│ │ 左: ControlPanel toggle  中: SearchBar  右: ViewMode + 2D/3D   │   │
│ └────────────────────────────────────────────────────────────────┘   │
│                                                                       │
│ ┌─────────────────────┐  ┌──────────────────────────────────────┐   │
│ │ ControlPanel（新）    │  │ GraphCanvas / Graph3DCanvas          │   │
│ │                      │  │                                      │   │
│ │ § 視圖模式            │  │ ViewMode preset → filter + display   │   │
│ │   全景/依賴/資料流/   │  │ 端到端追蹤 → glow path               │   │
│ │   呼叫鏈 radio group  │  │ 顯示偏好 → heatmap/label/particle   │   │
│ │                      │  │                                      │   │
│ │ § 顯示偏好            │  └──────────────────────────────────────┘   │
│ │   Heatmap toggle      │                                             │
│ │   邊標籤 toggle       │  ┌──────────────────────────────────────┐   │
│ │   粒子動畫 toggle     │  │ NodePanel / TracingPanel / E2EPanel   │   │
│ │   標籤密度 slider     │  │ （右側面板，互斥）                      │   │
│ │                      │  └──────────────────────────────────────┘   │
│ │ § 分析工具            │                                             │
│ │   端到端追蹤 trigger  │                                             │
│ │                      │                                             │
│ │ § 過濾器              │                                             │
│ │   嵌入 FilterPanel    │                                             │
│ │                      │                                             │
│ │ § AI 功能（P1）       │                                             │
│ │   AI 概述 / 設定      │                                             │
│ └─────────────────────┘                                              │
│                                                                       │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ ViewState 擴充（第 5 次）                                         │  │
│ │ +activeViewMode: 'panorama'|'dependency'|'dataflow'|'callchain'  │  │
│ │ +isControlPanelOpen: boolean                                     │  │
│ │ +displayPrefs: { showEdgeLabels, showParticles, labelDensity }   │  │
│ │ +e2eTracing: { active, startNodeId, path, edges, steps }         │  │
│ │ +7 new actions                                                   │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌──────────────────────────────────────────────────────────────────┐  │
│ │ graph-adapter 擴充                                                │  │
│ │ +applyViewMode(nodes, edges, mode) → filtered + styled           │  │
│ │ 復用 filterNodes/filterEdges（Sprint 8）                          │  │
│ └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### S9-1 控制面板（ControlPanel）

**設計要點**：

```
┌──────────────────────┐
│ ≡ CodeAtlas          X│  ← header: logo + 收合按鈕
├──────────────────────┤
│ ▼ 視圖模式            │  ← 區段 1: 預設展開
│  ○ 全景  ○ 依賴       │
│  ○ 資料流 ○ 呼叫鏈    │
├──────────────────────┤
│ ▶ 顯示偏好            │  ← 區段 2: 預設收合
│  □ Heatmap            │
│  □ 邊 Symbol 標籤     │
│  □ 粒子流動動畫       │
│  標籤密度: ▰▰▰▱▱     │
├──────────────────────┤
│ ▶ 分析工具            │  ← 區段 3: 預設收合
│  🔗 端到端追蹤         │
│  📊 AI 專案概述        │
├──────────────────────┤
│ ▶ 過濾器              │  ← 區段 4: 嵌入 FilterPanel 內容
│  目錄 / 節點 / 邊類型  │
├──────────────────────┤
│ ▶ AI 設定（P1）       │  ← 區段 5: P1
│  Provider / 隱私模式   │
└──────────────────────┘
```

- 寬度：280px（展開）/ 44px（收合，只有 icon 列）
- 位置：左側 fixed，top: 0，height: 100vh
- 區段預設展開/收合透過 state 管理
- 收合後用 icon 快捷列（視圖/顯示/分析/過濾/AI 各 1 icon）
- z-index: 35（高於 FilterPanel 的 30，低於搜尋的 40-45）
- ControlPanel 取代現有 FilterPanel 的獨立左側欄位，FilterPanel 內容嵌入控制面板「過濾器」區段

### S9-2 視圖模式切換

四種預設視圖，本質是「filter + display 組合」：

```typescript
// packages/web/src/adapters/view-modes.ts

export type ViewModeName = 'panorama' | 'dependency' | 'dataflow' | 'callchain';

export interface ViewModePreset {
  name: ViewModeName;
  label: string;
  description: string;
  filter: {
    nodeTypes: NodeType[];   // 空 = 全選
    edgeTypes: EdgeType[];   // 空 = 全選
  };
  display: {
    showHeatmap: boolean;
    showEdgeLabels: boolean;
    showParticles: boolean;
    labelDensity: 'all' | 'smart' | 'none';
    expandFiles: boolean;     // 是否自動展開檔案顯示函式
  };
}

export const VIEW_MODE_PRESETS: Record<ViewModeName, ViewModePreset> = {
  panorama: {
    name: 'panorama',
    label: '全景模式',
    description: '所有節點 + 所有邊，預設佈局',
    filter: { nodeTypes: [], edgeTypes: [] },  // 全選
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  dependency: {
    name: 'dependency',
    label: '依賴視圖',
    description: '聚焦 import/export 邊，dim 其他',
    filter: { nodeTypes: [], edgeTypes: ['import', 'export'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: false,
      showParticles: true,
      labelDensity: 'smart',
      expandFiles: false,
    },
  },
  dataflow: {
    name: 'dataflow',
    label: '資料流視圖',
    description: '聚焦 data-flow + export 邊 + symbol 標籤 + heatmap',
    filter: { nodeTypes: [], edgeTypes: ['data-flow', 'export'] },
    display: {
      showHeatmap: true,
      showEdgeLabels: true,
      showParticles: true,
      labelDensity: 'all',
      expandFiles: false,
    },
  },
  callchain: {
    name: 'callchain',
    label: '呼叫鏈視圖',
    description: '聚焦 call 邊 + 函式節點，自動展開檔案',
    filter: { nodeTypes: ['function', 'class', 'file'], edgeTypes: ['call'] },
    display: {
      showHeatmap: false,
      showEdgeLabels: true,
      showParticles: false,
      labelDensity: 'all',
      expandFiles: true,
    },
  },
};
```

**切換邏輯**：
1. 使用者選擇視圖 → dispatch `SET_VIEW_MODE`
2. Reducer 更新 `activeViewMode`，同時清除衝突狀態：
   - 清除 impactAnalysis（CLEAR_IMPACT）
   - 清除 searchFocus（EXIT_SEARCH_FOCUS）
   - 清除 e2eTracing（CLEAR_E2E_TRACING）
   - 重置手動 filter（RESET_FILTER）
3. graph-adapter 的 `applyViewMode()` 根據 preset 的 filter 過濾 nodes/edges
4. 渲染層根據 preset 的 display 控制 heatmap/label/particle
5. 手動 filter 疊加在視圖預設之上（使用者可微調）

### S9-3 端到端資料流追蹤

**演算法設計**（復用 Sprint 5 BFS + Sprint 8 analyzeImpact 架構）：

```typescript
// packages/web/src/hooks/useE2ETracing.ts

export interface E2EStep {
  nodeId: string;
  nodeLabel: string;
  edgeId: string | null;     // 進入此節點的邊 ID（起點為 null）
  edgeType: string | null;   // import / call / export / data-flow
  symbols: string[];          // 此步驟傳遞的 symbol 名稱
  depth: number;              // BFS 深度
}

export interface E2ETracingResult {
  path: string[];         // node ID 有序列表
  edges: string[];        // edge ID 有序列表
  steps: E2EStep[];       // 每步資訊（用於面板顯示）
  truncated: boolean;
}

/**
 * 端到端追蹤 — 混合 edge type BFS
 *
 * 從 startNodeId 出發，沿 all edge types（import → call → export → data-flow）
 * BFS 遍歷，直到沒有更多節點可達或達到 maxDepth。
 *
 * 與 analyzeImpact 的差異：
 * 1. analyzeImpact 只看 forward/reverse，e2eTracing 看 forward only
 * 2. e2eTracing 記錄每步的 symbol + edgeType（面板需要顯示）
 * 3. e2eTracing 截斷閾值 30（路徑更短，面板可讀性）
 * 4. e2eTracing 保留 BFS 路徑順序（不只是 set）
 */
export function traceE2E(
  startNodeId: string,
  edges: GraphEdge[],
  maxDepth: number = 10,
): E2ETracingResult { ... }
```

**ViewState 整合**：
```typescript
// ViewState 新增
e2eTracing: {
  active: boolean;
  startNodeId: string | null;
  path: string[];
  edges: string[];
  steps: E2EStep[];
  maxDepth: number;
  truncated: boolean;
} | null;

// 新 actions
| { type: 'START_E2E_TRACING'; startNodeId: string; path: string[];
    edges: string[]; steps: E2EStep[]; truncated: boolean }
| { type: 'UPDATE_E2E_DEPTH'; maxDepth: number; path: string[];
    edges: string[]; steps: E2EStep[]; truncated: boolean }
| { type: 'CLEAR_E2E_TRACING' }
```

**觸發方式**：
1. 控制面板「分析工具 → 端到端追蹤」→ 進入選取模式 → 點擊節點啟動
2. 右鍵選單新增「端到端追蹤」選項

**渲染**：
- 2D：path 上的 nodes/edges glow color（tracingTheme），其他 dim
- 3D：path 上的 node material intensity + edge color alpha
- 復用 Sprint 5 tracing highlight 架構（已在 GraphCanvas + Graph3DCanvas 中實作）

### S9-4 顯示偏好 Toggle

**ViewState 擴充**：
```typescript
displayPrefs: {
  showEdgeLabels: boolean;   // 邊 symbol 標籤（預設 false）
  showParticles: boolean;    // 粒子流動動畫（預設 true）
  labelDensity: 'all' | 'smart' | 'none';  // 節點標籤密度
  impactDefaultDepth: number; // 影響分析預設 depth（預設 5）
};
```

**注意**：`isHeatmapEnabled` 已在 Sprint 5 中加入 ViewState，直接復用。

**label 密度邏輯**（`smart` 模式）：
- zoom > 0.8 → 顯示所有 label
- zoom 0.4-0.8 → 只顯示 dependencyCount > median 的節點 label
- zoom < 0.4 → 只顯示 directory label

### S9-5 Toolbar 整合修復

**現狀問題**：
- `App.tsx` 中 `ViewToggle`、`CameraPresets`、`HeatmapToggle` 各自浮動定位
- FilterPanel 和 OverviewPanel Toolbar 按鈕未連接（Sprint 8 Minor 遺留）
- 缺乏統一的 Toolbar 容器

**方案**：
```
┌──────────────────────────────────────────────────────────────┐
│ ☰ │                 🔍 Search (Ctrl+K)              │ 📊 🗺 │
│   │                                                  │ 2D/3D │
└──────────────────────────────────────────────────────────────┘
 左區                     中區                          右區
 ControlPanel             SearchBar                     ViewMode 指示器
 toggle                                                 + 2D/3D toggle
```

- 新元件 `Toolbar.tsx`：fixed top，三區段 flex 佈局
- 左區：ControlPanel toggle 按鈕（☰ icon）
- 中區：SearchBar trigger（點擊展開 modal）
- 右區：當前 ViewMode 指示器 badge + 2D/3D toggle + OverviewPanel trigger
- 移除 App.tsx 中散落的 `ViewToggle`、`HeatmapToggle`（整合進 ControlPanel/Toolbar）
- CameraPresets 保留在右下角（3D 專屬，不放入 Toolbar）

### S9-6 2D + 3D 雙模式適配

- 控制面板：DOM overlay，與 2D/3D 無關（已是 fixed position）
- 視圖模式：filter 在 graph-adapter 層處理（2D/3D 共用），display 各自適配
- 端到端追蹤：復用 tracing highlight 架構
  - 2D：GraphCanvas `styledNodes` / `styledEdges` 增加 e2eTracing 分支
  - 3D：Graph3DCanvas useEffect 增加 e2eTracing 分支
- 顯示偏好：
  - `showEdgeLabels`：2D = NeonEdge label 顯示控制；3D = edgeLabelSprite 建立控制
  - `showParticles`：2D = CSS animation toggle；3D = linkDirectionalParticles(0) toggle
  - `labelDensity`：2D = NeonNode label opacity；3D = label sprite visibility

---

## 3. 異常處理

| 場景 | 處理 |
|------|------|
| 端到端追蹤找不到路徑 | E2EPanel 顯示「從此節點出發無可追蹤的資料流路徑」 |
| 端到端追蹤路徑過長 | 超過 30 節點截斷 + 黃色提示 |
| 端到端追蹤遇到循環 | visited set 防無限迴圈，循環節點標記 |
| 視圖模式切換期間互動 | 切換時先清除所有分析狀態，避免混合 |
| 控制面板 + NodePanel 同時展開 | 控制面板左側、NodePanel 右側，不衝突 |
| 控制面板擋住圖的操作 | 收合為 44px icon 列 |
| 顯示偏好切換時效能 | toggle 走 ViewState dispatch，渲染層 useEffect 響應 |
| label 密度 smart 模式計算量 | useMemo 快取 median，只在 nodes 變化時重算 |
| 呼叫鏈視圖自動展開檔案 | 僅展開包含 function/class 的檔案，非全部 |

---

## 4. 檔案變更清單

### 新增檔案

| 檔案 | 說明 | 任務 |
|------|------|------|
| `.knowledge/sprint9-controlpanel-architecture.md` | 架構設計文件 | T1 |
| `packages/web/src/components/ControlPanel.tsx` | 控制面板元件 | T5 |
| `packages/web/src/components/ControlPanelSection.tsx` | 可收合區段子元件 | T5 |
| `packages/web/src/adapters/view-modes.ts` | 視圖模式預設定義 | T6 |
| `packages/web/src/hooks/useE2ETracing.ts` | 端到端追蹤 hook + 純函式 | T7 |
| `packages/web/src/components/E2EPanel.tsx` | 端到端追蹤結果面板 | T8 |
| `packages/web/src/components/Toolbar.tsx` | 統一 Toolbar 元件 | T9 |
| `packages/web/src/components/DisplayPrefsSection.tsx` | 顯示偏好控制元件 | T10 |
| `mockups/sprint9-controlpanel-mockup.html` | 控制面板 HTML 圖稿 | T2 |
| `mockups/sprint9-toolbar-mockup.html` | Toolbar HTML 圖稿 | T2 |

### 修改檔案

| 檔案 | 修改 | 任務 |
|------|------|------|
| `packages/web/src/contexts/ViewStateContext.tsx` | +activeViewMode, +isControlPanelOpen, +displayPrefs, +e2eTracing, +7 actions, +7 reducer | T3 |
| `packages/web/src/types/graph.ts` | +ViewModeName, +E2EStep, +E2ETracingResult, +DisplayPrefs | T3 |
| `packages/web/src/adapters/graph-adapter.ts` | +applyViewMode() 視圖過濾函式 | T6 |
| `packages/web/src/components/GraphCanvas.tsx` | +e2eTracing highlight, +displayPrefs 響應, +viewMode 過濾整合 | T11 |
| `packages/web/src/components/Graph3DCanvas.tsx` | +e2eTracing highlight, +displayPrefs 響應 | T12 |
| `packages/web/src/components/ContextMenu.tsx` | +「端到端追蹤」選項 | T8 |
| `packages/web/src/components/NeonEdge.tsx` | +showEdgeLabels 控制 | T10 |
| `packages/web/src/App.tsx` | 整合 Toolbar + ControlPanel + E2EPanel，移除散落元件 | T9 |
| `packages/web/src/components/FilterPanel.tsx` | 改為可嵌入模式（嵌入 ControlPanel 區段） | T5 |
| `.knowledge/specs/feature-spec.md` | v9.0 更新 | T1 |

### 不改動

| 檔案 | 原因 |
|------|------|
| `packages/core/**` | 純前端 Sprint |
| `packages/cli/**` | 純前端 Sprint（P1 S9-7 除外） |

---

## 5. 規範文件索引

| 規範 | 路徑 | 版本 |
|------|------|------|
| 功能規格 | `.knowledge/specs/feature-spec.md` | v9.0（本 Sprint 更新） |
| 資料模型 | `.knowledge/specs/data-model.md` | v3.0（不改動） |
| API 設計 | `.knowledge/specs/api-design.md` | v4.0（不改動，除 P1） |
| 架構設計 | `.knowledge/sprint9-controlpanel-architecture.md` | v1.0（新建） |
| Sprint 8 架構 | `.knowledge/sprint8-impact-architecture.md` | v1.0（參考） |

---

## 6. 任務拆解

### 任務清單

| ID | 任務 | 指派 | 優先級 | 預估 | 依賴 |
|----|------|------|--------|------|------|
| T1 | 架構設計：控制面板 + 視圖模式 + 端到端追蹤 + Toolbar | tech-lead | P0 | 2h | — |
| T2 | UI 圖稿：控制面板 + Toolbar + 視圖模式 HTML mockup | design-director | P0 | 3h | T1 |
| T3 | ViewState 擴充 + 型別定義（第 5 次） | frontend-developer | P0 | 1.5h | T1 |
| T4 | **G1 審核**（圖稿） | 老闆 | — | — | T2 |
| T5 | ControlPanel 元件 + 可收合區段 + FilterPanel 嵌入 | frontend-developer | P0 | 3h | T3,T4 |
| T6 | 視圖模式預設定義 + applyViewMode + 切換邏輯 | frontend-developer | P0 | 2.5h | T3,T4 |
| T7 | 端到端追蹤 hook + traceE2E 純函式 | frontend-developer | P0 | 2h | T3,T4 |
| T8 | E2EPanel 元件 + ContextMenu 新增選項 | frontend-developer | P0 | 2h | T7 |
| T9 | Toolbar 統一元件 + App.tsx 整合 + 舊元件遷移 | frontend-developer | P0 | 2.5h | T5,T6,T8 |
| T10 | 顯示偏好 toggle + NeonEdge label 控制 + 標籤密度 | frontend-developer | P0 | 2h | T5,T3 |
| T11 | 2D 適配：GraphCanvas 視圖模式 + e2eTracing + displayPrefs | frontend-developer | P0 | 2.5h | T6,T7,T10 |
| T12 | 3D 適配：Graph3DCanvas 視圖模式 + e2eTracing + displayPrefs | frontend-developer | P0 | 2.5h | T11 |
| T13 | AI 設定 UI + Onboarding overlay（P1） | frontend-developer | P1 | 3h | T5,T9 |
| T14 | 測試 + 回歸 | test-writer-fixer | P0 | 4h | T11,T12 |

### 依賴圖

```
T1（設計）
 ├── T2（圖稿）→ T4（G1 審核）─────────────┐
 └── T3（ViewState + 型別）                  │
      │                                      │
      │    ┌─── G1 通過後可開始 ──────────────┘
      │    │
      ├────┼── T5（ControlPanel）─────┐
      ├────┼── T6（視圖模式）─────────┤
      └────┼── T7（端到端追蹤 hook）  │
           │    └── T8（E2EPanel）───┤
           │                         │
           ├── T10（顯示偏好）───────┤
           │                         │
           └── T9（Toolbar + App）───┤
                                     │
                    T11（2D 適配）────┤
                     └── T12（3D 適配）
                          └── T14（測試）

T13（P1，視時間，依賴 T5+T9）
```

### 執行順序建議

```
Phase 0: 設計 + 圖稿
  T1（設計，tech-lead）→ T2（圖稿，frontend-developer）+ T3（ViewState，可提前）
  → T4（G1 審核，老闆）

Phase 1: 基礎搭建（G1 通過後）
  T5（ControlPanel）+ T6（視圖模式）+ T7（端到端 hook）— 可平行

Phase 2: 面板 + 整合
  T8（E2EPanel）+ T10（顯示偏好）— 可平行
  → T9（Toolbar + App 整合）

Phase 3: 2D + 3D 適配
  T11（2D）→ T12（3D）

Phase 4: P1 + 測試
  T13（P1，視時間）
  T14（測試 + 回歸）

→ /review → G2 → T14 → /review → G3
```

---

## 7. 測試計畫

### 單元測試

| 測試對象 | 測試要點 | 任務 |
|---------|---------|------|
| `traceE2E` 純函式 | 正向 BFS、混合 edge type、depth limit、循環防護、截斷、steps 記錄、symbol 收集 | T14 |
| `applyViewMode` | 四種視圖預設過濾正確、空 filter 全選、edge type 過濾、node type 過濾 | T14 |
| `VIEW_MODE_PRESETS` | 預設定義完整、每種有 label/filter/display | T14 |
| ViewState reducer | 7 個新 action 全部測試、視圖切換清除衝突狀態、displayPrefs 更新 | T14 |
| `isNaturalLanguage` | 既有，確認不回歸 | T14 |

### 整合測試

| 測試場景 | 描述 | 任務 |
|---------|------|------|
| 視圖模式 + 手動過濾 | 切換視圖後手動過濾，確認疊加正確 | T14 |
| 端到端追蹤 + 視圖切換 | 追蹤中切換視圖，確認追蹤被清除 | T14 |
| 控制面板收合展開 | 收合/展開不影響其他功能狀態 | T14 |

### 回歸測試

- 718+ 既有 tests 零回歸
- `pnpm build` 全通過
- Sprint 1-8 所有功能不受影響

---

## 8. 驗收標準

### S9-1 控制面板

- [ ] 左側可收合控制面板，包含 5 個區段
- [ ] 面板可收合（收合後 44px icon 列）
- [ ] 區段可獨立展開/收合
- [ ] 既有功能（影響分析/路徑追蹤/AI 概述/過濾）都能從控制面板找到入口

### S9-2 視圖模式

- [ ] 四種視圖模式可一鍵切換：全景 / 依賴 / 資料流 / 呼叫鏈
- [ ] 每種視圖有明確視覺差異（過濾 + display 不同）
- [ ] 切換視圖時清除影響分析/搜尋聚焦/端到端追蹤狀態
- [ ] 視圖模式 + 手動過濾可疊加

### S9-3 端到端追蹤

- [ ] 選入口節點 → 啟動追蹤 → 整條路徑發亮
- [ ] 面板顯示每步 + symbol / edge type
- [ ] depth limit 預設 10，可調
- [ ] 循環偵測正確
- [ ] 超過 30 節點截斷 + 提示

### S9-4 顯示偏好

- [ ] Heatmap toggle 立即生效
- [ ] 邊標籤 toggle 立即生效
- [ ] 粒子動畫 toggle 立即生效
- [ ] 節點標籤密度可調（全顯示/智慧縮略/隱藏）

### S9-5 Toolbar

- [ ] FilterPanel 按鈕已連接
- [ ] OverviewPanel 按鈕已連接
- [ ] Toolbar 三區段佈局：左 + 中 + 右

### S9-6 雙模式

- [ ] 控制面板在 2D + 3D 都可用
- [ ] 視圖模式在 2D + 3D 都生效
- [ ] 端到端追蹤在 2D + 3D 都可見
- [ ] 顯示偏好在 2D + 3D 都生效

### 回歸

- [ ] 718+ tests 全部通過
- [ ] Sprint 1-8 功能不受影響

---

## 9. 時程預估

| 階段 | 任務 | 預估 | 累計 |
|------|------|------|------|
| 設計 | T1 架構設計 | 2h | 2h |
| 圖稿 | T2 HTML mockup | 3h | 5h |
| G1 | T4 圖稿審核 | — | 5h |
| 基礎搭建 | T3 ViewState + T5 ControlPanel + T6 視圖模式 + T7 端到端 hook | 9h | 14h |
| 面板整合 | T8 E2EPanel + T9 Toolbar + T10 顯示偏好 | 6.5h | 20.5h |
| 適配 | T11 2D + T12 3D | 5h | 25.5h |
| P1 | T13 AI 設定 + Onboarding | 3h | 28.5h |
| 測試 | T14 測試 + 回歸 | 4h | 32.5h |

> 總預估 ~32.5h（含 P1 的 T13 AI 設定 + Onboarding 3h）。若時程緊張，T13 可延後。
> 前端工作量佔比約 90%，設計 10%。

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ | `.knowledge/sprint9-controlpanel-architecture.md` v1.0 完成 |
| T2 | 2026-03-31 | ✅ | `mockups/sprint9-controlpanel-mockup.html`（75KB）+ `sprint9-toolbar-mockup.html`（53KB）。5 區段互動 + E2EPanel + Toolbar 三區段 + 搜尋 dropdown + 深色霓虹主題。design-director 審核通過 |
| T3 | 2026-03-31 | ✅ | types/graph.ts +5 型別、ViewStateContext +5 state +7 actions +7 reducer。tsc clean |
| T4 | 2026-03-31 | ✅ G1 通過 | 老闆核准圖稿，G1 阻斷解除 |
| T5 | 2026-03-31 | ✅ | ControlPanel.tsx（280px/44px 收合）+ ControlPanelSection.tsx + FilterPanel embedded 模式。5 區段 + icon 快捷列。tsc clean |
| T6 | 2026-03-31 | ✅ | view-modes.ts（ViewModePreset + 4 預設）+ graph-adapter applyViewMode()。tsc clean |
| T7 | 2026-03-31 | ✅ | useE2ETracing.ts：traceE2E 純函式（BFS + adjacency + visited + truncate）+ useE2ETracing hook。tsc clean |
| T8 | 2026-03-31 | ✅ | E2EPanel.tsx（340px 右側面板 + 步驟列表 + depth slider）+ ContextMenu 新增「端到端追蹤」。tsc clean |
| T9 | 2026-03-31 | ✅ | Toolbar.tsx（三區段 + ViewMode badge + 2D/3D toggle）+ App.tsx 整合（移除 ViewToggle/HeatmapToggle，加入 Toolbar+ControlPanel+E2EPanel，右側面板 E2E>Tracing>Node）+ GraphContainer/GraphCanvas 傳遞 onStartE2ETracing。tsc clean |
| T10 | 2026-03-31 | ✅ | DisplayPrefsSection.tsx（5 控制項 + ToggleSwitch + SegmentedControl）+ ControlPanel 整合 + NeonEdge showEdgeLabels/showParticles 控制。tsc clean |
| T11 | 2026-03-31 | ✅ | GraphCanvas 視圖模式過濾（applyViewMode useMemo）+ e2eTracing 高亮（path glow + dim 0.1）+ labelDensity smart median + styledNodes/styledEdges 優先順序更新。tsc clean |
| T12 | 2026-03-31 | ✅ | Graph3DCanvas 視圖模式過濾（applyViewMode useMemo）+ e2eTracing highlight（4 新 useEffect: nodeThreeObject + linkColor/linkWidth + restore）+ showParticles toggle + labelDensity nodeLabel callback + GraphContainer 修補 Sprint 8 缺漏 props。tsc clean |
| T13 | | | |
| T14 | 2026-03-31 | ✅ | 3 新測試檔 138 tests：e2e-tracing.test.ts（41 traceE2E 純函式）+ view-modes.test.ts（51 VIEW_MODE_PRESETS + applyViewMode）+ view-state-s9.test.ts（46 reducer 7 新 action）。全部 893 tests 通過。pnpm build clean。零回歸 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review | 2026-03-31 | ✅ 通過 | PM 要求補做。TL 併入實作 Review 第二輪執行：對設計稿 Review 發現 Major:3（面板 top:0 被 Toolbar 遮擋）→ 已修復。Minor:10（視覺微調，非功能性）。893 tests 零回歸 |
| UI 圖稿 Review | 2026-03-31 | ✅ 通過 | Blocker:0 Major:0 Minor:0。2 份圖稿 128KB 總計，5 區段+E2E+Toolbar 三區段全部可互動，色碼嚴格引用 Sprint 2 |
| 實作 Review | 2026-03-31 | ✅ 通過 | 二輪 Review。第一輪：Blocker:0 Major:0 Minor:3（已修復：移除 GraphCanvas 未用 import、刪除重複 T14 file、更新 T10 驗收）。第二輪（對設計稿補做）：Major:3（ControlPanel/CollapsedStrip/E2EPanel top:0 → 被 Toolbar 遮擋）→ 修復 top:48 + calc(100vh-48px)。修復後 Blocker:0 Major:0 Minor:10。893 tests 全過 |
| 測試 Review | 2026-03-31 | ✅ 通過 | Blocker:0 Major:0 Minor:0。3 新測試檔 138 cases：e2e-tracing(41)+view-modes(51)+view-state-s9(46)。core 343 + web 513 + cli 37 = 893 全過。pnpm build clean |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 老闆核准 G0 |
| G1 | 2026-03-31 | ✅ 通過 | 老闆核准 G1。設計總監圖稿通過，先照這個做 |
| G2 | 2026-03-31 | ✅ 通過 | L1 Review 通過（Blocker:0 Major:0 Minor:3 已修復）。T1-T12 實作完成，tsc clean，893 tests 全過，pnpm build clean。對程式碼+對規範+對設計稿+對功能+對文件正確性全部通過。提交 PM 審核 |
| G3 | 2026-03-31 | ✅ 通過 | 測試驗收通過。138 新測試（e2e-tracing 41 + view-modes 51 + view-state-s9 46）+ 755 既有測試 = 893 total 全部通過。pnpm build clean。無 Critical/High Bug |

---

**確認**: [ ] L1 確認 / [ ] Tech Lead 確認
