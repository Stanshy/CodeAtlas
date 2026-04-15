# ControlPanel 元件 + 可收合區段 + FilterPanel 嵌入

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

1. 新建 `ControlPanel.tsx`：左側 fixed 面板，280px 展開 / 44px 收合（icon 列）
2. 新建 `ControlPanelSection.tsx`：可收合區段子元件（header + chevron + content）
3. 五個區段：視圖模式（預設展開）、顯示偏好（收合）、分析工具（收合）、過濾器（收合）、AI 設定（收合，P1 placeholder）
4. 修改 `FilterPanel.tsx` 為可嵌入模式：新增 `embedded` prop，嵌入時去掉外框/背景
5. 過濾器區段嵌入 FilterPanel 內容
6. 分析工具區段：端到端追蹤 trigger 按鈕、AI 概述 trigger 按鈕
7. z-index: 35，深色霓虹主題
8. 讀取 ViewState isControlPanelOpen，dispatch TOGGLE_CONTROL_PANEL

## 驗收標準

- [x] ControlPanel.tsx 完成（展開 280px / 收合 44px）
- [x] ControlPanelSection.tsx 完成（可收合區段）
- [x] 5 個區段正確渲染（預設展開/收合狀態正確）
- [x] FilterPanel 可嵌入模式
- [x] 分析工具區段有端到端追蹤 + AI 概述入口
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
