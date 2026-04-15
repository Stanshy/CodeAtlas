# server.ts 擴充：GET /api/graph/functions/:fileId + ?include=functions

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T13:10:00.000Z |
| 結束時間 | 2026-03-31T13:20:00.000Z |

---

## 任務描述

修改 `packages/cli/src/server.ts`：

1. GET /api/graph 行為變更：
   - 預設（無參數）：只回傳 file/directory nodes + import/export/data-flow edges（向下相容）
   - `?include=functions`：回傳全部（含 function/class nodes + call edges）
   - 過濾邏輯：根據 node.metadata.parentFileId 和 edge.type 篩選

2. 新增 GET /api/graph/functions/:fileId 端點：
   - 從 analysis.json 中篩選 parentFileId === fileId 的 function/class nodes
   - 篩選相關的 call edges（source 或 target 屬於該檔案的函式）
   - 回傳格式：`{ fileId, nodes: GraphNode[], edges: GraphEdge[] }`
   - fileId 不存在 → 404 `{ error: "file_not_found", message: "..." }`

3. GET /api/node/:id 擴充：
   - 支援函式節點 ID 格式（含 `#` 字元，需 URL decode）
   - 函式節點回傳時包含所屬檔案的 sourceCode

## 驗收標準

- [x] GET /api/graph 預設不含函式節點
- [x] GET /api/graph?include=functions 含全部
- [x] GET /api/graph/functions/:fileId 回傳正確
- [x] fileId 不存在回傳 404
- [x] GET /api/node/:id 支援 # 字元
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:10:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T13:20:00.000Z — done
GET /api/graph filters function nodes by default, ?include=functions returns all, GET /api/graph/functions/:fileId new endpoint. tsc clean core+cli
