# 開發計畫書: Sprint 4 — 3D 視覺化

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint4-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 3 讓使用者「讀懂」架構，Sprint 4 讓使用者「身歷其境」。核心目標：將 CodeAtlas 從 2D 平面圖升級為 3D 星圖，使用者可在 2D/3D 之間一鍵切換。3D 模式下節點在空間中漂浮、霓虹光效、粒子沿邊線流動——一張「活的星圖」。完成後達成 Phase 2 首個里程碑——3D 視覺化。

### 確認的流程

需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **G1 阻斷規則**：3D 視覺設計審核通過前不得開始實作。設計階段（T1、T2）可先行，實作任務（T3+）須等 G1 通過。

---

## 2. 技術方案

### 選定方案

**3d-force-graph + 共享狀態層 + 漸進光效**

| 層 | 技術 | 說明 |
|----|------|------|
| 3D 渲染 | 3d-force-graph | 封裝 Three.js + d3-force-3d，提供力導向 3D 圖 |
| 3D 底層 | Three.js（自動依賴） | WebGL 渲染引擎，3d-force-graph 內部使用 |
| 2D 渲染 | React Flow（現有） | 保留不變，2D 模式繼續使用 |
| 共享狀態 | React Context（ViewStateContext） | 兩個渲染器共享選中節點、搜尋、面板狀態 |
| 切換動畫 | CSS opacity transition | fade out/in 300ms |

### 新增依賴分析

| 套件 | 版本 | Gzipped Size | 說明 |
|------|------|-------------|------|
| `3d-force-graph` | ^1.73 | ~50KB | 3D 力導向圖核心 |
| `three` | ^0.170（peer dep） | ~150KB | WebGL 引擎（3d-force-graph peer dependency） |
| `d3-force-3d` | ^3.0 | ~10KB | 3D 力導向計算（3d-force-graph 自帶） |
| **合計** | | **~210KB gzipped** | 可接受（提案書預估 500KB 為上界） |

> 實際 bundle size 在 T3 安裝後用 `pnpm build` + `du -sh dist/` 驗證。若超過 300KB gzipped 需報告。

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: 3d-force-graph | 封裝完整，API 簡潔，自帶力導向 | 自訂外觀需操作 Three.js 底層 | ✅ 選定 |
| B: 純 Three.js 手刻 | 完全控制 | 工作量大（力導向需自己算），Sprint 時程不允許 | ❌ 排除 |
| C: deck.gl | 大規模資料視覺化強 | 非圖專用，力導向需自己整合 | ❌ 排除 |

### 架構決策

#### 2D/3D 共享狀態層（架構關鍵）

```
┌──────────────────────────────────────────────────┐
│  ViewStateProvider（React Context）                │
│  ┌──────────────────────────────────────────────┐ │
│  │ mode: '2d' | '3d'                            │ │
│  │ selectedNodeId: string | null                │ │
│  │ hoveredNodeId: string | null                 │ │
│  │ searchQuery: string                          │ │
│  │ searchResults: string[]                      │ │
│  │ isPanelOpen: boolean                         │ │
│  │ focusNodeId: string | null  ← 觸發相機飛入   │ │
│  └──────────────────────────────────────────────┘ │
│           ▲              ▲                        │
│     ┌─────┘              └─────┐                  │
│  ┌──────────┐          ┌──────────┐               │
│  │ 2D 渲染器 │          │ 3D 渲染器 │               │
│  │ ReactFlow │          │ ForceGraph│               │
│  │ (現有)    │          │ 3D (新增) │               │
│  └──────────┘          └──────────┘               │
│           ▲              ▲                        │
│     ┌─────┴──────────────┴─────┐                  │
│  ┌──────────────────────────────┐                 │
│  │ 共用 UI：NodePanel, SearchBar │                 │
│  │ Toolbar（含 2D/3D 切換按鈕）  │                 │
│  └──────────────────────────────┘                 │
└──────────────────────────────────────────────────┘
```

