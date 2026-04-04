# 資料模型型別定義

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 1h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

按照 `.knowledge/specs/data-model.md` 規範，在 `packages/core/src/types.ts` 定義所有資料模型型別。

### 具體工作

1. 讀取 `.knowledge/specs/data-model.md`，逐欄位實作型別
2. 定義核心型別：GraphNode, GraphEdge, AnalysisResult, AnalysisStats
3. 定義輔助型別：FileNode, DirectoryNode, ImportEdge, ExportInfo 等
4. 確保命名遵循 PascalCase（型別）、camelCase（屬性）
5. Export 所有型別供其他模組使用

### 規範參考

- `.knowledge/specs/data-model.md`（🔴 規範，必須嚴格遵循）

## 驗收標準

- [x] 型別定義與 data-model.md 100% 一致
- [x] 所有型別可被 core 內其他模組正確引用
- [x] TypeScript 編譯無錯誤
- [x] 命名符合規範（PascalCase 型別 / camelCase 屬性）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T10:35:00.000Z — 狀態變更 → in_review
backend-architect 完成。11 個型別定義，type-check 通過。踩坑：Node16 moduleResolution 需 .js 副檔名。

### 2026-03-30T10:36:00.000Z — 狀態變更 → done
L1 審核通過。型別與 data-model.md 一致，命名規範正確。
