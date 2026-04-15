# SettingsPopover 拆分

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T5 |
| 預估 | 2h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

將 SettingsPopover.tsx (899 行) 拆出 2 個子元件，主檔目標 <500 行。

### 抽出子元件（2 個）

1. **`AnalysisSection`** → `components/settings/AnalysisSection.tsx` (~200 行)
   - analyzeState, activeScope, pollingRef, totalDirectories 狀態
   - startPolling, handleAnalyze callbacks
   - E2E tracing / AI overview / 分析按鈕 / 進度條 JSX

2. **`AISettingsSection`** → `components/settings/AISettingsSection.tsx` (~340 行)
   - Provider select + API key input + 連線測試 + feature toggles + hidden roles
   - recommendedProvider fetch + handleProviderChange + handleTestConnection

### Export 策略
- 內部子元件，不建 barrel export
- SettingsPopover.tsx 直接 `import { AnalysisSection } from './settings/AnalysisSection'`

## 驗收標準

- [x] SettingsPopover.tsx < 500 行
- [x] 2 個新檔案建立於 components/settings/
- [x] pnpm build 通過
- [x] 設定面板 UI 行為不變（provider 切換、連線測試、分析觸發）

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
