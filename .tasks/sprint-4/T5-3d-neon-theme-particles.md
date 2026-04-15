# 3D 霓虹主題 + 粒子流動

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T3 |
| 預估 | 4h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T13:00:00.000Z |
| 完工時間 | 2026-03-30T23:03:18.108Z |

---

## 任務描述

為 3D 渲染器加入霓虹主題和粒子流動效果：

1. **自訂節點外觀**：3d-force-graph nodeThreeObject callback
   - File 節點：Cyan 球體 + emissive glow（MeshStandardMaterial, emissive: #00d4ff）
   - Directory 節點：Magenta 球體 + emissive glow（emissive: #bd00ff）
   - Sprite glow：點光源或 glow sprite overlay
2. **自訂邊線外觀**：linkColor callback，霓虹 Green（#00cc66）
3. **粒子流動**：linkDirectionalParticles API
   - 粒子顏色：#00ff88
   - 粒子速度：0.005~0.01
   - 粒子寬度：3
4. **深空背景**：backgroundColor #050510
5. **theme.ts 更新**：新增 3D 相關常數（emissive colors、3D glow intensity）

色碼嚴格引用 theme.ts / sprint2-theme-draft.ts，不硬編碼。

## 驗收標準

- [x] File 節點顯示 Cyan 發光球體
- [x] Directory 節點顯示 Magenta 發光球體
- [x] 邊線為霓虹 Green 色
- [x] 粒子沿邊線流動，方向正確（source → target）
- [x] 深空暗色背景
- [x] 色碼引用 theme.ts 常數

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T13:00:00.000Z — 狀態變更 → in_progress
與 T3 一同由 frontend-developer 執行

### 2026-03-30T22:42:08.187Z — 狀態變更 → in_review
與 T3 一同提交審查。交付物：Graph3DCanvas.tsx 內 nodeThreeObject callback（Cyan/Magenta MeshStandardMaterial + SpriteMaterial glow）、linkDirectionalParticles（4/edge, #00ff88）、backgroundColor #050510 + FogExp2、theme.ts threeD section。

### 2026-03-30T23:03:18.108Z — 狀態變更 → done
L1 審核通過（/task-approve）。全部驗收標準達成。色碼全部引用 theme.ts，無硬編碼。
