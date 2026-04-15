# T5 NeonNode infrastructure 淡化 + useGraphData 策展整合

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

1. `packages/web/src/components/NeonNode.tsx`：infrastructure 角色節點 opacity 降低（0.5-0.6），視覺淡化但不隱藏
2. `packages/web/src/hooks/useGraphData.ts`：整合 applyCuration 呼叫點，在資料流中加入策展過濾

### 整合點

useGraphData 中：
```
原始資料 → applyViewMode → applyCuration(nodes, edges, pinnedNodeIds) → filterNodes/filterEdges → styled output
```

## 驗收標準

- [x] infrastructure 節點 opacity 淡化
- [x] useGraphData 正確呼叫 applyCuration
- [x] 三層過濾順序正確
- [x] 既有功能不受影響

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
