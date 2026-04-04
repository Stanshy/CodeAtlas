# React Flow 基礎渲染

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T17:25:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作 `GraphCanvas.tsx`：將 adapter 產出的 React Flow nodes/edges 渲染為可互動圖，含 minimap + 縮放平移。

### 具體工作

1. `packages/web/src/components/GraphCanvas.tsx`：React Flow 容器，使用 ReactFlowProvider
2. `packages/web/src/components/Minimap.tsx`：縮略圖元件
3. 更新 `App.tsx`：整合 useGraphData + GraphCanvas
4. 支援滑鼠滾輪縮放、拖曳平移、節點拖曳
5. 空資料時顯示提示，錯誤時顯示錯誤訊息

### 規範參考

- `.knowledge/specs/feature-spec.md` F8

## 驗收標準

- [x] 瀏覽器可看到節點圖
- [x] 滑鼠滾輪縮放正常
- [x] 拖曳平移正常
- [x] Minimap 顯示正常
- [x] 節點可拖曳重定位
- [x] 空資料/錯誤有對應 UI 提示

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:15:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T17:25:00.000Z — 狀態變更 → in_review
完成。GraphCanvas.tsx（ReactFlow + Background + MiniMap + Controls + vignette）、global.css（深色背景 + 狀態 UI）、App.tsx 整合 useGraphData + 三狀態（loading/error/empty）。exactOptionalPropertyTypes 修正。

### 2026-03-30T17:26:00.000Z — 狀態變更 → done
L1 審核通過。React Flow 容器正確整合，fitView + zoom 0.1-2、Background dots、MiniMap 色彩對應 nodeType、Controls toolbar、vignette overlay。三狀態 UI 完整。
