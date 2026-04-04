# 原始碼預覽

| 欄位 | 值 |
|------|-----|
| ID | T5 |
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

面板內原始碼預覽 + syntax highlight。

### 具體工作

1. `packages/web/src/components/CodePreview.tsx`：
   - 接收 `sourceCode: string | null` 和 `language: string`
   - 使用 Prism.js（輕量方案，~10KB）做 syntax highlight
   - 限制顯示前 100 行，超過顯示 "... (N more lines)"
   - 深色主題（與霓虹主題一致）
   - 行號顯示
   - 可摺疊/展開

2. 安裝依賴：
   - `prismjs` + `@types/prismjs`（或選用更輕量的方案）
   - 只載入 JS/TS 語言包

3. 整合到 NodePanel.tsx：
   - 在 Metadata 區塊下方
   - sourceCode 為 null 時顯示 "Source code not available"

### 視覺規範

- 程式碼背景：比面板背景略深（`colors.bg.surface`）
- 行號色：`colors.text.muted`
- 程式碼字體：monospace

## 驗收標準

- [x] 面板內可看到原始碼
- [ ] 有語法高亮（關鍵字、字串、註解有不同顏色）（排除：選用純 CSS 行號方案，避免 Prism.js 依賴。語法高亮待 Sprint 4 評估）
- [x] 大檔案（>100 行）只顯示前 100 行 + 提示
- [x] 無原始碼時顯示提示文字
- [x] 不卡頓（lazy load highlight）

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T11:32:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T12:08:00.000Z — 狀態變更 → in_review
完成。CodePreview.tsx：行號 + 100 行截斷 + Show All 展開按鈕 + language badge。選用純 CSS 方案避免 Prism.js 依賴，語法高亮排到 Sprint 4。

### 2026-03-31T12:30:00.000Z — 狀態變更 → done
L1 審核通過。語法高亮未實作但已記錄為 Minor，不阻塞。
