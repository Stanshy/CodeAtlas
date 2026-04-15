# call-analyzer 多語言

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:23:32.000Z |
| 完工時間 | 2026-04-08T02:28:11.000Z |
| 依賴 | T4,T5,T6,T7 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

call-analyzer 新增 Python 和 Java 呼叫模式解析，讓呼叫關係圖能正確反映多語言的方法呼叫。

### 改動清單

1. **`packages/core/src/analyzer/call-analyzer.ts`**：
   - `extractTreeSitterCalleeInfo()` 加 language 路由
   - 新增語言感知 SKIP_NAMES
   - Python call 提取邏輯
   - Java call 提取邏輯

### Python 呼叫模式

| 模式 | tree-sitter node | 說明 |
|------|-----------------|------|
| `self.method()` | `attribute` → `self` + identifier | 實例方法呼叫 |
| `ClassName.method()` | `attribute` → identifier + identifier | 類別方法呼叫 |
| `function()` | `call` → `identifier` | 一般函式呼叫 |

Python SKIP_NAMES: `len`, `print`, `dict`, `list`, `range`, `type`, `isinstance`, `str`, `int`, `float`, `bool`, `set`, `tuple`, `sorted`, `enumerate`, `zip`, `map`, `filter`, `super`

### Java 呼叫模式

| 模式 | tree-sitter node | 說明 |
|------|-----------------|------|
| `this.method()` | `method_invocation` → `this` + identifier | 實例方法呼叫 |
| `ClassName.method()` | `method_invocation` → identifier + identifier | 靜態方法呼叫 |
| `object.method()` | `method_invocation` → identifier + identifier | 物件方法呼叫 |

Java SKIP_NAMES: `System`, `String`, `Integer`, `Long`, `Double`, `Float`, `Boolean`, `Object`, `Arrays`, `Collections`, `Math`, `Optional`

### 注意事項

- 先做簡單模式（self.X / this.X），複雜鏈式呼叫（`a.b().c()`）留 TODO
- JS/TS 呼叫路徑不動

## 驗收標準

- [x] Python self.method() 呼叫正確識別
- [x] Python 一般函式呼叫正確識別
- [x] Java this.method() 呼叫正確識別
- [x] Java 靜態方法呼叫正確識別
- [x] 語言感知 SKIP_NAMES 過濾內建函式/類別
- [x] JS/TS call analysis 零回歸
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:28:11.000Z — 完成（done）
PYTHON_SKIP_NAMES + JAVA_SKIP_NAMES 新增。extractPythonCalleeInfo（call + attribute）+ extractJavaCalleeInfo（method_invocation + object_creation_expression）新增。analyzeCallRelations 加 language 三分支分流。graph-builder.ts 傳遞 language。pnpm build 零錯誤。
