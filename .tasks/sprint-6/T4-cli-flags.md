# CLI flag 擴充

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:30:00.000Z |
| 完工時間 | 2026-03-31T10:40:00.000Z |
| 依賴 | T2,T3 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 修改 `packages/cli/src/index.ts`：
   - 新增 `--ollama-model <name>` flag（預設 codellama）
   - `--ai-provider` 選項加入 'ollama'
   - `--ai-key` help 文字加入安全警告

2. 修改 `packages/cli/src/commands/web.ts`：
   - WebCommandOptions 新增 ollamaModel
   - 使用 resolveConfig() 合併設定
   - 傳遞 ollamaModel 給 startServer

## 驗收標準

- [x] --ollama-model flag 可用
- [x] --ai-provider 支援 'ollama' 值
- [x] --ai-key help 顯示安全警告
- [x] resolveConfig 整合到 web command
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:30:00.000Z — 狀態變更 → in_progress
委派 backend-architect 執行（與 T5、T6 並行）

### 2026-03-31T10:40:00.000Z — 狀態變更 → done
CLI flags 擴充完成：--ollama-model, --ai-provider 含 ollama, --ai-key 安全警告。resolveConfig 整合到 web command。tsc 通過
