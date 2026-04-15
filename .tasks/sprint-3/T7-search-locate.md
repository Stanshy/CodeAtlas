# 搜尋定位

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T12:00:00.000Z |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

頂部搜尋框 + 即時過濾候選清單 + 選擇後聚焦節點。

### 具體工作

1. `packages/web/src/components/SearchBar.tsx`：
   - 頂部居中搜尋框，backdrop-filter blur 背景
   - 即時輸入 → 過濾 node 清單（部分匹配、大小寫不敏感）
   - 候選清單下拉（最多 10 筆）
   - 每筆顯示：檔案名稱 + 完整路徑 + node type icon
   - 選擇候選項 → 聚焦到該節點（fitView/setCenter）

2. `packages/web/src/hooks/useSearch.ts`：
   - 接收 nodes 陣列
   - `query` state + `results` computed
   - 搜尋演算法：label.toLowerCase().includes(query) || filePath.toLowerCase().includes(query)
   - `selectResult(nodeId)` — 觸發聚焦
   - `isOpen` state — 控制搜尋框顯隱

3. 聚焦邏輯：
   - 使用 `useReactFlow().setCenter(x, y, { zoom: 1.2, duration: 500 })`
   - 聚焦後高亮該節點（短暫 2s pulse 動畫）

### 視覺規範

- 搜尋框背景：`colors.bg.overlay` + backdrop-filter blur(12px)
- 搜尋框邊框：`rgba(255, 255, 255, 0.1)`
- placeholder：`colors.text.muted`
- 候選項 hover：`colors.primary.ghost`

## 驗收標準

- [x] 輸入檔名 → 即時過濾候選清單
- [x] 選擇候選 → 地圖飛到節點 + 短暫高亮
- [x] 空搜尋 → 不顯示候選
- [x] 無結果 → 顯示 "No results"
- [x] 大小寫不敏感

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T11:32:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T11:58:00.000Z — 狀態變更 → in_review
完成。SearchBar.tsx + useSearch.ts。前端記憶體過濾（label+filePath，大小寫不敏感），最多 10 筆候選，選擇後 setCenter 飛到節點。backdrop-filter blur 背景。

### 2026-03-31T12:00:00.000Z — 狀態變更 → done
L1 審核通過。過濾邏輯正確，色碼引用 theme.ts。
