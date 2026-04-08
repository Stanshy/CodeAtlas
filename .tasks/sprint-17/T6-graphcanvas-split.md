# GraphCanvas 拆分

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T5 |
| 預估 | 4h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

將 GraphCanvas.tsx (2,644 行) 拆為主檔 + 子元件/hooks，主檔目標 <900 行。

### 抽出模組（5 個）

1. **`useDJMode`** → `hooks/useDJMode.ts` (~350 行)
   - DJ 狀態 + reset effects + BFS 路徑計算 + 6 handler callbacks

2. **`useLOMode`** → `hooks/useLOMode.ts` (~250 行)
   - LO 狀態 + reset effect + 4 handler callbacks + category card 建構

3. **`useNodeEdgeStyling`** → `hooks/useNodeEdgeStyling.ts` (~500 行)
   - styledNodes useMemo + styledEdges useMemo（巨型樣式優先權鏈）

4. **`useGraphCanvasFiltering`** → `hooks/useGraphCanvasFiltering.ts` (~350 行)
   - raw 轉換 + filtering pipeline（perspective + curation）

5. **`GraphCanvasFooter`** → `components/graph/GraphCanvasFooter.tsx` (~260 行)
   - SF/DJ/LO footer JSX

### 拆分原則
- 主檔只保留：imports + props + hook 呼叫 + event handlers + ReactFlow JSX
- GraphCanvas export 路徑不變（GraphContainer.tsx import 不破壞）
- 每抽完一個模組立即 `pnpm build` 驗證
- 注意 stale closure：DJ/LO hooks 接收 setter 作為 params，用 ref pattern

## 驗收標準

- [x] GraphCanvas.tsx < 900 行
- [x] 5 個新檔案建立
- [x] pnpm build 通過
- [x] UI 行為不變（2D 渲染、DJ/LO/SF 切換、搜尋、hover）
- [x] 無 circular dependency

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
