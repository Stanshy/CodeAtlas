# Settings 測試連線真實化

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | frontend-developer |
| 優先級 | P2 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

修改 `packages/web/src/components/SettingsPopover.tsx`：

1. 「測試連線」按鈕改為呼叫真實 Provider（取代 Sprint 14 的 mock setTimeout）：
   - **Claude Code CLI**：呼叫 `/api/ai/test-connection` 端點 → 後端 spawn 偵測 + 簡單 prompt 測試
   - **Gemini**：呼叫 `/api/ai/test-connection` 端點 → 後端 API key 驗證
   - **Ollama**：呼叫 `/api/ai/test-connection` 端點 → 後端 `GET http://localhost:11434/api/tags`
   - **OpenAI/Anthropic**：呼叫 `/api/ai/test-connection` 端點 → 後端 API key 驗證
   - **Disabled**：直接回傳成功（不呼叫 API）

2. 前端行為：
   - 按鈕按下 → loading 狀態（spinner）
   - 成功 → 綠色 checkmark + "連線成功"
   - 失敗 → 紅色 X + 錯誤訊息
   - 5s timeout → "連線逾時，請確認服務是否運行"

3. 注意：本專案 web 是純前端，透過 CLI server 的 `/api/*` 端點與後端通訊。
   - 若 `/api/ai/test-connection` 端點尚不存在，前端先使用 fetch 呼叫，後端端點留給後續實作
   - 前端需 graceful 處理 404（端點不存在）→ 顯示「測試連線功能需要最新版 CLI」

參照：計畫書 §2.7

## 驗收標準

- [x] 測試連線呼叫真實端點（非 mock）
- [x] 成功/失敗/timeout 三種狀態正確顯示
- [x] Disabled provider 直接成功
- [x] 404 graceful 處理
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
