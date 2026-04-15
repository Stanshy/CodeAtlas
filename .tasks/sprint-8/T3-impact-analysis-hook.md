# useImpactAnalysis hook：BFS 正向/反向 + 截斷 + 深度控制

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:40:00.000Z |
| 結束時間 | 2026-03-31T16:50:00.000Z |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/hooks/useImpactAnalysis.ts`
2. 實作純函式 `analyzeImpact(startNodeId, edges, direction, maxDepth)`:
   - BFS 正向遍歷（follow source → target）
   - BFS 反向遍歷（follow target → source）
   - depth limit（預設 5，可調整 1-10）
   - visited set 防循環依賴
   - 截斷 > 50 個影響節點（不含起點）
   - 回傳 `ImpactAnalysisResult { impactedNodes, impactedEdges, depthMap }`
3. 實作 React hook `useImpactAnalysis()`:
   - 呼叫純函式 + dispatch `IMPACT_ANALYZE` action
   - `updateDepth(maxDepth)` → 重新計算 + dispatch `UPDATE_IMPACT_DEPTH`
   - `clearImpact()` → dispatch `CLEAR_IMPACT`
4. 支援所有 edge type（import/export/data-flow/call）

## 驗收標準

- [x] `analyzeImpact` 純函式實作完成（可獨立測試）
- [x] BFS 正向遍歷正確
- [x] BFS 反向遍歷正確
- [x] depth limit 生效
- [x] visited set 防循環
- [x] 截斷 > 50 個節點 + 回傳完整 depthMap
- [x] `useImpactAnalysis` hook 整合 ViewState
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:40:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T16:50:00.000Z — done
analyzeImpact 純函式 + useImpactAnalysis hook 完成。BFS 正向/反向、depth limit、visited 防環、截斷 51。tsc clean。
