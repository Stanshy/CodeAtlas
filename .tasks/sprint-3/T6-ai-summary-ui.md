# AI 摘要 UI

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 完工時間 | 2026-03-31T12:30:00.000Z |
| 依賴 | T4 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

面板內 AI 摘要區塊，含 loading/結果/降級提示。

### 具體工作

1. `packages/web/src/components/AiSummary.tsx`：
   - 「AI Summary」區塊標題 + sparkle icon
   - 三種狀態：
     - **Loading**：spinner + "Generating summary..."
     - **Success**：摘要文字 + provider 標記 + cached 標記
     - **Not configured**：引導提示 "AI not configured. Use --ai-key flag to enable."
   - 「Regenerate」按鈕（清除快取重新呼叫）
   - 「AI 生成」浮水印標記

2. `packages/web/src/hooks/useAiSummary.ts`：
   - 呼叫 `fetchAiSummary(nodeId)` 取得 AI 摘要
   - 回傳 `{ summary, isLoading, error, isConfigured, cached, regenerate }`
   - `regenerate` 函數觸發重新呼叫（忽略快取）

3. `packages/web/src/api/ai.ts`：
   - `fetchAiSummary(nodeId, options?)` — POST `/api/ai/summary`
   - `fetchAiStatus()` — GET `/api/ai/status`
   - 使用既有 `apiFetch` pattern

4. 整合到 NodePanel.tsx：
   - 在 Source Code 區塊下方
   - 面板開啟時自動觸發 AI 摘要請求（如果 AI 已啟用）

### 視覺規範

- AI 摘要背景：`colors.bg.elevated` 帶微弱邊框
- 摘要文字：`colors.text.primary`
- 「AI 生成」標記：`colors.accent.green` 小字

## 驗收標準

- [x] 有 key → 自動載入並顯示摘要
- [x] 無 key → 顯示引導提示（不報錯）
- [x] Loading 有 spinner
- [x] cached: true 時顯示快取標記
- [x] Regenerate 按鈕可重新呼叫

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T11:32:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T12:10:00.000Z — 狀態變更 → in_review
完成。AiSummary.tsx 三態 UI、useAiSummary hook、api/ai.ts fetch 層。自動偵測 AI 是否啟用（/api/ai/status），未設定時降級提示。Regenerate 按鈕、cached/provider badges。

### 2026-03-31T12:30:00.000Z — 狀態變更 → done
L1 審核通過。降級邏輯正確，色碼引用 theme.ts。
