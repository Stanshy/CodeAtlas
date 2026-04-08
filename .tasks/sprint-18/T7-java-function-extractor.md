# Java function extractor

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:17:07.000Z |
| 完工時間 | 2026-04-08T02:23:32.000Z |
| 依賴 | T1,T3 |
| 預估 | 3h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

function-extractor 新增 Java 分支，支援 Java 類別、方法、介面等結構提取。

### 改動清單

1. **`packages/core/src/parser/function-extractor.ts`**：
   - Java 分支路由
   - 新增 `extractJavaMethod(node)` + `extractJavaClass(node)` 函式

### Java function 支援範圍

| 結構 | tree-sitter node type | 提取內容 |
|------|----------------------|---------|
| `public class Foo {}` | `class_declaration` | 類別名、修飾符、extends/implements |
| `public void bar() {}` | `method_declaration` | 方法名、參數、return type、修飾符 |
| `public Foo() {}` | `constructor_declaration` | 建構子、參數 |
| `interface IFoo {}` | `interface_declaration` | 介面名 |
| `enum Status {}` | `enum_declaration` | 列舉名 |
| `@Override` | `marker_annotation` / `annotation` | annotation 附加到方法/類別 |

### 參數解析

- `formal_parameters` → `formal_parameter`（type + name）
- return type：method_declaration 的第一個子節點（在方法名前面，與 JS/TS 不同）
- 修飾符：`public`/`private`/`protected`/`static`/`abstract`/`final`

### 注意事項

- 此檔案與 T5（Python function）共用，T5 先做完後 T7 再加 Java 分支
- Java return type 在方法名前面（vs JS/TS 在後面），需專用解析邏輯
- 不復用 extractReturnType，新寫 extractJavaReturnType

## 驗收標準

- [x] Java class 正確提取（名稱、修飾符、extends/implements）
- [x] Java method 正確提取（名稱、參數、return type、修飾符）
- [x] Java constructor 正確提取
- [x] Java interface 正確提取
- [x] Java enum 正確提取
- [x] Java annotation 正確附加
- [x] Python + JS/TS function 功能零回歸
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:23:32.000Z — 完成（done）
walkJavaTopLevel + extractJavaClass + extractJavaInterface + extractJavaEnum + extractJavaMethod + extractJavaParameters + extractJavaReturnType + extractJavaModifiers 新增。exactOptionalPropertyTypes 安全。pnpm build 零錯誤。
