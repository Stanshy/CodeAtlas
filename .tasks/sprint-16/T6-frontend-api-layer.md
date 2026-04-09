# 前端 API 層擴充

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T19:55:00.000Z |
| 完工時間 | 2026-04-07T20:15:00.000Z |

---

## 任務描述

修改 `packages/web/src/api/graph.ts` 新增 3 個 fetch wrapper：
- postAIAnalyze(scope, target?, force?) → POST /api/ai/analyze
- getAIJob(jobId) → GET /api/ai/jobs/:jobId
- postAIConfigure(provider, apiKey?) → POST /api/ai/configure

修改 `packages/web/src/types/graph.ts` 新增型別定義：AIJob, AIAnalyzeResponse, AIConfigureResult。

## 驗收標準

- [x] 三個 fetch wrapper 型別正確
- [x] 錯誤處理完善（network error, non-ok response）
- [x] AIJob interface 欄位與後端 AIJob 一致
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T19:55:00.000Z — 開始執行
frontend-developer 開始執行

### 2026-04-07T20:15:00.000Z — 完成交付
7 型別 + postAIAnalyze + getAIJob + postAIConfigure

### 2026-04-07T20:20:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
