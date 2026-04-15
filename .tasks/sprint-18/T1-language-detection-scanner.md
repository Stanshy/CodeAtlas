# 語言偵測 + scanner 擴充

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T01:58:28.859Z |
| 完工時間 | 2026-04-08T02:07:57.000Z |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

新增 `SupportedLanguage` 型別 + `detectLanguage()` 函式 + scanner 擴充，為多語言支援打基礎。

### 改動清單

1. **`packages/core/src/types.ts`**：新增 `SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java'`
2. **`packages/core/src/parser/ast-provider.ts`**：`ParseResult.language` 擴展為 `SupportedLanguage`
3. **`packages/core/src/scanner/index.ts`**：
   - `DEFAULT_EXTENSIONS` 加 `.py`、`.java`
   - `detectLanguage(filePath)` 擴展支援新副檔名
4. **`packages/core/src/parser/parser-factory.ts`**：
   - `parseSource` 接收 `language?: SupportedLanguage` 參數
   - 語言感知 provider 選擇：Python/Java 不走 TypeScriptCompilerProvider

### 設計要點

- TypeScriptCompilerProvider 只支援 JS/TS，Python/Java 必須走 tree-sitter
- parser-factory 需根據語言過濾可用 provider：
  ```
  Python/Java → native-tree-sitter → wasm-tree-sitter → 報錯
  JS/TS      → native-tree-sitter → wasm-tree-sitter → typescript-compiler
  ```

## 驗收標準

- [x] `SupportedLanguage` 型別已新增到 types.ts
- [x] `detectLanguage()` 正確識別 .py → python、.java → java
- [x] DEFAULT_EXTENSIONS 包含 .py 和 .java
- [x] parseSource 接受 language 參數
- [x] Python/Java 檔案不會被路由到 TypeScriptCompilerProvider
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:07:57.000Z — 完成（done）
Phase 1 合併執行。types.ts 新增 SupportedLanguage，ast-provider.ts 介面更新，scanner 加 .py/.java/.pyw + ignore dirs，parser-factory 語言感知分流。pnpm build 零錯誤。
