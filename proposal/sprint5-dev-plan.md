# 開發計畫書: Sprint 5 — 資料流動視覺化

> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint5-proposal.md`
> **狀態**: 待執行

---

> 本文件在 G0 通過後由 L1 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

Sprint 4 讓使用者「身歷其境」看 3D 星圖，Sprint 5 讓使用者「看到資料怎麼流動」。核心目標：在邊線上顯示搬運的 symbol 名稱、點擊 symbol 追蹤完整傳遞路徑、熱力圖一眼看出核心資料通道。從「看架構」升級到「看流動」。

### 確認的流程

需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）

> **無 G1**（延續 Sprint 4 的 2D/3D 視覺模式，無新視覺設計審核）。
> **無額外阻斷規則**（G2 前完成實作即可）。

---

## 2. 技術方案

### 設計策略：共用邏輯 + 雙渲染適配

Sprint 5 所有功能都需在 2D（React Flow）和 3D（3d-force-graph）雙模式運作。核心策略：

```
┌──────────────────────────────────────────────────────────────┐
│ 共用邏輯層（純計算，不依賴渲染器）                               │
│ ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│ │ usePathTracing │ │ useEdgeSymbols │ │ useHeatmap           │    │
│ │ BFS + visited │ │ 格式化 symbol  │ │ 粗細/亮度映射          │    │
│ │ + depth ≤ 10  │ │ + "+N more"    │ │ + 開關狀態            │    │
│ └──────┬────────┘ └──────┬─────────┘ └──────────┬───────────┘    │
│        │                 │                       │               │
│ ┌──────┴─────────────────┴───────────────────────┴────────────┐  │
│ │ ViewStateContext（擴充 tracing + heatmap 狀態）               │  │
│ └─────────────────────────────────────────────────────────────┘  │
│        ▲                 ▲                       ▲               │
│  ┌─────┘                 │                       └─────┐         │
│  │                       │                             │         │
│  ┌──────────┐     ┌──────────┐                  ┌──────────┐    │
│  │ 2D 渲染層 │     │ 共用 UI   │                  │ 3D 渲染層 │    │
│  │ ReactFlow │     │ TracingPanel│                │ ForceGraph│    │
│  │ EdgeLabel │     │ HeatmapToggle│               │ SpriteText│    │
│  │ NodeBadge │     │             │                │ MaterialOp│    │
│  └──────────┘     └──────────┘                  └──────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 核心資料（已備，不需新增解析）

| 資料 | 來源 | 用途 |
|------|------|------|
| `EdgeMetadata.importedSymbols: string[]` | core（Sprint 1） | 邊上 symbol 標籤、路徑追蹤、熱力圖 |
| `NodeMetadata.importCount: number` | core（Sprint 1） | 節點 I/O 入標記 |
| `NodeMetadata.exportCount: number` | core（Sprint 1） | 節點 I/O 出標記 |

> **不需修改 core 層**。所有 Sprint 5 功能為純前端（web package）。

### ViewStateContext 擴充

在現有 12 個 action 基礎上新增 tracing + heatmap 相關狀態：

```typescript
// 新增狀態欄位
interface ViewState {
  // ...existing fields...
  tracingSymbol: string | null;     // 正在追蹤的 symbol 名稱
  tracingPath: string[];            // 追蹤路徑中的 node ID 列表
  tracingEdges: string[];           // 追蹤路徑中的 edge ID 列表
  isHeatmapEnabled: boolean;        // 熱力圖開關
}

// 新增 action
| { type: 'START_TRACING'; symbol: string; path: string[]; edges: string[] }
| { type: 'STOP_TRACING' }
| { type: 'TOGGLE_HEATMAP' }
```

### 路徑追蹤演算法

```
輸入：symbol 名稱、graph（nodes + edges）
輸出：path（node IDs）、edges（edge IDs）

1. 找出所有 edge.metadata.importedSymbols 包含該 symbol 的邊
2. 從找到的邊建立子圖
3. BFS 遍歷子圖：
   - visited = new Set()
   - queue = [起始節點]
   - depth = 0
   - while queue 非空 && depth < 10:
     - 取出節點 → 加入 path
     - 遍歷鄰接邊（含該 symbol）→ 加入 edges
     - 鄰接節點若不在 visited → 加入 queue
     - depth++
4. 回傳 { path, edges }
```