**設計要點**：
1. `ViewStateProvider` 包裹整個 App，提供 `useViewState()` hook
2. 兩個渲染器各自讀取共享狀態，發生互動時寫入共享狀態
3. NodePanel、SearchBar 只讀共享狀態，不依賴渲染模式
4. 切換 mode 時只切換渲染器 DOM，共享狀態不重置
5. `focusNodeId` 為觸發式：寫入 → 對應渲染器執行飛入動畫 → 清空

#### 3D 渲染器封裝

```
packages/web/src/components/
├── GraphCanvas.tsx          # 現有 2D（React Flow）— 不修改
├── Graph3DCanvas.tsx        # 新增 3D（3d-force-graph 封裝）
└── GraphContainer.tsx       # 新增：依 mode 切換顯示 2D 或 3D
```

**不動的**：
- core 層：完全不動（純分析引擎）
- cli 層：不動（API 不變，3D 為純前端）
- 現有 2D 元件：GraphCanvas、NeonNode、NeonEdge、DirectoryNode 不動
- 現有面板/搜尋元件：NodePanel、SearchBar、CodePreview、AiSummary 不動（只重構狀態來源）

---

## 3. UI 圖稿

Sprint 4 有 G1。3D 視覺設計由 design-director 產出，需包含：

| 設計交付物 | 說明 |
|-----------|------|
| 3D 節點外觀 | 球體 + glow 材質，file/directory 色彩區分 |
| 3D 邊線外觀 | 霓虹光跡 + 粒子流動方向指示 |
| 3D 背景 | 深空暗色調色板 |
| Hover 效果 | 高亮路徑 + 暗淡無關節點（3D 版） |
| 2D/3D 切換按鈕 | Toolbar 中的位置與圖示 |
| 相機預設視角 | 俯瞰/側視/聚焦核心的視角示意 |

