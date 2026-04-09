# Provider 設定連動

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T19:10:00.000Z |
| 完工時間 | 2026-04-07T19:40:00.000Z |

---

## 任務描述

修改 `packages/cli/src/server.ts` 新增 POST /api/ai/configure 端點。接收 { provider, apiKey? } → 更新 server 內部 mutable provider 變數 → 寫入 .codeatlas.json。寫入失敗 → persisted=false → 降級 session memory。

aiProvider / aiKey 改為 let currentAiProvider / currentAiKey（mutable）。更新 GET /api/ai/status 讀 currentAiProvider。

規格對照：提案書附錄 B。

## 驗收標準

- [x] POST /api/ai/configure 回傳 { ok, provider, persisted, message }
- [x] .codeatlas.json 正確更新 aiProvider + aiKey
- [x] 寫入失敗時 persisted=false，server 仍正常
- [x] GET /api/ai/status 回傳新 provider（不需重啟）
- [x] 重啟 server → 新 provider 從 .codeatlas.json 載入
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T19:10:00.000Z — 開始執行
backend-architect 開始執行

### 2026-04-07T19:40:00.000Z — 完成交付
POST /api/ai/configure + mutable currentAiProvider/currentAiKey + .codeatlas.json 持久化

### 2026-04-07T19:50:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
