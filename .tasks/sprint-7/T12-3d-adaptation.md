# 3D 適配：函式節點 + 呼叫邊 + zoom into camera 飛入

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T8,T9 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |
| 開始時間 | 2026-03-31T14:35:00.000Z |
| 結束時間 | 2026-03-31T14:45:00.000Z |

---

## 任務描述

1. 3D 函式節點：更小球體、不同色系（lime/yellow，與 2D 一致）
2. 3D 呼叫邊：不同粒子顏色（區別 import 邊）、low confidence 更淡
3. 3D zoom into：camera 飛入動畫 + 透明化外部節點
4. 3D zoom out：camera 飛回 + 恢復外部節點

## 驗收標準

- [x] 3D 函式節點渲染正確
- [x] 3D 呼叫邊渲染正確
- [x] 3D zoom into camera 飛入動畫
- [x] 3D zoom out 恢復
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T14:35:00.000Z — in_progress
由 frontend-developer 開始執行

### 2026-03-31T14:45:00.000Z — done
3D function nodes (lime/yellow glow, smaller spheres), 3D call edges (lime particles, low-confidence transparency), camera flyTo on zoom-into, flyBack on zoom-out. Graph3DCanvas updated. tsc clean
