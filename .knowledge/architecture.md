# CodeAtlas 架構參考

> **版本**: v3.0
> **最後更新**: 2026-03-31
> **Sprint**: 3

---

## 架構概述

CodeAtlas 採用 Monorepo 三層分離架構，使用 pnpm workspace 管理。

```
core（純分析引擎）→ 不依賴任何 UI、不管 server、可被任何消費端引用
cli（入口 + 編排）→ 呼叫 core + 啟動 server + serve 靜態前端 + graph JSON
web（純前端）     → 讀 JSON 渲染，不直接依賴 core（Sprint 2 開始）
```

## Package 結構

```
codeatlas/
├── packages/
│   ├── core/                    # @codeatlas/core — 核心解析引擎
│   │   ├── src/
│   │   │   ├── types.ts         # 資料模型型別（GraphNode, GraphEdge, AnalysisResult）
│   │   │   ├── scanner/         # F1: 檔案掃描器
│   │   │   │   └── index.ts     #   scanDirectory() → ScanResult
│   │   │   ├── parser/          # F2: Import 解析器
│   │   │   │   ├── ast-provider.ts      # AstProvider 介面
│   │   │   │   ├── parser-factory.ts    # parseSource() 工廠
│   │   │   │   ├── import-extractor.ts  # AST → ParsedImport/ParsedExport
│   │   │   │   ├── import-resolver.ts   # 路徑解析 + 副檔名補全
│   │   │   │   ├── index.ts             # barrel export
│   │   │   │   └── providers/           # 三層 AST Provider
│   │   │   │       ├── native-tree-sitter.ts    # 首選：native binding
│   │   │   │       ├── wasm-tree-sitter.ts      # 備案：WASM
│   │   │   │       └── typescript-compiler.ts   # 最後防線：ts.createSourceFile
│   │   │   ├── analyzer/        # F3: 依賴分析器
│   │   │   │   ├── graph-builder.ts  # buildGraph() → nodes + edges + stats
│   │   │   │   └── index.ts          # analyze() 主入口
│   │   │   ├── ai/              # F6: AI Provider Interface
│   │   │   │   ├── types.ts     # re-export SummaryProvider/SummaryContext
│   │   │   │   ├── disabled.ts  # DisabledProvider
│   │   │   │   ├── openai.ts    # OpenAIProvider stub
│   │   │   │   ├── anthropic.ts # AnthropicProvider stub
│   │   │   │   └── index.ts     # createProvider() factory
│   │   │   └── index.ts         # package 入口（re-export 所有模組）
│   │   └── __tests__/           # 192 unit tests
│   │       └── fixtures/        # 6+ 測試用假專案
│   ├── cli/                     # @codeatlas/cli — CLI 入口
│   │   └── src/
│   │       ├── index.ts         # commander 程式入口（bin）
│   │       ├── server.ts        # Fastify HTTP server（5 端點）
│   │       └── commands/
│   │           ├── analyze.ts   # codeatlas analyze [path]
│   │           └── web.ts       # codeatlas web [path]
│   └── web/                     # @codeatlas/web — Web 前端（React + Vite）
│       ├── src/
│       │   ├── main.tsx                  # React 入口
│       │   ├── App.tsx                   # 主元件（GraphCanvas + NodePanel + SearchBar）
│       │   ├── types/graph.ts            # Core 型別複製（web 隔離）
│       │   ├── api/
│       │   │   ├── graph.ts              # fetch /api/graph
│       │   │   ├── node.ts               # fetch /api/node/:id
│       │   │   └── ai.ts                 # fetch /api/ai/summary + /api/ai/status
│       │   ├── adapters/
│       │   │   └── graph-adapter.ts      # AnalysisResult → React Flow nodes/edges
│       │   ├── components/
│       │   │   ├── GraphCanvas.tsx        # ReactFlow 容器 + 縮放平移 + onClick
│       │   │   ├── NeonNode.tsx           # Cyan 系 file 節點
│       │   │   ├── NeonEdge.tsx           # 霓虹邊 + SVG 粒子流動
│       │   │   ├── DirectoryNode.tsx      # Magenta 系目錄節點 + Framer Motion
│       │   │   ├── NodePanel.tsx          # 右側詳情面板（Sprint 3）
│       │   │   ├── CodePreview.tsx        # 原始碼預覽 + syntax highlight（Sprint 3）
│       │   │   ├── AiSummary.tsx          # AI 摘要區塊（Sprint 3）
│       │   │   └── SearchBar.tsx          # 搜尋框 + 即時過濾（Sprint 3）
│       │   ├── hooks/
│       │   │   ├── useGraphData.ts        # 資料載入 hook
│       │   │   ├── useForceLayout.ts      # D3 force simulation hook
│       │   │   ├── useHoverHighlight.ts   # Hover 高亮邏輯 hook
│       │   │   ├── useViewportAnimation.ts # 聚焦動畫 hook
│       │   │   ├── useNodeDetail.ts       # 節點詳情載入 hook（Sprint 3）
│       │   │   ├── useSearch.ts           # 搜尋邏輯 hook（Sprint 3）
│       │   │   └── useAiSummary.ts        # AI 摘要呼叫 hook（Sprint 3）
│       │   ├── styles/
│       │   │   ├── theme.ts              # 霓虹色彩系統（from G1 設計稿）
│       │   │   ├── global.css            # 深色背景 + 狀態 UI
│       │   │   └── animations.css        # 粒子流動 CSS
│       │   └── utils/
│       │       └── layout.ts             # 節點分層 + zoom 邏輯
│       ├── __tests__/                    # 前端測試（42 tests）
│       ├── index.html
│       └── vite.config.ts
├── .github/workflows/ci.yml    # GitHub Actions CI
├── tsconfig.base.json           # 共用 TS 設定（strict mode）
├── .eslintrc.js                 # ESLint 設定
├── .prettierrc                  # Prettier 設定
└── pnpm-workspace.yaml          # workspace 定義
```

