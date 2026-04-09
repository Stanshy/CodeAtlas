# CodeAtlas — Agent 指南

> 本文件為專案索引導航，所有 Agent 執行任務前必須先閱讀本文件，再依任務需求查閱對應文件。

---

## 專案簡介

- **專案名稱**: CodeAtlas
- **類型**: 開源 local-first 專案視覺化工具（CLI + 本地 Web UI）
- **核心價值**: 讓任何人在 5 分鐘內看懂一個陌生專案的架構與資料流
- **目標用戶**: 工程師、Vibe coder、非工程角色（PM/QA/老闆）
- **開發平台**: Windows
- **產品形態**: npm 套件，本地安裝執行，程式碼不出站

## 共用開發規則

> 以下 2 份文件包含所有 Agent 必須遵循的共用規則，執行任務前**必須先閱讀**。

| 文件 | 內容 |
|------|------|
| `.knowledge/company-rules.md` | 文件治理、文件層級、禁止憑空想像、命名骨架、Commit 紀律、依賴/環境變數規則 |
| `.knowledge/team-workflow.md` | 團隊架構、指揮鏈、Sprint 流程、Gate、Review、上線/回滾 |

## 命名規範

| 層 | 風格 | 範例 |
|----|------|------|
| Package 名 | `@codeatlas/*` | `@codeatlas/core`, `@codeatlas/cli` |
| 檔案名 | kebab-case | `graph-builder.ts`, `import-resolver.ts` |
| TypeScript 型別 | PascalCase | `GraphNode`, `AnalysisResult` |
| 變數/函式 | camelCase | `analyzeProject`, `graphData` |
| 本地 API JSON | camelCase | `fileSize`, `importCount` |

## 技術棧

| 類型 | 技術 |
|------|------|
| 語言 | TypeScript（全端） |
| Monorepo | pnpm workspace |
| 前端 | React + TypeScript |
| 圖譜渲染 | React Flow + D3.js |
| 動畫 | Framer Motion + Canvas API |
| 解析引擎 | tree-sitter（Node.js binding，備案 WASM） |
| 本地 Server | Fastify |
| 本地儲存 | JSON + SQLite（可選） |
| AI | 可插拔 Provider（Claude / OpenAI / 關閉） |
| 打包 | tsup / esbuild |
| 測試 | Vitest |
| CI/CD | GitHub Actions |

## 架構原則

```
core（純分析引擎）→ 不依賴任何 UI、不管 server
cli（入口 + 編排）→ 呼叫 core + 啟動 server + serve 前端 + graph JSON
web（純前端）     → 讀 JSON 渲染，不直接依賴 core
```

## 本地 API 串接規則

1. **core 只輸出 Graph JSON**：不管 server、不管 UI
2. **cli 負責 serve**：啟動 Fastify server，serve 靜態前端 + graph JSON
3. **web 讀取 API**：純前端，透過 `/api/graph` 取得資料
4. **API 設計以 `.knowledge/specs/api-design.md` 為準**

## 踩坑紀錄

> 詳見 `.knowledge/postmortem-log.md`

| 問題 | 原因 | 正確做法 |
|------|------|---------|
| tsup DTS + composite:true 衝突 | tsup worker 不認 composite 專案引用 | tsup dts.compilerOptions 覆寫 composite:false |
| API 端點遺漏 | 實作時未逐一對照 api-design.md | 分派任務時附規範 checklist，逐端點核對 |
| JSON.parse 無防護 | 只包了 readFile 未包 parse | 所有 JSON.parse 必須包 try-catch |
| 版本號不一致 | 多處硬編碼版本 | 版本號抽為共用常數 |

## 可用指令（Slash Commands）— 強制使用

> 以下指令已部署到 `.claude/commands/`。
> **使用方式**：讀取對應的 `.claude/commands/{指令名}.md` 檔案，依照其中的步驟執行。
>
> ⚠️ **SOP 強制規則（違反視同未完成任務）**：
> - L2 開始執行任務 → 必須使用 `/sop-execute`，不得直接呼叫 `/task-start`
> - L1 開始規劃任務 → 必須使用 `/sop-plan`，不得直接呼叫 `/task-delegation`
> - L1 進行 Code Review → 必須使用 `/sop-review`，不得直接呼叫 `/review`
> - 任何部署動作 → 必須使用 `/sop-deploy`，不得直接呼叫 `/pre-deploy`
>
> **強制規則：遇到下列「使用時機」描述的場景時，必須執行對應指令，不得跳過或手動替代。**
> 違反此規則等同未完成任務。

