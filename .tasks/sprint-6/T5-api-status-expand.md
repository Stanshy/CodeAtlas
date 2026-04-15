# GET /api/ai/status 擴充

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:30:00.000Z |
| 完工時間 | 2026-03-31T10:40:00.000Z |
| 依賴 | T2,T4 |
| 預估 | 1h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 修改 `packages/cli/src/server.ts`：
   - ServerOptions 新增 ollamaModel
   - GET /api/ai/status 回應新增 mode, privacyLevel, model
   - mode：disabled/local/cloud（根據 provider 決定）
   - privacyLevel：none/full/partial
   - model：Ollama 有值，其他為 null
   - createProvider 傳遞 ollamaModel options

## 驗收標準

- [x] GET /api/ai/status 回傳 mode 欄位
- [x] GET /api/ai/status 回傳 privacyLevel 欄位
- [x] GET /api/ai/status 回傳 model 欄位
- [x] disabled → mode='disabled', privacyLevel='none'
- [x] ollama → mode='local', privacyLevel='full'
- [x] openai/anthropic → mode='cloud', privacyLevel='partial'
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:30:00.000Z — 狀態變更 → in_progress
委派 backend-architect 執行（與 T4、T6 並行）

### 2026-03-31T10:40:00.000Z — 狀態變更 → done
GET /api/ai/status 擴充完成：mode/privacyLevel/model 三欄位，三模式映射正確。createProvider 傳遞 ollamaModel options。tsc 通過
