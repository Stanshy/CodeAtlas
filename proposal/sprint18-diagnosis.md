# 產品診斷報告

**專案**: CodeAtlas Sprint 18 — 多語言支援
**診斷日期**: 2026-04-08
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | **路線圖規劃** — 產品定位為「語言無關」（決策 #2），但目前只支援 JS/TS |
| 頻率 | 每次遇到 Python/Java 專案就無法使用 |
| 嚴重度 | 高 — 開源後如果只支援 JS/TS，受眾大幅縮小 |
| 現有替代方案 | 無，用戶只能用其他工具 |

**現狀**：
- scanner/index.ts 硬編碼 `DEFAULT_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']`
- Parser 架構已可插拔（AstProvider 介面 + ParserFactory），但 3 個 provider 全是 JS/TS
- import-extractor / function-extractor 的解析邏輯是否綁定 JS/TS 語法？需 TL 確認

**結論**: [x] 問題真實存在且值得解決 — 開源前必做

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | Python 工程師（Django/Flask/FastAPI）、Java 工程師（Spring Boot） |
| 使用頻率 | 接手新專案時 |
| 技術水平 | 與 JS/TS 用戶相同 |
| 關鍵場景 | Python 後端專案、Java 微服務專案 → codeatlas web → 看懂架構 |

**結論**: [x] 用戶輪廓清晰

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | 中等 — 需要新 grammar + 新 import/function extractor，但架構已有插拔設計 |
| 更簡單的做法 | 先做 Python 一種就好？Java 可延後？ |
| 技術可行性 | tree-sitter 有現成 Python/Java grammar，parser 架構已就緒 |
| 邊界情況 | Python 的 import 系統複雜（relative import、`__init__.py`、`from X import *`）；Java 的 package 系統 + classpath |

**架構評估**：
- `AstProvider` 介面是語言無關的 ✅
- `ParserFactory` 可擴充新 provider ✅
- 但 `import-extractor.ts` 和 `function-extractor.ts` 的**解析規則**可能綁定 JS/TS AST node type
- `scanner/index.ts` 的 `DEFAULT_EXTENSIONS` 需要擴充
- `call-analyzer.ts` 的呼叫關係解析是否綁 JS/TS？

**結論**: [x] 解法合理，但需 TL 評估 extractor 層的改造量

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做 | Python 支援、語言自動偵測、scanner 擴充 |
| 不做 | Java（工作量可能太大，建議延後）、IDE 整合、語言混合專案 |
| 驗收標準 | 一個 Python 專案（如 Flask/Django）能產出正確的三視角 |
| 依賴 | Sprint 17 完成 ✅ |

**PM 建議**：路線圖寫 Python + Java，但一個 Sprint 做兩種語言風險高。建議：
- Sprint 18：**Python only** + 語言框架基礎
- Sprint 19：Java + 開源準備
- 或：老闆決定要不要一起做

**結論**: [x] 範圍需老闆決策 — Python only 還是 Python + Java

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 架構原則 | core 純分析引擎，語言支援屬 core 範圍 ✅ |
| 資料流向 | 新語言 → 同一個 GraphNode/GraphEdge schema → 前端不用改 |
| 命名規範 | 新 parser provider 按既有模式命名 |
| 歷史教訓 | postmortem 無多語言相關踩坑 |

**關鍵問題**：graph-builder、call-analyzer、role-classifier 是否能處理非 JS/TS 的 AST？這決定改造量是「加 parser」還是「改分析引擎」。

**結論**: [x] 需要小幅調整 — extractor/analyzer 需評估是否綁定 JS/TS

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | 中 — Python + Java 同時做可能超 1 Sprint |
| 技術風險 | 中 — Python import 系統複雜（relative import、namespace package） |
| 回歸風險 | 低 — 新增語言不應影響 JS/TS 現有功能（如果架構正確） |
| 維護風險 | 中 — 每種語言都有持續維護成本 |

**結論**: [x] 中等風險 — 建議先做 Python 降低風險

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 存在且必做 | 開源前必須支援多語言 |
| Q2 | 目標用戶？ | ✅ 清晰 | Python/Java 工程師 |
| Q3 | 解法合理？ | ✅ 合理 | 架構已有插拔設計，需評估 extractor 改造量 |
| Q4 | 範圍明確？ | ⚠️ 需決策 | Python only 還是 Python + Java？ |
| Q5 | 符合架構？ | ⚠️ 需評估 | extractor/analyzer 是否綁 JS/TS |
| Q6 | 風險可控？ | ⚠️ 中等 | 建議先 Python only |

## 總體建議

[x] 建議修改後再提交 G0

### 需老闆決策

1. **範圍**：Sprint 18 做 Python only，還是 Python + Java？
   - PM 建議：**Python only** — 降低風險，Java 留 Sprint 19
2. **功能驗證**：備忘的 7 項待驗證功能要在 Sprint 18 前還是併入處理？
3. **專案概述**：老闆提到的「專案概述」頁面要併入嗎？

### 需 TL 評估

- import-extractor / function-extractor 的 JS/TS 綁定程度
- call-analyzer / graph-builder 處理非 JS/TS AST 的改造量
- tree-sitter Python grammar 的 Windows 相容性
