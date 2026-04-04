# 開發計畫書: Sprint 1 — 專案骨架 + 解析引擎

> **撰寫者**: PM（代 Tech Lead 產出，Tech Lead 開工後確認）
> **日期**: 2026-03-30
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint1-proposal.md`
> **狀態**: G0 通過，待執行

---

## 1. 需求摘要

建立 CodeAtlas 的 Monorepo 骨架與核心解析引擎（`@codeatlas/core`），讓 `codeatlas analyze` 能掃描 JS/TS 專案並產出結構化的依賴圖 JSON。同時搭建 CLI 入口與本地 Web Server 基礎，為 Sprint 2 的視覺化渲染奠定基礎。

### 確認的流程

需求 → 設計 → 實作 → G2 → 測試 → G3

---

## 2. 技術方案

### 選定方案

**Monorepo + tree-sitter + Fastify 本地 server**

| 層 | 技術 | 說明 |
|----|------|------|
| Monorepo 管理 | pnpm workspace | 輕量、快速、原生支援 workspace |
| 語言 | TypeScript（全端） | core / cli / web 統一 |
| 解析引擎 | tree-sitter (Node.js binding) | 語言無關、高效能，備案 WASM |
| 本地 Server | Fastify | 輕量 HTTP，serve 靜態前端 + JSON API |
| 打包 | tsup | 快速 TypeScript 打包 |
| 測試 | Vitest | 快速、TypeScript 原生支援 |
| 程式碼品質 | ESLint + Prettier | 標準化 |

### 替代方案比較

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: tree-sitter native binding | 效能最好、社群最大 | Windows 可能有原生編譯問題 | ✅ 首選，Sprint 1 首週驗證 |
| B: tree-sitter WASM | 跨平台零摩擦 | 效能略差（可接受） | 備案 |
| C: Babel parser | JS/TS 專用，零原生依賴 | 不支援其他語言、未來擴充受限 | 最後防線 |

### 架構決策

**三層分離原則**（從路線圖帶入）：

```
core（純分析引擎）→ 不依賴任何 UI、不管 server、可被任何消費端引用
cli（入口 + 編排）→ 呼叫 core + 啟動 server + serve 靜態前端 + graph JSON
web（純前端）     → 讀 JSON 渲染，不直接依賴 core（Sprint 2 開始）
```

---

## 3. UI 圖稿

Sprint 1 無 UI 設計，僅有 Web 佔位頁。不適用。

---

## 4. 檔案變更清單

### 新增

| 檔案/目錄 | 用途 |
|----------|------|
| `pnpm-workspace.yaml` | Monorepo 設定 |
| `package.json` | Root package |
| `tsconfig.base.json` | 共用 TypeScript 設定 |
| `.eslintrc.js` | ESLint 設定 |
| `.prettierrc` | Prettier 設定 |
| `.gitignore` | Git 忽略規則 |
| `packages/core/` | 核心解析引擎 |
| `packages/core/package.json` | core package 設定 |
| `packages/core/tsconfig.json` | core TypeScript 設定 |
| `packages/core/src/index.ts` | core 入口 |
| `packages/core/src/types.ts` | 資料模型型別定義 |
| `packages/core/src/scanner/index.ts` | 檔案掃描器 |
| `packages/core/src/parser/index.ts` | tree-sitter 解析器入口 |
| `packages/core/src/parser/import-resolver.ts` | Import 路徑解析 |
| `packages/core/src/analyzer/index.ts` | 依賴分析器 |
| `packages/core/src/analyzer/graph-builder.ts` | Graph 組裝 |
| `packages/core/src/ai/types.ts` | SummaryProvider interface |
| `packages/core/src/ai/disabled.ts` | DisabledProvider |
| `packages/core/src/ai/openai.ts` | OpenAIProvider stub |
| `packages/core/src/ai/anthropic.ts` | AnthropicProvider stub |
| `packages/core/src/ai/index.ts` | AI 模組入口 |
| `packages/cli/` | CLI 入口 |
| `packages/cli/package.json` | cli package 設定 |
| `packages/cli/tsconfig.json` | cli TypeScript 設定 |
| `packages/cli/src/index.ts` | CLI 入口（bin） |
| `packages/cli/src/commands/analyze.ts` | analyze 指令 |
| `packages/cli/src/commands/web.ts` | web 指令 |
| `packages/cli/src/server.ts` | 本地 HTTP server |
| `packages/web/` | Web 前端（Sprint 1 僅佔位頁） |
| `packages/web/package.json` | web package 設定 |
| `packages/web/index.html` | 佔位頁 |
| `packages/core/__tests__/` | core 測試目錄 |
| `packages/core/__tests__/scanner.test.ts` | Scanner 測試 |
| `packages/core/__tests__/parser.test.ts` | Parser 測試 |
| `packages/core/__tests__/analyzer.test.ts` | Analyzer 測試 |
| `packages/core/__tests__/fixtures/` | 測試用假專案 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `CLAUDE.md` | 更新技術棧、專案簡介 |
| `.knowledge/architecture.md` | 更新為 CodeAtlas 專屬架構（Monorepo 三層分離） |

### 刪除

無。

---

## 5. 規範文件索引

| 檔案 | 內容 | 狀態 |
|------|------|------|
| `.knowledge/specs/data-model.md` | Node/Edge 型別、JSON schema、命名規範 | ✅ 已建立 |
| `.knowledge/specs/api-design.md` | 本地 server API 端點、CLI 指令、錯誤碼 | ✅ 已建立 |
| `.knowledge/specs/feature-spec.md` | Scanner/Parser/Analyzer/CLI 功能規格、邊界條件 | ✅ 已建立 |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|---------|---------|
| T1 | Monorepo 骨架建立 | pnpm workspace + core/cli/web 三個 package + tsconfig + eslint + prettier + gitignore | devops-automator | 無 | 設計 | 三個 package 可獨立 build，`pnpm install` 成功 |
| T2 | 資料模型型別定義 | 按 data-model.md 定義 GraphNode / GraphEdge / AnalysisResult 等型別 | backend-architect | T1 | 設計 | 型別檔可被 core 內所有模組引用，與 spec 一致 |
| T3 | tree-sitter 整合 + Windows 驗證 | 安裝 tree-sitter + JS/TS grammar，驗證 Windows 相容性，不行就切 WASM | backend-architect | T1 | 實作 | 能解析一段 JS/TS 程式碼產出 AST，Windows 上可用 |
| T4 | 檔案掃描器（Scanner） | 遞迴掃描目錄，過濾 node_modules 等，輸出 file/directory node 清單 | backend-architect | T2 | 實作 | 掃描真實專案，輸出正確的檔案清單，忽略規則正確 |
| T5 | Import 解析器（Parser） | 用 tree-sitter 解析 import/require/export，輸出依賴邊清單 | backend-architect | T2, T3 | 實作 | ESM + CJS import 正確解析，路徑解析 + 自動補副檔名 |
| T6 | 依賴分析器（Analyzer） | 將 Scanner + Parser 結果組裝成 Graph JSON（含高層資料流推導） | backend-architect | T4, T5 | 實作 | 輸出的 JSON 符合 data-model.md schema，含 stats |
| T7 | AI Provider Interface | 定義 SummaryProvider 接口 + DisabledProvider + OpenAI/Anthropic stub | backend-architect | T2 | 實作 | interface 可用，DisabledProvider 回傳預設訊息 |
| T8 | CLI `analyze` 指令 | 實作 `codeatlas analyze [path]`，串接 Scanner → Parser → Analyzer → 輸出 JSON | backend-architect | T6 | 實作 | CLI 可執行，輸出 `.codeatlas/analysis.json`，終端機顯示統計 |
| T9 | CLI `web` 指令 + 本地 Server | 實作 `codeatlas web`，啟動 Fastify server，serve 佔位頁 + API | frontend-developer | T6, T8 | 實作 | `codeatlas web` 可開啟瀏覽器，`/api/graph` 回傳 JSON |
| T10 | 單元測試 | Scanner / Parser / Analyzer 單元測試，覆蓋率 ≥ 80% | test-writer-fixer | T4, T5, T6 | 測試 | 三個模組測試覆蓋 ≥ 80%，CI 通過 |
| T11 | CI 設定 | GitHub Actions：lint + type-check + test | devops-automator | T10 | 測試 | push 後自動跑 CI，全通過 |

### 依賴圖

```
T1（Monorepo 骨架）
├── T2（資料模型）
│   ├── T4（Scanner）──────────┐
│   ├── T5（Parser）───────────┤
│   │   └── T3（tree-sitter）  │
│   └── T7（AI Provider）      │
│                              ▼
│                        T6（Analyzer）
│                              │
│                     ┌────────┤
│                     ▼        ▼
│               T8（CLI analyze）
│                     │
│                     ▼
│               T9（CLI web + Server）
│
└── T10（單元測試）←── T4, T5, T6
         │
         ▼
    T11（CI 設定）
