# 快取持久化 + 移除自動全量分析

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 4h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T19:10:00.000Z |
| 完工時間 | 2026-04-07T19:45:00.000Z |

---

## 任務描述

改造 `packages/cli/src/ai-pipeline.ts` 的 AICache 為 PersistentAICache class，支援磁碟讀寫（.codeatlas/cache/ai-results.json）。

AICacheEntry 結構見提案書附錄 C。cache key = scope:targetId:provider:promptVersion。contentHash 用 node:crypto md5 計算。失效規則：contentHash 變→stale, promptVersion 變→強制失效, provider 變→不失效。5MB LRU 上限。

保留 3 個 Phase function 但重構為可單獨呼叫的 unit（供 T1 Job Manager 使用）。

修改 `packages/cli/src/server.ts`：移除 void runAIPipeline() fire-and-forget，替換為 PersistentAICache 載入。

規格對照：提案書附錄 C。

## 驗收標準

- [x] 分析完 → ai-results.json 有內容
- [x] 重啟 server → GET /api/graph 回傳 AI 欄位（不重新呼叫 AI）
- [x] server 啟動不觸發任何 AI 分析
- [x] contentHash 變更 → isStale 回傳 true
- [x] promptVersion 變更 → 強制失效
- [x] 超過 5MB → LRU 淘汰最舊 entry
- [x] corrupted cache file → rebuild empty + console.warn
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T19:10:00.000Z — 開始執行
backend-architect 開始執行

### 2026-04-07T19:45:00.000Z — 完成交付
PersistentAICache class + computeContentHash + LRU eviction + Phase functions export + server.ts 移除自動全量

### 2026-04-07T19:50:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
