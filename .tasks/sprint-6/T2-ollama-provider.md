# OllamaProvider 實作

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:15:00.000Z |
| 完工時間 | 2026-03-31T10:25:00.000Z |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 新增 `packages/core/src/ai/ollama.ts`：
   - 實作 SummaryProvider 介面（name, isConfigured, summarize）
   - HTTP POST `http://localhost:11434/api/generate`，`stream: false`
   - 預設模型 `codellama`，可透過 constructor options 設定
   - isConfigured() 恆為 true（Ollama 不需要 API key）
   - 重用 buildPrompt() + AI_TIMEOUT_MS
   - 所有 JSON.parse 必須 try-catch

2. 修改 `packages/core/src/ai/index.ts`：
   - createProvider 新增 `'ollama'` case
   - 新增 options 參數（ollamaModel, ollamaBaseUrl）
   - 匯出 OllamaProvider

3. 修改 `packages/core/src/index.ts`：
   - 匯出 OllamaProvider

## 驗收標準

- [x] OllamaProvider 實作 SummaryProvider 介面
- [x] HTTP fetch 到 localhost:11434/api/generate
- [x] isConfigured() 恆為 true
- [x] createProvider('ollama') 回傳 OllamaProvider
- [x] options 參數可設定 model 和 baseUrl
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:15:00.000Z — 狀態變更 → in_progress
委派 backend-architect 與 T3 並行執行

### 2026-03-31T10:25:00.000Z — 狀態變更 → done
ollama.ts + createProvider 擴充 + OllamaProvider 匯出。tsc 通過，217+218 tests 零回歸
