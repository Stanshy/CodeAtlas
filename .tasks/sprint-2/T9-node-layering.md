# 節點分層

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T18:10:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作 zoom 層級控制節點顯示粒度：zoom out 看目錄、zoom in 看檔案。

### 具體工作

1. `packages/web/src/utils/layout.ts`：zoom threshold 邏輯 + 目錄/檔案分層
2. 更新 `DirectoryNode.tsx`：展開/收合邏輯
3. Level 1（zoom < 0.5）：只顯示 directory 節點
4. Level 2（zoom ≥ 0.5）：展開目錄，顯示 file 節點
5. 邊界：扁平專案直接顯示所有檔案、深層巢狀只到第一層子目錄

### 規範參考

- `.knowledge/specs/feature-spec.md` F12

## 驗收標準

- [x] zoom out 只顯示 directory 節點
- [x] zoom in 展開顯示 file 節點
- [x] 扁平專案正確處理（直接顯示檔案）
- [x] 兩層切換正確

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:50:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T18:10:00.000Z — 狀態變更 → in_review
完成。layout.ts — ZOOM_THRESHOLD 0.5 切換、filterNodesByLayer（扁平專案 fallback + MAX_DIRECTORY_DEPTH）、filterEdgesByVisibleNodes。

### 2026-03-30T18:11:00.000Z — 狀態變更 → done
L1 審核通過。zoom 分層邏輯正確，邊界條件（扁平專案、深層巢狀）處理妥當。
