# Hover 高亮互動

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T17:45:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作 `useHoverHighlight.ts`：hover 節點時高亮相關依賴路徑，其餘淡化。

### 具體工作

1. `packages/web/src/hooks/useHoverHighlight.ts`
2. Hover 節點 → 放大/亮度提高
3. 入邊（被誰 import）+ 出邊（import 誰）全部亮起
4. 相關上下游節點也高亮
5. 其餘節點和邊 opacity 降低
6. 移開滑鼠 → 恢復正常
7. 響應 < 50ms

### 規範參考

- `.knowledge/specs/feature-spec.md` F11

## 驗收標準

- [x] hover 正確標記入邊 + 出邊 + 上下游節點
- [x] 其餘節點和邊正確淡化
- [x] 移開恢復正常
- [x] 響應 < 50ms（無卡頓感）

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:30:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T17:45:00.000Z — 狀態變更 → in_review
完成。useHoverHighlight hook — buildAdjacency 預計算 O(1) 查找、入邊+出邊+connected nodes、非相關 opacity 0.12/0.35 淡化、useMemo 快取。

### 2026-03-30T17:46:00.000Z — 狀態變更 → done
L1 審核通過。adjacency 預計算確保 <50ms 響應，highlight/fade 樣式在 GraphCanvas 正確套用。
