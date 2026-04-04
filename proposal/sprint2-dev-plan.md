# 開發計畫書: Sprint 2 — 模組依賴圖 + 視覺衝擊

> **撰寫者**: PM（代 Tech Lead 產出，Tech Lead 開工後確認）
> **日期**: 2026-03-30
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint2-proposal.md`
> **狀態**: ✅ Sprint 2 完成（2026-03-31）

---

> 本文件在 G0 通過後由 PM 撰寫，依據提案書中勾選的步驟展開技術細節。

## 1. 需求摘要

將 Sprint 1 產出的 graph JSON 渲染成可互動的視覺化依賴圖。以深色霓虹風格 + D3 力導向佈局 + 流動動畫呈現，讓使用者打開 `codeatlas web` 的第一眼就覺得「這也太酷了」。這是產品核心價值的第一次兌現。

### 確認的流程

需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 視覺衝擊力驗收（老闆）

### 阻斷規則

- **G1 阻斷**：圖稿審核通過前不得開始實作（T4~T12 必須等 G1）
- **深色霓虹主題確認前不得開始元件開發**

---

## 2. 技術方案

### 選定方案

**React + Vite + React Flow + D3 force + Framer Motion**

| 層 | 技術 | 說明 |
|----|------|------|
| 前端框架 | React 18 + TypeScript | 元件化開發，與 React Flow 無縫整合 |
| 建置工具 | Vite | 極速 HMR，開發體驗好 |
| 圖譜渲染 | React Flow v12 | 成熟的 node-based UI 庫，支援自訂節點/邊 |
| 佈局計算 | d3-force | 力導向模擬，自動節點排列 |
| 動畫 | Framer Motion + CSS Animation | 過渡動畫 + 粒子流動 |
| 樣式 | CSS Modules 或 Tailwind | 深色霓虹主題 |

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: React Flow + D3 force | 自訂度最高、React 生態、社群大 | 整合需手動銜接 | ✅ 選定 |
| B: Cytoscape.js | 開箱即用圖譜庫 | 視覺自訂度不如 RF、非 React 原生 | ❌ 排除 |
| C: 純 D3 | 完全掌控渲染 | 太底層，開發成本太高 | ❌ 排除 |
| D: Sigma.js | WebGL 效能好 | API 不直覺，生態小 | ❌ 排除 |

### 架構決策

```
packages/web/
├── src/
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 主元件，包含 ReactFlowProvider
│   ├── api/
│   │   └── graph.ts              # fetch /api/graph，回傳 AnalysisResult
│   ├── adapters/
│   │   └── graph-adapter.ts      # AnalysisResult → React Flow nodes/edges
│   ├── components/
│   │   ├── GraphCanvas.tsx       # ReactFlow 容器 + 縮放平移
│   │   ├── NeonNode.tsx          # 自訂霓虹風格節點
│   │   ├── NeonEdge.tsx          # 自訂霓虹風格邊（含流動動畫）
│   │   ├── DirectoryNode.tsx     # 目錄群組節點（可展開收合）
│   │   └── Minimap.tsx           # 縮略圖
│   ├── hooks/
│   │   ├── useGraphData.ts       # 資料載入 + 轉換 hook
│   │   ├── useForceLayout.ts     # D3 force simulation hook
│   │   └── useHoverHighlight.ts  # Hover 高亮邏輯 hook
│   ├── styles/
│   │   ├── theme.ts              # 霓虹色彩系統常數
│   │   ├── global.css            # 全域樣式 + 深色背景
│   │   └── animations.css        # 粒子流動 CSS 動畫
│   └── utils/
│       └── layout.ts             # 節點分層 + zoom 層級邏輯
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

**設計原則**：
- 資料層（api/ + adapters/）與渲染層（components/）分離
- 邏輯抽成 hooks，元件只負責渲染
- 主題色彩集中在 theme.ts，不散落在各元件

---

## 3. UI 圖稿

> ⚠️ G1 阻斷：以下圖稿必須通過審核後才能開始實作。

