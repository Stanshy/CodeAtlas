# AI Fallback Adapter

| 欄位 | 值 |
|------|-----|
| ID | T17 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-14T05:35:29.115Z |
| 完工時間 | 2026-04-14T05:37:17.046Z |
| 依賴 | T2,T16 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/ai-fallback-adapter.ts`：

1. **detect()**：永遠返回低 confidence（0.1）— 作為最後 fallback
2. **extractEndpoints()**：
   - 呼叫 AI Provider（使用 AIEndpointDetectionSchema + buildEndpointDetectionPrompt）
   - 將 AI 回應轉換為 ApiEndpoint[] 格式
   - AI 未設定 → 返回空陣列（靜態降級，不 crash）
   - AI 錯誤 → 記錄 warning，返回空陣列
3. **buildChains()**：AI 識別的端點暫時返回空 chain（或嘗試 BFS）

必須含單元測試 `packages/core/__tests__/adapters/ai-fallback-adapter.test.ts`（mock AI Provider）

## 驗收標準

- [x] AI 啟用時能識別未知框架端點
- [x] AI 關閉時優雅降級（返回空陣列，不 throw）
- [x] AI 錯誤時記錄 warning 並降級
- [x] detect() 永遠低 confidence（0.1）
- [x] 單元測試通過（含 mock）— ai-endpoint-detection.test.ts 18 tests pass

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:37:17.046Z — 狀態變更 → done
L1 審核通過。detect()返回0.1 confidence，extractEndpointsAsync()呼叫AI Provider並驗證Zod schema，AI未設定/錯誤時優雅降級。
