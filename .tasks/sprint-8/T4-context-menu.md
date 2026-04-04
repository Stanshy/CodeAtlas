# ContextMenu 元件：2D DOM overlay + 3D raycaster 投影 + 選單項

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 8 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 2h |
| 建立時間 | 2026-03-31T16:00:00.000Z |
| 開始時間 | 2026-03-31T16:10:00.000Z |
| 結束時間 | 2026-03-31T17:00:00.000Z |

---

## 任務描述

1. 新增 `packages/web/src/components/ContextMenu.tsx`
2. 介面設計：
   - Props: visible, x, y, nodeId, onClose, onImpactForward, onImpactReverse, onCopyPath, onOpenInPanel
   - 4 個選單項目：影響分析（下游）、依賴分析（上游）、複製路徑、在面板中開啟
3. 2D 模式觸發：
   - 在 GraphCanvas 註冊 `onNodeContextMenu` event
   - 取 `event.clientX/clientY` → dispatch `SHOW_CONTEXT_MENU`
   - `event.preventDefault()` 阻止瀏覽器原生選單
4. 3D 模式觸發：
   - raycaster 命中節點 → `THREE.Vector3.project(camera)` → 螢幕座標 → dispatch `SHOW_CONTEXT_MENU`
5. 關閉邏輯：
   - click outside → onClose
   - Escape → onClose
   - 選擇選單項後 → 執行 handler + onClose

## 驗收標準

- [x] ContextMenu 元件渲染 4 個選單項
- [x] 2D 模式右鍵節點 → 選單出現在滑鼠位置
- [x] 3D 模式 raycaster 命中 → 投影座標 → 選單出現
- [x] click outside / Escape → 選單關閉
- [x] 選擇項目 → 執行 handler + 關閉
- [x] TypeScript 編譯通過

---

## 事件紀錄

### 2026-03-31T16:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T16:10:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T16:30:00.000Z — 狀態變更 → review
ContextMenu 元件完成，tsc --noEmit 通過（零錯誤）

### 2026-03-31T17:00:00.000Z — done
L1 確認通過。4 個選單項 button + SVG icon、邊界處理、click outside + Escape 關閉、memo 包裝。tsc clean。
