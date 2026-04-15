# Python import extractor

| 欄位 | 值 |
|------|-----|
| ID | T4 |
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

import-extractor 新增 Python 分支，支援所有常見 Python import 模式。同時擴展 import-resolver 支援 Python 模組解析。

### 改動清單

1. **`packages/core/src/parser/import-extractor.ts`**：
   - `walkTreeSitter()` 加 language 參數
   - Python 分支路由：`import_statement`、`import_from_statement`
   - 新增 `extractPythonImport(node)` 函式
2. **`packages/core/src/parser/import-resolver.ts`**：
   - Python probe 陣列：`.py`、`/__init__.py`
   - `resolvePythonModule()` 函式
   - `from foo.bar import X` → `foo/bar.py` 或 `foo/bar/__init__.py`
   - `from . import X` → 相對路徑 `__init__.py`
   - `from ..models import X` → 往上兩層

### Python import 支援範圍

| 模式 | tree-sitter node type | 說明 |
|------|----------------------|------|
| `import os` | `import_statement` → `dotted_name` | 絕對 import |
| `from os.path import join` | `import_from_statement` → `dotted_name` + `import_list` | from import |
| `from . import utils` | `import_from_statement` → `relative_import`（1 dot） | 相對 import |
| `from ..models import User` | `import_from_statement` → `relative_import`（2 dots） | 多級相對 |
| `from X import *` | `import_from_statement` → `wildcard_import` | 標記為 namespace |

### 注意事項

- 此檔案與 T6（Java import）共用，T4 先做 Python，T6 後做 Java
- relative import 的 dots 數量用 tree-sitter `relative_import` node 的 dot children 計算
- JS/TS 現有邏輯路徑不動

## 驗收標準

- [x] Python 絕對 import 正確提取
- [x] Python from import 正確提取
- [x] Python relative import 正確提取（from . / from ..）
- [x] Python wildcard import 標記為 namespace
- [x] Python `__init__.py` 模組識別正確
- [x] import-resolver 能解析 Python 模組路徑
- [x] JS/TS import 功能零回歸
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:17:07.000Z — 完成（done）
extractPythonImport() 新增，支援 import_statement + import_from_statement。walkTreeSitter 加 language 分流。import-resolver 加 Python probe + pythonSourceToPath。isTreeSitterAst 加 'module' 根型別。pnpm build 零錯誤。
