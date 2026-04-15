# AI analyze API + Job 整合

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7,T9 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 `packages/cli/src/server.ts` 新增：

- `POST /api/wiki/analyze` — 觸發單頁 AI 深度分析
  - Body: `{ slug, scope }`
  - 復用 Sprint 16 Job 狀態機（queued → running → succeeded/failed/cached）
  - 回傳 `{ jobId }`
- Job 完成後：
  - AI 結果覆寫 `.codeatlas/wiki/{type}/{slug}.md` 的描述段落
  - 更新 `wiki-manifest.json` 中對應 page 的 `hasAiContent = true`
- 失敗時：骨架不動，回傳錯誤狀態
- 前端 polling 復用 `GET /api/ai/jobs/:jobId`

## 驗收標準

- [x] POST analyze → job 建立 → polling → succeeded 全流程通
- [x] 成功後 .md 檔案更新、manifest 更新
- [x] 失敗時骨架不受影響
- [x] 復用 Sprint 16 Job 狀態機

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
