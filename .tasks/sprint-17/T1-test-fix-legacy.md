# Sprint 16 遺留測試修復

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

修復 Sprint 16 遺留的 15 個既存測試失敗：

| 測試檔案 | 失敗數 | 原因 |
|---------|--------|------|
| `packages/core/__tests__/ai-contracts.test.ts` | 6 | Sprint 15.1 schema 放寬後期望值過時 |
| `packages/web/__tests__/directory-card.test.tsx` | 7 | Sprint 16 AI 按鈕從卡片移除 + category accent bar 樣式調整 |
| `packages/web/__tests__/sf-detail-panel.test.tsx` | 2 | Sprint 16 detail panel 新增 AI section 後期望值過時 |

**原則**：修正測試期望值以符合當前程式碼行為，不改產品碼。

## 驗收標準

- [x] ai-contracts.test.ts 6 個 fail → pass
- [x] directory-card.test.tsx 7 個 fail → pass
- [x] sf-detail-panel.test.tsx 2 個 fail → pass
- [x] pnpm test 零新增失敗

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
