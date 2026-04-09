# CLI `codeatlas wiki` 指令

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T6 |
| 預估 | 1h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

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

- [ ] `codeatlas wiki` 可執行
- [ ] .md 輸出到指定目錄
- [ ] `--ai` flag 觸發 AI 分析
- [ ] 統計報告輸出正確

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
