# Sprint 提案書: Sprint 1 — 專案骨架 + 解析引擎

> **提案人**: PM
> **日期**: 2026-03-30
> **專案**: CodeAtlas
> **狀態**: 待 G0 審核

---

## 1. 目標

建立 CodeAtlas 的 Monorepo 骨架與核心解析引擎（`@codeatlas/core`），讓 core 能掃描 JS/TS 專案並產出結構化的依賴圖 JSON，同時搭建本地 CLI 入口與 Web Server 基礎，為 Sprint 2 的視覺化渲染奠定基礎。

## 2. 範圍定義

### 做

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| 1 | Monorepo 建立 | P0 | pnpm workspace：`packages/core`、`packages/web`、`packages/cli` |
| 2 | 資料模型定義 | P0 | Node 類型（file / directory / function / class）、Edge 類型（import / call / data-flow）的 TypeScript 型別與 JSON schema |
| 3 | tree-sitter 整合 | P0 | Node.js binding 支援 JS/TS grammar，含 Windows 相容性驗證 |
| 4 | 檔案掃描器 | P0 | 遞迴掃描專案目錄，過濾 node_modules / .git / dist 等 |
| 5 | Import 解析器 | P0 | 解析 import/require/export，建立模組間依賴關係 |
| 6 | 高層資料流推導 | P1 | 基於 import/export 推導模組間的資料進出方向（heuristic 級） |
| 7 | Graph JSON 輸出 | P0 | core 輸出標準化的 nodes + edges JSON |
| 8 | AI Provider Interface | P1 | 定義 SummaryProvider 接口 + DisabledProvider + OpenAIProvider + AnthropicProvider（本 Sprint 只定義接口與 stub，不實作 AI 呼叫） |
| 9 | CLI 基礎 | P0 | `codeatlas analyze <path>` 指令可用 |
| 10 | 本地 Web Server | P1 | CLI 啟動薄 HTTP server，serve 靜態前端佔位頁 + graph JSON API |

### 不做（明確排除）

- Web UI 視覺渲染（Sprint 2）
- React Flow / D3 / 動畫（Sprint 2）
- AI 摘要實際呼叫（Sprint 3）
- 多語言支援（Phase 2）
- npm 發佈（Sprint 4）
- 設定檔 `.codeatlas.json`（Sprint 4）
- 函式級解析與呼叫鏈（Phase 2）
- 效能優化（Sprint 4）

## 3. 流程決策（G0 核心產出）

> **本區由老闆在 G0 審核時勾選確認，決定後續要走哪些步驟和關卡。**

### 步驟勾選

| 勾選 | 步驟 | 說明 | 對應關卡 | 備註 |
|------|------|------|---------|------|
| [x] | 需求分析 | 需求文件、任務拆解 | G0（本文件） | 必選 |
| [x] | 設計 | 架構/API 設計 | — | Monorepo 結構 + 資料模型 + AI Provider 接口 |
| [ ] | UI 圖稿 | HTML mockup | G1: 圖稿審核 | Sprint 1 無 UI |
| [x] | 實作 | 程式碼開發 | G2: 程式碼審查 | 核心引擎 + CLI |
| [x] | 測試 | 單元測試 | G3: 測試驗收 | parser + analyzer 測試 |
| [ ] | 文件 | 文件更新 | G4: 文件審查 | Sprint 4 統一處理 |
| [ ] | 部署 | 環境配置、CI/CD | G5: 部署就緒 | Sprint 4 |
| [ ] | 發佈 | 正式對外發佈 | G6: 正式發佈 | Sprint 4 |

### 阻斷規則（勾選適用的）

- [x] 資料模型定義完成前，不得開始 Import 解析器
- [x] tree-sitter 整合驗證通過前，不得開始 Import 解析器
- [x] G2（程式碼審查）通過前，不得進入測試階段

### 額外步驟（不在標準清單內的）

| 勾選 | 步驟名稱 | 說明 | 審核方式 |
|------|---------|------|---------|
| [x] | tree-sitter Windows 相容性驗證 | 確認 native binding 在 Windows 可用，否則切 WASM | L1 自審，結果回報老闆 |

