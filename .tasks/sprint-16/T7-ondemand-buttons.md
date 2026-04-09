# 三視角按需分析按鈕

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1,T6,G1 |
| 預估 | 4h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T21:15:00.000Z |
| 完工時間 | 2026-04-07T21:50:00.000Z |

---

## 任務描述

新增 `packages/web/src/hooks/useAIAnalysis.ts` 共用 hook，封裝 postAIAnalyze → polling getAIJob 邏輯。

修改三個元件加按需分析按鈕（規格見提案書附錄 E）：
- DirectoryCard.tsx（SF）：「✨ 分析此目錄」scope=directory
- LOCategoryCardNode.tsx（LO）：「✨ 解釋邏輯」scope=method-group
- DJSelectorCardNode.tsx（DJ）：「✨ 解釋資料流」scope=endpoint

4 種按鈕狀態：未分析（藍色邊框）→ 分析中（spinner+disabled）→ 已分析（AIResultBlock+🔄）→ 失敗（⚠️重試）。

AI disabled 時：按鈕保留但 disabled + tooltip「請先在設定中啟用 AI」。

## 驗收標準

- [x] SF/LO/DJ 三視角都有按需分析按鈕
- [x] 4 種狀態轉換正確
- [x] 已分析後底部小字 ✨ provider · 時間 · 🔄 重新分析
- [x] AI disabled 時按鈕 disabled + tooltip
- [x] polling 每 2s，succeeded/cached 自動停止
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T21:15:00.000Z — 開始執行
frontend-developer 開始執行

### 2026-04-07T21:50:00.000Z — 完成交付
useAIAnalysis hook + DirectoryCard/LOCategoryCardNode/DJSelectorCardNode 三視角按鈕 + 5 種狀態 + tooltip

### 2026-04-07T21:55:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