### 邊標籤渲染策略

| 模式 | 技術 | 效能策略 |
|------|------|---------|
| 2D | React Flow custom edge label component | hover 時才掛載 DOM |
| 3D | Three.js SpriteText（`three-spritetext`） | hover 的那條邊才渲染 sprite，超過 50 邊不預渲染 |

### 熱力圖映射

```typescript
function getEdgeHeatmapStyle(symbolCount: number) {
  const width = symbolCount <= 2 ? 1 : symbolCount <= 5 ? 2 : symbolCount <= 10 ? 3 : 4;
  const opacity = Math.min(0.3 + (symbolCount / 15) * 0.7, 1.0);
  return { width, opacity };
}
```

### 新增依賴分析

| 套件 | 版本 | 說明 |
|------|------|------|
| `three-spritetext` | ^1.9 | 3D 文字 sprite（3d-force-graph 推薦搭配）|

> `three-spritetext` 為 3d-force-graph 常見搭配套件，gzipped ~5KB，影響可忽略。若 bundle size 增加超過 10KB 需報告。

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: SpriteText（3D 邊標籤） | 3d-force-graph 官方推薦，API 簡潔 | 大量文字時效能降 | ✅ 選定（hover-only 策略緩解） |
| B: HTML overlay（3D 邊標籤） | DOM 排版靈活 | CSS 3D 座標轉換複雜、遮擋問題 | ❌ 排除 |
| C: Canvas texture（3D 邊標籤） | GPU 友好 | 文字更新需重繪 texture，開發成本高 | ❌ 排除 |

---

## 3. UI 設計

Sprint 5 無 G1。延續 Sprint 4 的 2D/3D 視覺風格，新增 UI 元素：

| 元素 | 說明 | 位置 |
|------|------|------|
| 邊 symbol 標籤 | hover 時浮現在邊線中點上方 | 邊線中點 |
| 節點 I/O badge | 入/出數字標記 | 節點左上（入）/ 右上（出） |
| 路徑追蹤面板 | 完整路徑列表 | 右側面板（替換 NodePanel 內容） |
| 熱力圖 toggle | 火焰圖示按鈕 | Toolbar（與 ViewToggle 同列） |

