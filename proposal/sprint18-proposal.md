# Sprint 提案書: Sprint 18 — Python + Java 多語言支援

> **提案人**: PM
> **日期**: 2026-04-08
> **專案**: CodeAtlas
> **Sprint 類型**: 功能擴充（core 層為主）
> **前置 Sprint**: Sprint 17（✅ 完成 — 程式碼優化）
> **產品診斷**: `proposal/sprint18-diagnosis.md`（六問通過）
> **狀態**: 待 G0 審核

---

## 1. 目標

CodeAtlas 目前只支援 JS/TS。產品定位為「語言無關」（決策 #2），開源前必須支援主流語言。本 Sprint 新增 Python 和 Java 支援，讓 Python/Java 專案也能產出完整的三視角分析。

架構已有可插拔設計（AstProvider + ParserFactory），主要工作在 extractor 層適配不同語言的 AST node type + scanner 擴充副檔名。前端不用改。

---

## 2. 範圍定義

### 做

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S18-1 | **Python tree-sitter grammar** | P0 | NativeTreeSitterProvider + WasmTreeSitterProvider 加載 Python grammar |
| S18-2 | **Java tree-sitter grammar** | P0 | 同上，加載 Java grammar |
| S18-3 | **語言自動偵測** | P0 | scanner 根據副檔名（.py / .java）自動選擇語言，傳遞給 parser |
| S18-4 | **Python import extractor** | P0 | 支援 `import X`、`from X import Y`、`from . import Z`（relative）、`__init__.py` |
| S18-5 | **Java import extractor** | P0 | 支援 `import com.foo.Bar`、`import static`、package 宣告 |
| S18-6 | **Python function extractor** | P0 | 支援 `def`、`class`、decorator、`async def` |
| S18-7 | **Java function extractor** | P0 | 支援 class、method、interface、enum、annotation |
| S18-8 | **scanner 副檔名擴充** | P0 | DEFAULT_EXTENSIONS 新增 `.py`、`.java` |
| S18-9 | **call-analyzer 多語言適配** | P0 | Python/Java 的呼叫關係解析（Python: `self.method()`、Java: `this.method()`） |
| S18-10 | **端到端驗證** | P0 | 用真實 Python 專案（Flask/Django）+ Java 專案（Spring Boot）驗證三視角 |
| S18-11 | **測試** | P0 | Python/Java parser + extractor 測試 + 回歸 |
| S18-12 | **文件更新** | P0 | feature-spec + CLAUDE.md + README 支援語言更新 |

### 不做（明確排除）

- Go / Rust / C++ 等其他語言（後續按需加）
- Python 虛擬環境解析（venv / conda）
- Java classpath / Maven / Gradle 依賴解析
- 語言混合專案的跨語言引用（如 Python 呼叫 Java）
- 專案概述頁面（後續 Sprint）
- 功能驗證修復（3D 等 7 項，後續處理）
- npm 發佈 / 開源準備（Sprint 19）

---

## 3. 流程決策（G0 核心產出）

### 步驟勾選

| 勾選 | 步驟 | 說明 | 對應關卡 | 備註 |
|------|------|------|---------|------|
| [x] | 需求分析 | 本文件 | G0 | 必選 |
| [x] | 設計 | extractor 適配方案 | — | |
| [ ] | UI 圖稿 | — | — | 前端不用改 |
| [x] | 實作 | core 層多語言 | G2: 程式碼審查 | |
| [x] | 測試 | parser + extractor + 端到端 | G3: 測試驗收 | |
| [x] | 文件 | feature-spec + CLAUDE.md | G4: 文件審查 | |
| [ ] | 部署 | — | — | 不需 |
| [ ] | 發佈 | — | — | Sprint 19 |

### 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

> **無 G1**：前端不用改
> **無阻斷規則**

### 阻斷規則

- 無

---

## 4. 團隊分配

| 角色 | Agent | 負責範圍 |
|------|-------|---------|
| L1 領導 | tech-lead | 架構設計、extractor 適配方案、Review |
| L2 Parser | ai-engineer | tree-sitter grammar 加載 + language detection |
| L2 Extractor | backend-architect | import/function extractor Python + Java 分支 |
| L2 測試 | test-writer-fixer | parser + extractor 測試 + 端到端驗證 |

---

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| Python relative import 解析複雜 | 中 | 中 | 先支援常見模式（from . import / from ..X import），邊界情況標記 TODO |
| tree-sitter Python/Java grammar Windows 相容性 | 低 | 高 | 已有 WASM fallback 機制 |
| call-analyzer 綁定 JS/TS 語法 | 中 | 中 | TL 先評估，可能需要抽象化呼叫解析邏輯 |
| 新語言影響 JS/TS 現有功能 | 低 | 高 | 語言分支獨立，JS/TS 路徑不動 |

---

## 6. 失敗模式分析

| 失敗場景 | 可能性 | 影響 | 偵測方式 | 緩解措施 |
|---------|--------|------|---------|---------|
| Python import 解析遺漏導致依賴圖斷裂 | 中 | 中 | 端到端：真實 Flask 專案三視角檢查 | 先覆蓋 80% 常見 import 模式 |
| Java package 層級太深導致目錄圖過深 | 低 | 低 | 端到端：Spring Boot 專案驗證 | directory aggregation 已有深度控制 |
| grammar 加載失敗 | 低 | 高 | isAvailable() 機制 + fallback | WASM fallback + TypeScript Compiler（僅限 JS/TS） |

---

## 7. 可觀測性

- **pnpm build**：零錯誤
- **pnpm test**：零失敗 + 新語言測試覆蓋
- **端到端**：真實 Python/Java 專案產出正確 graph JSON
- **語言偵測**：`codeatlas analyze` 輸出顯示偵測到的語言

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | git revert Sprint 18 commit |
| 判斷標準 | 新語言破壞 JS/TS 現有功能 |
| 負責人 | tech-lead |

---

## 9. 驗收標準

### 必達

- [ ] Python 專案（Flask/Django）：`codeatlas web` → SF 視角顯示目錄結構 + LO 顯示函式列表 + DJ 顯示路由
- [ ] Java 專案（Spring Boot）：同上
- [ ] 語言自動偵測：混合專案正確識別 .py / .java / .ts
- [ ] Python import 支援：`import X`、`from X import Y`、`from . import Z`
- [ ] Java import 支援：`import com.foo.Bar`、`import static`
- [ ] Python 函式提取：`def`、`class`、`async def`、decorator
- [ ] Java 方法提取：class、method、interface、constructor
- [ ] JS/TS 現有功能零回歸
- [ ] pnpm build 全通過
- [ ] pnpm test 全通過 + ≥30 新測試

### 回歸

- [ ] JS/TS 專案三視角正常
- [ ] AI 按需分析正常（不受語言擴充影響）
- [ ] 2D/3D 渲染正常

---

**G0 審核結果**

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-08 確認通過。Python + Java 雙語言一起做。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3 → 文件 → G4
