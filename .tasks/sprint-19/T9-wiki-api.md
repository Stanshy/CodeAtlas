# API 端點（wiki + page）

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 `packages/cli/src/server.ts` 新增 Wiki API 端點：

- `GET /api/wiki` — 讀取 `.codeatlas/wiki/wiki-manifest.json`
  - 若存在：回傳 WikiManifest（nodes/edges/stats/pages，不含 content）
  - 若不存在：回傳 `{ status: 'not_generated' }`
- `GET /api/wiki/page/:slug` — 讀取 `.codeatlas/wiki/{type}/{slug}.md`
  - 回傳 WikiPageDetail（content + frontmatter）
  - 404 if not found

遵守 API 規範：snake_case JSON、標準錯誤格式、trace_id。

## 驗收標準

- [x] `/api/wiki` 回傳正確 WikiManifest
- [x] wiki 未產生時回傳 `{ status: 'not_generated' }`
- [x] `/api/wiki/page/:slug` lazy load 單頁正確
- [x] 404 處理正確

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
