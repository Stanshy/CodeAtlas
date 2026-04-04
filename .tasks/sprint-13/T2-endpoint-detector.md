# T2 Core 層 API 端點識別

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 4h |
| 建立時間 | 2026-04-02T10:00:00.000Z |

---

## 任務描述

新增 `packages/core/src/analyzers/endpoint-detector.ts` 模組：

1. **Pattern Matching 識別 API 端點定義**：
   - Express Router: `router.{method}(path, ...handlers)`
   - Express App: `app.{method}(path, ...handlers)`
   - Fastify: `fastify.{method}(path, opts, handler)`
   - Fastify Route: `fastify.route({ method, url, handler })`
   - 不支援的回退 null

2. **輸出型別**：
   - `ApiEndpoint`: id, method, path, handler, handlerFileId, middlewares, description
   - `EndpointGraph`: endpoints + chains
   - `EndpointChain`: endpointId + steps (ChainStep[])
   - `ChainStep`: name, method, className, fileId, input, output, transform

3. **請求鏈追蹤**：從 handler BFS 追蹤呼叫鏈（利用 Sprint 7 的 call 邊），深度 >10 截斷

4. **CLI 整合**：`packages/cli/src/server.ts` 的 `/api/graph` 回應新增 `endpointGraph` 欄位

5. **Core 匯出**：`packages/core/src/index.ts` 匯出 `detectEndpoints`, `ApiEndpoint`, `EndpointGraph`

6. **單元測試**：`packages/core/src/analyzers/endpoint-detector.test.ts`

## 驗收標準

- [ ] 用 VideoBrief 驗證識別出 API 端點（Express 標準寫法）
- [ ] 請求鏈 BFS 正確追蹤（endpoint → middleware → service → model）
- [ ] API 回應含 endpointGraph 欄位
- [ ] 非 web 專案回退 null
- [ ] 單元測試覆蓋 happy path + 非標準框架 fallback

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
