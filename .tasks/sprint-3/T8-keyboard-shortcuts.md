# 搜尋鍵盤快捷鍵

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 完工時間 | 2026-03-31T12:00:00.000Z |
| 依賴 | T7 |
| 預估 | 1h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

Ctrl+K / Cmd+K 開啟搜尋，Esc 關閉，鍵盤完整操作。

### 具體工作

1. 在 `useSearch.ts` 中新增鍵盤事件監聽：
   - `Ctrl+K` / `Cmd+K` → 開啟搜尋框 + focus input
   - `Esc` → 關閉搜尋框
   - `ArrowDown` / `ArrowUp` → 在候選清單中移動
   - `Enter` → 選擇當前高亮的候選項
   - `Ctrl+K` 需 `e.preventDefault()` 避免瀏覽器預設行為

2. 搜尋框 UI 更新：
   - 顯示快捷鍵提示（搜尋框右側 "Ctrl+K" 標記）
   - 選中的候選項有視覺高亮

## 驗收標準

- [x] Ctrl+K 開啟搜尋框
- [x] Esc 關閉搜尋框
- [x] 上下鍵移動候選高亮
- [x] Enter 選擇 → 聚焦節點
- [x] 鍵盤可完成完整搜尋流程（不需滑鼠）

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T11:32:00.000Z — 狀態變更 → in_progress
與 T7 同步實作，鍵盤快捷鍵整合在 useSearch.ts 中

### 2026-03-31T11:58:00.000Z — 狀態變更 → in_review
完成。Ctrl+K/Cmd+K 開啟（preventDefault）、Esc 關閉、ArrowUp/Down 移動候選、Enter 選擇。SearchBar 顯示 ESC badge。

### 2026-03-31T12:00:00.000Z — 狀態變更 → done
L1 審核通過。鍵盤流程完整，不需滑鼠。