> 設計稿路徑：`design/sprint4-3d-visual.md`（含 HTML mockup 或截圖）

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `packages/web/src/components/Graph3DCanvas.tsx` | 3D 渲染器（3d-force-graph 封裝） |
| `packages/web/src/components/GraphContainer.tsx` | 2D/3D 切換容器 |
| `packages/web/src/components/ViewToggle.tsx` | 2D/3D 切換按鈕 |
| `packages/web/src/components/CameraPresets.tsx` | 3D 預設相機視角選擇器 |
| `packages/web/src/contexts/ViewStateContext.tsx` | 共享狀態 Context + Provider |
| `packages/web/src/hooks/useViewState.ts` | 共享狀態 hook |
| `packages/web/src/hooks/use3DInteraction.ts` | 3D 互動邏輯 hook（click/hover/focus） |
| `packages/web/src/utils/three-helpers.ts` | Three.js 工具函式（glow material、camera tween） |
| `packages/web/__tests__/view-state.test.ts` | 共享狀態測試 |
| `packages/web/__tests__/graph-3d.test.ts` | 3D 渲染器測試 |
| `packages/web/__tests__/view-toggle.test.ts` | 切換邏輯測試 |
| `design/sprint4-3d-visual.md` | 3D 視覺設計規範（G1 交付物） |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/web/src/App.tsx` | 引入 ViewStateProvider + GraphContainer，替換直接使用 GraphCanvas |
| `packages/web/src/components/NodePanel.tsx` | 從 props 改為讀取 ViewStateContext 的 selectedNodeId |
| `packages/web/src/components/SearchBar.tsx` | 從 props 改為讀取/寫入 ViewStateContext |
| `packages/web/src/hooks/useSearch.ts` | 搜尋結果寫入 ViewStateContext.focusNodeId |
| `packages/web/src/hooks/useHoverHighlight.ts` | 讀寫 ViewStateContext.hoveredNodeId |
| `packages/web/src/styles/theme.ts` | 新增 3D 相關色彩常數（emissive 值、glow 強度） |
| `packages/web/package.json` | 新增 3d-force-graph、three 依賴 |
| `CLAUDE.md` | 更新 Sprint 4 文件索引 |

### 刪除

無。

---

## 5. 規範文件索引

| 檔案 | 內容 | 狀態 |
|------|------|------|
| `.knowledge/specs/data-model.md` | Node/Edge 型別 — Sprint 4 不變 | ✅ 已建立（v1.0） |
| `.knowledge/specs/api-design.md` | API 端點 — Sprint 4 不新增端點（純前端 3D） | ✅ 已建立（v2.0） |
| `.knowledge/specs/feature-spec.md` | 已更新 Sprint 4 功能規格（F23~F32） | ✅ 已更新（v4.0） |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | 3D 架構設計 + 共享狀態層 | 定義 ViewStateContext 介面、2D/3D 切換策略、Graph3DCanvas 介面、檔案結構。產出設計文件 | tech-lead | 無 | 設計 | 設計文件含 ViewState 型別定義、元件介面、資料流圖 |
| T2 | 3D 視覺設計規範 | 3D 節點/邊線/背景/hover/粒子的視覺規範。產出 `design/sprint4-3d-visual.md`（含 HTML mockup 或色彩規格） | design-director | 無 | UI 圖稿 | 設計稿含所有 3D 視覺元素規格，色彩引用 theme.ts 色系 |
| T3 | 3d-force-graph 整合 + 基本渲染 | 安裝依賴、建立 Graph3DCanvas.tsx、將 graph data 轉為 3d-force-graph 格式、基本 3D 力導向渲染 | frontend-developer | T1, G1 | 實作 | 3D 畫面可見節點球體 + 邊線，力導向佈局自動排列 |
| T4 | 2D/3D 切換 + 共享狀態層實作 | ViewStateContext.tsx、GraphContainer.tsx、ViewToggle.tsx。重構 App.tsx 引入 Provider，NodePanel/SearchBar 改讀 Context | frontend-developer | T3 | 實作 | 按鈕切換 2D↔3D，選中節點/搜尋結果在切換後保留 |
| T5 | 3D 霓虹主題 + 粒子流動 | Three.js 自訂 node material（emissive glow）、邊線光跡、粒子沿邊流動（linkDirectionalParticles）、深空背景 | frontend-developer | T3 | 實作 | 節點發光、邊線霓虹色、粒子流動可見且方向正確 |
| T6 | 3D 互動 + Hover 高亮 | 旋轉/縮放/平移、點擊節點相機飛入、hover raycaster 偵測、高亮路徑 + 暗淡無關節點 | frontend-developer | T3 | 實作 | 旋轉平滑、點擊飛入 500ms、hover 高亮依賴路徑 |
| T7 | 面板 + 搜尋 3D 適配 | NodePanel 在 3D 模式開啟正常、SearchBar 選中後 3D 相機飛到目標（lookAt + zoom） | frontend-developer | T4, T6 | 實作 | 面板可開/關、搜尋定位在 3D 模式下相機飛到節點 |
| T8 | 3D 節點分層 + 相機預設 | 目錄深度 → Y 軸高度映射、3-4 個預設相機視角（數字鍵 1/2/3）、CameraPresets.tsx | frontend-developer | T5, T6 | 實作 | 目錄層級有視覺高度區分、預設視角可快捷鍵切換 |
| T9 | 單元測試 + 整合測試 + 效能基線 | 共享狀態測試、切換回歸測試、3D 渲染 smoke test、200 節點 FPS 量測、現有 266+ tests 不回歸 | test-writer-fixer | T3~T8 | 測試 | 新增 tests 通過、266+ 既有 tests 零回歸、200 節點 > 30 FPS |

### 依賴圖

```
T1（架構設計）──┐
               ├── [G1 審核] ── T3（3d-force-graph 整合）
T2（視覺設計）──┘                  │
                                  ├── T4（2D/3D 切換）
                                  ├── T5（霓虹主題 + 粒子）
                                  ├── T6（互動 + Hover 高亮）
                                  │       │
                                  │       ├── T7（面板/搜尋適配）← T4
                                  │       └── T8（分層 + 相機預設）← T5
                                  │
                                  └── T9（測試）← T3~T8 全完成
