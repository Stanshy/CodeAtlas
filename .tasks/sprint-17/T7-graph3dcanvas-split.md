# Graph3DCanvas 拆分

| 欄位 | 值 |
|------|-----|
| ID | T7 |
| 專案 | CodeAtlas |
| Sprint | Sprint 17 |
| 指派給 | frontend-developer |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T1,T5 |
| 預估 | 3h |
| 建立時間 | 2026-04-07T15:42:57.386Z |

---

## 任務描述

將 Graph3DCanvas.tsx (1,627 行) 拆為主檔 + 工具模組/hooks，主檔目標 <800 行。

### 抽出模組（2 個）

1. **`three-scene-helpers.ts`** → `utils/three-scene-helpers.ts` (~420 行)
   - 純函式：createGlowTexture, createTextSprite, createAxisLabelSprite, addSpatialReference, inferSymbolType, buildNodeObject, buildHighlightedNodeObject
   - 常數：FUNC_EMISSIVE, CLASS_EMISSIVE 等
   - 零狀態依賴

2. **`use3DHighlightEffects`** → `hooks/use3DHighlightEffects.ts` (~650 行)
   - 8 種 highlight effect 的 useEffect 集合
   - Hover / selected / path tracing / heatmap / impact / search focus / E2E tracing / display prefs

### 拆分原則
- 主檔保留：types/props + graph init useEffect + data conversion memos + camera effects + JSX
- Graph3DCanvas export 路徑不變
- FG3DNode/FG3DLink 型別考慮搬到 types/graph-3d.ts

## 驗收標準

- [x] Graph3DCanvas.tsx < 800 行
- [x] 2 個新檔案建立
- [x] pnpm build 通過
- [x] 3D 渲染行為不變（旋轉、hover、highlight、heatmap）
- [x] 無 circular dependency

---

## 事件紀錄

### 2026-04-07T15:42:57.386Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
