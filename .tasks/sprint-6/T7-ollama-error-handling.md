# Ollama 錯誤處理強化

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:15:00.000Z |
| 完工時間 | 2026-03-31T10:25:00.000Z |
| 依賴 | T2 |
| 預估 | 1h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

在 OllamaProvider.summarize() 中強化錯誤處理：

1. ECONNREFUSED → `Ollama is not running. Install: https://ollama.ai/download then run: ollama serve`
2. HTTP 404 → `Model "${model}" not found. Run: ollama pull ${model}`
3. Timeout → `Ollama request timed out (30s). Check if Ollama is running.`
4. JSON 解析失敗 → `Failed to parse Ollama response.`
5. 空回應 → `Ollama returned an empty response.`

所有錯誤 throw Error 帶友善訊息，server.ts 已有統一 catch → 500 回應。

## 驗收標準

- [x] ECONNREFUSED 顯示安裝指引
- [x] 404 顯示 ollama pull 提示
- [x] Timeout 顯示檢查提示
- [x] JSON 解析失敗 graceful 處理
- [x] 空回應友善提示

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:15:00.000Z — 狀態變更 → in_progress
T2 實作時已涵蓋全部錯誤處理，與 T2 同步完成

### 2026-03-31T10:25:00.000Z — 狀態變更 → done
5 種錯誤情境全部在 ollama.ts 中實作：ECONNREFUSED（安裝指引）、404（ollama pull）、Timeout（30s 檢查）、JSON 解析失敗、空回應。isConnectionError helper 處理 TypeError/ECONNREFUSED/ENOTFOUND