> 色彩嚴格引用 `theme.ts`，不硬編碼。追蹤高亮色使用現有霓虹色（Cyan/Green），暗淡 opacity 與 Sprint 4 hover 一致（0.1）。

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `packages/web/src/hooks/usePathTracing.ts` | 路徑追蹤邏輯 hook（BFS + visited + depth limit） |
| `packages/web/src/hooks/useEdgeSymbols.ts` | 邊 symbol 格式化 hook（truncate + "+N more"） |
| `packages/web/src/hooks/useHeatmap.ts` | 熱力圖計算 hook（粗細/亮度映射 + 開關） |
| `packages/web/src/components/EdgeSymbolLabel.tsx` | 2D 邊 symbol 標籤元件（React Flow edge label） |
| `packages/web/src/components/NodeIOBadge.tsx` | 節點 I/O 標記元件（2D badge） |
| `packages/web/src/components/TracingPanel.tsx` | 路徑追蹤面板元件 |
| `packages/web/src/components/HeatmapToggle.tsx` | 熱力圖開關按鈕元件 |
| `packages/web/src/utils/path-tracer.ts` | 純函式：路徑追蹤演算法（BFS/visited/depth） |
| `packages/web/__tests__/path-tracer.test.ts` | 路徑追蹤演算法測試 |
| `packages/web/__tests__/edge-symbols.test.ts` | 邊 symbol 標籤測試 |
| `packages/web/__tests__/heatmap.test.ts` | 熱力圖映射測試 |
| `packages/web/__tests__/tracing-panel.test.ts` | 追蹤面板測試 |
| `packages/web/__tests__/node-io-badge.test.ts` | I/O 標記測試 |
| `packages/web/__tests__/integration-s5.test.ts` | Sprint 5 整合測試 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/web/src/contexts/ViewStateContext.tsx` | 新增 tracingSymbol/tracingPath/tracingEdges/isHeatmapEnabled 狀態 + START_TRACING/STOP_TRACING/TOGGLE_HEATMAP action |
| `packages/web/src/components/GraphCanvas.tsx` | 整合 2D 邊標籤（EdgeSymbolLabel）、I/O badge（NodeIOBadge）、熱力圖（edge style）、追蹤高亮 |
| `packages/web/src/components/Graph3DCanvas.tsx` | 整合 3D 邊標籤（SpriteText hover）、I/O sprite、熱力圖（line width/opacity）、追蹤高亮、粒子 symbol 類型 |
| `packages/web/src/components/NeonEdge.tsx` | 支援熱力圖 strokeWidth/opacity + 追蹤高亮狀態 |
| `packages/web/src/components/NeonNode.tsx` | 支援 I/O badge overlay + 追蹤暗淡狀態 |
| `packages/web/src/components/DirectoryNode.tsx` | 支援 I/O badge overlay + 追蹤暗淡狀態 |
| `packages/web/src/components/GraphContainer.tsx` | 傳遞 tracing/heatmap props 給渲染器 |
| `packages/web/src/App.tsx` | 引入 HeatmapToggle 元件，TracingPanel 與 NodePanel 切換 |
| `packages/web/src/styles/theme.ts` | 新增 heatmap 色階常數、tracing highlight 色彩 |
| `packages/web/package.json` | 新增 three-spritetext 依賴（若需要） |
| `CLAUDE.md` | 更新 Sprint 5 文件索引 |

### 刪除

無。

---

## 5. 規範文件索引

| 檔案 | 內容 | 狀態 |
|------|------|------|
| `.knowledge/specs/data-model.md` | Node/Edge 型別 — Sprint 5 不變 | ✅ 已建立（v1.0） |
| `.knowledge/specs/api-design.md` | API 端點 — Sprint 5 不新增端點（純前端） | ✅ 已建立（v2.0） |
| `.knowledge/specs/feature-spec.md` | 已更新 Sprint 5 功能規格（F33~F40） | ✅ 已更新（v5.0） |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | 設計：路徑追蹤演算法 + 邊標籤架構 | 定義路徑追蹤 BFS 演算法、ViewStateContext 擴充介面、共用 hook 介面、邊標籤渲染策略。產出設計文件 | tech-lead | 無 | 設計 | 設計文件含演算法虛擬碼、ViewState 型別擴充、hook 介面、資料流圖 |
| T2 | 路徑追蹤 utility + ViewStateContext 擴充 | 實作 `path-tracer.ts` 純函式（BFS + visited + depth ≤ 10）、ViewStateContext 新增 tracing/heatmap 狀態與 action | frontend-developer | T1 | 實作 | 路徑追蹤可處理循環依賴（不無限展開）、ViewState 新增 6 個欄位 + 3 個 action |
| T3 | 邊上 symbol 標籤（2D） | `EdgeSymbolLabel.tsx`（React Flow edge label）+ `useEdgeSymbols` hook。Hover 邊線浮現 symbol 名稱，超過 3 個 +N more | frontend-developer | T2 | 實作 | 2D hover 邊線顯示 symbol 名稱、>3 個摺疊顯示、無 symbol 不顯示 |
| T4 | 邊上 symbol 標籤（3D） | Graph3DCanvas 整合 Three.js sprite text，hover 邊線時渲染 symbol 標籤。超過 50 邊只渲染 hover 的 | frontend-developer | T2 | 實作 | 3D hover 邊線顯示 sprite text、效能策略生效（>50 邊不預渲染） |
| T5 | 路徑追蹤模式（2D + 3D） | `usePathTracing` hook + 2D/3D 高亮渲染。點擊 symbol → START_TRACING → 路徑高亮 + 暗淡無關。Escape/空白退出 | frontend-developer | T2, T3 | 實作 | 點擊 symbol 追蹤整條路徑、高亮/暗淡正確、10 層深度限制、2D+3D 皆可用 |
| T6 | 節點 I/O 標記（2D + 3D） | `NodeIOBadge.tsx` + NeonNode/DirectoryNode 整合 badge + 3D sprite I/O 標記 | frontend-developer | T1 | 實作 | 節點顯示 ↓importCount ↑exportCount、0 時不顯示、>99 顯示 99+ |
| T7 | 資料流熱力圖（2D + 3D） | `useHeatmap` hook + NeonEdge strokeWidth/opacity 適配 + Graph3DCanvas line width/opacity。含粒子速度調整 | frontend-developer | T2 | 實作 | 邊粗細/亮度反映 symbol 數量、2D+3D 皆生效、可開關 |
| T8 | 路徑追蹤面板 + 熱力圖 Toggle + 粒子 symbol 類型 | `TracingPanel.tsx`（右側面板，追蹤時替換 NodePanel 內容）+ `HeatmapToggle.tsx`（Toolbar 按鈕）+ 粒子顏色/大小依 symbol 類型 | frontend-developer | T5, T7 | 實作 | 面板顯示完整路徑列表可點擊跳轉、Toggle 可即時開關熱力圖、粒子依 symbol 類型著色 |
| T9 | 測試 + 回歸 | 路徑追蹤演算法測試（含循環依賴）、邊標籤測試、熱力圖測試、追蹤面板測試、I/O badge 測試、整合測試、353+ 既有 tests 零回歸 | test-writer-fixer | T2~T8 | 測試 | 新增 tests 全部通過、353+ 既有 tests 零回歸、pnpm build 全通過 |

### 依賴圖

```
T1（設計）─────┬── T2（路徑追蹤 utility + ViewState 擴充）
              │       │
              │       ├── T3（2D 邊標籤）
              │       │       │
              │       │       └── T5（路徑追蹤模式）← T2, T3
              │       │
              │       ├── T4（3D 邊標籤）
              │       │
              │       └── T7（熱力圖）
              │               │
              │               └── T8（面板 + Toggle + 粒子）← T5, T7
              │
              └── T6（I/O 標記）
                        │
                        └── T9（測試）← T2~T8 全完成
