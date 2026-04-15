# Graph 資料對接

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1,G1 |
| 預估 | 2h |
| 完工時間 | 2026-03-30T17:10:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

實作 `api/graph.ts` + `adapters/graph-adapter.ts`：fetch `/api/graph` 回傳的 AnalysisResult JSON → 轉換為 React Flow nodes/edges 格式。

### 具體工作

1. `packages/web/src/api/graph.ts`：fetch wrapper，呼叫 `/api/graph`、`/api/graph/stats`、`/api/node/:id`，含錯誤處理
2. `packages/web/src/adapters/graph-adapter.ts`：
   - GraphNode → React Flow Node（id 不變，label 顯示，type 對應自訂元件，metadata 放 data）
   - GraphEdge → React Flow Edge（source/target 不變，type 對應自訂邊元件）
   - directory node → group node（parentNode 邏輯）
   - 空 graph → 回傳空陣列
3. `packages/web/src/hooks/useGraphData.ts`：資料載入 + 轉換 hook（含 loading/error 狀態）

### 規範參考

- `.knowledge/specs/feature-spec.md` F7
- `.knowledge/specs/data-model.md` GraphNode/GraphEdge 型別
- `.knowledge/specs/api-design.md` API 端點

## 驗收標準

- [x] fetch `/api/graph` 正確取得 AnalysisResult
- [x] GraphNode → React Flow Node 轉換正確（id/label/type/data）
- [x] GraphEdge → React Flow Edge 轉換正確（source/target/type）
- [x] 空 graph 回傳空陣列（不拋錯）
- [x] API 錯誤時 hook 回傳 error 狀態
- [x] JSON.parse 有 try-catch 防護

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:00:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T17:10:00.000Z — 狀態變更 → in_review
完成。api/graph.ts（3 端點 + apiFetch 泛型 + JSON.parse try-catch）、graph-adapter.ts（toReactFlowNodes/Edges + parentId 解析）、useGraphData.ts（loading/error/refetch）、types/graph.ts。TypeScript 編譯零錯誤。

### 2026-03-30T17:12:00.000Z — 狀態變更 → done
L1 審核通過。程式碼品質合格：泛型 apiFetch、JSON.parse 全 try-catch、零 any、parentId 目錄解析正確。
