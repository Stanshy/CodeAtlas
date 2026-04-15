# Sprint 7 架構設計：函式級解析 + 呼叫鏈

> **版本**: v1.0
> **撰寫者**: Tech Lead（L1）
> **日期**: 2026-03-31
> **Sprint**: 7

---

## 1. 設計目標

從模組級（file → file）深入到函式級（function → function）。新增第二解析 pass，在既有 import/export 分析之上疊加函式定義提取與呼叫關係分析。

**核心約束**：
- 不改既有 import-extractor / import-resolver 邏輯
- 新增欄位全部 optional（向下相容）
- 函式級節點預設不載入（按需展開）

---

## 2. tree-sitter Node Type 對應表

### 函式定義

| JS/TS 語法 | tree-sitter node type | TS Compiler SyntaxKind | kind |
|-----------|----------------------|----------------------|------|
| `function foo() {}` | `function_declaration` | `FunctionDeclaration` | function |
| `const foo = () => {}` | `lexical_declaration` → `variable_declarator` → `arrow_function` | `VariableStatement` → `ArrowFunction` | function |
| `const foo = function() {}` | `lexical_declaration` → `variable_declarator` → `function_expression` | `VariableStatement` → `FunctionExpression` | function |
| `export function foo() {}` | `export_statement` → `function_declaration` | `ExportDeclaration` → `FunctionDeclaration` | function |
| `async function foo() {}` | `function_declaration`（有 `async` child） | `FunctionDeclaration`（有 `AsyncKeyword`） | function |
| `function* gen() {}` | `generator_function_declaration` | `FunctionDeclaration`（有 `AsteriskToken`） | function |

### 類別定義

| JS/TS 語法 | tree-sitter node type | TS Compiler SyntaxKind | kind |
|-----------|----------------------|----------------------|------|
| `class Foo {}` | `class_declaration` | `ClassDeclaration` | class |
| `export class Foo {}` | `export_statement` → `class_declaration` | `ExportDeclaration` → `ClassDeclaration` | class |

### 方法定義（class 內）

| JS/TS 語法 | tree-sitter node type | TS Compiler SyntaxKind | kind |
|-----------|----------------------|----------------------|------|
| `bar() {}` | `method_definition` | `MethodDeclaration` | method |
| `async bar() {}` | `method_definition`（有 `async` child） | `MethodDeclaration`（有 `AsyncKeyword`） | method |
| `get x() {}` | `method_definition`（有 `get` child） | `GetAccessor` | getter |
| `set x(v) {}` | `method_definition`（有 `set` child） | `SetAccessor` | setter |
| `constructor() {}` | `method_definition`（name = `constructor`） | `Constructor` | constructor |
| `static bar() {}` | `method_definition`（有 `static` child） | `MethodDeclaration`（有 `StaticKeyword`） | method |

### 跳過的語法

| 語法 | 原因 |
|------|------|
| `(a, b) => a + b`（匿名 arrow） | 無穩定 ID |
| `setTimeout(function() {})` | callback 匿名 |
| `(function() {})()`（IIFE） | 無穩定 ID |
| 巢狀 function 定義 | 只取頂層 + class method |

---

## 3. function-extractor 策略

### 遍歷演算法

```
extractFunctions(root: AstNode):
  if isTreeSitterAst(root):
    walk root.children → 處理 tree-sitter 方言
  else:
    walk root.children → 處理 TS Compiler 方言

對每個頂層語句：
  1. function_declaration / FunctionDeclaration → ParsedFunction
  2. generator_function_declaration → ParsedFunction (isGenerator=true)
  3. lexical_declaration → 遍歷 variable_declarator：
     - 右側是 arrow_function / function_expression → ParsedFunction (name 取左側 identifier)
  4. class_declaration / ClassDeclaration → ParsedClass
     - 遍歷 class_body → method_definition → ParsedFunction (className 設定)
  5. export_statement / ExportDeclaration → 遞迴處理子節點，標記 isExported=true
```

### 參數提取

