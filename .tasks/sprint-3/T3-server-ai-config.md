# Server 傳遞 AI 設定

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T11:00:00.000Z |
| 依賴 | T1,T2 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

CLI `--ai-key` / `--ai-provider` 參數傳到 server，整合快取邏輯。

### 具體工作

1. `packages/cli/src/commands/web.ts`：
   - WebCommandOptions 新增 `aiKey?: string` 和 `aiProvider?: string`
   - 傳遞到 `startServer()` 的 options

2. `packages/cli/src/server.ts`：
   - ServerOptions 新增 `aiKey?: string` 和 `aiProvider?: string`
   - `/api/ai/summary` handler：
     - 使用 `createProvider(options.aiProvider ?? providerName, options.aiKey)` 建立 provider
     - 整合 T2 快取邏輯：先查快取 → miss 才呼叫 → 寫快取
   - 新增 `GET /api/ai/status` 端點：回傳 AI 是否啟用（前端判斷顯示）

3. `packages/cli/src/index.ts`（Commander 定義）：
   - 新增 `--ai-key <key>` option
   - 新增 `--ai-provider <name>` option（預設 'disabled'）

### 規範參考

- api-design.md：CLI Flags 定義
- 不硬編碼 API Key，一律用參數傳遞

## 驗收標準

- [x] `codeatlas web --ai-key xxx --ai-provider openai` 可啟用 AI
- [x] 無 --ai-key 時 AI 端點回傳 `ai_not_configured`
- [x] `/api/ai/status` 回傳 `{ enabled: true/false, provider: "openai" }`
- [x] 快取功能正常整合
- [x] 版本號保持 0.1.0

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T10:47:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T10:58:00.000Z — 狀態變更 → in_review
完成。CLI --ai-key/--ai-provider options，ServerOptions 擴充，/api/ai/status 端點，快取整合到 /api/ai/summary handler。修正 exactOptionalPropertyTypes 型別問題。CLI build 通過。

### 2026-03-31T11:00:00.000Z — 狀態變更 → done
L1 審核通過。API 格式與 api-design.md 一致，版本號 0.1.0。
