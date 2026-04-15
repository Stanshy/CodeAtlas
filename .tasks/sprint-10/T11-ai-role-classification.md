# T11 AI 輔助角色分類（P1，復用 AI Provider）

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | backend-architect |
| 優先級 | P1 |
| 狀態 | created |
| 依賴 | T3 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

對 heuristic 無法判斷的節點（Step 5 fallback），用 AI 分析檔案名稱 + 路徑 + import 模式，輔助分類角色。復用現有 AI Provider 架構。

## 驗收標準

- [ ] AI 輔助分類功能可用
- [ ] 復用現有 AI Provider
- [ ] 只在 heuristic 無法判斷時啟用
- [ ] AI 不可用時 graceful fallback

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