```
extractParameters(formalParams: AstNode): FunctionParam[]
  - 遍歷 formal_parameters / Parameters 的子節點
  - 每個 required_parameter / optional_parameter / rest_parameter → FunctionParam
  - name: identifier 子節點的 text
  - type: type_annotation 子節點的 text（去掉 `: ` 前綴）
  - isOptional: optional_parameter 或有 `?` 後綴
  - isRest: rest_parameter 或有 `...` 前綴
```

### 回傳型別提取

```
extractReturnType(funcNode: AstNode): string | undefined
  - 找 type_annotation 子節點（在 formal_parameters 之後的那個）
  - 或找 return_type / TypeReference 子節點
  - 取 text 並去掉 `: ` 前綴
```

---

## 4. call-analyzer 策略

### 呼叫表達式匹配

```
遍歷 AST 所有 call_expression / CallExpression + new_expression / NewExpression：

1. 直接呼叫 foo()：
   - call_expression → function 子節點是 identifier
   - 取 identifier.text → 在 localFunctions 或 importedFunctions 中查找
   - 找到 → confidence: high
   - 找不到 → 檢查是否為全域函式（console.log 等），不建邊

2. 方法呼叫 obj.foo()：
   - call_expression → function 子節點是 member_expression
   - object.property 結構
   - this.foo() → 在 class methods 中查找 → confidence: high
   - obj.foo() → 嘗試透過 obj 的型別/import 解析 → confidence: medium
   - 無法解析 → confidence: low

3. new 建構 new Foo()：
   - new_expression → constructor 子節點是 identifier
   - 在 localFunctions（kind=class）或 importedFunctions 中查找
   - 找到 → confidence: high

4. 動態呼叫 obj[method]()：
   - call_expression → function 子節點是 subscript_expression
   - → confidence: low，建立邊但標記

5. 不建邊的情況：
   - 全域函式（console.*, Math.*, JSON.* 等）
   - 第三方套件函式（非本專案的 import）
   - 完全無法解析的呼叫
```

### 跨檔案解析

```
建立 importedFunctions Map：
  key: import 的 symbol 名稱
  value: { fileId: 目標檔案 ID, functionName: 目標函式名 }

來源：FileParseResult.imports 中的 importedSymbols
  → 結合 import-resolver 的路徑解析結果
  → 對應到目標檔案的 ParsedFunction
```

---

## 5. graph-builder 第二 Pass

### 流程

```
buildFunctionGraph(fileNodes, projectRoot, importEdges):
  functionNodes: GraphNode[] = []
  callEdges: GraphEdge[] = []

  for each fileNode:
    1. 讀取 source code
    2. parseSource(source, language) → AST
    3. extractFunctions(ast.root) → functions[], classes[]
    4. 為每個 function/method 建立 GraphNode：
       - id: `${fileId}#${funcName}` 或 `${fileId}#${className}.${methodName}`
       - type: 'function' 或 'class'
       - metadata: { parentFileId, kind, parameters, returnType, lineCount, isAsync, isExported }
    5. 建立 importedFunctions Map（結合 importEdges）
    6. analyzeCallRelations(ast.root, fileId, functions, importedFunctions) → CallRelation[]
    7. 為每個 CallRelation 建立 GraphEdge：
       - id: `${callerId}--call--${calleeId}`
       - type: 'call'
       - metadata: { callerName, calleeName, callType, confidence }

  return { functionNodes, callEdges, stats }
```

### 錯誤隔離

```
try {
  // 函式級解析
} catch (err) {
  errors.push({ filePath, error: err.message, phase: 'analyze' });
  // 不影響模組級結果 — 繼續處理下一個檔案
}
```

---

## 6. API 載入策略

### 預設行為（向下相容）

```
GET /api/graph
  → 過濾：node.type !== 'function' && node.type !== 'class'
  → 過濾：edge.type !== 'call'
  → 回傳 file/directory nodes + import/export/data-flow edges
```

### 完整載入

```
GET /api/graph?include=functions
  → 不過濾，回傳全部
  → ⚠️ 資料量可能是原來 5-10x