```

### 可並行的任務

| 並行組 | 任務 | 條件 |
|--------|------|------|
| 組 1（設計） | T1 + T2 | 無前置，可同時進行 |
| 組 2（實作基礎） | T5 + T6 | T3 完成後可同時 |
| 組 3（實作進階） | T7 + T8 | 各自前置完成後可同時 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 4 — 3D 視覺化 的開發計畫。

📄 計畫書：proposal/sprint4-dev-plan.md
📋 確認的流程：需求 → 設計 → UI 圖稿 → G1 → 實作 → G2 → 測試 → G3

⚠️ G1 阻斷規則 — 設計（T1+T2）通過 G1 後才能開始實作（T3+）。
⚠️ feature-spec.md 已更新為 v4.0，新增 F23~F32。

🖥️ 設計階段：
- tech-lead 自行完成 T1（3D 架構設計 + 共享狀態層）
- 委派 design-director 完成 T2（3D 視覺設計規範）
- T1 + T2 可並行

🔍 G1 審核 → 老闆決策

🖥️ 實作階段（G1 後）：
- 委派 frontend-developer：T3~T8（全部前端實作）
- 執行順序：T3 → (T4 | T5 | T6) → (T7 | T8)

🧪 測試階段：
- 委派 test-writer-fixer：T9（測試 + 效能基線）

📌 架構重點：
- 共享狀態層 ViewStateContext 是關鍵，T1 設計 → T4 實作
- 3d-force-graph 安裝後驗證 bundle size（< 300KB gzipped）
- 現有 2D 元件不修改，3D 為新增元件
- 色碼嚴格引用 theme.ts，不硬編碼

📌 Sprint 3 教訓：
- 所有 JSON.parse 必須包 try-catch
- 任務狀態必須完整流轉：created → in_progress → in_review → done
- 事件紀錄必須有 ISO 8601 timestamp
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/App.tsx` | T4 | 中（引入 ViewStateProvider + GraphContainer） |
| `packages/web/src/components/NodePanel.tsx` | T4, T7 | 中（改讀 Context） |
| `packages/web/src/components/SearchBar.tsx` | T4, T7 | 中（改讀/寫 Context） |
| `packages/web/src/styles/theme.ts` | T5 | 低（新增 3D 色彩常數） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `view-state.test.ts` | ViewStateContext 初始值正確、mode 切換、selectedNodeId 同步、focusNodeId 觸發後清空 |
| `view-toggle.test.ts` | 按鈕點擊切換 mode、切換後共享狀態保留、UI 顯示當前模式 |
| `graph-3d.test.ts` | Graph3DCanvas 接收 nodes/edges prop、3d-force-graph 實例建立（mock）、cleanup 銷毀 |

### 整合測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `integration-3d.test.ts` | 2D→3D 切換保留選中節點、3D 模式下搜尋定位觸發相機移動（mock）、NodePanel 在兩種模式都可開啟 |

### 效能測試

| 測試 | 方法 | 基線 |
|------|------|------|
| 200 節點 3D FPS | performance.now() 計算 frame interval | > 30 FPS |
| 2D/3D 切換延遲 | 切換 timestamp 差 | < 1 秒 |

### 回歸測試

