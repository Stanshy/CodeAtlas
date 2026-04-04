# AI overview builder：core/ai/overview-builder.ts + 結構提取 + prompt 組裝

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:20:00.000Z |
| 結束時間 | 2026-03-31T16:30:00.000Z |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 新增 `packages/core/src/ai/overview-builder.ts`
2. 實作 `extractStructureInfo(result: AnalysisResult): StructureInfo`：
   - 提取 totalFiles, totalFunctions, totalClasses
   - 提取 topModules（按 dependencyCount 排序，最多 20 個）
   - 提取 moduleRelationships（模組間的邊數統計）
   - **隱私保證**：只提取名稱、類型、數量，不含原始碼
3. 實作 `buildOverviewPrompt(info: StructureInfo): string`：
   - 組裝 AI prompt，要求生成 1-2 段架構概述
   - 超過 20 個模組 → 只取 top 20
   - prompt 中不含任何原始碼
4. export 以上函式供 cli/server.ts 使用

### StructureInfo 型別

```typescript
export interface StructureInfo {
  totalFiles: number;
  totalFunctions: number;
  totalClasses: number;
  topModules: Array<{
    path: string;
    dependencyCount: number;
    importCount: number;
    exportCount: number;
  }>;
  moduleRelationships: Array<{
    source: string;
    target: string;
    edgeCount: number;
  }>;
}
```

## 驗收標準

- [x] extractStructureInfo 正確提取結構資訊
- [x] 只提取名稱/類型/數量，不含原始碼（隱私保護）
- [x] topModules 最多 20 個，按 dependencyCount 排序
- [x] buildOverviewPrompt 組裝正確格式
- [x] export 所有函式和型別
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:20:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T16:30:00.000Z — done
新增 overview-builder.ts: StructureInfo interface + extractStructureInfo() + buildOverviewPrompt()。file/function/class 分類統計、topModules top 20 by dependencyCount、moduleRelationships top 30 (排除 call edge)。隱私保護驗證通過。ai/index.ts re-export 完成。tsc clean。
