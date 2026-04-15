# 型別定義

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 0.5h |
| 建立時間 | 2026-04-09T08:56:57.895Z |

---

## 任務描述

在 `packages/core/src/types.ts` 新增 i18n 相關型別：

1. **Locale type**：`export type Locale = 'en' | 'zh-TW';`
2. **AnalysisOptions**：加入 `locale?: Locale` 欄位
3. **WikiOptions**：加入 `locale?: Locale` 欄位（若存在）
4. 確保 `pnpm build` 零錯誤，型別可被 cli 和 web 引用

## 驗收標準

- [x] `Locale` type 已定義並 export
- [x] `PipelineOptions` 含 `locale?` 欄位（cli/ai-pipeline.ts）
- [x] `WikiExportOptions` 含 `locale?` 欄位（core/wiki-exporter/index.ts）
- [x] `pnpm build` 零錯誤
- [x] cli 和 web 可引用新型別

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:00:00.000Z — 完成（done）
- core/types.ts: 新增 `Locale = 'en' | 'zh-TW'`
- cli/ai-pipeline.ts: PipelineOptions 加 `locale?: Locale`
- core/wiki-exporter/index.ts: WikiExportOptions 加 `locale?: Locale`
- pnpm build 零錯誤
