# CLI `analyze` 指令

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T6 |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

實作 `codeatlas analyze [path]` CLI 指令，串接 Scanner → Parser → Analyzer → 輸出 JSON。

### 具體工作

1. 讀取 `.knowledge/specs/api-design.md` CLI 指令區段
2. 實作 `packages/cli/src/commands/analyze.ts`：
   - 接收 `[path]` 參數（預設當前目錄）
   - 呼叫 core 的 `analyze()` 函數
   - 輸出結果到 `.codeatlas/analysis.json`
   - 終端機顯示統計摘要（files, edges, external deps）
3. 實作 `packages/cli/src/index.ts`：
   - 使用 commander 或 yargs 建立 CLI 入口
   - 註冊 `analyze` 子指令
4. 確保 `codeatlas analyze` 可透過 `npx` 或 bin link 執行

### 規範參考

- `.knowledge/specs/api-design.md` CLI 區段
- `.knowledge/specs/feature-spec.md` CLI 區段
- T6 Analyzer 的 `analyze()` API

## 驗收標準

- [x] `codeatlas analyze [path]` 可執行
- [x] 預設分析當前目錄（fallback process.cwd()）
- [x] 輸出 `.codeatlas/analysis.json`（pretty print 2 spaces）
- [x] 終端機顯示統計摘要（files, edges, errors 數量）
- [x] JSON 輸出符合 data-model.md schema
- [x] 錯誤處理：目標路徑不存在時顯示友善錯誤 + exit code 1

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T12:40:00.000Z — 狀態變更 → in_review
backend-architect 完成。analyzeCommand 實作完整，--verbose/--ignore flags，友善錯誤處理，type-check 通過。

### 2026-03-30T12:41:00.000Z — 狀態變更 → done
L1 審核通過。CLI 行為符合 feature-spec，輸出格式正確。
