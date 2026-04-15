# 3D 架構設計 + 共享狀態層

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T10:15:00.000Z |
| 完工時間 | 2026-03-31T11:00:00.000Z |

---

## 任務描述

定義 Sprint 4 的 3D 架構設計：

1. **ViewStateContext 介面定義**：mode、selectedNodeId、hoveredNodeId、searchQuery、searchResults、isPanelOpen、focusNodeId
2. **2D/3D 切換策略**：GraphContainer 依 mode 切換顯示 GraphCanvas 或 Graph3DCanvas，共享狀態不重置
3. **Graph3DCanvas 介面**：接收 nodes/edges prop，封裝 3d-force-graph 實例
4. **檔案結構**：contexts/ViewStateContext.tsx、hooks/useViewState.ts、components/GraphContainer.tsx、components/Graph3DCanvas.tsx
5. **資料流圖**：ViewStateProvider → 兩個渲染器 → 共用 UI（NodePanel、SearchBar）

產出設計文件：`.knowledge/sprint4-3d-architecture.md`

## 驗收標準

- [x] 設計文件含 ViewState TypeScript 型別定義
- [x] 設計文件含元件介面（props 定義）
- [x] 設計文件含資料流圖（ASCII）
- [x] 設計文件含檔案結構規劃
- [x] 與 feature-spec F23~F32 一致

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:15:00.000Z — 狀態變更 → in_progress
tech-lead 開始執行 T1 架構設計

### 2026-03-31T11:00:00.000Z — 狀態變更 → in_review
T1 完成。產出 `.knowledge/sprint4-3d-architecture.md`（8 章節）：ViewState 型別定義、元件介面、資料流圖、檔案結構、3d-force-graph 整合策略、重構計畫、Feature Spec 對照

### 2026-03-31T11:05:00.000Z — 狀態變更 → done
L1 自審通過：ViewState 型別完整（7 欄位 + 10 Action）、元件介面 5 個已定義、資料流圖含互動細節、檔案結構 8 新增 / 6 小改 / 6 不動、F23~F32 全部對照
