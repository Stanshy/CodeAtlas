# DJ 步驟描述 + INPUT/OUTPUT

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T2,T7 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

### DJStepNode 改動（`packages/web/src/components/DJStepNode.tsx`）：

1. 步驟名稱下方顯示 AI 描述（取代方法名重複）：
   - 灰色字 12px
   - 如「驗證檔案格式並產生上傳 URL」
   - AI 關閉時只顯示方法名

2. 步驟 data interface 擴展：
   - `aiDescription?: string`
   - `stepInput?: string`
   - `stepOutput?: string`
   - `stepTransform?: string`

### DJPanel 改動（`packages/web/src/components/DJPanel.tsx`）：

3. 點擊步驟 → 右面板新增四個區塊：
   ```
   ┌─ INPUT ──────────────────────┐
   │ req.body: { file, title }    │
   ├─ OUTPUT ─────────────────────┤
   │ { videoId, status, url }     │
   ├─ TRANSFORM ──────────────────┤
   │ 驗證檔案格式 → 產生 UUID →  │
   │ 寫入 S3 → 建立 DB 記錄      │
   ├─ METHOD ─────────────────────┤
   │ uploadVideo() @ video-api.ts │
   └──────────────────────────────┘
   ```

4. 每個區塊有標題列（深色背景）+ 內容（淺色背景）
5. AI 關閉時：INPUT/OUTPUT/TRANSFORM 不顯示，只顯示 METHOD 區塊
6. Loading 時：區塊顯示 skeleton placeholder

參照：計畫書 §2.5

## 驗收標準

- [x] DJStepNode 步驟有 AI 描述
- [x] DJPanel 有 INPUT/OUTPUT/TRANSFORM/METHOD 四區塊
- [x] AI 關閉時只顯示 METHOD 區塊
- [x] Loading 狀態正確顯示
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
