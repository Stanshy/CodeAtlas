# AI 摘要快取

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T10:45:00.000Z |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

在 server 端實作 AI 摘要快取，避免重複呼叫外部 API。

### 具體工作

1. 快取邏輯（在 `packages/cli/src/server.ts` 的 `/api/ai/summary` handler 中）：
   - 快取目錄：`{projectPath}/.codeatlas/cache/`
   - 快取檔名：`{hash(nodeId + provider)}.json`
   - hash 使用 Node.js 內建 `crypto.createHash('sha256')`
   - 快取格式：`{ nodeId, summary, provider, cachedAt: ISO8601 }`

2. 流程：
   - 收到請求 → 計算 hash → 檢查快取檔案是否存在
   - 存在 → 讀取 + JSON.parse（try-catch）→ 回傳 `cached: true`
   - 不存在 → 呼叫 provider.summarize() → 存快取 → 回傳 `cached: false`
   - 快取讀取失敗 → 當作 miss，重新呼叫

3. 快取工具提取到 `packages/cli/src/cache.ts`：
   - `getCachedSummary(cacheDir, nodeId, provider)` → CacheResult | null
   - `setCachedSummary(cacheDir, nodeId, provider, summary)` → void
   - 確保 cacheDir 存在（`fs.mkdir recursive`）

### 規範參考

- api-design.md：回應含 `cached: true/false`
- coding-standards.md：所有 JSON.parse 包 try-catch

## 驗收標準

- [x] 首次呼叫 → 存快取檔案 → 回傳 `cached: false`
- [x] 同一節點第二次呼叫 → 讀快取 → 不打外部 API → 回傳 `cached: true`
- [x] 快取檔案格式正確（JSON，含 cachedAt）
- [x] 快取損壞時自動重新呼叫（不 crash）
- [x] 快取目錄自動建立

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T10:32:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T10:43:00.000Z — 狀態變更 → in_review
完成。cache.ts：sha256 hash 快取鍵，getCachedSummary/setCachedSummary，損壞自動 miss，目錄自動建立。

### 2026-03-31T10:45:00.000Z — 狀態變更 → done
L1 審核通過。快取邏輯正確，JSON.parse 有 try-catch，非阻塞寫入。