```

### 按需載入（推薦）

```
GET /api/graph/functions/:fileId
  → 從 AnalysisResult 中：
    nodes.filter(n => n.metadata?.parentFileId === fileId)
    edges.filter(e => e.type === 'call' &&
      (e.source.startsWith(fileId + '#') || e.target.startsWith(fileId + '#')))
  → 回傳 { fileId, nodes, edges }
```

---

## 7. ViewState 擴充設計

### 新增欄位

```typescript
interface ViewState {
  // ... 既有欄位

  // Sprint 7：Zoom into file
  expandedFileId: string | null;       // 當前展開的檔案 ID
  expandedNodes: GraphNode[];          // 展開後載入的函式節點
  expandedEdges: GraphEdge[];          // 展開後載入的呼叫邊
}
```

### 新增 Action

```typescript
type ViewAction =
  // ... 既有 action

  // Sprint 7：Zoom into file
  | { type: 'ZOOM_INTO_FILE'; fileId: string; nodes: GraphNode[]; edges: GraphEdge[] }
  | { type: 'ZOOM_OUT_FILE' }
  // Sprint 7：Call chain tracing（復用 tracingPath/tracingEdges）
  | { type: 'START_CALL_TRACING'; functionId: string; path: string[]; edges: string[] }
  | { type: 'STOP_CALL_TRACING' };
```

### Reducer 邏輯

```
ZOOM_INTO_FILE:
  expandedFileId = fileId
  expandedNodes = nodes
  expandedEdges = edges

ZOOM_OUT_FILE:
  expandedFileId = null
  expandedNodes = []
  expandedEdges = []

START_CALL_TRACING:
  tracingSymbol = functionId  // 復用 Sprint 5 欄位
  tracingPath = path
  tracingEdges = edges

STOP_CALL_TRACING:
  tracingSymbol = null
  tracingPath = []
  tracingEdges = []
```

---

## 8. 節點 ID 與 Edge ID 規範

| 類型 | 格式 | 範例 |
|------|------|------|
| function node ID | `{fileId}#{functionName}` | `src/auth.ts#validateUser` |
| class node ID | `{fileId}#{className}` | `src/models/user.ts#UserService` |
| method node ID | `{fileId}#{className}.{methodName}` | `src/models/user.ts#UserService.findById` |
| call edge ID | `{callerId}--call--{calleeId}` | `src/app.ts#handleLogin--call--src/auth.ts#validateUser` |

### ID 分隔符

- `#` 分隔 file ID 和 function name
- `.` 分隔 class name 和 method name
- `--call--` 分隔 call edge 的 source 和 target

### 重複 ID 處理

- 同檔案同名函式（overload）：`{fileId}#{funcName}` 取第一個，第二個加序號 `{fileId}#{funcName}$2`
- class 的 static method 和 instance method 同名：method ID 已含 className，不衝突

---

## 9. 2D / 3D 策略

### 2D（React Flow）

- **Zoom into**：
  - 檔案節點變為「群組節點」（React Flow parentNode 機制）
  - 函式/class 子節點在群組內排列
  - fitView 動畫過渡
  - 呼叫邊渲染在子節點之間

- **函式節點視覺**：
  - 比 NeonNode 小（寬度 ~60%）
  - 色系：lime（function）/ yellow（class）
  - 邊框發光效果（延續霓虹風格）

- **呼叫邊視覺**：
  - 虛線（區別 import 的實線）
  - 粒子速度較快
  - low confidence：更淡虛線 + 無粒子

### 3D（3d-force-graph）

- **Zoom into**：
  - camera 飛入動畫（lookAt 目標節點 + distance 縮短）
  - 外部節點透明化（opacity 降低）
  - 子節點在 3D 空間中環繞父節點排列

- **函式節點視覺**：
  - 更小球體（radius ~60%）
  - lime/yellow 發光色

- **Zoom out**：
  - camera 飛回原位
  - 恢復外部節點 opacity
