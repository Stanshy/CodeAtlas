# 按需分析 API + Job Manager

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 4h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T19:55:00.000Z |
| 完工時間 | 2026-04-07T20:30:00.000Z |

---

## 任務描述

新增 `packages/cli/src/ai-job-manager.ts`（AIJob 介面 + AIJobManager 類）。修改 `packages/cli/src/server.ts` 新增 POST /api/ai/analyze + GET /api/ai/jobs/:jobId 端點。

Job 狀態機：queued→running→succeeded/failed/cached/canceled。重複提交策略見提案書附錄 A。cache hit → 仍回 jobId，status=cached。server 重啟 → in-flight jobs 標 canceled。

scope=core 定義：directoryGraph.nodes.filter(n => n.role === 'business-logic' || n.role === 'cross-cutting')。

附錄 F Metrics 併入：AIJobManager 內部計數器（successCount, failCount, cacheHitCount），擴充 GET /api/ai/status 回傳 metrics 欄位。

## 驗收標準

- [x] POST /api/ai/analyze 回傳 jobId + status
- [x] GET /api/ai/jobs/:jobId 回傳完整 AIJob
- [x] cache hit 回傳 status=cached + result 非 null
- [x] 重複提交（同 target queued/running）回傳現有 jobId
- [x] server 重啟時 cancelInFlightJobs 清理
- [x] scope=core 正確過濾 business-logic + cross-cutting 目錄
- [x] GET /api/ai/status 含 metrics 欄位
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T19:55:00.000Z — 開始執行
backend-architect 開始執行

### 2026-04-07T20:30:00.000Z — 完成交付
AIJobManager class + POST /api/ai/analyze + GET /api/ai/jobs/:jobId + metrics + scope routing

### 2026-04-07T20:35:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
