# T13 測試 + 回歸（角色分類 + 策展 + 效能 + 893+ 回歸）

| 欄位 | 值 |
|------|-----|
| ID | T13 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T10,T9 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

### 單元測試
- applyCuration 策展過濾
- ViewState reducer PIN_NODE/UNPIN_NODE
- useViewStateSelector hook

### 整合測試
- 策展 + 手動過濾疊加
- 策展 + 視圖模式疊加
- pinnedNodeIds 持久性

### 效能測試
- ViewState dispatch re-render 範圍
- graph-adapter useMemo 命中率

### 回歸測試
- 893+ 既有 tests 零回歸
- pnpm build 全通過
- Sprint 1-9 功能不受影響
- 2D 模式不受 3D 影響

## 驗收標準

- [x] applyCuration 單元測試通過
- [x] ViewState 新 actions 測試通過
- [x] 整合測試通過
- [x] 893+ 既有 tests 零回歸
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
