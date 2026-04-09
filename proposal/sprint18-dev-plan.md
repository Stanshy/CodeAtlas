# 開發計畫書: Sprint 18 — Python + Java 多語言支援

> **撰寫者**: PM
> **日期**: 2026-04-08
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint18-proposal.md`（G0 通過 2026-04-08）
> **狀態**: G0 通過，待執行

---

## 1. 需求摘要

CodeAtlas 目前只支援 JS/TS。本 Sprint 新增 Python + Java 支援，讓多語言專案也能用三視角分析。架構已有 AstProvider + ParserFactory 可插拔設計，主要工作在 extractor 層適配 + scanner 擴充。前端不用改。

**老闆決策**：Python + Java 同時做。

### 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- 無

---

## 2. 技術方案

### 架構現況

```
scanner（副檔名過濾）
  → parser-factory（選 AstProvider）
    → NativeTreeSitterProvider / WasmTreeSitterProvider / TypeScriptCompilerProvider
      → AstNode 樹
        → import-extractor（AST node type 匹配 → ParsedImport）
        → function-extractor（AST node type 匹配 → ParsedFunction）
          → call-analyzer（呼叫關係）
            → graph-builder（GraphNode / GraphEdge）
```

### 改動策略

| 層 | 改動 | 說明 |
|----|------|------|
| scanner | 擴充 DEFAULT_EXTENSIONS | 加 `.py`、`.java` |
| parser-factory | 傳遞語言參數 | `parseSource(code, filePath, language?)` |
| NativeTreeSitterProvider | 加載 Python/Java grammar | `tree-sitter-python`、`tree-sitter-java` |
| WasmTreeSitterProvider | 同上 WASM 版 | fallback |
| import-extractor | 新增 Python/Java 分支 | 按 AST node type 分派 |
| function-extractor | 新增 Python/Java 分支 | 按 AST node type 分派 |
| call-analyzer | 新增 Python/Java 呼叫模式 | `self.method()` / `this.method()` |
| 語言偵測 | 新增 detectLanguage() | 副檔名 → 'javascript' \| 'typescript' \| 'python' \| 'java' |

### Python import 支援範圍

| 模式 | 範例 | 支援 |
|------|------|------|
| 絕對 import | `import os` | ✅ |
| from import | `from os.path import join` | ✅ |
| relative import | `from . import utils` | ✅ |
| relative from | `from ..models import User` | ✅ |
| `__init__.py` | 目錄即模組 | ✅（scanner 識別） |
| wildcard | `from X import *` | ✅（標記為 namespace） |
| 動態 import | `importlib.import_module()` | ❌ 不做 |

### Java import 支援範圍

| 模式 | 範例 | 支援 |
|------|------|------|
| 一般 import | `import com.foo.Bar;` | ✅ |
| static import | `import static com.foo.Bar.method;` | ✅ |
| wildcard | `import com.foo.*;` | ✅（標記為 namespace） |
| package 宣告 | `package com.foo;` | ✅（作為目錄層級） |
| classpath 解析 | Maven/Gradle 依賴 | ❌ 不做 |

---

## 3. UI 圖稿

不適用（前端不用改）。

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/core/src/parser/providers/python-extractor.ts` | Python import + function 提取 |
| `packages/core/src/parser/providers/java-extractor.ts` | Java import + function 提取 |
| `packages/core/src/parser/language-detector.ts` | 語言自動偵測 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/scanner/index.ts` | DEFAULT_EXTENSIONS 加 .py/.java + 傳遞語言資訊 |
| `packages/core/src/parser/parser-factory.ts` | parseSource 接收 language 參數 |
| `packages/core/src/parser/providers/native-tree-sitter.ts` | 加載 python/java grammar |
| `packages/core/src/parser/providers/wasm-tree-sitter.ts` | 同上 WASM 版 |
| `packages/core/src/parser/import-extractor.ts` | 新增 Python/Java AST node type 分派 |
| `packages/core/src/parser/function-extractor.ts` | 新增 Python/Java AST node type 分派 |
| `packages/core/src/analyzer/call-analyzer.ts` | Python self.method() / Java this.method() 模式 |
| `packages/core/package.json` | 新增 tree-sitter-python + tree-sitter-java 依賴 |

---

## 5. 介面設計

### 語言偵測介面

```typescript
type SupportedLanguage = 'javascript' | 'typescript' | 'python' | 'java';

