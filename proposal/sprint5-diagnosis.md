# 產品診斷報告 — Sprint 5

**專案**: CodeAtlas
**診斷日期**: 2026-03-31
**診斷人**: PM

---

## Q1: 問題存在嗎？（Problem Validation）

| 檢查項 | 說明 |
|--------|------|
| 痛點來源 | 目前圖譜只看到「誰 import 誰」，但看不到「搬了什麼東西過去」。使用者無法回答：「UserService 是從哪裡 export 的？中間經過幾層 re-export？」這對理解架構至關重要 |
| 頻率 | 每次看圖都會想知道 — 邊線只顯示「有依賴」但不顯示「依賴了什麼」 |
| 嚴重度 | 高 — 路線圖 v2.0 明確列為 Phase 2 里程碑 M5，老闆決策 #13 要求資料流動視覺化 |
| 現有替代方案 | 無。目前只能點進節點面板看 imports/exports 列表，無法直觀追蹤 symbol 傳遞路徑 |

**結論**: [x] 問題真實存在且值得解決

---

## Q2: 目標用戶是誰？（User Definition）

| 檢查項 | 說明 |
|--------|------|
| 用戶角色 | 工程師（理解模組間資料流動）、Tech Lead（審查架構耦合度）、新人（快速掌握「誰用了什麼」） |
| 使用頻率 | 每次 code review、架構討論、onboarding 都會用 |
| 技術水平 | 理解 import/export 概念即可 |
| 關鍵場景 | ① Hover 邊線 → 看到具體搬運的 symbol 名稱 ② 點擊 symbol → 整條傳遞路徑亮起 ③ 一眼看出哪些邊最「繁忙」（熱力圖） |

**結論**: [x] 用戶輪廓清晰

---

## Q3: 解法合理嗎？（Solution Fitness）

| 檢查項 | 說明 |
|--------|------|
| 複雜度 vs 價值 | core 層已有 import/export symbol 資料（data-model.md 的 Edge.symbols），Sprint 5 主要是前端呈現層工作，價值高且基礎資料已備 |
| 有沒有更簡單的做法 | 最簡化是只做邊上 symbol 標籤（hover 顯示），但路徑追蹤和熱力圖是真正有差異化的功能 |
| 技術可行性 | ✅ 邊上標籤：2D（React Flow edge label）+ 3D（Three.js sprite text）。路徑追蹤：圖遍歷演算法。熱力圖：邊的 weight → 粗細/亮度映射 |
| 邊界情況 | ① 循環依賴的路徑追蹤（需設深度上限）② re-export 鏈可能很長 ③ 大量 symbol 的邊標籤可能擁擠 |

**結論**: [x] 解法合理

---

## Q4: 範圍明確嗎？（Scope Clarity）

| 檢查項 | 說明 |
|--------|------|
| 必做（Must Have） | ① 邊上 symbol 標籤（hover 浮現）② 路徑追蹤模式（點擊 symbol → 追蹤完整傳遞鏈）③ 節點 I/O 標記（import 數/export 數）④ 粒子攜帶資訊（symbol 類型映射顏色/大小）⑤ 資料流熱力圖（依賴頻率 → 邊粗細/亮度）⑥ 2D + 3D 皆適用 |
| 不做（Out of Scope） | 函式級參數/回傳追蹤（Phase 3 Sprint 7）、端到端 API 路徑（Phase 3）、變數級 taint analysis（長期） |
| 驗收標準 | hover 邊 → 看到 symbol 名稱 + 點擊 symbol → 路徑亮起 + 熱力圖可見 + 2D/3D 都能用 |
| 依賴 | Sprint 1-4 全部完成 ✅，core 已有 Edge.symbols 資料，Sprint 4 的 ViewStateContext 共享狀態層可擴充 |

**結論**: [x] 範圍清晰可執行

---

## Q5: 符合架構嗎？（Architecture Alignment）

| 檢查項 | 說明 |
|--------|------|
| 三層分離原則 | ✅ 基本不破壞。core 可能需小幅擴充（symbol 路徑追蹤演算法），web 為主要變更 |
| 資料流向 | ✅ core 提供 symbol 資料 → API 輸出 → web 渲染。可能需在 core 新增路徑追蹤 utility |
| 命名規範 | ✅ 延續 kebab-case 檔名：`edge-label.tsx`、`path-tracer.ts`、`heatmap-overlay.tsx` |
| 歷史教訓 | ① ViewStateContext 已建立，可擴充 tracing 相關狀態 ② 2D/3D 雙模式已有架構，新功能需同時適配 |

**結論**: [x] 符合架構

---

## Q6: 風險可控嗎？（Risk Assessment）

| 風險類型 | 評估 |
|---------|------|
| 時間風險 | 🟡 中等 — 路徑追蹤演算法 + 2D/3D 雙模式適配 + 熱力圖三線工作 |
| 技術風險 | 🟡 中等 — 3D 邊上文字渲染（Three.js sprite text 效能）、循環依賴路徑追蹤 |
| 回歸風險 | 🟢 低 — 353 tests 保護。資料流為新增功能，不改現有渲染邏輯 |
| 維護風險 | 🟢 低 — 基於現有 symbol 資料擴充，不引入新重量級依賴 |

**結論**: [x] 風險可控

---

## 診斷摘要

| # | 診斷問題 | 結論 | 備註 |
|---|---------|------|------|
| Q1 | 問題存在嗎？ | ✅ 真實存在 | 看不到「搬了什麼」是核心痛點 |
| Q2 | 目標用戶清晰？ | ✅ 清晰 | 工程師/TL/新人，code review + onboarding 場景 |
| Q3 | 解法合理？ | ✅ 合理 | core 已有 symbol 資料，主要前端呈現 |
| Q4 | 範圍明確？ | ✅ 明確 | 6 項核心功能，不含函式級分析 |
| Q5 | 符合架構？ | ✅ 符合 | core 小幅擴充 + web 主要變更 |
| Q6 | 風險可控？ | ✅ 可控 | 中等技術風險，回歸風險低 |

## 總體建議

[x] 建議通過，可進入 Sprint 5 提案書撰寫

資料流動視覺化是產品「從看結構到看流動」的關鍵跳躍，基礎資料已備，技術可行。
