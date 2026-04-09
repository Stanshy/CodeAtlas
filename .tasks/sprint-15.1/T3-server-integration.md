# Server 整合

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15.1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-04-05T07:24:19.271Z |
| 開始時間 | 2026-04-05T07:22:06.584Z |
| 依賴 | T2 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-05T07:15:28.003Z |

---

## 任務描述

修改 `packages/cli/src/server.ts`：
1. startServer() 啟動後 fire-and-forget runAIPipeline
2. `/api/graph` handler 回傳前呼叫 mergeAICache() 合併 AI 結果
3. `/api/ai/status` 新增 ready/analysisStatus/progress 欄位

**修改檔案**: `packages/cli/src/server.ts`

## 驗收標準

- [x] `/api/ai/status` 回傳 `{ ready, analysisStatus, progress }` 新欄位
- [x] `/api/graph` 回傳的 nodes 含 aiSummary（AI 完成時）
- [x] AI 管線不阻塞 server 啟動
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-05T07:15:28.003Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T07:22:06.584Z — 狀態變更 → in_progress
開始：server.ts 整合 AI pipeline 啟動 + mergeAICache + /api/ai/status 擴充

### 2026-04-05T07:24:19.271Z — 狀態變更 → done
完成：server.ts 三項修改 + tsc --noEmit 零錯誤 + pnpm build 通過
