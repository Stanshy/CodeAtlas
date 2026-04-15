# Async 整合

| 欄位 | 值 |
|------|-----|
| ID | T18 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-14T05:37:17.046Z |
| 完工時間 | 2026-04-14T05:37:17.046Z |
| 依賴 | T7,T17 |
| 預估 | 2h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

新增 async 版本的端點偵測，整合 AI fallback 路徑：

1. **endpoint-detector.ts**：新增 `detectEndpointsAsync(analysis): Promise<EndpointGraph | null>`
   - 同步跑所有規則 adapter
   - 若結果為空 → 呼叫 AI Fallback Adapter（async）
   - 三層 fallback 完整串接
2. **server.ts**（packages/cli）：`detectEndpoints` → `detectEndpointsAsync`
   - 已是 async handler，無破壞性變更
3. Export `detectEndpointsAsync` 從 core/index.ts

## 驗收標準

- [x] `detectEndpointsAsync()` 正確實作三層 fallback（規則→AI→legacy）
- [x] server.ts 呼叫 async 版本，正常運作（3 個 call sites 已更新）
- [x] AI 路徑可觸發（透過 AIFallbackAdapter.setProvider + extractEndpointsAsync）
- [x] 同步 `detectEndpoints()` 仍可用（向後相容，簽名不變）
- [x] TypeScript 編譯通過（core + cli build clean）

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:37:17.046Z — 狀態變更 → done
L1 審核通過。detectEndpointsAsync()實作三層fallback，server.ts 3個call site已更新，core+cli build clean，123 tests pass。
