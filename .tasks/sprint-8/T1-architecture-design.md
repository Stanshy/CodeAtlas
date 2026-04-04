# 架構設計：影響分析演算法 + 過濾架構 + AI 概述 prompt 設計 + 右鍵選單互動

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:05:00.000Z |
| 結束時間 | 2026-03-31T16:20:00.000Z |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 撰寫 `.knowledge/sprint8-impact-architecture.md` 架構設計文件
2. 影響分析 BFS 演算法設計（正向/反向、depth limit、visited 防環、截斷 50 個）
3. 右鍵選單設計（2D DOM overlay + 3D raycaster 投影到螢幕座標）
4. 搜尋聚焦模式設計（dim/highlight、Escape 退出）
5. FilterPanel 架構設計（graph-adapter 層過濾、三個過濾區段）
6. AI 概述 prompt 設計（結構提取、隱私保護不送原始碼）
7. ViewState 擴充設計（8 個新 action、優先級：filter → searchFocus → impact）

## 驗收標準

- [x] `.knowledge/sprint8-impact-architecture.md` 完成
- [x] BFS 演算法設計含偽代碼
- [x] 右鍵選單 2D + 3D 觸發方式清晰
- [x] 搜尋聚焦 + 過濾 + 影響分析優先級明確
- [x] AI 概述 prompt 模板含隱私保護說明
- [x] ViewState 擴充型別完整

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:05:00.000Z — in_progress
由 tech-lead 開始執行

### 2026-03-31T16:20:00.000Z — done
`.knowledge/sprint8-impact-architecture.md` 完成。含 BFS 演算法設計、右鍵選單 2D/3D 觸發、搜尋聚焦模式、FilterPanel graph-adapter 層過濾、AI 概述 prompt 設計（隱私保護）、ViewState 9 個 action、優先級疊加規則（filter→search→impact→tracing）、2D/3D 適配清單。
