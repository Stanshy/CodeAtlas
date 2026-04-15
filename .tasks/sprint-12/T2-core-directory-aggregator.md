# Core 層目錄聚合引擎

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T19:30:00.000Z |
| 完工時間 | 2026-04-01T19:45:00.000Z |

---

## 任務描述

新增 `packages/core/src/analyzers/directory-aggregator.ts`，實作 `aggregateByDirectory()` 函式。

### 聚合規則
1. 每個目錄成為一個節點（取第一層子目錄，如 src/services → services/）
2. 目錄間的邊 = 子檔案間依賴的聯集（去重）
3. 同目錄內的邊忽略（不產生自循環）
4. 扁平專案（≤2 個目錄）回退 → 返回 null

### 分類邏輯（從圖稿 SF_TYPE_COLOR 提取）
- entry: 入口檔（app.ts, index.ts, main.ts 所在目錄）
- logic: 業務邏輯（routes, controllers, services, hooks）
- data: 資料層（models, db, types, schemas）
- support: 輔助（utils, lib, config, middleware, tests）

### 型別定義
```typescript
export interface DirectoryNode {
  id: string;
  label: string;
  type: 'entry' | 'logic' | 'data' | 'support';
  fileCount: number;
  files: string[];
  role: NodeRole;
}
export interface DirectoryEdge {
  source: string;
  target: string;
  weight: number;
}
export interface DirectoryGraph {
  nodes: DirectoryNode[];
  edges: DirectoryEdge[];
}
```

### CLI 修改
`packages/cli/src/server.ts` 的 `/api/graph` 回應新增 `directoryGraph` 欄位。
`packages/core/src/index.ts` 匯出 `aggregateByDirectory`。

### 單元測試
`packages/core/src/analyzers/directory-aggregator.test.ts`

## 驗收標準

- [x] `aggregateByDirectory()` 正確聚合，典型專案產出 5~15 個目錄節點
- [x] 目錄間依賴正確計算（子檔案依賴聯集，去重，無自循環）
- [x] 分類邏輯正確（entry/logic/data/support）
- [x] 扁平專案回退 null
- [x] API `/api/graph` 回應含 `directoryGraph` 欄位
- [x] core index.ts 匯出 aggregateByDirectory
- [x] 單元測試通過（≥10 cases）

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
