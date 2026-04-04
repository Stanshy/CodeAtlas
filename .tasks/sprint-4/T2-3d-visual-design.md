# 3D 視覺設計規範

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 4 |
| 指派給 | design-director |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |
| 開始時間 | 2026-03-31T10:30:00.000Z |
| 完工時間 | 2026-03-31T13:30:00.000Z |

---

## 任務描述

產出 3D 視覺設計規範 `design/sprint4-3d-visual.md`，延續 Sprint 2 霓虹主題（`design/sprint2-visual-style.md`），適配 3D 空間。

設計交付物：
1. **3D 節點外觀**：球體 + glow 材質（emissive），file=Cyan、directory=Magenta
2. **3D 邊線外觀**：Three.js Line material，霓虹光跡 + 粒子方向
3. **3D 背景**：深空暗色（#050510 或延續 bg-base）
4. **3D Hover 效果**：高亮路徑 + 暗淡無關節點（3D 版）
5. **2D/3D 切換按鈕**：Toolbar 中位置與圖示
6. **相機預設視角**：俯瞰/側視/聚焦核心示意
7. **Three.js material 參數**：emissive color、emissive intensity、glow sprite 規格

色彩必須引用 `design/sprint2-theme-draft.ts` 中的色碼常數。

## 驗收標準

- [x] 設計稿含所有 3D 視覺元素規格
- [x] 色彩引用 Sprint 2 theme.ts 色系（Cyan/Magenta/Green/Amber）
- [x] 含 Three.js material 參數（emissive color、intensity）
- [x] 含 3D hover/active 狀態規格
- [x] 含 2D/3D 切換按鈕設計
- [x] 含相機預設視角規格

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:30:00.000Z — 狀態變更 → in_progress
design-director 開始執行，委派 brand-guardian 協作

### 2026-03-31T12:00:00.000Z — 狀態變更 → in_review
brand-guardian 完成 `design/sprint4-3d-visual.md`（8 章節）：
- 第 1 章：3D 節點外觀（球體幾何、MeshStandardMaterial、SpriteMaterial glow、CSS2DRenderer 標籤、四態規格）
- 第 2 章：3D 邊線外觀（LineBasicMaterial 四態、WebGL linewidth 限制說明、MeshLine 替代方案、箭頭 API）
- 第 3 章：3D 背景（#050510 深空色、FogExp2、AmbientLight + 雙 PointLight）
- 第 4 章：3D Hover 效果（scale/emissive/opacity 四層規格、TWEEN 過渡、onNodeHover raycaster）
- 第 5 章：2D/3D 切換按鈕（Toolbar 位置、四態顏色、fade 過渡、tooltip）
- 第 6 章：3D 粒子流動（linkDirectionalParticles API、Hover 加速 1.5x、200 節點效能降級、prefers-reduced-motion）
- 第 7 章：相機預設視角（4 個預設 + 快捷鍵 0-3、動態 Focus-core 計算、500ms easeInOut）
- 第 8 章：3D 節點分層（Y=depth×40、forceY strength=0.3）
所有色碼已核對引用自 sprint2-theme-draft.ts，唯一新增色碼 #050510 已標明。

### 2026-03-31T12:30:00.000Z — 狀態變更 → done
design-director L1 Review 通過。Blocker:0 Major:0 Minor:0。
- 8 章節完整覆蓋所有設計交付物
- 所有色碼引用 sprint2-theme-draft.ts，唯一新增 #050510 已標明
- Three.js material 參數精確可直接抄寫
- 四態規格完整（Normal/Hover/Active/Faded）
- 與 feature-spec F23~F32 對齊
- 效能降級 + prefers-reduced-motion 無障礙方案齊全

### 2026-03-31T13:00:00.000Z — 狀態變更 → in_progress（追加交付物）
老闆要求追加交付物 2：`design/sprint4-3d-mockup.html`（Three.js 互動圖稿）。
重開任務，委派 ui-designer 製作。

### 2026-03-31T13:30:00.000Z — 狀態變更 → done
ui-designer 完成 `design/sprint4-3d-mockup.html`（639 行，獨立 HTML）：
- Three.js 0.170.0 CDN + OrbitControls
- 10 個節點（4 dir Magenta + 6 file Cyan），Y 軸 depth 分層
- 雙層發光：MeshStandardMaterial emissive + SpriteMaterial AdditiveBlending glow
- 6 條邊線 + 每邊 4 顆粒子流動
- Raycaster Hover 系統（高亮/淡化/Tooltip）
- 背景 #050510 + FogExp2 + Cyan/Magenta 雙光源旋轉
- 所有色碼嚴格引用 Sprint 2 theme.ts
design-director 審核通過。
