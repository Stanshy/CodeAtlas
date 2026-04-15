# BaseAdapter 抽象基類

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-14T05:24:59.365Z |
| 開始時間 | 2026-04-14T05:37:17.046Z |
| 完工時間 | 2026-04-14T05:37:17.046Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/base-adapter.ts`，從現有 `endpoint-detector.ts` 抽出共用邏輯作為抽象基類：

1. **normaliseMethod(method: string)**：HTTP method 正規化（大寫、trim）
2. **parseHandlerArgs(argList: string)**：handler / middleware 名稱解析（含 inline handler 偵測）
3. **readSourceCode(filePath: string)**：從磁碟讀取檔案原始碼（含 try-catch）
4. **buildChainSteps(startNodeId, nodeMap, callAdjacency)**：BFS 追蹤 call edges 建構呼叫鏈
5. **findEnclosingFunction(fileId, line, fnNodes)**：匿名 handler 找包裹函式
6. **classifyStepRole(label: string)**：方法角色分類（controller/service/repository/utility/unknown）

所有方法含 JSDoc 說明。子類透過 `extends BaseAdapter` 使用。

參考：現有 `endpoint-detector.ts` 中的同名函式。

## 驗收標準

- [x] 所有 6 個方法可被子類呼叫
- [x] 每個方法含 JSDoc 文件
- [x] TypeScript 編譯通過
- [x] 不引入新的外部依賴

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:37:17.046Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-14T05:37:17.046Z — 狀態變更 → done
L1 審核通過。BaseAdapter 抽象基類完成：6 個 protected methods + buildChains 預設實作 + extractMiddleware 預設空陣列。JSDoc 齊全，0 Blocker。