| 頁面/元件 | Mockup 檔案 | 說明 |
|----------|------------|------|
| 主畫面 — 依賴圖全景 | `mockups/sprint2-main-view.html` | 深色背景 + 霓虹節點 + 力導向佈局 |
| Hover 高亮效果 | `mockups/sprint2-hover-highlight.html` | 節點 hover → 依賴路徑亮起 + 其餘淡化 |
| 節點分層（zoom out） | `mockups/sprint2-directory-view.html` | 目錄層級視圖 |
| 節點分層（zoom in） | `mockups/sprint2-file-view.html` | 檔案層級視圖 |
| 流動動畫效果 | `mockups/sprint2-particle-flow.html` | 邊線上的光點粒子流動 |

### 圖稿驗收標準

- [ ] 所有新增頁面皆有對應 HTML mockup
- [ ] 可在瀏覽器直接開啟預覽（不需 build）
- [ ] 深色霓虹主題色彩系統已定義（色碼表）
- [ ] 文字對比度 ≥ 4.5:1（WCAG AA）
- [ ] 節點/邊的霓虹色區分（directory vs file）明確

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `packages/web/src/main.tsx` | React 入口 |
| `packages/web/src/App.tsx` | 主元件 |
| `packages/web/src/api/graph.ts` | API 呼叫層 |
| `packages/web/src/adapters/graph-adapter.ts` | Graph JSON → React Flow 格式轉換 |
| `packages/web/src/components/GraphCanvas.tsx` | React Flow 容器（縮放平移） |
| `packages/web/src/components/NeonNode.tsx` | 霓虹風格自訂節點 |
| `packages/web/src/components/NeonEdge.tsx` | 霓虹風格自訂邊（含粒子動畫） |
| `packages/web/src/components/DirectoryNode.tsx` | 可展開收合的目錄群組節點 |
| `packages/web/src/components/Minimap.tsx` | 縮略圖元件 |
| `packages/web/src/hooks/useGraphData.ts` | 資料載入 + 轉換 hook |
| `packages/web/src/hooks/useForceLayout.ts` | D3 force simulation hook |
| `packages/web/src/hooks/useHoverHighlight.ts` | Hover 高亮邏輯 hook |
| `packages/web/src/styles/theme.ts` | 霓虹色彩系統 |
| `packages/web/src/styles/global.css` | 全域深色背景樣式 |
| `packages/web/src/styles/animations.css` | 粒子流動 CSS 動畫 |
| `packages/web/src/utils/layout.ts` | 節點分層 + zoom 邏輯 |
| `packages/web/vite.config.ts` | Vite 設定 |
| `packages/web/tsconfig.json` | TypeScript 設定（繼承 base） |
| `mockups/sprint2-*.html` | 5 個 HTML mockup |
| `packages/web/__tests__/` | 前端測試目錄 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/web/package.json` | 新增 React / React Flow / D3 / Framer Motion 依賴 |
| `packages/web/index.html` | 從佔位頁改為 React 入口（引用 main.tsx） |
| `packages/cli/src/commands/web.ts` | 靜態檔案路徑指向 `packages/web/dist/` |
| `packages/cli/src/server.ts` | 更新靜態檔案 serve 路徑 |
| `CLAUDE.md` | 更新 Sprint 2 文件索引 + 新踩坑紀錄 |

### 刪除

無。

---

## 5. 規範文件索引

| 檔案 | 內容 | 狀態 |
|------|------|------|
| `.knowledge/specs/data-model.md` | Node/Edge 型別、JSON schema — Sprint 2 不變 | ✅ 已建立（v1.0） |
| `.knowledge/specs/api-design.md` | 本地 server API 端點 — Sprint 2 不新增端點 | ✅ 已建立（v1.0） |
| `.knowledge/specs/feature-spec.md` | F7~F15 Sprint 2 前端功能規格 | ✅ 已更新（v2.0） |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | Web 專案初始化 | `packages/web` 改為 React + TypeScript + Vite，安裝 React Flow / D3 / Framer Motion 依賴，確保 `pnpm build` 通過 | devops-automator | 無 | 設計 | `pnpm build` 成功，`pnpm dev` 可啟動開發伺服器 |
| T2 | 深色霓虹視覺設計 | 定義色彩系統（背景色、霓虹色碼、節點/邊樣式、glow 效果參數），產出 `theme.ts` 設計稿 + 色碼表 | ui-designer | 無 | 設計 | 色彩系統文件完整，含色碼表 + 節點/邊視覺規格 |
| T3 | HTML Mockup 圖稿 | 5 個 HTML mockup（主畫面、hover 高亮、zoom out 目錄層、zoom in 檔案層、粒子流動），可瀏覽器直接開啟 | ui-designer | T2 | UI 圖稿 | 5 個 mockup 完成，瀏覽器可預覽，文字對比度達 WCAG AA |
| T4 | Graph 資料對接 | `api/graph.ts` + `adapters/graph-adapter.ts`：fetch `/api/graph` → 轉換為 React Flow nodes/edges 格式，含空狀態/錯誤處理 | frontend-developer | T1, **G1** | 實作 | adapter 單元測試通過，轉換格式與 React Flow 相容 |
| T5 | React Flow 基礎渲染 | `GraphCanvas.tsx`：將 adapter 產出的 nodes/edges 渲染為可互動圖，含 minimap + 基本縮放平移 | frontend-developer | T4 | 實作 | 瀏覽器可看到節點圖，可縮放平移 |
| T6 | D3 力導向佈局 | `useForceLayout.ts`：D3 force simulation 計算節點位置（forceLink + forceManyBody + forceCenter + forceCollide），佈局穩定後停止 | frontend-developer | T5 | 實作 | 節點自動排列不重疊，依賴關係密集的模組聚合 |
| T7 | 深色霓虹主題實作 | `NeonNode.tsx` + `NeonEdge.tsx` + `DirectoryNode.tsx` + `global.css`：按 T2/T3 設計稿實作霓虹風格節點與邊 | frontend-developer | T3(**G1**), T5 | 實作 | 視覺效果與 mockup 一致，glow 效果可見 |
| T8 | Hover 高亮互動 | `useHoverHighlight.ts`：hover 節點 → 相關依賴路徑亮起、其餘淡化、移開恢復，響應 < 50ms | frontend-developer | T5 | 實作 | hover 高亮正確（入邊+出邊+上下游），響應流暢 |
| T9 | 節點分層 | `layout.ts` + `DirectoryNode.tsx` 更新：zoom out 看目錄、zoom in 看檔案，展開/收合邏輯 | frontend-developer | T6 | 實作 | 兩層切換正確，扁平專案直接顯示檔案 |
| T10 | 流動動畫 | `NeonEdge.tsx` + `animations.css`：邊線上光點粒子流動動畫（CSS animation 優先），支援 `prefers-reduced-motion` | frontend-developer | T7 | 實作 | 粒子沿邊線流動可見，方向正確（source→target） |
| T11 | 動畫過渡 | 展開/收合/聚焦的平滑動畫（Framer Motion 或 React Flow transition），時長 200-400ms | frontend-developer | T7, T9 | 實作 | 展開/收合/聚焦有平滑動畫，無跳閃 |
| T12 | CLI Server 更新 | 更新 `cli/commands/web.ts` + `cli/server.ts`：serve `packages/web/dist/` 的 React build 產物 | devops-automator | T5 | 實作 | `codeatlas web` 可開啟瀏覽器顯示 React UI |
| T13 | 元件測試 + 視覺驗收 | adapter 單元測試、hooks 單元測試、主要元件 render 測試，截圖/錄 GIF 驗收 | test-writer-fixer | T6~T11 | 測試 | 測試覆蓋率 ≥ 70%，CI 通過，截圖/GIF 已產出 |

### 依賴圖

```
T1（Web 專案初始化）──┐
T2（視覺設計）         │
├── T3（HTML Mockup）  │
│                      │
│ ════ G1 圖稿審核 ═══ │
│                      │
├──────────────────────┼── T4（Graph 資料對接）
│                      │       │
│                      │       ▼
│                      └── T5（React Flow 基礎渲染）──── T12（CLI Server 更新）
│                              │
│                     ┌────────┼────────┐
│                     ▼        ▼        ▼
│              T6（力導向佈局） T8（Hover） T7（霓虹主題）←── T3(G1)
│                     │                    │
│                     ▼                    ▼
│              T9（節點分層）         T10（流動動畫）
│                     │                    │
│                     └───────┬────────────┘
│                             ▼
│                      T11（動畫過渡）
│
└── T13（元件測試 + 視覺驗收）←── T6~T11 完成後
```

### 可並行的任務

| 並行組 | 任務 | 條件 |
|--------|------|------|
| 組 0（設計階段） | T1 + T2 | 可同時開始 |
| 組 1（G1 後） | T4 + T12 | G1 通過 + T1 完成 |
| 組 2 | T6 + T7 + T8 | T5 完成後可同時開始（T7 另需 T3/G1） |
| 組 3 | T9 + T10 | T6/T7 完成後可同時開始 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 2 — 模組依賴圖 + 視覺衝擊 的開發計畫。

📄 計畫書：proposal/sprint2-dev-plan.md
📋 確認的流程：需求 → 設計 → UI 圖稿 → G1 → 實作 → G2 → 測試 → G3 → 視覺衝擊力驗收（老闆）

⚠️ 阻斷規則：
- G1（圖稿審核）通過前不得開始實作（T4~T12）
- 深色霓虹主題設計確認前不得開始元件開發

🎨 委派 ui-designer：T2（視覺設計）、T3（HTML Mockup）
🔧 委派 devops-automator：T1（Web 專案初始化）、T12（CLI Server 更新）
🖥️ 委派 frontend-developer：T4, T5, T6, T7, T8, T9, T10, T11（前端核心開發）
🧪 委派 test-writer-fixer：T13（元件測試 + 視覺驗收）

📌 Sprint 1 教訓提醒：
- API 端點必須與 api-design.md 逐項核對
- 所有 JSON.parse 必須包 try-catch
- 版本號統一 0.1.0
- tsup dts.compilerOptions 覆寫 composite:false

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/web/package.json` | T1, T4, T5 | 中（T1 先建立，其他新增依賴） |
| `packages/web/src/styles/theme.ts` | T2, T7, T8, T10 | 高（T2 定義色彩，T7/T8/T10 使用） |
| `packages/web/index.html` | T1 | 低（T1 一次改完） |
| `packages/cli/src/server.ts` | T12 | 低（僅 T12 修改） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `graph-adapter.test.ts` | GraphNode → RF Node 轉換、GraphEdge → RF Edge 轉換、空 graph 處理、metadata 保留完整、edge type 對應正確 |
| `useForceLayout.test.ts` | 力導向佈局產出位置、節點不重疊、simulation 穩定後停止 |
| `useHoverHighlight.test.ts` | hover 正確標記入邊+出邊+上下游、移開恢復、無關節點淡化 |
| `layout.test.ts` | zoom threshold 切換、扁平專案處理、深層巢狀截斷 |

