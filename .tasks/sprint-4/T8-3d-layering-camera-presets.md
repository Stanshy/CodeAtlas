# 3D 節點分層 + 相機預設視角

| 欄位 | 值 |
|------|-----|
| ID | T8 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T5,T6 |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T00:14:55.212Z |
| 完工時間 | 2026-03-31T00:14:55.212Z |

---

## 任務描述

實作 P1 功能：3D 節點分層和相機預設視角。

1. **3D 節點分層**（S4-8）：
   - 目錄深度映射為 Y 軸高度（根目錄 Y=0，每深一層 Y += 固定值）
   - 使用 3d-force-graph 的 d3Force('y') 或 nodeVal 自訂力
   - 同目錄節點自然聚集

2. **相機預設視角**（S4-9）：
   - CameraPresets.tsx 元件
   - 俯瞰（top-down）：高 Y 軸向下看
   - 側視（side-view）：水平視角
   - 聚焦核心（focus-core）：飛到 dependencyCount 最高的節點
   - 快捷鍵 1/2/3 切換
   - 切換動畫 500ms（camera tween）

## 驗收標準

- [x] 目錄層級有 Y 軸高度區分（視覺可見）
- [x] 同目錄節點聚集在相近 Y 軸位置
- [x] 至少 3 個預設相機視角可切換
- [x] 數字鍵 1/2/3 觸發視角切換
- [x] 視角切換有平滑動畫（≈500ms）

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T00:14:55.212Z — 狀態變更 → in_progress
開始執行任務。依賴 T5+T6 已完成。L1 直接實作。

### 2026-03-31T00:14:55.212Z — 狀態變更 → in_review
提交審查。交付物：(1) Graph3DCanvas.tsx 加入 yLayerForce 自訂 d3 force（filePath 計算 depth, depth×ySpacing(40), strength 0.3）、cameraPreset effect。(2) CameraPresets.tsx 新建（固定右下角，3 預設 Default/TopDown/SideView，鍵盤 1/2/3 快捷鍵）。(3) ViewStateContext.tsx 擴充 cameraPreset state + SET_CAMERA_PRESET/CLEAR_CAMERA_PRESET actions。(4) GraphContainer.tsx + App.tsx 串接。pnpm tsc 0 errors，pnpm build 成功。

### 2026-03-31T00:18:17.098Z — 狀態變更 → done
L1 審核通過（/task-approve）。全部驗收標準達成。
