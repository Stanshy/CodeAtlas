# Python function extractor

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:07:57.000Z |
| 完工時間 | 2026-04-08T02:17:07.000Z |
| 依賴 | T1,T2 |
| 預估 | 3h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

function-extractor 新增 Python 分支，支援 Python 函式和類別提取。

### 改動清單

1. **`packages/core/src/parser/function-extractor.ts`**：
   - `walkTreeSitterTopLevel()` 加 language 參數
   - Python 分支路由
   - 新增 `extractPythonFunction(node)` + `extractPythonClass(node)` 函式

### Python function 支援範圍

| 結構 | tree-sitter node type | 提取內容 |
|------|----------------------|---------|
| `def foo():` | `function_definition` | 函式名、參數、return type annotation |
| `async def foo():` | `function_definition`（前有 async keyword） | 同上 + async 標記 |
| `class Foo:` | `class_definition` | 類別名、base classes |
| `@decorator` | `decorated_definition` | decorator 名稱附加到被裝飾的函式/類別 |
| `def method(self):` | `function_definition`（在 class 內） | 方法，識別 self 參數 |

### 參數解析

- `parameters` → `identifier` / `typed_parameter` / `list_splat_pattern`（*args）/ `dictionary_splat_pattern`（**kwargs）
- return type：`-> type` annotation
- decorator：`@property`、`@staticmethod`、`@classmethod`

### 注意事項

- 此檔案與 T7（Java function）共用，T5 先做 Python，T7 後做 Java
- JS/TS 現有邏輯路徑不動

## 驗收標準

- [x] Python def 函式正確提取（名稱、參數、return type）
- [x] Python async def 正確提取並標記 async
- [x] Python class 正確提取（名稱、base classes）
- [x] Python decorator 正確附加到函式/類別
- [x] Python method（self 參數）正確識別
- [x] JS/TS function 功能零回歸
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:17:07.000Z — 完成（done）
walkPythonTopLevel + extractPythonFunction + extractPythonClass + extractPythonParameters + extractPythonDecorators 新增。self/cls 自動剝離。extractFunctions 加 language 參數。pnpm build 零錯誤。
