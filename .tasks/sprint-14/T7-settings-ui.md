# Settings UI — AI Provider 管理

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 14 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T4,T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-04-05T10:00:00.000Z |
| 開始時間 | 2026-04-05T15:00:00.000Z |
| 完工時間 | 2026-04-05T15:30:00.000Z |

---

## 任務描述

1. SettingsPopover AI 區塊重做（計畫書 §2.6）：
   - Provider 下拉選擇（Claude Code CLI / Gemini API / Ollama / OpenAI / Anthropic / Disabled）
   - API key 輸入欄（Gemini/OpenAI/Anthropic 時顯示）
   - CLI 偵測狀態顯示（Claude Code CLI 時）
   - 測試連線按鈕 + 結果顯示
   - 隱私標示（本地/雲端）
   - 方法分析開關（啟用 AI 摘要、啟用 AI 角色分類）
   - 顯示過濾：隱藏角色勾選（utility, framework_glue, infra, validation）

2. ViewStateContext 新增 AI 設定相關 state：
   - aiProvider, aiApiKey, enableAiSummary, enableAiRoleClassification, hiddenMethodRoles

參照：計畫書 §2.6

## 驗收標準

- [x] 4+ 種 Provider 可選擇切換
- [x] 測試連線功能可用
- [x] 隱私標示正確（本地 vs 雲端）
- [x] 過濾角色可勾選/取消
- [x] ViewStateContext AI state 正確管理
- [x] TypeScript 編譯無錯誤

---

## 事件紀錄

### 2026-04-05T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-05T05:37:03.998Z — 批次補正紀錄
⚠️ 本任務執行期間未依規範呼叫 /task-start 與 /task-done，導致開始/完工時間為估計值、事件紀錄缺失。
以下為補正：
- 狀態變更 → in_progress：由 frontend-developer 執行，重做 SettingsPopover AI 區塊 + 擴展 ViewStateContext
- 狀態變更 → in_review：6 種 Provider 切換 + 測試連線 + 隱藏角色勾選完成
- 狀態變更 → done：L1 Review 通過
