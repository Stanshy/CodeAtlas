# Toolbar 統一元件 + App.tsx 整合 + 舊元件遷移

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5,T6,T8 |
| 預估 | 2.5h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

### 1. 新建 Toolbar.tsx
- fixed top，z-index: 40
- 三區段 flex 佈局：
  - **左區**：ControlPanel toggle 按鈕（☰ icon），dispatch TOGGLE_CONTROL_PANEL
  - **中區**：SearchBar trigger（點擊 dispatch SET_SEARCH_OPEN）
  - **右區**：當前 ViewMode badge + 2D/3D toggle + OverviewPanel trigger
- 深色半透明背景

### 2. 修改 App.tsx
- 引入 Toolbar + ControlPanel + E2EPanel
- 移除散落的獨立浮動元件：ViewToggle、HeatmapToggle（已整合進 ControlPanel/Toolbar）
- CameraPresets 保留在右下角（3D 專屬）
- 右側面板互斥邏輯：e2eTracing.active → E2EPanel / tracingSymbol → TracingPanel / isPanelOpen → NodePanel
- 確保 FilterPanel 不再獨立渲染（已嵌入 ControlPanel）

### 3. OverviewPanel 連接
- Toolbar 右區的 OverviewPanel 按鈕 → 觸發 AI 概述

### 4. 整合後 App layout
```
┌─ Toolbar (fixed top) ───────────────────────────┐
│ ☰ │        🔍 Search (Ctrl+K)        │ 📊 🗺 2D │
├───┤                                              │
│ C │    GraphContainer / Graph3DCanvas             │
│ o │                                              │
│ n │                                        ┌────┤
│ t │                                        │ E2E│
│ r │                                        │ or │
│ o │                                        │Node│
│ l │                                        │Pnl │
│   │                                        │    │
│ P │                                        └────┤
│ a │                                              │
│ n │                  CameraPresets (3D only)      │
│ l │                       ↙                      │
└───┴──────────────────────────────────────────────┘
```

## 驗收標準

- [x] Toolbar.tsx 完成（三區段佈局）
- [x] App.tsx 整合 Toolbar + ControlPanel + E2EPanel
- [x] 移除 ViewToggle / HeatmapToggle 散落引用
- [x] 右側面板互斥邏輯正確（E2EPanel > TracingPanel > NodePanel）
- [x] OverviewPanel 按鈕已連接
- [x] FilterPanel 按鈕已連接（透過 ControlPanel）
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
