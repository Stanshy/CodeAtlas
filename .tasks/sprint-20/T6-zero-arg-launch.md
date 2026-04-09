# 無子命令啟動支援（zero-arg launch）

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 20 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | assigned |
| 依賴 | T5 |
| 並行組 | — |
| 預估 | — |
| 建立時間 | 2026-04-09T03:13:03.032Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

index.ts 新增 default command：無子命令時等同 codeatlas web（無路徑）。web.ts 支援無路徑啟動→server mode='idle'。自動開瀏覽器

## 驗收標準

- [ ] codeatlas 可啟動 server + 開瀏覽器
- [ ] codeatlas web /path 向後相容
- [ ] server 初始 mode='idle'

---

## 事件紀錄

### 2026-04-09T03:13:03.032Z — 建立任務（assigned）
由 tech-lead 透過 /task-delegation 派工
