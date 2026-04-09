# AI Contract 擴展

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | ai-engineer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

在 `packages/core/src/ai/contracts.ts` 新增 3 個 zod schema：

1. **DirectorySummarySchema**（SF 用）：
   - directoryPath: z.string()
   - role: z.string()（路由層/資料層/服務層/前端/基礎設施 等）
   - oneLineSummary: z.string().max(30)
   - keyResponsibilities: z.array(z.string()).optional()
   - confidence: z.number().min(0).max(1)

2. **EndpointDescriptionSchema**（DJ 用）：
   - endpointId: z.string()
   - method: z.string()（GET/POST/PUT/DELETE）
   - path: z.string()
   - chineseDescription: z.string().max(20)（如「影片上傳」）
   - purpose: z.string()
   - confidence: z.number().min(0).max(1)

3. **StepDetailSchema**（DJ 右面板用）：
   - stepIndex: z.number()
   - methodId: z.string()
   - description: z.string().max(30)
   - input: z.string()（輸入參數描述）
   - output: z.string()（回傳值描述）
   - transform: z.string()（資料轉換邏輯描述）

4. 為每個 schema 新增 strict validator + safe validator（延續 Sprint 14 pattern）
5. 在 `packages/core/src/ai/index.ts` export 新增的 schema 和 types

參照：計畫書 §2.1

## 驗收標準

- [x] DirectorySummarySchema 可 parse valid 輸入
- [x] EndpointDescriptionSchema 可 parse valid 輸入
- [x] StepDetailSchema 可 parse valid 輸入
- [x] malformed 輸入正確 reject（返回 ZodError）
- [x] 三個 schema 都有 strict + safe validator
- [x] index.ts 正確 export 新模組
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
