# Import 解析器（Parser）

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3 |
| 預估 | 3h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

實作 `packages/core/src/parser/index.ts` 和 `packages/core/src/parser/import-resolver.ts`，使用 tree-sitter 解析 import/require/export 語句，輸出依賴邊清單。

### 具體工作

1. 讀取 `.knowledge/specs/feature-spec.md` Parser 區段
2. 用 tree-sitter 解析 AST，提取：
   - ESM: `import { x } from './y'`（named / default / namespace）
   - CJS: `const x = require('./y')`
   - Re-export: `export { x } from './y'`
   - Dynamic import: `import('./y')` — 標記為 dynamic
3. 實作 `import-resolver.ts`：
   - 相對路徑解析（`./` / `../`）
   - 自動補副檔名（`.ts` / `.js` / `/index.ts`）
   - 外部套件識別（非相對路徑 = external）
4. 輸出 GraphEdge[] 格式
5. 錯誤處理：解析失敗的檔案不拋錯，記錄到 errors

### 規範參考

- `.knowledge/specs/feature-spec.md` Parser 區段
- `.knowledge/specs/data-model.md` GraphEdge 型別
- T3 產出的 tree-sitter 整合方案

## 驗收標準

- [x] ESM named/default/namespace import 正確解析
- [x] CJS require 正確解析
- [x] Re-export 正確解析（含 barrel export）
- [x] Dynamic import 標記為 dynamic 類型
- [x] 相對路徑正確解析 + 自動補副檔名（.ts→.tsx→.js→.jsx→/index.ts→/index.js）
- [x] 外部套件正確識別（非相對路徑忽略）
- [x] 解析失敗不拋錯，記錄錯誤
- [x] 輸出格式符合 data-model.md 的 GraphEdge 型別

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T12:00:00.000Z — 狀態變更 → in_review
backend-architect 完成。雙 AST dialect 支援（tree-sitter snake_case + TS compiler PascalCase）。import-extractor + import-resolver 實作完整。exactOptionalPropertyTypes 相容。

### 2026-03-30T12:01:00.000Z — 狀態變更 → done
L1 審核通過。覆蓋所有 import 模式，路徑解析邏輯完整，雙 dialect 設計確保三個 provider 皆可用。