| 指令 | 用途 | 使用時機（遇到即必須執行） |
|------|------|--------------------------|
| `/project-kickoff` | 初始化專案結構 | 專案建立後第一件事 |
| `/product-diagnosis` | 產品六問診斷（G0 前置） | 提案前驗證產品方向 |
| `/sprint-proposal` | 產出 Sprint 提案書 | Sprint 規劃階段 |
| `/dev-plan` | 產出開發計畫書 | G0 通過後展開任務 |
| `/task-dispatch` | 老闆派工，建立 .tasks/ 檔案 | 老闆分配任務時 |
| `/task-delegation` | 拆解任務到計畫書第 6 節 | L1 拆解子任務時 |
| `/task-start` | 標記任務為進行中 | Agent 開始執行任務時 |
| `/task-status` | 更新任務狀態 | 任務狀態變更時（blocked、assigned 等） |
| `/task-done` | 標記任務完成（待審查） | 任務交付時 |
| `/task-approve` | L1 審核通過，標記為 done | L1 Review 通過後 |
| `/review` | L1 內部 Code Review | 程式碼完成後送審 |
| `/pm-review` | PM 審核 Gate 提交 | L1 提交 Gate 後 |
| `/gate-record` | 記錄 Gate 審查決策 | Gate 審查結果出爐時 |
| `/pre-deploy` | 上線前檢查清單（G5） | 部署前最後確認 |
| `/pitfall-record` | 記錄踩坑經驗 | 發現問題時立即記錄 |
| `/pitfall-resolve` | 標記踩坑已解決 | 問題修復後 |
| `/sprint-retro` | Sprint 回顧報告 | Sprint 結束時 |
| `/sprint-close` | 結案 Sprint，merge 回主幹 | 老闆 + PM 確認所有 Gate 通過後 |
| `/harness-audit` | Harness 健康度稽核 | 定期檢查 |
| `/sop-plan` | L1 計畫模式 SOP（上下文載入 + Plan Mode 評估） | L1 收到任務分派後，開始規劃前 |
| `/sop-execute` | L2 任務執行 SOP（規範強制載入 + 驗收確認） | L2 開始執行任務時 |
| `/sop-review` | L1 Code Review SOP（規範對照 + 審核決策） | L1 進行 Code Review 時 |
| `/sop-deploy` | 部署 SOP（品質 checklist + Gate G5） | 部署前 |
| `/spec-update` | 規範文件更新（版本遞增 + 變更記錄） | 修改任何 .knowledge/specs/ 文件時 |

## Git 版控流程（強制）

> 詳細規範見 AgentHub `.knowledge/company/sop/git-flow.md`

| 角色 | 操作 | 說明 |
|------|------|------|
| dev-plan 產出後 | `git checkout -b sprint-{N}` | 從主幹建立 Sprint branch |
| task-start（循序） | 直接在 sprint-{N} commit | `並行組 = —` 的任務 |
| task-start（並行） | `git checkout -b task/s{N}-T{id}-{slug}` | `並行組 = A/B/C...` 的任務 |
| task-approve（並行） | merge task → sprint-{N}，刪 branch | code 進 sprint 後依賴才解鎖 |
| sprint-close | merge sprint-{N} → 主幹，tag，清理 | 老闆 + PM 確認後執行 |

**task-dispatch 必須標記 `| 並行組 |` 欄位**：`—` = 循序，`A/B/C` = 同組可並行。

## 專案文件索引

> 完整分類索引見 `.knowledge/file-index.md`。以下為快速入口。

| 文件 | 說明 |
|------|------|
| `.knowledge/file-index.md` | **完整文件索引**（共用規則、規範、Sprint 1-15 紀錄、架構設計、公司知識庫） |
| `.knowledge/company-rules.md` | 共用開發規則（所有 Agent 必讀） |
| `.knowledge/team-workflow.md` | 共用工作流程（所有 Agent 必讀） |
| `.knowledge/specs/data-model.md` | 資料模型規格 v8.0（🔴 規範） |
| `.knowledge/specs/api-design.md` | API 設計規格 v9.0（🔴 規範） |
| `.knowledge/specs/feature-spec.md` | 功能規格 v19.0（🟡 規格） |
| `.knowledge/sprint14-ai-architecture.md` | Sprint 14 AI 架構設計文件 |
| `proposal/roadmap.md` | 產品路線圖 v9.0（已核准） |
| `proposal/sprint15-dev-plan.md` | Sprint 15 開發計畫書（✅ 已完成） |
| `proposal/sprint15.1-dev-plan.md` | Sprint 15.1 AI 資料管線串接 Hotfix（✅ 附條件通過） |
| `proposal/sprint16-proposal.md` | Sprint 16 提案書（✅ G0 通過） |
| `proposal/sprint16-dev-plan.md` | Sprint 16 開發計畫書 — AI 體驗完整化（✅ 完成，G3 附條件通過） |
| `proposal/sprint17-proposal.md` | Sprint 17 提案書（✅ G0 通過） |
| `proposal/sprint17-dev-plan.md` | Sprint 17 開發計畫書 — 程式碼優化（✅ 完成） |
| `proposal/sprint17-loc-report.md` | Sprint 17 LOC 盤點報告 |
| `proposal/sprint17-refactor-report.md` | Sprint 17 重構報告（前後 LOC 對比） |
| `proposal/sprint18-diagnosis.md` | Sprint 18 產品診斷報告 |
| `proposal/sprint18-proposal.md` | Sprint 18 提案書（✅ G0 通過） |
| `proposal/sprint18-dev-plan.md` | Sprint 18 開發計畫書 — Python + Java 多語言支援（✅ 完成） |
| `proposal/sprint19-proposal.md` | Sprint 19 提案書（✅ G0 通過，含附錄 A-F 規格） |
| `proposal/sprint19-dev-plan.md` | Sprint 19 開發計畫書 — Wiki 知識輸出 + Obsidian 知識圖（✅ 完成，G3 附條件通過） |
| `proposal/sprint20-proposal.md` | Sprint 20 提案書（✅ G0 通過，含附錄 A-C） |
| `proposal/sprint20-dev-plan.md` | Sprint 20 開發計畫書 — 啟動體驗改造（✅ 完成） |
