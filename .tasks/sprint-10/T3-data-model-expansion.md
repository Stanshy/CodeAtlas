# T3 core 資料模型擴充（NodeRole type + graph-builder 整合 + re-export）

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

1. `packages/core/src/types.ts`：新增 `NodeRole` type + `NodeMetadata.role?: NodeRole`
2. `packages/core/src/analyzer/graph-builder.ts`：在 buildGraph 中呼叫 `classifyNodeRole` 填入每個節點的 role
3. `packages/core/src/index.ts`：re-export `NodeRole`
4. 確保 `/api/graph` 回傳含 role（cli/server.ts 自動，因 core 已填）

### 向下相容

- role 為 optional 欄位
- 舊版前端讀不到 role 不影響功能

## 驗收標準

- [x] NodeRole type 定義正確
- [x] NodeMetadata.role 為 optional
- [x] graph-builder 呼叫 classifyNodeRole 填入 role
- [x] core/index.ts re-export NodeRole
- [x] pnpm build 通過
- [x] 所有既有測試通過（零回歸）

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
