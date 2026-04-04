# T8 3D 空間參考系（GridHelper + AxesHelper + 軸標示文字）

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1 |
| 預估 | 2.5h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

在 `packages/web/src/components/Graph3DCanvas.tsx` 新增 Three.js 空間參考元件：

### GridHelper（地板網格）
- size=1000, divisions=50
- 材質 color: rgba(0, 212, 255, 0.06)（淡 cyan）
- 位置 y=-200（節點下方）

### AxesHelper（XYZ 軸線）
- 長度 500
- X = red (rgba(255,80,80,0.4))
- Y = green (rgba(80,255,80,0.4))
- Z = blue (rgba(80,80,255,0.4))
- 淡色半透明不搶視覺

### 軸標示文字
- Canvas texture sprite 或 CSS2DRenderer
- X, Y, Z 文字在軸末端
- 白色半透明，fontSize 小
- billboard 朝向相機（旋轉時始終可見）

**只限 3D 模式**，2D 不受影響。

## 驗收標準

- [x] 3D 模式顯示 XYZ 軸線 + 背景網格
- [x] 軸線有 X/Y/Z 標示文字
- [x] 深色主題下網格淡色半透明
- [x] 旋轉時軸線和網格始終可見
- [x] 2D 模式不受影響

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
