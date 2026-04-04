# function-extractor.ts：tree-sitter AST 函式/類別/方法定義提取

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T12:30:00.000Z |
| 結束時間 | 2026-03-31T12:45:00.000Z |

---

## 任務描述

新增 `packages/core/src/parser/function-extractor.ts`：

1. 定義 `ParsedFunction` interface：
   - name, kind, parameters (FunctionParam[]), returnType, startLine, endLine
   - isExported, isAsync, isGenerator, className (method 才有)

2. 定義 `ParsedClass` interface：
   - name, startLine, endLine, isExported, methods (ParsedFunction[])

3. 實作 `extractFunctions(root: AstNode)` 函式：
   - 遍歷 AST，匹配以下 tree-sitter node type：
     - `function_declaration` / `FunctionDeclaration` → function
     - `lexical_declaration` + `arrow_function` → arrow function（具名賦值）
     - `class_declaration` / `ClassDeclaration` → class
     - `method_definition` / `MethodDeclaration` → method
     - `get` / `set` accessor → getter/setter
   - 提取 parameters：遍歷 `formal_parameters` 子節點
   - 提取 returnType：type annotation 子節點
   - 偵測 export：檢查父節點是否為 `export_statement`
   - 偵測 async：檢查是否有 `async` modifier
   - 跳過匿名函式（無 name 的 callback / IIFE）
   - 巢狀函式只取頂層 + class method，不遞迴

4. 支援 tree-sitter 和 TypeScript Compiler 兩種 AST 方言（snake_case / PascalCase）

5. 修改 `packages/core/src/parser/index.ts` 匯出

## 驗收標準

- [x] function declaration 正確提取
- [x] arrow function（具名賦值）正確提取
- [x] class declaration 正確提取
- [x] class method 正確提取
- [x] getter / setter 正確提取
- [x] async / generator 標記正確
- [x] parameters + returnType 正確提取
- [x] export 偵測正確
- [x] 匿名函式跳過
- [x] 巢狀函式只取頂層
- [x] 支援 tree-sitter + TS Compiler 兩種 AST 方言
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T12:30:00.000Z — in_progress
由 backend-architect 開始執行

### 2026-03-31T12:45:00.000Z — done
function-extractor.ts complete: supports tree-sitter + TS Compiler, 7 function definition types, parameter + returnType extraction. tsc clean
