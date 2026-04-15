# buildLargeContext 實作

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 15 |
| 指派給 | ai-engineer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 1.5h |
| 建立時間 | 2026-04-05T05:49:01.061Z |
| 開始時間 | 2026-04-05T06:21:15.558Z |
| 完工時間 | 2026-04-05T06:21:15.558Z |

---

## 任務描述

在 `packages/core/src/ai/prompt-budget.ts` 實作 `buildLargeContext()`：

```typescript
interface DirectoryInfo {
  path: string;
  files: Array<{
    name: string;
    exports: string[];
    lineCount: number;
    functions?: Array<{ name: string; signature: string }>;
  }>;
  subdirectories?: string[];
}

function buildLargeContext(directory: DirectoryInfo, budget?: PromptBudget): string
```

建構 ~20K token context：
1. 目錄樹結構（深度 3 層）
2. 每個檔案的 exports 列表
3. 前 5 個最大/最重要檔案的 function signatures
4. 截斷至 20K token（使用現有 `estimateTokens` + `truncateToTokens`）

建構策略（類似 buildMethodBatchContext 的 2-phase）：
- Phase 1：目錄結構 + 檔案列表（必定包含）
- Phase 2：在剩餘 budget 內加入 function signatures（依檔案 lineCount 降序）

參照：計畫書 §2.3

## 驗收標準

- [x] buildLargeContext 函式已實作
- [x] DirectoryInfo interface 已定義
- [x] Large context 截斷至 ≤20K token
- [x] 目錄結構 + exports 列表正確建構
- [x] Phase 2 依檔案重要度排序
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T05:49:01.061Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T06:09:41.161Z — 狀態變更 → done
L1 Review 通過，所有驗收標準確認
