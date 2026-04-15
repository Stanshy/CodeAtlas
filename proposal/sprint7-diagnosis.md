# 產品診斷報告 — Sprint 7

**專案**: CodeAtlas
**診斷日期**: 2026-03-31
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | 目前圖譜只到模組（檔案）級別。使用者可以看到「A 檔案 import B 檔案」，但看不到「A 檔案裡的 handleLogin() 呼叫了 B 檔案裡的 validateUser()」。對於理解程式邏輯、追蹤 bug、code review 來說，函式級才是真正需要的粒度 |
| 頻率 | 每次深入理解程式碼邏輯時都需要 — 模組級是「地圖」，函式級是「街景」 |
| 嚴重度 | 高 — 路線圖 v2.0 Phase 3 首個里程碑 M7，從「看結構」深入到「看邏輯」的關鍵跳躍 |
| 現有替代方案 | 點進面板看原始碼（Sprint 3），但只是展示程式碼文字，沒有呼叫關係視覺化 |

**結論**: [x] 問題真實存在且值得解決

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | ① 工程師（追蹤函式呼叫鏈、理解邏輯流）② Tech Lead（審查架構耦合度、識別 God function）③ 新人（快速掌握「這個 API 從入口到資料庫走了哪些函式」） |
| 使用頻率 | code review、bug 追蹤、onboarding 時高頻使用 |
| 技術水平 | 理解函式/類別概念即可 |
| 關鍵場景 | ① 點進檔案 → 看到內部函式/class 節點 ② 選一個函式 → 展開完整呼叫路徑 ③ API route → handler → service → data access 一條路徑看到底 |

**結論**: [x] 用戶輪廓清晰

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | 高複雜度 + 高價值。tree-sitter 已在 Sprint 1 引入，但目前只解析 import/export。需擴充解析 function/class/method 定義 + 呼叫關係（靜態分析） |
| 有沒有更簡單的做法 | 正則表達式可抓函式定義，但無法正確處理巢狀/解構/箭頭函式。tree-sitter AST 是正確做法 |
| 技術可行性 | ✅ tree-sitter 可解析函式定義、方法呼叫。靜態分析呼叫關係有限制（動態呼叫/callback 無法追蹤），但覆蓋率 > 70% 已有價值 |
| 邊界情況 | ① 動態呼叫（`obj[method]()`）無法靜態分析 → 標記 confidence: low ② 高階函式/callback → 盡力而為 ③ 超大檔案（1000+ 行）解析效能 ④ 匿名函式 → 用位置作 ID |

**結論**: [x] 解法合理

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | ① 函式/類別/方法解析（tree-sitter）② 呼叫關係分析（靜態）③ 呼叫鏈圖（選函式→展開路徑）④ 節點第三層（zoom into 檔案→看到函式/class）⑤ 函式 I/O 視覺化（參數→回傳）⑥ 2D + 3D 適配 |
| 應做 | API 路徑視圖（Express/Fastify route → handler → service） |
| 不做（Out of Scope） | 動態呼叫追蹤、runtime profiling、跨語言呼叫、變數級 taint analysis |
| 驗收標準 | 點進檔案→看到函式節點 + 選函式→呼叫鏈亮起 + 2D/3D 都能用 |
| 依賴 | Sprint 1 tree-sitter 已引入、Sprint 4 的 3D 渲染、Sprint 5 的路徑追蹤模式可復用 |

**結論**: [x] 範圍清晰可執行

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 三層分離原則 | ✅ core 層擴充解析引擎（函式/class 解析 + 呼叫分析）、web 層新增函式級視圖。cli 層 API 可能需擴充（函式級資料） |
| 資料流向 | ✅ core 解析→輸出含函式級 nodes/edges 的 Graph JSON→web 渲染。需擴充 data-model（新增 function/class node type、call edge type） |
| 命名規範 | ✅ `function-parser.ts`、`call-analyzer.ts`、`FunctionNode.tsx` |
| 歷史教訓 | ① data-model 擴充需向下相容（既有模組級 nodes/edges 不變）② API 擴充需更新 api-design.md ③ 路徑追蹤模式可復用（Sprint 5 的 BFS 演算法） |

**結論**: [x] 符合架構

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | 🔴 高 — 這是目前最複雜的 Sprint：tree-sitter AST 解析 + 呼叫關係建圖 + 第三層 zoom + 2D/3D 適配 |
| 技術風險 | 🟡 中等 — 靜態呼叫分析有天然限制（動態呼叫、callback）。tree-sitter query 需要 JS/TS 專用語法 |
| 回歸風險 | 🟡 中等 — core 層解析引擎需擴充，可能影響現有模組級分析。523 tests 保護但需仔細 |
| 維護風險 | 🟡 中等 — 函式級分析增加資料模型複雜度，Graph JSON 資料量增加 |

**結論**: [x] 風險可控，但需特別注意時間和範圍控制

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在 | 模組級不夠，函式級才能理解邏輯 |
| Q2 | 目標用戶清晰？ | ✅ 清晰 | 工程師/TL/新人，code review + bug 追蹤場景 |
| Q3 | 解法合理？ | ✅ 合理 | tree-sitter AST，靜態分析覆蓋率 > 70% |
| Q4 | 範圍明確？ | ✅ 明確 | 6 項核心功能 + 1 應做，不含動態分析 |
| Q5 | 符合架構？ | ✅ 符合 | core 擴充 + web 新增，data-model 向下相容 |
| Q6 | 風險可控？ | ⚠️ 可控但高複雜度 | 時間風險高，建議嚴格控制範圍 |

## 總體建議

[x] 建議通過，但附帶建議：

1. **嚴格控制範圍** — 函式定義 + 呼叫關係 + 呼叫鏈圖為 P0，API 路徑視圖為 P1 可視時間調整
2. **先 core 後 web** — 先確保解析引擎正確，再做視覺化
3. **漸進式** — 先做函式定義解析（相對簡單），再做呼叫關係分析（較複雜）