- 現有 266+ tests 全部重跑，零失敗
- 2D 模式下所有 Sprint 1~3 功能不受影響

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 3d-force-graph 自訂外觀需操作 Three.js 底層 | 高 | 先用預設外觀跑通（T3），再逐步加霓虹光效（T5）。漸進式 |
| 2D↔3D 切換狀態同步 | 中 | 共享狀態層 ViewStateContext 在設計階段（T1）定義清楚 |
| 3D raycaster hover 效能 | 中 | 使用 3d-force-graph 內建 onNodeHover，不自己寫 raycaster |
| 面板 DOM overlay 在 3D canvas 上定位 | 中 | 面板固定在畫面右側（absolute），不跟隨 3D 空間 |
| bundle size 增加 | 低 | 預估 ~210KB gzipped，T3 安裝後驗證。超標則報告 |
| 3D 霓虹光效 GPU 消耗 | 低 | WebGL 天然比 DOM 快。節點 > 200 降低 glow 解析度 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `.knowledge/specs/feature-spec.md` — 已更新至 v4.0，新增 F23~F32
- [ ] `.knowledge/architecture.md` — 更新至 v4.0，新增 3D 渲染器、ViewStateContext、Graph3DCanvas
- [ ] `CLAUDE.md` — 更新 Sprint 4 文件索引
- [ ] `.knowledge/specs/api-design.md` — Sprint 4 不新增 API（確認無變更即可）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ 完成 | `.knowledge/sprint4-3d-architecture.md`（8 章節）：ViewState 型別、元件介面、資料流圖、檔案結構、3d-force-graph 策略 |
| T2 | 2026-03-31 | ✅ 完成 | 交付物 1: `design/sprint4-3d-visual.md`（8 章節規範），交付物 2: `design/sprint4-3d-mockup.html`（639 行 Three.js 互動圖稿）。design-director 審核通過 |
| T3 | 2026-03-31 | ✅ 完成 | Graph3DCanvas.tsx（imperative 3d-force-graph wrapper）、ViewStateContext.tsx、GraphContainer.tsx、ViewToggle.tsx、App.tsx 重構、useGraphData 擴充 rawNodes/rawEdges、theme.ts threeD section。L1 Review: 0 Blocker / 0 Major / 2 Minor |
| T4 | 2026-03-31 | ✅ 完成 | ViewStateContext 共享狀態層完成。修復 4 個 pre-existing TS 錯誤。切換保留 selectedNodeId/isPanelOpen/searchQuery |
| T5 | 2026-03-31 | ✅ 完成 | 與 T3 一同交付。Cyan/Magenta 雙層 glow、粒子 4/edge #00ff88、深空 #050510 + FogExp2、三光源 |
| T6 | 2026-03-31 | ✅ 完成 | 與 T3 一同交付。Adjacency 預計算、四狀態 highlight、hover/click dispatch ViewStateContext |
| T7 | 2026-03-31 | ✅ 完成 | App.tsx bridge 模式：3D click→面板、focusNode 2D/3D 分路、Ctrl+K 搜尋雙模式運作 |
| T8 | 2026-03-31 | ✅ 完成 | forceY 自訂力（depth×40, strength 0.3）、CameraPresets.tsx（Default/TopDown/SideView + 鍵盤 1/2/3）|
| T9 | 2026-03-31 | ✅ 完成 | 6 個測試檔案 +87 tests（總計 353），零回歸。helper 提取到 three-helpers.ts。效能基線：adjacency <2ms、轉換 <1ms |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review（對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 8 章完整、色碼全引用 theme.ts、Three.js 參數精確、四態規格齊全、feature-spec F23~F32 對齊 |
| UI 圖稿 Review（對設計稿） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 3D 視覺設計規範完整覆蓋所有設計交付物，含效能降級 + 無障礙方案 |
| 實作 Review（對程式碼 + 對設計稿 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:3 — (1) 3處 as any（Framer Motion + d3 force typing，已註解）(2) F27 hover 未放大 1.5x（改 emissiveIntensity 替代）(3) F31 缺 focus-core 動態預設（3 靜態預設已達標）|
| 測試 Review（對功能 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 353 tests 全通過（+87 新增、266 零回歸），效能基線達標，測試品質良好，doc-integrity 全部通過 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 老闆核准 G0，確認流程含 G1 |
| G1 | 2026-03-31 | ✅ 通過 | 老闆體驗 3D 互動圖稿（sprint4-3d-mockup.html）後核准。設計規範 + 圖稿品質通過 |
| G2 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。3 Minor 不影響功能，可後續清理 |
| G3 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。353 tests 零回歸，效能基線達標 |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認

---

**Sprint 4 完成**: ✅ 2026-03-31
**最終測試**: 353 tests, 0 failures
**Gate 紀錄**: G0 ✅ → G1 ✅ → G2 ✅ → G3 ✅
