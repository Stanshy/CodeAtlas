# 自然語言搜尋：POST /api/ai/search-keywords + SearchBar 整合（P1）

| 欄位 | 值 |
|------|-----|
| ID | T13 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T6,T9 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

### 後端（backend-architect）

1. 修改 `packages/cli/src/server.ts`，新增 `POST /api/ai/search-keywords` 端點：
   - Request body: `{ query: string, provider?: string }`
   - Response: `{ keywords: string[], originalQuery: string }`
   - AI 未設定 → `{ error: 'ai_not_configured', message: '...' }`
2. prompt 設計：告知 AI 從自然語言中提取程式碼相關關鍵字

### 前端（frontend-developer）

3. 修改 `packages/web/src/components/SearchBar.tsx`：
   - 偵測自然語言輸入（含中文/空格/句號等非程式碼字元）
   - 呼叫 `POST /api/ai/search-keywords` 取得關鍵字
   - 用關鍵字匹配 node label / filePath / AI summary
   - AI 未啟用 → fallback：以空格分割 query 為關鍵字
4. 新增 `packages/web/src/api/graph.ts` 函式：
   - `fetchSearchKeywords(query: string, provider?: string)`

## 驗收標準

- [x] POST /api/ai/search-keywords 端點可存取
- [x] AI 提取關鍵字正確
- [x] AI 未啟用時 fallback 為空格分割
- [x] SearchBar 自然語言輸入觸發 AI 搜尋
- [x] 關鍵字匹配 node label/filePath/AI summary
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T19:00:00.000Z — 狀態變更 → in_progress
開始執行任務（後端+前端平行）

### 2026-03-31T19:30:00.000Z — done
後端：POST /api/ai/search-keywords 端點，regex JSON 提取 + fallback 空格分割。前端：useSearch +isNaturalLanguage 偵測 +aiKeywords state +debounce 300ms fetch +matchesKeywords OR 邏輯。SearchBar +AiSpinner loading 指示器。tsc clean。
