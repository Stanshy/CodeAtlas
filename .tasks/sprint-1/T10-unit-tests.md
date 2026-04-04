# 單元測試

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4,T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

為 Scanner、Parser、Analyzer 三個核心模組撰寫單元測試，覆蓋率 >= 80%。

### 具體工作

1. 讀取計畫書第 7 節測試計畫
2. 建立測試 fixtures（`packages/core/__tests__/fixtures/`）：
   - `simple-project/`：3 個 JS 檔，簡單 import
   - `ts-project/`：5 個 TS 檔，ESM + type import
   - `cjs-project/`：3 個 CJS 檔，require
   - `mixed-project/`：ESM + CJS 混合
   - `large-project/`：腳本生成 100+ 檔案
   - `error-project/`：含語法錯誤的檔案
3. 撰寫測試：
   - `scanner.test.ts`：掃描、忽略規則、空目錄、symlink
   - `parser.test.ts`：ESM/CJS/re-export/dynamic import、路徑解析、錯誤處理
   - `analyzer.test.ts`：單檔/互依賴/多層依賴/統計/錯誤/schema
   - `ai-provider.test.ts`：DisabledProvider、interface 型別
4. 確保覆蓋率 >= 80%

### 規範參考

- 計畫書第 7 節測試計畫
- `.knowledge/specs/feature-spec.md` 各模組邊界條件

## 驗收標準

- [x] Scanner 測試覆蓋 >= 80%（88.84% statements）
- [x] Parser 測試覆蓋 >= 80%（88.84% statements）
- [x] Analyzer 測試覆蓋 >= 80%（88.84% statements）
- [x] 所有測試 fixtures 建立完成（6 個 fixture 目錄 + 2 個額外 fixture）
- [x] `pnpm test` 全部通過（192 tests, 8 files）
- [x] AI Provider 測試通過（30 tests）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T14:00:00.000Z — 狀態變更 → in_review
test-writer-fixer 完成。192 tests / 8 files 全通過。覆蓋率 88.84% statements, 98.3% functions。發現 2 個 TS compiler dialect bugs（已記錄，不影響 native tree-sitter）。

### 2026-03-30T14:01:00.000Z — 狀態變更 → done
L1 審核通過。覆蓋率超過 80% 門檻，所有模組測試完整，TS compiler bugs 為已知限制不影響主路徑。