## 資料流

```
使用者執行 codeatlas analyze [path]
    │
    ▼
CLI (cli/commands/analyze.ts)
    │ 呼叫 core.analyze(path)
    ▼
Scanner (core/scanner/)
    │ 遞迴掃描目錄 → GraphNode[]
    ▼
Parser (core/parser/)
    │ tree-sitter AST → import/export 提取 → 路徑解析 → GraphEdge[]
    ▼
Analyzer (core/analyzer/)
    │ 組裝 nodes + edges + stats → AnalysisResult
    ▼
CLI 輸出 .codeatlas/analysis.json + 終端機統計

使用者執行 codeatlas web
    │
    ▼
CLI (cli/commands/web.ts)
    │ 如無 analysis.json → 自動執行 analyze
    ▼
Fastify Server (cli/server.ts)
    │ GET /api/health, /api/graph, /api/graph/stats, /api/node/:id
    │ POST /api/ai/summary
    │ 靜態檔案 serve → packages/web/
    ▼
瀏覽器顯示 Web UI
    │
    ▼
Web 前端（React + React Flow）
    │ useGraphData → graph-adapter → React Flow nodes/edges
    │ NeonNode / NeonEdge / DirectoryNode → 霓虹視覺渲染
    │ useForceLayout → D3 力導向佈局
    │ useHoverHighlight → Hover 高亮
    │ NodePanel → /api/node/:id → 詳情面板（Sprint 3）
    │ SearchBar → 前端過濾 → fitView 聚焦（Sprint 3）
    │ AiSummary → /api/ai/summary → AI 摘要（Sprint 3）
```

## 技術決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| AST 解析器 | tree-sitter native binding | Windows 有 prebuild，效能最佳，語言無關 |
| Provider 抽象 | 三層 fallback（native→WASM→TS compiler） | 確保任何環境都能運行 |
| 本地 Server | Fastify v5 | 輕量、TypeScript 友好、高效能 |
| CLI 框架 | Commander | 社群最大、API 穩定 |
| 打包 | tsup | 快速、ESM+CJS 雙輸出、自動 DTS |
| 測試 | Vitest + v8 coverage | 快速、TypeScript 原生支援 |

## 已知限制（Sprint 3）

- Path alias（`@/utils`）未解析，標記為未解析
- `data-flow` / `call` edge 型別已定義但未產生（Phase 2）
- ~~AI Provider 為 stub~~ → Sprint 3 已接通 OpenAI + Anthropic
- ~~Web UI 為佔位頁~~ → Sprint 2 已實作 React Flow 視覺渲染
- `.codeatlas.json` 設定檔未實作（只支援 CLI flags，Sprint 4）
- 效能優化未做（500+ 檔案虛擬化，Sprint 4）
- 自然語言搜尋未做（Phase 2）
