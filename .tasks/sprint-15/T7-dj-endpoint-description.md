# DJ 端點中文描述

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T2 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

修改 `packages/web/src/components/DJSelectorCardNode.tsx`：

1. 端點名（如 `POST /api/v1/videos/upload`）下方新增中文描述行：
   - 灰色字，12px
   - 如「影片上傳」「用戶登入」「取得訂單列表」
   - AI 關閉時不顯示此行

2. 資料來源：
   - EndpointDescription.chineseDescription 從 AI 分析結果取得
   - 透過 endpointId 對應

3. 端點卡片 data interface 擴展：
   - `aiDescription?: string`（中文描述）
   - `aiConfidence?: number`

4. AI 關閉時：只顯示端點 method + path，不顯示中文描述
5. Loading 時：顯示 `...` placeholder

參照：計畫書 §2.5

## 驗收標準

- [x] 每個端點卡片有中文描述（AI 啟用時）
- [x] AI 關閉時不顯示中文描述
- [x] Loading 狀態正確顯示
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
