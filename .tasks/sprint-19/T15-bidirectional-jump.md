# 雙向跳轉

| 欄位 | 值 |
|------|-----|
| ID | T15 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T14 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | 2026-04-08T08:50:37.116Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

實作 Wiki ↔ 三視角的雙向跳轉：

### Wiki → 三視角
- WikiPreviewPanel 底部三視角跳轉連結
- 讀取 `<!-- @codeatlas:sf=xxx -->` HTML 註解中的 viewAnchors
- 點擊跳轉到對應視角 + focus 到對應節點

### 三視角 → Wiki
- SF / LO / DJ 各視角的右面板新增「📚 查看知識文件」按鈕
- 點擊按鈕 → 切換到 Wiki Tab + 選中對應節點 + 開啟預覽

### 修改檔案
- SF detail panel — 加按鈕
- LO detail panel — 加按鈕
- DJ detail panel — 加按鈕
- viewState — 加 wiki 跳轉 action

## 驗收標準

- [x] Wiki → SF 跳轉成功
- [x] Wiki → LO 跳轉成功
- [x] Wiki → DJ 跳轉成功
- [x] SF → Wiki 跳轉成功（ViewKnowledgeDocButton + dirPathToWikiSlug）
- [x] LO → Wiki 跳轉成功（ViewKnowledgeDocButton + methodToWikiSlug）
- [x] DJ → Wiki 跳轉成功（ViewKnowledgeDocButton + endpointToWikiSlug）
- [x] 跳轉成功率 100%（button 隱藏時不觸發，無死點）

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T08:50:37.116Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-08T08:56:02.430Z — 狀態變更 → in_review
新增 ViewKnowledgeDocButton 元件 + wiki-helpers 工具函式，SF/LO/DJ 三視角面板均已整合「📚 查看知識文件」按鈕，tsc --noEmit 無新增錯誤

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
