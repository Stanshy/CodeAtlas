# Wiki 型別定義

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | 2026-04-08T07:50:34.645Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 `packages/core/src/wiki-exporter/types.ts` 定義所有 Wiki 相關型別，依照提案書附錄 A 規格：

- `WikiNode`：id / slug / type / displayName / lang / path / summary / ruleSummary / edges / mdPath / viewAnchors
- `WikiEdge`：type / targetId / targetSlug / label
- `WikiExportResult`：nodes / edges / stats / pages
- `WikiPageMeta`：slug / mdPath / type / displayName / lang / hasAiContent
- `WikiManifest`：status / generatedAt / nodes / edges / stats / pages
- `WikiPageDetail`：slug / content / frontmatter
- `SlugRegistry` 介面

型別參考：提案書附錄 A + 附錄 B 命名規則。

## 驗收標準

- [x] 所有型別可 import 且 build 通過
- [x] 型別與提案書附錄 A schema 完全一致
- [x] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T07:50:34.645Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-08T07:53:29.793Z — 狀態變更 → in_review
Wiki 型別定義完成。packages/core/src/wiki-exporter/types.ts 已建立，含所有 11 個型別；packages/core/src/types.ts 已加入 re-exports。pnpm build 零錯誤通過（ESM + CJS + DTS）。

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
