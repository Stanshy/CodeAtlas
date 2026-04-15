# Barrel Export 更新

| 欄位 | 值 |
|------|-----|
| ID | T19 |
| 專案 | CodeAtlas |
| Sprint | Sprint 24 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-14T05:35:29.115Z |
| 完工時間 | 2026-04-14T05:37:17.046Z |
| 依賴 | T3 |
| 預估 | 0.5h |
| 建立時間 | 2026-04-14T05:24:59.365Z |

---

## 任務描述

更新 barrel exports：

1. **packages/core/src/analyzers/adapters/index.ts**：export 所有 adapter 和型別
2. **packages/core/src/index.ts**：新增 adapter 相關 export
   - FrameworkAdapter, AdapterContext, FrameworkDetection 型別
   - AdapterRegistry, createDefaultRegistry
   - detectEndpointsAsync
   - 各 adapter class（供外部擴展用）

## 驗收標準

- [x] `import { FrameworkAdapter, AdapterRegistry } from '@codeatlas/core'` 可用
- [x] `import { detectEndpointsAsync } from '@codeatlas/core'` 可用
- [x] TypeScript 編譯通過（DTS build success）
- [x] 不破壞現有 import

---

## 事件紀錄

### 2026-04-14T05:24:59.365Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-14T05:37:17.046Z — 狀態變更 → done
L1 審核通過。adapters/index.ts barrel export 10個adapter+types，core/index.ts export detectEndpointsAsync+buildAdapterContext+adapter types+registry。
