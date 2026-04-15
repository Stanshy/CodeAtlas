# 2D/3D 切換 + 共享狀態層實作

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T13:00:00.000Z |
| 完工時間 | 2026-03-31T00:14:55.212Z |

---

## 任務描述

實作共享狀態層和 2D/3D 切換功能：

1. **ViewStateContext.tsx**：建立 React Context + Provider，含 ViewState 型別（依 T1 設計）
2. **useViewState.ts**：hook 封裝，提供 state + dispatch 方法
3. **GraphContainer.tsx**：依 mode 切換顯示 GraphCanvas（2D）或 Graph3DCanvas（3D），fade out/in 300ms
4. **ViewToggle.tsx**：2D/3D 切換按鈕，放在 Toolbar
5. **重構 App.tsx**：引入 ViewStateProvider 包裹，替換直接使用 GraphCanvas
6. **重構 NodePanel.tsx**：從 props 改為讀取 ViewStateContext 的 selectedNodeId
7. **重構 SearchBar.tsx**：從 props 改為讀取/寫入 ViewStateContext

切換時共享狀態不重置：selectedNodeId、searchQuery、isPanelOpen 保留。

## 驗收標準

- [x] ViewStateContext 提供完整 ViewState 讀寫
- [x] 按鈕切換 2D↔3D，渲染器正確切換
- [x] 切換後選中節點保留
- [x] 切換後搜尋結果保留
- [x] 切換後面板狀態保留
- [x] 過渡動畫 fade out/in（≈300ms）
- [x] 2D 模式所有現有功能不受影響

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:00:00.000Z — 狀態變更 → in_progress
與 T3 一同由 frontend-developer 部分完成：ViewStateContext.tsx、ViewToggle.tsx、GraphContainer.tsx、App.tsx 重構。剩餘：TS 錯誤修復、切換狀態保留驗證。

### 2026-03-31T00:14:55.212Z — 狀態變更 → in_review
L1 補完剩餘工作並提交審查。修復 4 個 pre-existing TS 錯誤（NodePanel.tsx unused import、NodePanel.tsx/SearchBar.tsx Framer Motion MotionStyle cast、useAiSummary.ts redundant comparison）。ViewStateContext 管理所有共享狀態，切換 2D↔3D 時 selectedNodeId/isPanelOpen/searchQuery 均透過 Context 保留。

### 2026-03-31T00:18:17.098Z — 狀態變更 → done
L1 審核通過（/task-approve）。全部驗收標準達成。pnpm tsc 0 errors。
