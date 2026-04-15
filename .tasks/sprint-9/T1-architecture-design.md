# 架構設計：控制面板 + 視圖模式 + 端到端追蹤 + Toolbar

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

撰寫 `.knowledge/sprint9-controlpanel-architecture.md` 架構設計文件，包含：
1. ControlPanel 元件架構（5 個區段、收合邏輯、FilterPanel 嵌入方式）
2. 視圖模式定義（ViewModePreset 型別、四種預設、applyViewMode 設計）
3. 端到端追蹤演算法（traceE2E BFS 設計、E2EStep 資料結構）
4. Toolbar 三區段佈局設計
5. ViewState 第 5 次擴充完整定義（新 state + 7 個 actions + reducer 邏輯）
6. 優先順序堆疊設計（filter → viewMode → searchFocus → e2eTracing → impact → tracing → hover）
7. 2D + 3D 適配策略

## 驗收標準

- [x] 架構設計文件完成
- [x] ControlPanel 區段結構清楚定義
- [x] 四種視圖模式預設完整定義
- [x] 端到端追蹤 BFS 演算法設計
- [x] ViewState 擴充完整（型別 + actions + reducer）
- [x] Toolbar 三區段佈局定義

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T22:30:00.000Z — done
架構設計文件完成：`.knowledge/sprint9-controlpanel-architecture.md`（v1.0）。涵蓋 ControlPanel 5 區段架構、Toolbar 三區段佈局、四種視圖模式預設定義（ViewModePreset + applyViewMode）、端到端追蹤 BFS 演算法（traceE2E 純函式 + E2EStep 資料結構）、ViewState 第 5 次擴充（4 新 state + 7 新 actions + reducer 邏輯）、2D+3D 適配策略、優先順序堆疊。
