# Java import extractor

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:17:07.000Z |
| 完工時間 | 2026-04-08T02:23:32.000Z |
| 依賴 | T1,T3 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

import-extractor 新增 Java 分支，支援所有常見 Java import 模式。同時擴展 import-resolver 支援 Java package 解析。

### 改動清單

1. **`packages/core/src/parser/import-extractor.ts`**：
   - Java 分支路由：`import_declaration`、`package_declaration`
   - 新增 `extractJavaImport(node)` 函式
2. **`packages/core/src/parser/import-resolver.ts`**：
   - Java probe 陣列：`.java`（無 index 概念）
   - `resolveJavaPackage()` 函式
   - `import com.foo.Bar` → `com/foo/Bar.java`

### Java import 支援範圍

| 模式 | tree-sitter node type | 說明 |
|------|----------------------|------|
| `import com.foo.Bar;` | `import_declaration` → `scoped_identifier` | 一般 import |
| `import static com.foo.Bar.method;` | `import_declaration`（有 static modifier） | 靜態 import |
| `import com.foo.*;` | `import_declaration` → `asterisk` | wildcard，標記為 namespace |
| `package com.foo;` | `package_declaration` → `scoped_identifier` | package 宣告（作為目錄層級） |

### 注意事項

- 此檔案與 T4（Python import）共用，T4 先做完後 T6 再加 Java 分支
- `scoped_identifier` 是嵌套結構（scope.name），需遞迴展開
- Java package 用 `.` 分隔，解析為 `/` 路徑分隔

## 驗收標準

- [x] Java 一般 import 正確提取
- [x] Java static import 正確提取
- [x] Java wildcard import 標記為 namespace
- [x] Java package 宣告正確提取
- [x] import-resolver 能解析 Java package 路徑（dot → slash）
- [x] Python + JS/TS import 功能零回歸
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:23:32.000Z — 完成（done）
extractJavaImport + flattenScopedIdentifier 新增。walkTreeSitter 加 Java 分支。import-resolver 加 javaSourceToPath + Java 路徑解析。pnpm build 零錯誤。
