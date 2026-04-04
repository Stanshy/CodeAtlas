# web 型別擴充 + PrivacyBadge.tsx + AiSummary 整合

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:30:00.000Z |
| 完工時間 | 2026-03-31T10:40:00.000Z |
| 依賴 | T5 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 修改 `packages/web/src/types/graph.ts`：
   - AiStatusResponse 新增 mode, privacyLevel, model 欄位

2. 新增 `packages/web/src/components/PrivacyBadge.tsx`：
   - 三模式顯示：
     - disabled：「AI 已關閉」，灰色
     - local：「✅ 本地模式 — 程式碼不出站」，綠色
     - cloud：「⚠️ 雲端模式 — 原始碼片段將傳送至 {provider}」，琥珀色
   - 所有色彩引用 theme.ts
   - 顯示模型名稱（local 模式時）

3. 修改 `packages/web/src/components/AiSummary.tsx`：
   - 在摘要區塊上方渲染 PrivacyBadge
   - 傳遞 AI 狀態（mode, privacyLevel, provider, model）

## 驗收標準

- [x] AiStatusResponse 型別含 mode + privacyLevel + model
- [x] PrivacyBadge 三模式正確渲染
- [x] 色彩引用 theme.ts，不硬編碼
- [x] AiSummary 整合 PrivacyBadge
- [x] model 名稱正確顯示

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:30:00.000Z — 狀態變更 → in_progress
委派 frontend-developer 執行（與 T4、T5 並行）

### 2026-03-31T10:40:00.000Z — 狀態變更 → done
PrivacyBadge.tsx 完成：三模式（disabled 灰/local 綠/cloud 琥珀），role="status" + aria-label，model 名稱顯示。AiSummary 整合完成。218 web tests 零回歸
