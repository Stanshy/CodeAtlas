# T9 3D 佈局改善（力導向參數調整 + 碰撞力）

| 欄位 | 值 |
|------|-----|
| ID | T9 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T8 |
| 預估 | 1.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

調整 `Graph3DCanvas.tsx` 中 3d-force-graph 力導向參數：

```typescript
graph.d3Force('charge')?.strength(-300);     // 增加斥力
graph.d3Force('link')?.distance(120);        // 增加連結距離
graph.d3Force('collision')?.radius(30);       // 添加碰撞力
```

節點減少後空間自然改善，但仍需調參確保不擠成一團。

## 驗收標準

- [x] 節點分佈有空間感，不擠成一團
- [x] 力導向參數調整後穩定收斂
- [x] 不影響 2D 模式

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
