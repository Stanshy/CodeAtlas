# Wiki 輸出語言

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T8 |
| 預估 | 2h |
| 建立時間 | 2026-04-09T08:56:57.895Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

支援 `codeatlas wiki --lang en/zh-TW`：

1. **`packages/core/src/wiki-exporter/index.ts`**：
   - WikiExporter 接受 `locale` 參數
   - 傳遞給 md-renderer

2. **`packages/core/src/wiki-exporter/md-renderer.ts`**：
   - Markdown 輸出標題/描述/分類標籤根據 locale 切換
   - 中文版使用現有中文標題
   - 英文版使用英文標題

3. **`packages/cli/src/commands/wiki.ts`**：
   - `--lang` flag（`en` / `zh-TW`，預設 `en`）
   - 優先級鏈：`--lang flag → .codeatlas.json locale → CODEATLAS_LANG env → 'en'`

## 驗收標準

- [x] `--lang en` 產出英文 wiki
- [x] `--lang zh-TW` 產出中文 wiki
- [x] 預設英文
- [x] 優先級鏈正確（flag > config > env > default）
- [x] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 21 i18n 全部完成。L1 補登任務完成狀態。
