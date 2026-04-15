# D3 力導向佈局

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 3h |
| 完工時間 | 2026-03-30T17:45:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作 `useForceLayout.ts`：D3 force simulation 計算節點位置。

### 具體工作

1. `packages/web/src/hooks/useForceLayout.ts`
2. 使用 d3-force：forceLink + forceManyBody + forceCenter + forceCollide
3. 初次載入時自動佈局，節點從中心展開到計算位置
4. forceCollide 碰撞偵測避免節點重疊
5. 佈局穩定後停止 simulation（alphaMin threshold）
6. 整合到 GraphCanvas，佈局結果更新 React Flow node positions

### 規範參考

- `.knowledge/specs/feature-spec.md` F9
- 建議參數：charge -300~-500, link distance 100~200

## 驗收標準

- [x] 節點自動排列不重疊
- [x] 依賴密集的模組自然聚合
- [x] 佈局穩定後 simulation 停止（不持續消耗 CPU）
- [x] 初次載入有展開動畫效果

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:30:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T17:45:00.000Z — 狀態變更 → in_review
完成。useForceLayout hook — forceLink + forceManyBody(-400) + forceCenter + forceCollide(40)，alphaMin 收斂停止，已整合至 GraphCanvas。

### 2026-03-30T17:46:00.000Z — 狀態變更 → done
L1 審核通過。D3 force simulation 正確整合，碰撞偵測 + 自動停止 + tick 更新 React Flow positions。
