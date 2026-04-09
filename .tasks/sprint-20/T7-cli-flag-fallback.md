# Web 端 AI 設定覆蓋與優先級鏈

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 20 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | assigned |
| 依賴 | T6 |
| 並行組 | — |
| 預估 | — |
| 建立時間 | 2026-04-09T03:13:03.032Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

Web 端 POST /api/ai/configure 可覆蓋 CLI 初始值。優先級鏈：Web 設定 > CLI flag > .codeatlas.json > env > default

## 驗收標準

- [ ] Web 端切換 AI Provider 後後續請求使用新設定
- [ ] 優先級鏈正確

---

## 事件紀錄

### 2026-04-09T03:13:03.032Z — 建立任務（assigned）
由 tech-lead 透過 /task-delegation 派工
