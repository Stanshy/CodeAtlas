# graph-builder 擴充：buildFunctionGraph 第二 pass

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3,T4 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T13:00:00.000Z |
| 結束時間 | 2026-03-31T13:10:00.000Z |

---

## 任務描述

1. 修改 `packages/core/src/analyzer/graph-builder.ts`：
   - 新增 `buildFunctionGraph()` 函式（第二 pass）
   - 對每個 file node：讀取 source → parseSource → extractFunctions → 產出 function/class GraphNode
   - function node ID 格式：`{fileId}#{functionName}`
   - class node ID 格式：`{fileId}#{className}`
   - method node ID 格式：`{fileId}#{className}.{methodName}`
   - 對每個 file：analyzeCallRelations → 產出 call GraphEdge
   - call edge ID 格式：`{callerId}--call--{calleeId}`
   - 更新 AnalysisStats（totalFunctions, totalClasses, totalCallEdges）
   - 函式級解析失敗不影響模組級結果（try-catch 包裹，記入 errors）

2. 修改 `packages/core/src/analyzer/index.ts`：
   - analyze() 串接 buildFunctionGraph，合併到 AnalysisResult
   - function/class nodes 追加到 graph.nodes
   - call edges 追加到 graph.edges

3. 修改 `packages/core/src/index.ts`：
   - 匯出新增型別（FunctionParam, ParsedFunction, ParsedClass 等）

## 驗收標準

- [x] buildFunctionGraph 正確產出 function/class nodes
- [x] node ID 格式正確（fileId#funcName）
- [x] call edges 正確產出
- [x] edge ID 格式正確（callerId--call--calleeId）
- [x] AnalysisStats 新欄位正確統計
- [x] 函式級解析失敗不影響模組級
- [x] analyze() 正確串接第二 pass
- [x] TypeScript 編譯通過
- [x] 既有 523+ tests 零回歸

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:00:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T13:10:00.000Z — done
buildFunctionGraph second pass added, analyze() wired, function/class nodes + call edges merged into AnalysisResult. tsc clean, 253 tests zero regression
