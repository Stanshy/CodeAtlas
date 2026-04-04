# 系統框架 = 目錄鳥瞰

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 12 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 4h |
| 建立時間 | 2026-04-01T19:10:00.000Z |
| 開始時間 | 2026-04-01T20:10:00.000Z |
| 完工時間 | 2026-04-01T20:50:00.000Z |

---

## 任務描述

系統框架視角的核心重做：從「檔案節點」變為「目錄卡片」。嚴格對照圖稿 Tab 1。

### DirectoryCard.tsx 新增（見計畫書 §2.3）
卡片結構：陰影底 + 白色填充 + 頂部色帶 + 圓點 + 目錄名 + badge。

### dagre 佈局（見計畫書 §2.3）
rankdir: TB, nodesep: 60, ranksep: 100。目錄只有 5~15 個，dagre 正常分層。

### 邊的樣式：elbowPath
```typescript
function elbowPath(x1, y1, x2, y2) {
  const my = y1 + (y2 - y1) * 0.5;
  return `M ${x1} ${y1} L ${x1} ${my} L ${x2} ${my} L ${x2} ${y2}`;
}
```

### hover 互動
1. hover 卡片 → 高亮（fill: sfBg, stroke-width: 2.5, shadow 增強）
2. 連接的邊 → stroke: #1e88e5, stroke-width: 2.5
3. 非連接 → dimmed（卡片 opacity: 0.25, 邊 opacity: 0.12）
4. mouseleave → 重置

### 底部 Legend Bar
`[ ● 模組目錄 ] [ ─── 依賴箭頭 ] [ ─── Hover 高亮路徑 ]    Hover 目錄卡片查看連線`

## 驗收標準

- [x] DirectoryCard 正確渲染（結構與圖稿一致）
- [x] dagre 分層不再是一條線（目錄少，正常分層）
- [x] hover 高亮 + dimmed 效果正確
- [x] badge 顯示檔案數
- [x] elbowPath 邊正確繪製
- [x] legend bar 可見
- [x] 與圖稿 Tab 1 一致

---

## 事件紀錄

### 2026-04-01T19:10:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
