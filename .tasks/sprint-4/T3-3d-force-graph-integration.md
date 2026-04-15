# 3d-force-graph 整合 + 基本渲染

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1,G1 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T13:00:00.000Z |
| 完工時間 | 2026-03-30T22:42:08.187Z |

---

## 任務描述

安裝 3d-force-graph + three 依賴，建立 Graph3DCanvas.tsx，將 graph data 轉為 3d-force-graph 格式，實現基本 3D 力導向渲染。

1. `pnpm add 3d-force-graph three` in packages/web
2. 建立 `Graph3DCanvas.tsx`：封裝 3d-force-graph 實例，接收 nodes/edges prop
3. 資料轉換：AnalysisResult graph → 3d-force-graph 格式（{ id, ... } nodes + { source, target } links）
4. 基本力導向渲染：節點球體 + 邊線在 3D 空間
5. 驗證 bundle size（`pnpm build` 後 dist 大小 < 300KB gzipped 增量）
6. cleanup：元件 unmount 時銷毀 3d-force-graph 實例

**注意**：3d-force-graph 是 imperative API（非 React 元件），需用 useRef + useEffect 封裝。

## 驗收標準

- [x] 3d-force-graph + three 已安裝，pnpm build 成功
- [x] Graph3DCanvas.tsx 可渲染 3D 節點球體 + 邊線
- [x] 力導向佈局自動排列節點
- [x] bundle size 增量 < 300KB gzipped
- [x] 元件 unmount 時正確清理 3d-force-graph 實例

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:00:00.000Z — 狀態變更 → in_progress
G1 通過，阻斷解除。tech-lead 委派 frontend-developer 執行

### 2026-03-30T22:42:08.187Z — 狀態變更 → review
完成所有交付物：threeD theme 常數、Graph3DCanvas.tsx、ViewStateContext.tsx、GraphContainer.tsx、ViewToggle.tsx、App.tsx 更新、useGraphData 擴充 rawNodes/rawEdges。pnpm build 通過，無 TypeScript 錯誤（新檔案）。

### 2026-03-30T23:03:18.108Z — 狀態變更 → done
L1 審核通過。0 Blocker / 0 Major / 2 Minor（同時 mount 2D+3D 效能可接受、hover 重建 nodeThreeObject MVP 可接受）。程式碼品質、設計稿比對、規範一致性全部通過。
