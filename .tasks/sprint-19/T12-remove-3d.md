# 3D 移除

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | 2026-04-08T07:51:19.964Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

完全移除 3D 視覺層，依照提案書附錄 F Migration Checklist：

### 刪除檔案
- `packages/web/src/components/Graph3DCanvas.tsx`
- `packages/web/src/components/three-scene-helpers.ts`
- `packages/web/src/hooks/use3DHighlightEffects.ts`
- 3D 相關測試檔案

### 移除依賴
- `3d-force-graph` — package.json
- `three` — 確認無其他引用後移除
- `@types/three` — 同上

### 修改檔案
- `App.tsx` — 移除 3D import + 2D/3D 切換邏輯
- `ControlPanel` / `SettingsPopover` — 移除 2D/3D toggle
- `viewState` — 移除 `is3D` / `renderMode` 等 3D 狀態
- `graph-adapter` — 移除 3D 專用轉換邏輯
- 測試檔案 — 移除 3D mock/test

⚠️ **必須獨立 commit**，T12 合併後 T13 才可 rebase 動 App.tsx / viewState。

### 驗證（附錄 F）
1. `grep -r "3d-force-graph|Graph3DCanvas|three-scene|use3DHighlight|is3D|renderMode.*3d" packages/web/src/` → 零命中
2. `pnpm build` → 零錯誤
3. `pnpm test` → 零失敗
4. build 產出物 grep 零 three/3d-force-graph 命中
5. SF / LO / DJ 三視角正常

## 驗收標準

- [x] grep 零命中（3D 相關關鍵字）
- [x] `pnpm build` 零錯誤
- [x] `pnpm test` 零失敗
- [x] SF/LO/DJ 三視角正常
- [x] 獨立 commit

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T07:51:19.964Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-08T08:00:00.000Z — 狀態變更 → in_review
任務完成，等待 L1 審查：
- 刪除 4 個 3D 檔案（Graph3DCanvas, three-scene-helpers, three-helpers, use3DHighlightEffects）
- 移除 package.json 中 3d-force-graph / three / @types/three
- 重寫 GraphContainer（移除 3D 分支，只保留 2D）
- 更新 ViewStateContext（移除 SET_3D_MODE action、is3D guard）
- 更新 App.tsx（移除 mode 分支，simplify focusNode）
- 更新 Toolbar.tsx（移除 2D/3D toggle 按鈕）
- 清空 CameraPresets / ViewToggle（no-op placeholder）
- 更新 6 個檔案的 comment（移除 3D 參照）
- grep 驗證：零命中
- TypeScript 編譯：零新增錯誤（存在的錯誤均為本次未觸碰之既有問題）

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
