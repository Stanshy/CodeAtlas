# FunctionPanel.tsx：函式簽名 + 參數 + 呼叫鏈列表 + NodePanel 整合

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T8,T10 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T14:25:00.000Z |
| 結束時間 | 2026-03-31T14:35:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/FunctionPanel.tsx`：
   - 函式簽名顯示：`async function foo(a: string, b: number): Promise<boolean>`
   - 參數列表（名稱 + 型別 + optional/rest 標記）
   - 回傳型別
   - 呼叫鏈列表：callers（誰呼叫我）→ callees（我呼叫誰），可點擊跳轉
   - class 節點時顯示方法列表

2. 修改 `packages/web/src/components/NodePanel.tsx`：
   - function/class 節點時渲染 FunctionPanel
   - file 節點保持既有行為

## 驗收標準

- [x] 函式簽名正確顯示
- [x] 參數列表完整（名稱+型別+標記）
- [x] 呼叫鏈列表可點擊跳轉
- [x] class 節點顯示方法列表
- [x] NodePanel 正確分派 FunctionPanel
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T14:25:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T14:35:00.000Z — done
FunctionPanel with signature display, parameter list (name+type+optional/rest), callers/callees chain (clickable). ClassNode shows method list. NodePanel dispatches FunctionPanel for function/class nodes. tsc clean
