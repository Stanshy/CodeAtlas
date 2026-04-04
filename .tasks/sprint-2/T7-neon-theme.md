# 深色霓虹主題實作

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5,G1 |
| 預估 | 3h |
| 完工時間 | 2026-03-30T17:45:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

按 T2/T3 設計稿實作霓虹風格的自訂節點與邊元件。

### 具體工作

1. `packages/web/src/styles/theme.ts`：DD 提供的色彩系統常數（或按 mockup 提取）
2. `packages/web/src/styles/global.css`：深色背景、全域字體
3. `packages/web/src/components/NeonNode.tsx`：霓虹風格自訂節點（圓角矩形 + glow border）
4. `packages/web/src/components/NeonEdge.tsx`：霓虹風格自訂邊（漸層 + glow）
5. `packages/web/src/components/DirectoryNode.tsx`：目錄群組節點（可展開收合外觀）
6. 節點類型色彩區分：directory 用一色、file 用另一色
7. 文字對比度 ≥ 4.5:1（WCAG AA）

### 規範參考

- `.knowledge/specs/feature-spec.md` F10
- DD 提供的 theme.ts + mockup HTML
- G1 通過的設計稿

## 驗收標準

- [x] 視覺效果與 mockup 一致
- [x] glow 效果可見（box-shadow / drop-shadow）
- [x] 不同節點類型用不同霓虹色區分
- [x] 文字對比度 ≥ 4.5:1
- [x] 色彩常數集中在 theme.ts

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:30:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T17:45:00.000Z — 狀態變更 → in_review
完成。NeonNode.tsx（Cyan 系 file 節點 + 3 態 glow）、NeonEdge.tsx（bezier path + import/export/data-flow 樣式）、DirectoryNode.tsx（Magenta 系 + accent bar + toggle）、theme.ts 從 design 複製、global.css 深色背景。

### 2026-03-30T17:46:00.000Z — 狀態變更 → done
L1 審核通過。所有色碼嚴格引用 theme.ts，glow 三級（subtle/normal/intense），節點類型 Cyan vs Magenta 區分明確。
