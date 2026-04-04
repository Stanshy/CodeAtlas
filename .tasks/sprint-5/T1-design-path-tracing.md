# 設計：路徑追蹤演算法 + 邊標籤架構

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 5 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T01:28:16.133Z |
| 完工時間 | 2026-03-31T01:31:11.510Z |

---

## 任務描述

定義 Sprint 5 核心架構：

1. **路徑追蹤 BFS 演算法**：虛擬碼、輸入/輸出介面、循環偵測（visited set + depth ≤ 10）
2. **ViewStateContext 擴充介面**：新增 tracing + heatmap 欄位與 action 型別定義
3. **共用 hook 介面**：usePathTracing、useEdgeSymbols、useHeatmap 的介面規格
4. **邊標籤渲染策略**：2D（React Flow edge label）vs 3D（SpriteText hover-only）
5. **資料流圖**：各元件如何透過 ViewStateContext 互動

產出設計文件：`.knowledge/sprint5-dataflow-architecture.md`

## 驗收標準

- [x] 設計文件含路徑追蹤演算法虛擬碼
- [x] 設計文件含 ViewState 型別擴充定義
- [x] 設計文件含 3 個共用 hook 介面
- [x] 設計文件含邊標籤渲染策略（2D/3D）
- [x] 設計文件含資料流圖
- [x] 所有色彩引用 theme.ts，不硬編碼

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T01:28:16.133Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T01:30:36.110Z — 狀態變更 → in_review
提交審查。交付物：`.knowledge/sprint5-dataflow-architecture.md`（11 章節）：ViewState 型別擴充（+5 欄位 +4 action）、路徑追蹤 BFS 演算法虛擬碼（visited + depth ≤ 10）、3 個共用 hook 介面（useEdgeSymbols/usePathTracing/useHeatmap）、邊標籤渲染策略（2D React Flow + 3D Canvas sprite）、元件互動資料流圖、theme.ts 擴充、優先級規則、粒子 symbol 類型推斷。

### 2026-03-31T01:31:11.510Z — 狀態變更 → done
L1 審核通過。設計 Review（對規範）：F33~F40 逐項比對全覆蓋，色碼全引用 theme.ts，BFS 演算法含循環偵測+深度上限，3 個共用 hook 介面完整。0 Blocker / 0 Major / 0 Minor。
