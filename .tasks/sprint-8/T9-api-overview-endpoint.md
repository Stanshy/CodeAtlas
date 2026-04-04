# POST /api/ai/overview 端點：server.ts 新增 + 快取 + 錯誤處理

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:30:00.000Z |
| 結束時間 | 2026-03-31T16:40:00.000Z |
| 依賴 | T8 |
| 預估 | 1h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 修改 `packages/cli/src/server.ts`，新增 `POST /api/ai/overview` 端點：
   - Request body: `{ provider?: string }`
   - 成功 Response: `{ overview: string, provider: string, cached: boolean, structureInfo: { totalFiles, totalFunctions, topModules } }`
   - 錯誤 Response: `{ error: 'ai_not_configured' | 'ai_overview_failed', message: string }`
2. 實作流程：
   - 檢查 AI provider 是否設定 → 否則回 `ai_not_configured`
   - 檢查快取（`.codeatlas/cache/{hash}.json`，hash = sha256(projectPath + provider)）
   - 快取命中 → 直接回傳（cached: true）
   - 快取未命中 → 呼叫 `extractStructureInfo()` + `buildOverviewPrompt()` → 呼叫 AI → 存快取 → 回傳
   - AI 呼叫失敗 → 回 `ai_overview_failed`
3. 快取策略：與 AI summary 一致

### 規範 checklist（api-design.md v4.0）

- [x] 端點路徑：`POST /api/ai/overview`
- [x] Request body: `{ provider?: string }`
- [x] Response 格式符合 api-design.md
- [x] 錯誤碼：`ai_not_configured`, `ai_overview_failed`
- [x] 快取策略與 AI summary 一致

## 驗收標準

- [x] POST /api/ai/overview 端點可存取
- [x] AI 啟用時正確呼叫 overview-builder
- [x] AI 未啟用時回傳 ai_not_configured
- [x] 快取命中時 cached: true
- [x] AI 呼叫失敗時回傳 ai_overview_failed
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:30:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T16:40:00.000Z — done
POST /api/ai/overview 端點新增。import extractStructureInfo + buildOverviewPrompt。cache key='overview'，ai_not_configured/ai_overview_failed 錯誤處理。tsc clean（需先 pnpm --filter core build）。
