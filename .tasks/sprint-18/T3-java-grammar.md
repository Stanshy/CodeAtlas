# Java grammar 加載

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T01:58:28.859Z |
| 完工時間 | 2026-04-08T02:07:57.000Z |
| 依賴 | — |
| 預估 | 1.5h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

NativeTreeSitterProvider + WasmTreeSitterProvider 加載 tree-sitter-java grammar，讓 Java 檔案能產出 AstNode 樹。

### 改動清單

1. **`packages/core/package.json`**：新增 `tree-sitter-java` 依賴
2. **`packages/core/src/parser/providers/native-tree-sitter.ts`**：
   - grammar map 擴展，加入 java 語言
   - 條件載入 `tree-sitter-java`，用 try-catch 包裝
3. **`packages/core/src/parser/providers/wasm-tree-sitter.ts`**：
   - 同上 WASM 版 fallback

### 注意事項

- 與 T2 共用 native-tree-sitter.ts 和 wasm-tree-sitter.ts，但風險低（各加獨立 grammar）
- grammar 載入用 try-catch 包裝
- 確保 isAvailable() 涵蓋 Java 語言

## 驗收標準

- [x] tree-sitter-java 依賴已安裝
- [x] NativeTreeSitterProvider 能解析 Java 檔案產出 AstNode 樹
- [x] WasmTreeSitterProvider 能作為 fallback 解析 Java
- [x] grammar 載入失敗時不 crash（graceful fallback）
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:07:57.000Z — 完成（done）
native-tree-sitter.ts: _javaGrammar 變數 + 隔離 try-catch 載入。wasm-tree-sitter.ts: JAVA_WASM 路徑 + 條件載入。package.json: tree-sitter-java ^0.21.0。pnpm build 零錯誤。
