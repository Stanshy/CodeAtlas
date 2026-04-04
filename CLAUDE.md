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
| `/harness-audit` | Harness 健康度稽核 | 定期檢查 |

## 專案文件索引

| 文件 | 說明 |
|------|------|
| `.knowledge/company-rules.md` | 共用開發規則 |
| `.knowledge/team-workflow.md` | 共用工作流程 |
| `.knowledge/project-overview.md` | 專案概述 |
| `.knowledge/architecture.md` | 架構參考 |
| `.knowledge/postmortem-log.md` | 踩坑紀錄 |
| `.knowledge/specs/data-model.md` | 資料模型規格 v5.0（🔴 規範） |
| `.knowledge/specs/api-design.md` | API 設計規格 v5.0（🔴 規範） |
| `.knowledge/specs/feature-spec.md` | 功能規格 v12.0（🟡 規格） |
| `proposal/roadmap.md` | 產品路線圖 v4.0（已核准） |
| `proposal/sprint1-diagnosis.md` | Sprint 1 六問診斷 |
| `proposal/sprint1-proposal.md` | Sprint 1 提案書（G0 通過） |
| `proposal/sprint1-dev-plan.md` | Sprint 1 開發計畫書（已完成） |
| `proposal/sprint2-diagnosis.md` | Sprint 2 六問診斷 |
| `proposal/sprint2-proposal.md` | Sprint 2 提案書（G0 通過） |
| `proposal/sprint2-dev-plan.md` | Sprint 2 開發計畫書（已完成） |
| `proposal/sprint3-diagnosis.md` | Sprint 3 六問診斷 |
| `proposal/sprint3-proposal.md` | Sprint 3 提案書（G0 通過） |
| `proposal/sprint3-dev-plan.md` | Sprint 3 開發計畫書（已完成） |
| `proposal/sprint4-diagnosis.md` | Sprint 4 六問診斷 |
| `proposal/sprint4-proposal.md` | Sprint 4 提案書（G0 通過） |
| `proposal/sprint4-dev-plan.md` | Sprint 4 開發計畫書（已完成） |
| `proposal/sprint5-diagnosis.md` | Sprint 5 六問診斷 |
| `proposal/sprint5-proposal.md` | Sprint 5 提案書（G0 通過） |
| `proposal/sprint5-dev-plan.md` | Sprint 5 開發計畫書（已完成） |
| `.knowledge/sprint5-dataflow-architecture.md` | Sprint 5 資料流動架構設計 |
| `proposal/sprint6-diagnosis.md` | Sprint 6 六問診斷 |
| `proposal/sprint6-proposal.md` | Sprint 6 提案書（G0 通過） |
| `proposal/sprint6-dev-plan.md` | Sprint 6 開發計畫書（已完成） |
| `.knowledge/sprint6-ollama-architecture.md` | Sprint 6 Ollama + 隱私架構設計 |
| `proposal/sprint7-diagnosis.md` | Sprint 7 六問診斷 |
| `proposal/sprint7-proposal.md` | Sprint 7 提案書（G0 通過） |
| `proposal/sprint7-dev-plan.md` | Sprint 7 開發計畫書（已完成） |
| `.knowledge/sprint7-function-architecture.md` | Sprint 7 函式級解析架構設計 |
| `proposal/sprint8-diagnosis.md` | Sprint 8 六問診斷 |
| `proposal/sprint8-proposal.md` | Sprint 8 提案書（G0 通過） |
| `proposal/sprint8-dev-plan.md` | Sprint 8 開發計畫書（已完成） |
| `.knowledge/sprint8-impact-architecture.md` | Sprint 8 影響分析架構設計 |
| `proposal/sprint9-diagnosis.md` | Sprint 9 六問診斷 |
| `proposal/sprint9-proposal.md` | Sprint 9 提案書（G0 通過） |
| `proposal/sprint9-dev-plan.md` | Sprint 9 開發計畫書（已完成） |
| `.knowledge/sprint9-controlpanel-architecture.md` | Sprint 9 控制面板架構設計 |
| `proposal/sprint10-diagnosis.md` | Sprint 10 六問診斷 |
| `proposal/sprint10-proposal.md` | Sprint 10 提案書（G0 通過） |
| `proposal/sprint10-dev-plan.md` | Sprint 10 開發計畫書（已完成） |
| `.knowledge/sprint10-curation-architecture.md` | Sprint 10 智慧策展架構設計 |
| `proposal/sprint11-diagnosis.md` | Sprint 11 六問診斷 |
| `proposal/sprint11-proposal.md` | Sprint 11 提案書（G0 通過） |
| `proposal/sprint11-dev-plan.md` | Sprint 11 開發計畫書（已完成） |
| `.knowledge/sprint11-perspectives-architecture.md` | Sprint 11 三種故事視角架構設計 |
| `proposal/sprint12-diagnosis.md` | Sprint 12 六問診斷 |
| `proposal/sprint12-proposal.md` | Sprint 12 提案書（G0 通過） |
| `proposal/sprint12-dev-plan.md` | Sprint 12 開發計畫書（已完成） |
| `proposal/references/sprint12/three-perspectives-mockup.html` | Sprint 12 核准圖稿（白紙黑格 + 三視角呈現邏輯） |
| `proposal/sprint13-diagnosis.md` | Sprint 13 六問診斷 |
| `proposal/sprint13-proposal.md` | Sprint 13 提案書（G0 通過） |
| `proposal/sprint13-dev-plan.md` | Sprint 13 開發計畫書（已完成） |
| `.knowledge/sprint13-method-level-architecture.md` | Sprint 13 方法/端點級架構設計 |
| `proposal/references/sprint13/method-level-mockup.html` | Sprint 13 核准圖稿（方法/端點級三視角） |
| `proposal/references/sprint13/method-level-mockup-spec.md` | Sprint 13 技術規格書（11 章） |
| `.knowledge/research-industry-visualization.md` | 業界視覺化調研報告 |

## 公司知識庫

> **使用規則（company-rules.md 第 7 條）**：需要引用公司規範時，先檢查本地 `.knowledge/` 是否已有副本。若無，從下方來源路徑複製一份到 `.knowledge/` 再使用。不需要的規範不必複製。

| 規範 | 來源路徑 | 本地副本 |
|------|---------|---------|
| 程式碼規範 | `C:/projects/AgentHub/.knowledge/company/standards/coding-standards.md` | `.knowledge/coding-standards.md` |
| API 規範 | `C:/projects/AgentHub/.knowledge/company/standards/api-standards.md` | `.knowledge/api-standards.md` |
| 測試規範 | `C:/projects/AgentHub/.knowledge/company/standards/testing-standards.md` | `.knowledge/testing-standards.md` |
| 品質 Checklist | `C:/projects/AgentHub/.knowledge/company/standards/quality-checklist.md` | `.knowledge/quality-checklist.md` |
| Code Review SOP | `C:/projects/AgentHub/.knowledge/company/sop/code-review.md` | `.knowledge/code-review.md` |
| Sprint 規劃 SOP | `C:/projects/AgentHub/.knowledge/company/sop/sprint-planning.md` | `.knowledge/sprint-planning.md` |