## 4. 團隊分配

| 角色 | Agent | 負責範圍 |
|------|-------|---------|
| L1 領導 | tech-lead | 架構設計、core 實作、Review、整體品質 |
| L2 執行 | backend-architect | 資料模型、parser、analyzer 實作 |
| L2 執行 | frontend-developer | Web 佔位頁、CLI server 基礎 |
| L2 執行 | devops-automator | Monorepo 建置、CI 基礎設定 |
| L2 執行 | test-writer-fixer | 單元測試撰寫 |

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| tree-sitter native binding Windows 不相容 | 中 | 高 | Sprint 1 第一週驗證，備案切 WASM |
| JS/TS import 解析 edge case 多 | 高 | 中 | 先支援主流 pattern（ESM/CJS），exotic pattern 標記為未解析 |
| pnpm workspace 跨 package 引用問題 | 低 | 中 | 開發初期先驗證 core → cli 引用鏈 |
| 資料模型設計不夠彈性，後續要大改 | 中 | 高 | 參考既有工具（Madge、dependency-cruiser）的 graph model |

## 6. 失敗模式分析

| 失敗場景 | 可能性 | 影響 | 偵測方式 | 緩解措施 |
|---------|--------|------|---------|---------|
| tree-sitter 解析大量檔案時記憶體溢出 | 低 | 高 | 測試 500+ 檔案專案 | 串流處理、單檔解析後釋放 |
| Import 路徑解析錯誤（alias、barrel export） | 高 | 中 | 用真實專案驗證 | 先支援直接路徑，alias 標記未解析 |
| Graph JSON 結構不夠通用，Sprint 2 渲染層要大改 | 中 | 高 | Sprint 1 結束前用 mock 前端驗證 JSON 結構 | 預先定義 React Flow 需要的 node/edge 格式 |

## 7. 可觀測性

> Sprint 1 為本地工具，可觀測性以 CLI 輸出為主。

- **日誌策略**: CLI verbose mode (`--verbose`)，顯示掃描進度、解析成功/失敗、耗時
- **關鍵指標**: 掃描檔案數、解析成功數、解析失敗數、總耗時
- **錯誤報告**: 解析失敗的檔案路徑 + 原因記錄到 JSON 輸出

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | git revert，Sprint 1 為全新建置，回滾即刪除整個結構 |
| DB 回滾 | 無 DB，不適用 |
| 判斷標準 | tree-sitter 完全不可用且 WASM 備案也失敗 → 評估替代 parser |
| 負責人 | tech-lead |

## 9. 驗收標準

### 核心功能

- [ ] `codeatlas analyze ./sample-project` 能掃描 JS/TS 專案並輸出 graph JSON
- [ ] Graph JSON 包含正確的 file nodes 和 import edges
- [ ] 解析 ESM（import/export）和 CJS（require/module.exports）
- [ ] 100 檔案的專案分析時間 < 10 秒
- [ ] 解析失敗的檔案不阻塞整體流程

### 架構

- [ ] Monorepo 結構可用：core / web / cli 三個 package 可獨立建置
- [ ] core 零 UI 依賴，可被 cli 和 web 獨立引用
- [ ] AI Provider Interface 已定義，DisabledProvider 可用

### CLI

- [ ] `codeatlas analyze <path>` 可正常執行
- [ ] `codeatlas web` 可啟動本地 server，瀏覽器能打開佔位頁
- [ ] CLI help (`--help`) 可用

### 測試

- [ ] Scanner 單元測試 ≥ 80% 覆蓋
- [ ] Parser（import 解析）單元測試 ≥ 80% 覆蓋
- [ ] Analyzer（依賴圖建構）單元測試 ≥ 80% 覆蓋

### 平台相容性

- [ ] Windows 上 npm install + codeatlas analyze 能正常運作
- [ ] tree-sitter 方案確認（native 或 WASM）

---

**G0 審核結果**

**老闆決策**: [x] 通過

**審核意見**: 無調整，按提案執行。六問診斷已通過（附帶條件：dev-plan 補建架構文件 + Sprint 1 首週完成 tree-sitter Windows 驗證）。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3

**G0 通過日期**: 2026-03-30
