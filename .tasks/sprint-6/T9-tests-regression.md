# 測試 + 回歸

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T11:00:00.000Z |
| 完工時間 | 2026-03-31T11:25:00.000Z |
| 依賴 | T2,T3,T4,T5,T6,T7,T8 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. **單元測試**：
   - `ollama-provider.test.ts`：正常回應、ECONNREFUSED、404、逾時、空回應、JSON 失敗、isConfigured=true、自訂 model/baseUrl
   - `config.test.ts`：讀取成功、檔案不存在、JSON 錯誤、無效 provider、環境變數讀取、優先級驗證、金鑰偵測
   - `privacy-badge.test.ts`：三模式渲染、provider 名稱、model 名稱

2. **整合測試**：
   - `integration-s6.test.ts`：createProvider('ollama')、options 傳遞、resolveConfig 優先級、AiStatusResponse 新欄位

3. **回歸測試**：
   - 435+ 既有 tests 零回歸
   - `pnpm build` 三個 package 全通過

## 驗收標準

- [x] 新增單元測試全部通過
- [x] 新增整合測試全部通過
- [x] 435+ 既有 tests 零回歸
- [x] pnpm build 全通過

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T11:00:00.000Z — 狀態變更 → in_progress
委派 test-writer-fixer 執行 T9 測試

### 2026-03-31T11:25:00.000Z — 狀態變更 → done
4 個測試檔案、81 個新測試全部通過。core 253 + web 233 + cli 37 = 523 tests 零回歸。pnpm build 全通過
