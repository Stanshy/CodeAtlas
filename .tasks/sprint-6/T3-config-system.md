# config.ts — .codeatlas.json + 環境變數 + 優先級合併

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:15:00.000Z |
| 完工時間 | 2026-03-31T10:25:00.000Z |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 新增 `packages/cli/src/config.ts`：
   - `readConfigFile(projectPath)` — 讀取 .codeatlas.json
   - `readEnvVars()` — 讀取環境變數（CODEATLAS_AI_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY）
   - `resolveConfig(cliOptions, projectPath)` — 合併 CLI + json + env
   - JSON 格式錯誤 → 友善錯誤 + 預設值
   - 無效 aiProvider → 錯誤訊息 + disabled
   - 金鑰欄位偵測 → console.warn

2. 設定優先級：
   - Provider：CLI flag > .codeatlas.json > env > disabled
   - Key：env > CLI flag
   - Port：CLI flag > .codeatlas.json > 3000
   - Ollama Model：CLI flag > .codeatlas.json > 'codellama'

## 驗收標準

- [x] readConfigFile 正確讀取 .codeatlas.json
- [x] readConfigFile 檔案不存在時回傳預設值
- [x] readConfigFile JSON 格式錯誤時友善提示
- [x] readEnvVars 讀取三個環境變數
- [x] resolveConfig 優先級正確（Provider: CLI > json > env）
- [x] resolveConfig 金鑰優先級正確（env > CLI）
- [x] 偵測到金鑰欄位 → console.warn
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:15:00.000Z — 狀態變更 → in_progress
委派 backend-architect 與 T2 並行執行

### 2026-03-31T10:25:00.000Z — 狀態變更 → done
config.ts 完成：readConfigFile + readEnvVars + resolveConfig。優先級正確，金鑰偵測警告已實作