function detectLanguage(filePath: string): SupportedLanguage | null;
```

### parseSource 擴充

```typescript
// 現有
function parseSource(code: string, filePath: string): Promise<ParseResult>;

// 擴充
function parseSource(code: string, filePath: string, language?: SupportedLanguage): Promise<ParseResult>;
```

---

## 6. 任務定義與分配

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 驗收標準 |
|---|---------|------|-----------|------|---------|
| T1 | 語言偵測 + scanner 擴充 | 新增 detectLanguage() + DEFAULT_EXTENSIONS 加 .py/.java + scanner 傳遞語言 | backend-architect | 無 | .py/.java 檔案被掃描、語言正確識別 |
| T2 | Python grammar 加載 | NativeTreeSitterProvider + WasmTreeSitterProvider 加載 tree-sitter-python | ai-engineer | 無 | Python 檔案能產出 AstNode 樹 |
| T3 | Java grammar 加載 | 同上，tree-sitter-java | ai-engineer | 無 | Java 檔案能產出 AstNode 樹 |
| T4 | Python import extractor | import-extractor 新增 Python 分支：絕對/from/relative/wildcard/__init__.py | backend-architect | T2 | 真實 Python 專案 import 全部正確提取 |
| T5 | Python function extractor | function-extractor 新增 Python 分支：def/class/async def/decorator | backend-architect | T2 | Python 函式+類別正確提取 |
| T6 | Java import extractor | import-extractor 新增 Java 分支：import/static import/wildcard/package | backend-architect | T3 | 真實 Java 專案 import 全部正確提取 |
| T7 | Java function extractor | function-extractor 新增 Java 分支：class/method/interface/constructor/enum | backend-architect | T3 | Java 方法+類別正確提取 |
| T8 | call-analyzer 多語言 | Python self.method() + Java this.method() + 靜態呼叫模式 | backend-architect | T4-T7 | 呼叫關係圖正確 |
| T9 | 端到端驗證 — Python | Flask 或 Django 專案 → codeatlas web → 三視角正確 | test-writer-fixer | T1-T5, T8 | SF/LO/DJ 三視角有內容 |
| T10 | 端到端驗證 — Java | Spring Boot 專案 → codeatlas web → 三視角正確 | test-writer-fixer | T1, T3, T6-T8 | SF/LO/DJ 三視角有內容 |
| T11 | 測試 | Python/Java parser + extractor 單元測試 + JS/TS 回歸 | test-writer-fixer | T1-T8 | ≥30 新測試 + 零回歸 |
| T12 | 文件更新 | feature-spec + CLAUDE.md + README 語言支援說明 | tech-lead | T11 | 文件與程式碼一致 |

### 依賴圖

```
T1（語言偵測+scanner）──┐
T2（Python grammar）────┤─ 並行
T3（Java grammar）──────┘
        ↓
T4（Python import）+ T5（Python function）← 依賴 T2
T6（Java import）+ T7（Java function）← 依賴 T3
        ↓
T8（call-analyzer）← 依賴 T4-T7
        ↓
T9（端到端 Python）+ T10（端到端 Java）← 並行
        ↓
T11（測試）
        ↓
T12（文件）
```

### L1 執行指令

```
Sprint 18 — Python + Java 多語言支援

計畫書：proposal/sprint18-dev-plan.md
提案書：proposal/sprint18-proposal.md

讀完計畫書，照依賴順序執行。
先進 Plan Mode，評估 extractor/call-analyzer 的改造量再動手。
前端不用改，全部在 core 層。
按 SOP 走。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| import-extractor.ts | T4, T6 | 中（Python/Java 各加分支） |
| function-extractor.ts | T5, T7 | 中（同上） |
| native-tree-sitter.ts | T2, T3 | 低（各加 grammar） |

---

## 7. 測試計畫

### 單元測試