```

### 可並行的任務

| 並行組 | 任務 | 條件 |
|--------|------|------|
| 組 1（實作基礎） | T2 + T6 | T1 完成後可同時 |
| 組 2（邊標籤） | T3 + T4 | T2 完成後可同時 |
| 組 3（進階功能） | T5 + T7 | 各自前置完成後。T5 需 T2+T3，T7 需 T2 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 5 — 資料流動視覺化 的開發計畫。

📄 計畫書：proposal/sprint5-dev-plan.md
📋 確認的流程：需求 → 設計 → 實作 → G2 → 測試 → G3

⚠️ 無 G1 阻斷規則 — 設計（T1）完成後可直接進入實作。
⚠️ feature-spec.md 已更新為 v5.0，新增 F33~F40。

🖥️ 設計階段：
- tech-lead 自行完成 T1（路徑追蹤演算法 + 邊標籤架構設計）

🖥️ 實作階段：
- 委派 frontend-developer：T2~T8（全部前端實作）
- 執行順序：T2 + T6 並行 → T3 + T4 並行 → T5 + T7 → T8

🧪 測試階段：
- 委派 test-writer-fixer：T9（測試 + 回歸）

📌 架構重點：
- 核心資料已備：EdgeMetadata.importedSymbols、NodeMetadata.importCount/exportCount
- 路徑追蹤演算法：BFS + visited set + depth ≤ 10（防循環依賴）
- 所有功能需 2D + 3D 雙模式適配，業務邏輯抽共用 hook
- ViewStateContext 擴充 tracing + heatmap 狀態（+6 欄位 +3 action）
- 3D 邊上文字：hover-only 渲染，>50 邊不預渲染（效能）
- 色碼嚴格引用 theme.ts，不硬編碼

📌 Sprint 4 教訓：
- 所有 JSON.parse 必須包 try-catch
- 任務狀態必須完整流轉：created → in_progress → in_review → done
- 事件紀錄必須有 ISO 8601 timestamp
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/src/contexts/ViewStateContext.tsx` | T2 | 中（新增 6 欄位 + 3 action） |
| `packages/web/src/components/GraphCanvas.tsx` | T3, T5, T7 | 高（邊標籤 + 追蹤高亮 + 熱力圖） |
| `packages/web/src/components/Graph3DCanvas.tsx` | T4, T5, T7, T8 | 高（3D 邊標籤 + 追蹤 + 熱力圖 + 粒子） |
| `packages/web/src/components/NeonEdge.tsx` | T3, T7 | 中（邊標籤 + 熱力圖 style） |
| `packages/web/src/components/NeonNode.tsx` | T6 | 低（新增 badge overlay） |
| `packages/web/src/App.tsx` | T8 | 中（新增 HeatmapToggle + TracingPanel） |
| `packages/web/src/styles/theme.ts` | T3, T7 | 低（新增色彩常數） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `path-tracer.test.ts` | 線性路徑追蹤（A→B→C）、分岔路徑、循環依賴不無限展開、深度上限 10 層截斷、symbol 不存在回傳空、空 graph 處理 |
| `edge-symbols.test.ts` | useEdgeSymbols 格式化 1~3 個 symbol、超過 3 個 +N more、空陣列回傳 null、特殊字元 symbol |
| `heatmap.test.ts` | useHeatmap 映射 1/3/6/11 symbols 對應粗細/亮度、開關狀態切換、邊界值 0 symbols |
| `node-io-badge.test.ts` | NodeIOBadge 渲染 importCount/exportCount、0 不顯示、>99 顯示 99+ |
| `tracing-panel.test.ts` | TracingPanel 渲染路徑列表、點擊跳轉觸發 FOCUS_NODE、結束追蹤按鈕觸發 STOP_TRACING |

