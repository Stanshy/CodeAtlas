# FunctionNode.tsx + ClassNode.tsx + CallEdge.tsx 元件

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T13:45:00.000Z |
| 結束時間 | 2026-03-31T14:00:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/FunctionNode.tsx`：函式節點（比 NeonNode 小一號，lime/yellow 色系）、顯示參數（≤3 完整 / >3 計數）、回傳型別、async 標記
2. 新增 `packages/web/src/components/ClassNode.tsx`：類別節點、顯示方法數量
3. 新增 `packages/web/src/components/CallEdge.tsx`：呼叫邊（虛線 + 粒子、low confidence 用更淡虛線）
4. 修改 `packages/web/src/components/GraphCanvas.tsx`：註冊新元件

## 驗收標準

- [x] FunctionNode 正確渲染（色系、大小、參數、回傳型別）
- [x] ClassNode 正確渲染（方法數量）
- [x] CallEdge 虛線 + 粒子渲染
- [x] low confidence 邊視覺區分
- [x] GraphCanvas 正確註冊新元件
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:45:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T14:00:00.000Z — done
FunctionNode (lime/green neon, params/returnType/async/export badges), ClassNode (yellow/amber, method count), CallEdge (dashed lime + particle, low-confidence transparency). All registered in GraphCanvas. tsc clean
