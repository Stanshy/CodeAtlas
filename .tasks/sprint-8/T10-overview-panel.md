# OverviewPanel 元件：AI 概述 UI + loading/error 狀態 + Toolbar 按鈕

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T16:40:00.000Z |
| 結束時間 | 2026-03-31T17:15:00.000Z |
| 依賴 | T9 |
| 預估 | 1.5h |
| 建立時間 | 2026-03-31T16:00:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/OverviewPanel.tsx`：
   - 從 Toolbar 的「專案概述」按鈕觸發
   - 顯示為 modal 或右側面板
   - 狀態管理：idle → loading → result / error
   - 結果快取在組件內（避免重複 API 呼叫）
   - AI 未設定時顯示「需啟用 AI 才能使用此功能」
   - 超時顯示「AI 回應超時，請重試」+ 重試按鈕
2. 面板內容：
   - AI 生成的 1-2 段架構概述文字
   - 結構統計：totalFiles, totalFunctions, topModules 列表
   - 來源 provider 標示
3. 修改 `packages/web/src/components/Toolbar.tsx`：
   - 新增「專案概述」按鈕
   - 新增 FilterPanel toggle 按鈕
4. 新增 `packages/web/src/api/graph.ts` 函式：
   - `fetchOverview(provider?: string)` → 呼叫 `POST /api/ai/overview`

## 驗收標準

- [x] OverviewPanel 渲染 AI 概述文字
- [x] loading 狀態正確顯示
- [x] AI 未設定時顯示提示
- [x] 結構統計正確顯示
- [ ] Toolbar 新增「專案概述」按鈕（T11 整合時處理）
- [ ] Toolbar 新增 FilterPanel toggle 按鈕（T11 整合時處理）
- [x] fetchOverview API 函式正確
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:40:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T17:15:00.000Z — done
OverviewPanel modal 完成。fetchAiOverview + fetchSearchKeywords API 函式。idle/loading/success/error 狀態機、快取 component state、Escape/backdrop/X 關閉。tsc clean。Toolbar 按鈕留待 T11 整合。