| 測試範圍 | 測試案例 |
|---------|---------|
| Python import | 絕對、from、relative、wildcard、__init__.py（8+） |
| Python function | def、class、async def、decorator、method（6+） |
| Java import | import、static import、wildcard、package（6+） |
| Java function | class、method、interface、constructor、enum（6+） |
| 語言偵測 | .py → python、.java → java、.ts → typescript、unknown（4+） |

### 端到端測試

| 測試專案 | 驗證項 |
|---------|--------|
| Flask/Django 專案 | SF 目錄結構 + LO 函式列表 + DJ 路由端點 |
| Spring Boot 專案 | SF package 結構 + LO 方法列表 + DJ REST 端點 |

### 回歸

- JS/TS 專案三視角正常
- pnpm build 零錯誤
- pnpm test 零失敗

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| Python relative import 複雜 | 中 | 先覆蓋 80% 常見模式，邊界 TODO |
| grammar Windows 相容性 | 高 | WASM fallback 已存在 |
| call-analyzer 改造量大 | 中 | 先做簡單模式（self.X / this.X），複雜鏈式呼叫後續 |
| 新語言影響 JS/TS | 高 | 語言分支獨立，JS/TS 路徑不動 |

---

## 9. 文件更新

- [ ] `.knowledge/specs/feature-spec.md` — v17.0 新增 Python/Java 支援
- [ ] `CLAUDE.md` — Sprint 18 完成標記
- [ ] `README.md`（如有） — 支援語言列表

---

## 10. 任務與審核紀錄

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-08 | ✅ 通過 | SupportedLanguage 型別 + scanner 擴充 + parser-factory 語言感知分流 |
| T2 | 2026-04-08 | ✅ 通過 | native + WASM Python grammar 載入，隔離 try-catch |
| T3 | 2026-04-08 | ✅ 通過 | native + WASM Java grammar 載入，隔離 try-catch |
| T4 | 2026-04-08 | ✅ 通過 | Python import extractor（絕對/from/relative/wildcard）+ resolver |
| T5 | 2026-04-08 | ✅ 通過 | Python function extractor（def/class/async/decorator/self 剝離） |
| T6 | 2026-04-08 | ✅ 通過 | Java import extractor（import/static/wildcard/package）+ resolver |
| T7 | 2026-04-08 | ✅ 通過 | Java function extractor（class/method/constructor/interface/enum） |
| T8 | 2026-04-08 | ✅ 通過 | call-analyzer Python/Java 分支 + 語言感知 SKIP_NAMES |
| T9 | 2026-04-08 | ✅ 通過 | Python E2E tests（21 tests, availability guard） |
| T10 | 2026-04-08 | ✅ 通過 | Java E2E tests（18 tests, availability guard） |
| T11 | 2026-04-08 | ✅ 通過 | 65 new tests, 784 total pass, 0 fail, 0 regression |
| T12 | 2026-04-08 | ✅ 通過 | feature-spec v17.0 + CLAUDE.md 更新 |

### Review 紀錄

| Review | 日期 | 結果 | 文件 |
|--------|------|------|------|
| 實作 Review | 2026-04-08 | 通過 | Blocker:0 Major:0 Minor:0 — 對程式碼+對規範，Python/Java extractor/call-analyzer 全通過 |
| 測試 Review | 2026-04-08 | 通過 | Blocker:0 Major:0 Minor:0 — 對功能+對規範，784 tests pass / 65 new / 0 regression |
| 文件 Review | 2026-04-08 | 通過 | Blocker:0 Major:0 Minor:0 — 對規範，feature-spec v17.0 + CLAUDE.md 一致 |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-08 | ✅ 通過 | Python + Java 雙語言同時做 |
| G2 | 2026-04-08 | ✅ 通過 | 老闆批准。PM 審核 6 項 checklist 全過。65 新測試超標、零回歸、build 零錯誤 |
| G3 | 2026-04-08 | ✅ 通過 | 老闆批准。784 total pass / 0 fail / 65 new tests / 0 regression |
| G4 | 2026-04-08 | ✅ 通過 | 老闆批准。feature-spec v17.0 + CLAUDE.md 更新，文件與程式碼一致 |
