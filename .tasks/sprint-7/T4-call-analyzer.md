# call-analyzer.ts：靜態呼叫關係分析

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T12:45:00.000Z |
| 結束時間 | 2026-03-31T13:00:00.000Z |

---

## 任務描述

新增 `packages/core/src/analyzer/call-analyzer.ts`：

1. 定義 `CallRelation` interface：
   - callerFileId, callerName, calleeFileId, calleeName
   - callType ('direct' | 'method' | 'new'), confidence ('high' | 'medium' | 'low')
   - line (呼叫行號)

2. 實作 `analyzeCallRelations()` 函式：
   - 遍歷 AST 尋找 `call_expression` / `CallExpression` 和 `new_expression` / `NewExpression`
   - 直接呼叫 `foo()`：匹配 localFunctions 中的同名函式 → confidence: high
   - 方法呼叫 `obj.foo()`：匹配 `this.foo()` → class 內方法；其他 → 嘗試 import 匹配
   - new 建構 `new Foo()`：匹配 localFunctions 或 importedFunctions 中的 class → confidence: high
   - import 的函式呼叫：透過 importedFunctions map 解析到目標 fileId + functionName
   - 動態呼叫 `obj[method]()`：建立 confidence: low 邊
   - 未匯入/全域函式呼叫：不建立邊

3. 輔助函式：
   - `resolveCallTarget()` — 解析呼叫目標到已知函式
   - `isMethodCall()` — 判斷是否為方法呼叫
   - `isDynamicCall()` — 判斷是否為動態呼叫

## 驗收標準

- [x] 直接呼叫 foo() 正確匹配
- [x] 方法呼叫 obj.foo() / this.foo() 正確匹配
- [x] new 建構 new Foo() 正確匹配
- [x] import 的函式呼叫正確跨檔案解析
- [x] 動態呼叫標記 confidence: low
- [x] 未匯入/全域函式不建立邊
- [x] 遞迴呼叫建立自邊
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T12:45:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T13:00:00.000Z — done
call-analyzer.ts complete: direct/method/new callTypes, confidence grading, global function skip list, cross-file import resolution. tsc clean
