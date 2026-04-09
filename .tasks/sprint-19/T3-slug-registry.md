# Slug Registry + Dead Link Checker

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

在 `packages/core/src/wiki-exporter/slug-registry.ts` 實作：

- `SlugRegistry` class：
  - `register(canonicalId, slug)` — 註冊 slug，衝突時附加數字後綴（`-2`、`-3`）
  - `resolve(canonicalId)` → slug — 查詢已註冊的 slug
  - `has(slug)` — 檢查 slug 是否存在
  - `sanitizeFilename(slug)` — 移除 OS 不合法字元
  - 內部用 canonical id 小寫正規化比對（附錄 B）
- Dead Link Checker：
  - 掃描所有 WikiNode 的 edges，檢查 targetSlug 是否存在於 registry
  - 回傳 dead link 列表 + count

## 驗收標準

- [ ] slug 衝突正確解決（附加後綴）
- [ ] canonical id 小寫比對正確
- [ ] dead links = 0（正常情況）
- [ ] sanitizeFilename 處理特殊字元
- [ ] `pnpm build` 零錯誤

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