```

### 可並行的任務

| 並行組 | 任務 | 條件 |
|--------|------|------|
| 組 1 | T2 + T3 | T1 完成後可同時開始 |
| 組 2 | T4 + T5 + T7 | T2 完成後可同時開始（T5 另需 T3） |
| 組 3 | T10 | 可與 T8/T9 並行，但需 T4/T5/T6 先完成 |

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 tech-lead session 即可啟動。

```
請執行 Sprint 1 — 專案骨架 + 解析引擎 的開發計畫。

📄 計畫書：proposal/sprint1-dev-plan.md
📋 確認的流程：需求 → 設計 → 實作 → G2 → 測試 → G3

🔧 委派 devops-automator：T1（Monorepo 骨架）、T11（CI 設定）
🔧 委派 backend-architect：T2, T3, T4, T5, T6, T7, T8（核心引擎全線）
🔧 委派 frontend-developer：T9（CLI web + Server）
🔧 委派 test-writer-fixer：T10（單元測試）

⚠️ 阻斷規則：
- T5 依賴 T2 + T3
- T6 依賴 T4 + T5
- T8 依賴 T6
- T9 依賴 T6 + T8
- G2 通過前不得進入測試階段

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/core/src/types.ts` | T2, T4, T5, T6, T7 | 中（T2 先建立，其他讀取） |
| `packages/core/src/index.ts` | T4, T5, T6, T7, T8 | 低（各模組 export 集中處） |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `scanner.test.ts` | 掃描含 JS/TS 檔案的目錄、忽略 node_modules、忽略非 JS/TS 檔、空目錄處理、symlink 跳過 |
| `parser.test.ts` | ESM named import、ESM default import、ESM namespace import、CJS require、re-export、dynamic import 標記、路徑解析 + 補副檔名、解析失敗不拋錯 |
| `analyzer.test.ts` | 單檔無依賴、兩檔互相依賴、多層依賴鏈、統計數字正確、錯誤檔案記錄、Graph JSON schema 驗證 |
| `ai-provider.test.ts` | DisabledProvider 回傳預設值、Provider interface 型別正確 |

### 測試 Fixture

建立 `packages/core/__tests__/fixtures/` 下的假專案：

| Fixture | 內容 | 用途 |
|---------|------|------|
| `simple-project/` | 3 個 JS 檔，簡單 import | 基本功能測試 |
| `ts-project/` | 5 個 TS 檔，ESM + type import | TypeScript 支援 |
| `cjs-project/` | 3 個 CJS 檔，require | CJS 支援 |
| `mixed-project/` | ESM + CJS 混合 | 混合模式 |
| `large-project/` | 腳本生成 100+ 檔案 | 效能測試 |
| `error-project/` | 含語法錯誤的檔案 | 錯誤處理 |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| tree-sitter Windows 原生編譯失敗 | 高 | T3 第一優先驗證，備案 WASM，最終防線 Babel |
| Import 路徑解析 edge case（alias、barrel） | 中 | Phase 1 只做直接路徑，alias 標記未解析 |
| pnpm workspace 跨 package 引用問題 | 中 | T1 驗證 core → cli 引用鏈 |
| Graph JSON 結構不夠通用，Sprint 2 要大改 | 高 | T6 完成後用 mock 前端驗證 JSON 可渲染性 |
| 測試 fixture 覆蓋不足 | 中 | 用真實開源專案做 smoke test |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `CLAUDE.md` — 更新踩坑紀錄索引（4 項踩坑經驗）
- [x] `.knowledge/architecture.md` — 更新為 CodeAtlas 專屬架構（三層分離 + 資料流 + 技術決策）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-03-30 | ✅ 完成 | pnpm install 成功，三 package build+type-check 通過 |
| T2 | 2026-03-30 | ✅ 完成 | 11 個型別定義完成，與 data-model.md 一致 |
| T3 | 2026-03-30 | ✅ 完成 | native tree-sitter 成功（win32-x64 prebuild），三層 Provider 抽象已建立 |
| T4 | 2026-03-30 | ✅ 完成 | Scanner 實作完成，邊界條件處理完整 |
| T5 | 2026-03-30 | ✅ 完成 | 雙 AST dialect 支援，import/export 解析 + 路徑解析完整 |
| T6 | 2026-03-30 | ✅ 完成 | Analyzer 串接完整，深拷貝+去重+stats 計算 |
| T7 | 2026-03-30 | ✅ 完成 | DisabledProvider + OpenAI/Anthropic stub + createProvider factory |
| T8 | 2026-03-30 | ✅ 完成 | CLI analyze 指令完整，--verbose/--ignore flags |
| T9 | 2026-03-30 | ✅ 完成 | Fastify server + 4 API 端點 + 佔位頁 + 自動 analyze |
| T10 | 2026-03-30 | ✅ 完成 | 192 tests 全通過，覆蓋率 88.84%，8 test files |
| T11 | 2026-03-30 | ✅ 完成 | GitHub Actions CI: lint+type-check+build+test，本地全通過 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review（架構 + 資料模型） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — 型別與 data-model.md 一致 |
| 實作 Review（程式碼品質） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:3 — 修復 3 Blocker+1 Major 後通過：AI endpoint 補齊、JSON.parse 防護、版本號統一、Fastify 安全限制 |
| 測試 Review（覆蓋率 + 案例） | 2026-03-30 | 通過 | Blocker:0 Major:0 Minor:0 — 192 tests 全通過，覆蓋率 88.84%，CI pipeline 完整 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-03-30 | ✅ 通過 | 六問診斷通過，提案書通過 |
| G2 | 2026-03-30 | ✅ 通過 | L1 Review 通過，3 Blocker + 1 Major 已修復，build + type-check 全綠 |
| G3 | 2026-03-30 | ✅ 通過 | 192 tests 全通過，覆蓋率 88.84% (>80%)，CI 全綠。PM 審核 6 項 checklist 通過，老闆核准 |

---

**確認**: [x] Tech Lead 確認
