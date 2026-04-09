# 新增 analysis-runner 分析管線封裝

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 20 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | assigned |
| 依賴 | T2 |
| 並行組 | — |
| 預估 | — |
| 建立時間 | 2026-04-09T03:13:03.032Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

新增 packages/cli/src/analysis-runner.ts：封裝 scan→parse→build 管線，接受 onProgress 回調，每步回報階段+百分比+當前檔案

## 驗收標準

- [ ] 獨立呼叫可完成分析
- [ ] 進度回調正確觸發
- [ ] 錯誤時回報失敗狀態

---

## 事件紀錄

### 2026-04-09T03:13:03.032Z — 建立任務（assigned）
由 tech-lead 透過 /task-delegation 派工
