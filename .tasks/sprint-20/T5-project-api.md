# server.ts 新增 /api/project/* 端點

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 20 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 並行組 | — |
| 預估 | — |
| 建立時間 | 2026-04-09T03:13:03.032Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

server.ts 新增 /api/project/status、/api/project/validate、/api/project/analyze、/api/project/progress/:jobId（SSE+polling）、/api/project/recent（GET+DELETE）。串接 analysis-runner + recent-projects

## 驗收標準

- [x] 6 個端點皆可用
- [x] SSE 推送正常
- [x] validate 防 path traversal
- [x] analyze 回傳 jobId

---

## 事件紀錄

### 2026-04-09T03:13:03.032Z — 建立任務（assigned）
由 tech-lead 透過 /task-delegation 派工

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 20 已完成。L1 補登任務完成狀態。
