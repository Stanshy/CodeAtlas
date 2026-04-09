# Wiki Exporter 主入口

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T2,T3,T4,T5 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

在 `packages/core/src/wiki-exporter/index.ts` 整合 T2-T5，實作 WikiExporter 主入口：

- `WikiExporter.export(analysisResult, options?)` → `WikiExportResult`
- 流程：
  1. PageGenerator 產出 WikiNode[]
  2. SlugRegistry 註冊所有 slug
  3. LinkResolver 生成 wiki-link
  4. MdRenderer 產出 .md 文字
  5. 寫入 .md 檔案到指定目錄（預設 `.codeatlas/wiki/`）
  6. 產出 wiki-manifest.json（nodes/edges/stats，不含 content）
  7. Dead Link Checker 驗證
- 統計報告：page count / link count / dead links / coverage
- 目錄結構：`modules/` + `files/` + `endpoints/` + `methods/`

## 驗收標準

- [ ] `codeatlas wiki` 端到端產出 .md 檔案群
- [ ] wiki-manifest.json 正確產出
- [ ] dead links = 0
- [ ] coverage ≥ 80%
- [ ] 統計報告正確

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
