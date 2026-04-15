# Express Adapter

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-04-14T05:24:59.365Z |
| 開始時間 | 2026-04-14T05:37:17.046Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/express-adapter.ts`，從 endpoint-detector.ts 抽出 Express 相關邏輯：

1. **detect()**：檢查 package.json dependencies/devDependencies 是否有 `express`
2. **extractEndpoints()**：使用 shorthand regex 匹配 `app.get()`, `router.post()` 等模式，含 inline handler 偵測（peek-ahead）
3. **buildChains()**：BFS 追蹤 call edges，匿名 handler 使用 findEnclosingFunction

Express 特有的 variable name prefixes：`app`, `router`, `express`

必須含單元測試 `packages/core/__tests__/adapters/express-adapter.test.ts`

## 驗收標準

- [x] detect 正確判斷 Express 專案（有 express 依賴 → true）
- [x] extractEndpoints 與舊 endpoint-detector 邏輯對 Express 專案輸出一致
- [x] buildChains 正確建構呼叫鏈（含匿名 handler）
- [ ] 單元測試通過（T20 整合驗證）

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
