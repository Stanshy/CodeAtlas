# 端到端追蹤 hook + traceE2E 純函式

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 9 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T22:00:00.000Z |

---

## 任務描述

1. 新建 `packages/web/src/hooks/useE2ETracing.ts`：
   - **純函式** `traceE2E(startNodeId, nodes, edges, maxDepth=10)` — 混合 edge type BFS：
     - 從 startNodeId 出發，沿 all edge types forward（source === current）
     - 記錄每步的 nodeId, nodeLabel, edgeId, edgeType, symbols, depth
     - visited set 防循環
     - 截斷：超過 30 個節點 → truncated: true
     - 回傳 E2ETracingResult { path, edges, steps, truncated }
   - **Hook** `useE2ETracing()`:
     - 讀取 ViewState e2eTracing
     - 提供 startTracing(nodeId), updateDepth(maxDepth), clearTracing()
     - startTracing: 呼叫 traceE2E → dispatch START_E2E_TRACING
     - updateDepth: 重新呼叫 traceE2E → dispatch UPDATE_E2E_DEPTH
     - clearTracing: dispatch CLEAR_E2E_TRACING

2. BFS 先寫純函式再包 hook（Sprint 8 教訓：方便單元測試）

### traceE2E 演算法虛擬碼

```
function traceE2E(startNodeId, nodes, edges, maxDepth):
  queue = [{ nodeId: startNodeId, depth: 0 }]
  visited = Set([startNodeId])
  result = { path: [startNodeId], edges: [], steps: [startStep], truncated: false }

  while queue not empty:
    { nodeId, depth } = queue.shift()
    if depth >= maxDepth: continue
    if result.path.length >= 30: result.truncated = true; break

    for each edge where edge.source === nodeId:
      targetId = edge.target
      if targetId in visited: continue
      visited.add(targetId)

      step = { nodeId: targetId, edgeId: edge.id, edgeType: edge.type,
               symbols: edge.metadata.importedSymbols ?? [], depth: depth+1 }
      result.path.push(targetId)
      result.edges.push(edge.id)
      result.steps.push(step)
      queue.push({ nodeId: targetId, depth: depth+1 })

  return result
```

## 驗收標準

- [x] traceE2E 純函式實作完成
- [x] BFS 正確 follow all edge types forward
- [x] visited set 防循環
- [x] depth limit 生效
- [x] 超過 30 節點截斷
- [x] useE2ETracing hook 完成（startTracing / updateDepth / clearTracing）
- [x] tsc 編譯通過

---

## 事件紀錄

### 2026-03-31T22:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