### 整合測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `integration-s5.test.ts` | hover 邊→標籤顯示→點擊 symbol→追蹤啟動→路徑高亮→Escape 退出。熱力圖 toggle 開關→邊 style 變更。2D/3D 切換保留追蹤狀態 |

### 回歸測試

- 現有 353+ tests 全部重跑，零失敗
- 2D 模式下所有 Sprint 1~4 功能不受影響
- 3D 模式下所有 Sprint 4 功能不受影響
- `pnpm build` 三個 package 全通過

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 3D 邊上文字渲染效能 | 高 | hover-only 渲染策略，>50 邊不預渲染。SpriteText 為輕量 sprite，非 DOM overlay |
| 循環依賴路徑追蹤 | 中 | visited set 防重複 + depth ≤ 10 截斷。演算法為純函式，可充分單測 |
| GraphCanvas.tsx / Graph3DCanvas.tsx 修改量大 | 中 | 邏輯抽入共用 hook（usePathTracing/useHeatmap），渲染層只做 style 適配 |
| NeonEdge 熱力圖 + 追蹤高亮衝突 | 低 | 追蹤模式優先：追蹤中不套用熱力圖 style（追蹤高亮覆蓋） |
| 邊標籤視覺擁擠 | 低 | hover-only 顯示（非永久），超過 3 symbol 摺疊 |
| three-spritetext 依賴 | 低 | 約 5KB gzipped，3d-force-graph 官方推薦搭配。若不可用可 fallback 為 Canvas texture |
| 2D/3D 切換追蹤狀態同步 | 低 | tracingSymbol/tracingPath/tracingEdges 存在 ViewStateContext，切換模式不重置 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `.knowledge/specs/feature-spec.md` — 已更新至 v5.0，新增 F33~F40
- [ ] `.knowledge/architecture.md` — 更新至 v5.0，新增共用 hook 層、TracingPanel、HeatmapToggle
- [ ] `CLAUDE.md` — 更新 Sprint 5 文件索引
- [ ] `.knowledge/specs/api-design.md` — Sprint 5 不新增 API（確認無變更即可）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-31 | ✅ 完成 | `.knowledge/sprint5-dataflow-architecture.md`（11 章節）：ViewState 擴充（+5 欄位 +4 action）、BFS 追蹤演算法、3 共用 hook 介面、邊標籤策略、資料流圖 |
| T2 | 2026-03-31 | ✅ 完成 | path-tracer.ts（BFS + visited + depth ≤ 10）+ ViewStateContext 擴充（+5 欄位 +4 action）。tsc 通過，129 tests 零回歸 |
| T3 | 2026-03-31 | ✅ 完成 | useEdgeSymbols hook + EdgeSymbolLabel（EdgeLabelRenderer）+ NeonEdge hover 整合 + GraphCanvas onEdgeMouseEnter/Leave |
| T4 | 2026-03-31 | ✅ 完成 | Graph3DCanvas: createTextSprite Canvas API（無外部套件）、onLinkHover sprite 管理、FG3DLink 擴充 importedSymbols。GraphContainer 傳遞 edge hover |
| T5 | 2026-03-31 | ✅ 完成 | usePathTracing hook（BFS + Escape 退出）+ NeonEdge onStartTracing + GraphCanvas/Graph3DCanvas 追蹤高亮（§10 優先級） |
| T6 | 2026-03-31 | ✅ 完成 | NodeIOBadge.tsx + NeonNode/DirectoryNode 整合 + theme.ts 新增 ioBadge/heatmap/tracing/edgeLabel 常數 |
| T7 | 2026-03-31 | ✅ 完成 | useHeatmap hook + NeonEdge 2D 熱力圖 style + Graph3DCanvas 3D heatmap（linkWidth/linkColor/particleSpeed）|
| T8 | 2026-03-31 | ✅ 完成 | TracingPanel.tsx（AnimatePresence 滑入、路徑列表可點擊跳轉）+ HeatmapToggle.tsx（火焰 icon、aria-pressed）+ Graph3DCanvas 粒子 symbol 類型（inferSymbolType + particleVisual）+ App.tsx 整合 |
| T9 | 2026-03-31 | ✅ 完成 | 6 新測試檔（89 tests）：path-tracer(14), edge-symbols(19), heatmap(18), node-io-badge(9), tracing-panel(13), integration-s5(16)。web 218 + core 217 = 435 tests 全通過。pnpm build 成功 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review（對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — F33~F40 逐項全覆蓋，色碼全引用 theme.ts，BFS 含循環偵測+depth ≤ 10 |
| 實作 Review（對程式碼 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — tsc 零錯誤、web 129 tests + core 217 tests 全通過。無 any 濫用（3 處 Framer Motion 型別不相容已加 eslint-disable 註解）。F33~F40 逐項覆蓋。所有色碼引用 theme.ts。命名符合 camelCase/PascalCase 規範。doc-integrity 修正後通過（T1~T8 驗收標準已全勾） |
| 測試 Review（對功能 + 對規範） | 2026-03-31 | 通過 | Blocker:0 Major:0 Minor:0 — 6 新測試檔 89 tests 全通過。web 218 + core 217 = 435 total，零回歸。pnpm build 三包成功。覆蓋：path-tracer 邊界（循環/depth/空圖）、edge-symbols 格式化、heatmap 映射表、NodeIOBadge 渲染、TracingPanel 互動、Sprint 5 reducer 整合。doc-integrity 全勾 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-31 | ✅ 通過 | 老闆核准 G0 |
| G2 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。0 Blocker / 0 Major / 0 Minor |
| G3 | 2026-03-31 | ✅ 通過 | PM 審核通過（6 項 checklist ✅），老闆核准。435 tests 零回歸，三輪 Review 全 0 Minor |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認

---

**Sprint 5 完成**: ✅ 2026-03-31
**最終測試**: 435 tests, 0 failures
**Gate 紀錄**: G0 ✅ → G2 ✅ → G3 ✅
