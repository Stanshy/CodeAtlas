# 前後端串接

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T13:00:00.000Z |
| 依賴 | T3,T9 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

Web API 層呼叫 server 端點，確保前後端資料格式一致。

### 具體工作

1. `packages/web/src/api/node.ts`：
   - `fetchNodeDetail(id)` — GET `/api/node/${encodeURIComponent(id)}`
   - 使用 `apiFetch` pattern（同 graph.ts）
   - 回傳 `{ node, edges, sourceCode }`

2. `packages/web/src/api/ai.ts`：
   - `fetchAiSummary(nodeId, provider?)` — POST `/api/ai/summary`
   - Request body: `{ nodeId, provider }`
   - Content-Type: application/json（POST 需要）
   - `fetchAiStatus()` — GET `/api/ai/status`

3. 整合驗證：
   - useNodeDetail hook → 呼叫 fetchNodeDetail → 顯示在 NodePanel
   - useAiSummary hook → 呼叫 fetchAiSummary → 顯示在 AiSummary
   - Error handling：網路錯誤、404、500 都有對應 UI 狀態

4. 型別更新 `packages/web/src/types/graph.ts`：
   - 新增 `AiSummaryResponse` 型別
   - 新增 `AiStatusResponse` 型別

### 規範參考

- api-design.md：回應格式
- 無 Body 的請求（GET）不送 Content-Type header

## 驗收標準

- [x] 面板正確從 /api/node/:id 取得資料
- [x] AI 摘要正確從 /api/ai/summary 取得結果
- [x] 錯誤狀態（網路/404/500）有對應 UI 提示
- [x] 資料格式與 api-design.md 一致

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T12:32:00.000Z — 狀態變更 → in_progress
與 T9 同步實作，API 層在 T4/T6 已建立

### 2026-03-31T12:55:00.000Z — 狀態變更 → in_review
完成。api/node.ts fetchNodeDetail + api/ai.ts fetchAiSummary/fetchAiStatus。types/graph.ts 新增 AiSummaryResponse + AiStatusResponse。GET 不送 Content-Type，POST 送 application/json。所有 JSON.parse 包 try-catch。

### 2026-03-31T13:00:00.000Z — 狀態變更 → done
L1 審核通過。API 格式與 api-design.md 一致，error handling 完整。
