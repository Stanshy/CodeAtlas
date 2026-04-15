# 視角切換 Tab Bar + graph-adapter 適配

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T20:00:00.000Z |
| 完工時間 | 2026-04-01T20:10:00.000Z |

---

## 任務描述

### TabBar.tsx 新增（見計畫書 §2.6）
- 三個 Tab：系統框架 / 邏輯運作 / 資料旅程
- Active tab: 白底 + 邊框（底部無邊框）+ font-weight:600
- 色點 8px circle: 藍色 / 三色漸層 / 綠色
- 計數 badge: 目錄數 / 檔案數 / 入口數

### graph-adapter.ts 修改
`applyPerspective()` 支援 `directoryGraph` 分流：
- system-framework + directoryGraph 存在 → 使用目錄數據
- 其他視角 → 使用檔案數據

### perspective-presets.ts 更新
- colorScheme: cyan-monochrome → blue-paper, neon-multicolor → multi-paper, green-monochrome → green-paper
- interaction: static-hierarchy → directory-hover, bfs-hover-highlight → bfs-click-focus, stagger-playback → stagger-appear
- 新增 dataSource: 'directory' | 'file'

## 驗收標準

- [x] Tab Bar 三分頁切換正常
- [x] 系統框架切換時使用 directoryGraph
- [x] 其他視角使用檔案數據
- [x] 色點和計數 badge 正確
- [x] perspective-presets 更新完整

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
