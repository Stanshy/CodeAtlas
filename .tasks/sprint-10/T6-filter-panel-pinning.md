# T6 FilterPanel 手動微調（已隱藏節點區段 + PIN_NODE/UNPIN_NODE）

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 2h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

1. `packages/web/src/contexts/ViewStateContext.tsx`：新增 `pinnedNodeIds: string[]` + `PIN_NODE` / `UNPIN_NODE` actions
2. `packages/web/src/components/FilterPanel.tsx`：新增「已隱藏節點」區段
   - 顯示被策展隱藏的 utility + noise 節點列表
   - 每個節點旁有「釘選」按鈕（PIN_NODE）
   - 已釘選的節點有「取消釘選」按鈕（UNPIN_NODE）
   - **不可一鍵全開**

## 驗收標準

- [x] ViewState 含 pinnedNodeIds
- [x] PIN_NODE / UNPIN_NODE actions 正確
- [x] FilterPanel 顯示已隱藏節點列表
- [x] 可釘選 / 取消釘選
- [x] 不可一鍵全開
- [x] pinnedNodeIds 切換視圖後保持

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
