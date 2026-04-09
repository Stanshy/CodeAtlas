# 新增 recent-projects 最近專案管理

| 欄位 | 值 |
|------|-----|
| ID | T4 |
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

新增 packages/cli/src/recent-projects.ts：讀寫 ~/.codeatlas/recent.json，最多 10 筆，CRUD 操作，try-catch 靜默失敗

## 驗收標準

- [ ] 讀寫正確
- [ ] 超過 10 筆自動移除最舊
- [ ] 檔案不存在回空陣列
- [ ] 寫入失敗靜默不 crash

---

## 事件紀錄

### 2026-04-09T03:13:03.032Z — 建立任務（assigned）
由 tech-lead 透過 /task-delegation 派工
