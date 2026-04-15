# SF FUNCTIONS 區塊

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T5 |
| 預估 | 2h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

修改 `packages/web/src/components/SFDetailPanel.tsx`：

1. **統計區新增 FUNCTIONS 數量**：
   - 現有：FILES / LINES
   - 改為：FILES / **FUNCTIONS** / LINES
   - FUNCTIONS = 該目錄所有檔案的函式總數

2. **檔案列表每項旁顯示 `N fn`**：
   - 如 `user-service.ts  12 fn`
   - 灰色字，右對齊

3. **點擊 ▶ 展開該檔案**：
   - 展開後顯示該檔案所有函式名
   - 每個函式旁顯示 AI 摘要（灰色字，若有）
   - 每個函式旁顯示 MethodRole badge（延續 Sprint 14 LODetailPanel 的 badge 樣式）
   - 展開/收合動畫

4. 資料來源：
   - 函式列表從 GraphCanvas 傳入的 NodeMetadata 中取得
   - AI 摘要和 MethodRole 從 NodeMetadata.aiSummary / methodRole 取得

參照：計畫書 §2.4

## 驗收標準

- [x] 統計區顯示 FUNCTIONS 數量
- [x] 檔案列表顯示函式數量（N fn）
- [x] 點擊展開顯示函式列表
- [x] 函式旁有 AI 摘要和 MethodRole badge
- [x] 展開/收合動畫正確
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
