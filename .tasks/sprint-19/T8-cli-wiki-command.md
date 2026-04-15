# CLI `codeatlas wiki` 指令

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 1h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 `packages/cli/src/commands/wiki.ts` 新增 CLI 指令：

- `codeatlas wiki [projectPath]`
  - `--output <dir>` — 輸出目錄（預設 `.codeatlas/wiki/`）
  - `--ai` — 啟用 AI 深度分析（預設只跑規則骨架）
- 流程：
  1. 讀取 analysis.json（若不存在，先執行 analyze）
  2. 呼叫 WikiExporter.export()
  3. 輸出統計報告到 console
- 整合到 CLI 入口（index.ts）

## 驗收標準

- [x] `codeatlas wiki` 可執行
- [x] .md 輸出到指定目錄
- [x] `--ai` flag 觸發 AI 分析
- [x] 統計報告輸出正確

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
