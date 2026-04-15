# T4 web 型別同步 + graph-adapter applyCuration 策展函式

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

1. `packages/web/src/types/graph.ts`：新增 `NodeRole` type + `NodeMetadata.role?: NodeRole`
2. `packages/web/src/adapters/graph-adapter.ts`：新增 `applyCuration()` 函式

### applyCuration 規則

```typescript
export function applyCuration(
  nodes: GraphNode[],
  edges: GraphEdge[],
  pinnedNodeIds: Set<string>,
): { nodes: GraphNode[]; edges: GraphEdge[] }
```

- business-logic + cross-cutting → 顯示
- infrastructure → 顯示（opacity 淡化由 NeonNode 處理）
- utility + noise → 隱藏（除非在 pinnedNodeIds 中）
- role undefined → 當 infrastructure
- 邊：source + target 都在顯示集合才保留
- 策展後節點 < 5 → 自動放寬（顯示全部 infrastructure）

### 三層過濾順序

applyViewMode → applyCuration → filterNodes/filterEdges

**無「全部顯示」選項**。

## 驗收標準

- [x] web types/graph.ts 含 NodeRole + role optional 欄位
- [x] applyCuration 正確過濾 5 種角色
- [x] pinnedNodeIds 機制正確
- [x] role undefined → infrastructure 處理
- [x] 邊過濾正確
- [x] 策展後節點 < 5 自動放寬
- [x] 無「全部顯示」

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