### 元件 Render 測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `GraphCanvas.test.tsx` | 正確渲染 React Flow、空資料顯示提示、錯誤狀態顯示 |
| `NeonNode.test.tsx` | 節點渲染正確、label 顯示、type 對應樣式 |
| `NeonEdge.test.tsx` | 邊渲染正確、動畫 class 存在 |

### 視覺驗收

| 項目 | 驗收方式 |
|------|---------|
| 主畫面截圖 | 與 mockup 比對，視覺一致 |
| Hover 效果 GIF | 錄製 hover → 高亮 → 恢復 |
| 粒子流動 GIF | 錄製邊線粒子流動效果 |
| 節點分層 GIF | 錄製 zoom in/out 切換效果 |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| React Flow + D3 force 整合複雜度 | 高 | 先用 React Flow 原生佈局驗證可行，再替換 D3 force |
| 深色霓虹調色耗時 | 中 | ui-designer 先出設計稿 + 色碼表（T2），確認後再實作（T7） |
| Canvas 粒子動畫效能 | 中 | 先用 CSS animation 簡化版（T10），效果不夠再改 Canvas |
| 節點分層邏輯複雜 | 中 | 先做兩層（目錄/檔案），三層放 Phase 2 |
| Sprint 1 API 格式不適合前端 | 高 | T4 第一優先驗證轉換可行性，不改 core 輸出格式 |
| 時間風險（8 項視覺功能） | 高 | 先做「截圖能成立」的靜態效果（T4~T7），再疊動畫（T8~T11） |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `CLAUDE.md` — 更新 Sprint 2 文件索引 + 新踩坑紀錄
- [x] `.knowledge/architecture.md` — 更新 web package 結構（v3.0，含 Sprint 2+3 元件）
- [x] `.knowledge/specs/feature-spec.md` — 已更新至 v3.0（Sprint 3 時一併更新）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-30 | ✅ 完成 | React 18 + Vite + RF v12 + d3-force + Framer Motion，build 通過 |
| T2 | 2026-03-30 | ✅ 完成 | 視覺風格文件 + theme.ts 設計稿完成，L1 審核通過 |
| T3 | 2026-03-30 | ✅ 完成 | 5 個 HTML mockup 完成，色碼一致、互動可用、粒子動畫正確，L1 審核通過 |
| T4 | 2026-03-30 | ✅ 完成 | api/graph.ts + graph-adapter.ts + useGraphData.ts + types/graph.ts，TS 零錯誤 |
| T5 | 2026-03-30 | ✅ 完成 | GraphCanvas + MiniMap + global.css + App.tsx 整合，三狀態 UI |
| T6 | 2026-03-30 | ✅ 完成 | useForceLayout hook — forceLink + forceManyBody + forceCenter + forceCollide，alphaMin 收斂停止 |
| T7 | 2026-03-30 | ✅ 完成 | NeonNode + NeonEdge + DirectoryNode + theme.ts + global.css，色碼嚴格引用 theme |
| T8 | 2026-03-30 | ✅ 完成 | useHoverHighlight hook — adjacency 預計算 O(1)，入邊+出邊+connected，淡化 0.12/0.35 |
| T9 | 2026-03-30 | ✅ 完成 | layout.ts — ZOOM_THRESHOLD 0.5 + filterNodesByLayer + 扁平專案 fallback |
| T10 | 2026-03-30 | ✅ 完成 | NeonEdge SVG animateMotion 粒子 + animations.css + prefers-reduced-motion |
| T11 | 2026-03-30 | ✅ 完成 | Framer Motion AnimatePresence 展開/收合 + useViewportAnimation 聚焦 |
| T12 | 2026-03-30 | ✅ 完成 | resolveWebDir→dist/ + SPA fallback + pnpm build 全通過 |
| T13 | 2026-03-30 | ✅ 完成 | 33 tests 全通過，純邏輯模組 100% 覆蓋，225 total tests 無回歸 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review（色彩系統 + 元件架構） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — 色彩系統完整、WCAG AA 全達標、theme.ts 可直接引用 |
| UI 圖稿 Review | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — 5 個 mockup 色碼 100% 一致、hover 互動真實、粒子 offset-path 正確 |
| 實作 Review（程式碼品質） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — TS 零錯誤零 any、JSON.parse 全 try-catch、色碼嚴格引用 theme.ts、F7~F15 全實作、API 端點一致 |
| 測試 Review（覆蓋率 + 視覺驗收） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — 33 tests 全通過、adapter/hooks/layout 100% 覆蓋、225 total 無回歸、元件 render 排 Sprint 3 E2E |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-30 | ✅ 通過 | 六問診斷通過，提案書全數通過，無調整 |
| G1 | 2026-03-30 | ✅ 通過 | PM 6 項 checklist 通過，老闆核准。交付物：visual-style.md + theme.ts + 5 HTML mockup，色碼 100% 一致，WCAG AA 達標。老闆確認維持原計畫節奏，文字說明留 Sprint 3 |
| G2 | 2026-03-30 | ✅ 通過 | L1 Review 通過：對程式碼（零 Blocker/Major，TS 零錯誤零 any）+ 對設計稿（色碼嚴格引用 theme.ts）+ 對規範（F7~F15 全實作、API 一致）。三包 build 通過 |
| G3 | 2026-03-30 | ✅ 通過 | 225 tests 全通過（core 192 + web 33），adapter/hooks/layout 覆蓋率 100%，pnpm build 三包成功（web 559KB JS），無回歸 |
| 視覺衝擊力驗收 | 2026-03-31 | ✅ 通過 | 老闆親自驗收，深色霓虹視覺、hover 高亮、粒子流動效果通過。附帶修復 resolveWebDir 路徑 bug（已記錄 postmortem） |

---

**確認**: [x] L1 確認 / [x] Tech Lead 確認
