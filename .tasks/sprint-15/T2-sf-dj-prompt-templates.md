# SF/DJ Prompt 模板

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | ai-engineer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

在 `packages/core/src/ai/prompt-templates.ts` 新增 3 個 prompt 模板：

1. **buildDirectorySummaryPrompt(directoryContext: string)**：
   - 輸入：目錄結構 + 關鍵檔案列表（Large budget 建構的 context）
   - 要求 AI 輸出 DirectorySummarySchema JSON
   - 要求 role 為「路由層/資料層/服務層/前端/基礎設施」等中文分類
   - 要求 oneLineSummary ≤30 字

2. **buildEndpointDescriptionPrompt(endpointContext: string)**：
   - 輸入：端點 method + path + handler 方法 signature（Small budget）
   - 要求 AI 輸出 EndpointDescriptionSchema JSON
   - 要求 chineseDescription ≤20 字中文描述（如「影片上傳」「用戶登入」）

3. **buildStepDetailPrompt(chainContext: string)**：
   - 輸入：一條 chain 所有步驟（Medium budget）
   - 要求 AI 輸出 StepDetailSchema[] JSON array
   - 要求每步有 description + input + output + transform

參照：計畫書 §2.2

## 驗收標準

- [x] 三個 prompt 模板函式已建立
- [x] 每個 prompt 輸出格式要求符合對應 schema
- [x] prompt 模板包含 JSON 範例引導 AI
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
