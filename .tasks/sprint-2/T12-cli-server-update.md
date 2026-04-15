# CLI Server 更新

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | devops-automator |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 1h |
| 完工時間 | 2026-03-30T18:10:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

更新 CLI Server，serve `packages/web/dist/` 的 React build 產物。

### 具體工作

1. 更新 `packages/cli/src/commands/web.ts`：resolveWebDir 指向 `packages/web/dist/`
2. 更新 `packages/cli/src/server.ts`：確認 @fastify/static 正確 serve build 產物
3. 處理 SPA 路由：所有非 /api/ 路徑 fallback 到 index.html
4. 確認 `codeatlas web` 可開啟瀏覽器顯示 React UI

### 規範參考

- `.knowledge/specs/feature-spec.md` F15
- `.knowledge/specs/api-design.md` API 端點不變

## 驗收標準

- [x] `codeatlas web` 開啟瀏覽器顯示 React UI（非佔位頁）
- [x] `/api/graph` 等 API 端點仍正常
- [x] SPA 路由 fallback 正確
- [x] `pnpm build` 後 web dist 產物存在

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T17:50:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-30T18:10:00.000Z — 狀態變更 → in_review
完成。resolveWebDir 指向 packages/web/dist/、server.ts 加入 SPA fallback（非 /api/ 路由 → index.html）。pnpm build 三包全通過。

### 2026-03-30T18:11:00.000Z — 狀態變更 → done
L1 審核通過。resolveWebDir 正確指向 dist/，SPA fallback 分流 API vs 靜態，build 全通過。
