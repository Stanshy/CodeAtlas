# types.ts 擴充：NodeMetadata + EdgeMetadata + FunctionParam + AnalysisStats

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 1h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T12:25:00.000Z |
| 結束時間 | 2026-03-31T12:30:00.000Z |

---

## 任務描述

修改 `packages/core/src/types.ts`：

1. 新增 `FunctionParam` interface：
   - `name: string`、`type?: string`、`isOptional?: boolean`、`isRest?: boolean`

2. 擴充 `NodeMetadata`（全部 optional，向下相容）：
   - `parentFileId?: string` — 所屬檔案節點 ID
   - `kind?: 'function' | 'method' | 'getter' | 'setter' | 'constructor' | 'class'`
   - `parameters?: FunctionParam[]` — 函式參數列表
   - `returnType?: string` — 回傳型別
   - `lineCount?: number` — 函式/類別行數
   - `isAsync?: boolean`
   - `isExported?: boolean`
   - `methodCount?: number` — class 專用

3. 擴充 `EdgeMetadata`（全部 optional，向下相容）：
   - `callerName?: string`
   - `calleeName?: string`
   - `callType?: 'direct' | 'method' | 'new'`

4. 擴充 `AnalysisStats`（全部 optional，向下相容）：
   - `totalFunctions?: number`
   - `totalClasses?: number`
   - `totalCallEdges?: number`

5. 匯出 `FunctionParam` 型別

## 驗收標準

- [x] FunctionParam interface 定義正確
- [x] NodeMetadata 新欄位全部 optional
- [x] EdgeMetadata 新欄位全部 optional
- [x] AnalysisStats 新欄位全部 optional
- [x] 既有型別不受影響（向下相容）
- [x] TypeScript 編譯通過
- [x] 既有 523+ tests 零回歸

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T12:25:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T12:30:00.000Z — done
types.ts extended: FunctionParam + NodeMetadata + EdgeMetadata + AnalysisStats. tsc clean, 253 tests zero regression
