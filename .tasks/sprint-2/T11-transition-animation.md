# 動畫過渡

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T7,T9 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T18:20:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作展開/收合/聚焦的平滑動畫過渡。

### 具體工作

1. 展開目錄：子節點從父節點位置展開到佈局位置
2. 收合目錄：子節點匯聚回父節點
3. 聚焦節點：viewport 平滑移動 + zoom in
4. 使用 Framer Motion 或 React Flow transition
5. 時長 200-400ms，easing: ease-out 或 spring

### 規範參考

- `.knowledge/specs/feature-spec.md` F14

## 驗收標準

- [x] 展開/收合有平滑動畫
- [x] 聚焦有 viewport 平移動畫
- [x] 無跳閃現象
- [x] 動畫時長 200-400ms

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T18:15:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T18:20:00.000Z — 狀態變更 → in_review
完成。DirectoryNode 加入 Framer Motion AnimatePresence + motion.div 展開/收合動畫（250ms ease）、toggle 旋轉動畫、useViewportAnimation hook（setCenter + fitView 帶 duration）。

### 2026-03-30T18:21:00.000Z — 狀態變更 → done
L1 審核通過。展開/收合 250ms 平滑，toggle 按鈕旋轉回饋，聚焦 350ms easeInOut，無跳閃。
