# Link Resolver

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

在 `packages/core/src/wiki-exporter/link-resolver.ts` 實作 WikiEdge → `[[wiki-link]]` 格式轉換：

- 輸入：WikiNode 的 edges[] + SlugRegistry
- 輸出：`[[slug|displayName]]` 格式字串
- 只生成 registry 中存在的 link（dead link 防護）
- 按 edge type 分組輸出（imports / calls / owns / exposes / dataflow）
- displayName 與 slug 分離（附錄 B 第 2 條）

## 驗收標準

- [x] `[[wiki-link]]` 格式正確
- [x] 零 dead links（只生成 registry 中存在的 link）
- [x] displayName 正確分離
- [x] 按 edge type 正確分組

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
