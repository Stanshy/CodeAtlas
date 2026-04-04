# 流動動畫

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T18:10:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作邊線上的方向性光點粒子流動動畫。

### 具體工作

1. 更新 `packages/web/src/components/NeonEdge.tsx`：加入粒子流動
2. `packages/web/src/styles/animations.css`：粒子 CSS 動畫
3. 粒子沿邊線從 source 流向 target
4. 非 hover 時粒子較暗，hover 時明亮
5. 支援 `prefers-reduced-motion` 關閉動畫

### 規範參考

- `.knowledge/specs/feature-spec.md` F13

## 驗收標準

- [x] 粒子沿邊線流動可見
- [x] 方向正確（source → target）
- [x] prefers-reduced-motion 可關閉
- [x] 動畫效能不影響整體 FPS

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:50:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T18:10:00.000Z — 狀態變更 → in_review
完成。NeonEdge.tsx 加入 SVG animateMotion 粒子、animations.css（@keyframes particle-flow + prefers-reduced-motion）、particleFlow 參數引用 theme.ts。

### 2026-03-30T18:11:00.000Z — 狀態變更 → done
L1 審核通過。SVG animateMotion 沿 bezier path 流動，source→target 方向正確，reduced-motion 支援，僅 import 邊顯示粒子。
