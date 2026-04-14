# Fastify Adapter

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

建立 `packages/core/src/analyzers/adapters/fastify-adapter.ts`，從 endpoint-detector.ts 抽出 Fastify 相關邏輯：

1. **detect()**：檢查 package.json dependencies/devDependencies 是否有 `fastify`
2. **extractEndpoints()**：shorthand regex（`fastify.get()` 等）+ route block regex（`fastify.route({ method, url, handler })`），含 inline handler 偵測
3. **buildChains()**：BFS 追蹤 call edges，匿名 handler 使用 findEnclosingFunction

Fastify 特有的 variable name prefixes：`fastify`, `server`, `app`

必須含單元測試 `packages/core/__tests__/adapters/fastify-adapter.test.ts`

## 驗收標準

- [x] detect 正確判斷 Fastify 專案
- [x] 支援 shorthand 和 fastify.route({}) 兩種模式
- [x] extractEndpoints 與舊邏輯對 Fastify 專案輸出一致
- [x] buildChains 正確建構呼叫鏈
- [ ] 單元測試通過（T20 整合驗證）

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
