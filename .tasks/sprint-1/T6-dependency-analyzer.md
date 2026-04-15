# 依賴分析器（Analyzer）

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4,T5 |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

實作 `packages/core/src/analyzer/index.ts` 和 `packages/core/src/analyzer/graph-builder.ts`，將 Scanner + Parser 結果組裝成完整的 Graph JSON。

### 具體工作

1. 讀取 `.knowledge/specs/feature-spec.md` Analyzer 區段
2. 實作 `graph-builder.ts`：
   - 接收 Scanner 的 GraphNode[] 和 Parser 的 GraphEdge[]
   - 組裝成 AnalysisResult（含 nodes, edges, stats, metadata）
   - 計算統計：totalFiles, totalEdges, externalDeps, circularDeps
3. 實作 `analyzer/index.ts`：
   - 串接 Scanner → Parser → GraphBuilder 流程
   - 提供 `analyze(targetPath, options)` 主入口
4. 高層資料流推導：識別入口檔、孤立檔
5. 輸出 JSON 符合 data-model.md schema

### 規範參考

- `.knowledge/specs/feature-spec.md` Analyzer 區段
- `.knowledge/specs/data-model.md` AnalysisResult 完整結構
- T4 Scanner 產出、T5 Parser 產出

## 驗收標準

- [x] 串接 Scanner + Parser，輸出完整 AnalysisResult
- [x] JSON 結構符合 data-model.md schema
- [x] stats 統計數字正確（totalFiles, totalEdges, dependencyCount 等）
- [x] 孤立檔正確標記（dependencyCount 為 0 時不設定）
- [x] 錯誤檔案記錄在 errors 中（scan + parse 階段合併）
- [x] metadata 包含分析時間（analysisDurationMs）、目標路徑（projectPath）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T12:20:00.000Z — 狀態變更 → in_review
backend-architect 完成。graph-builder 深拷貝 nodes、edge 去重、dependencyCount 計算。analyze 主入口串接全流程。

### 2026-03-30T12:21:00.000Z — 狀態變更 → done
L1 審核通過。Scanner→Parser→GraphBuilder 流程完整，stats 計算合理，exactOptionalPropertyTypes 相容。
