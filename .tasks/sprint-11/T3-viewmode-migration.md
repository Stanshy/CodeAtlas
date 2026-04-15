# 視圖模式遷移 + 視角切換 UI

| 欄位 | 值 |
|------|-----|
| ID | T3 |
| 專案 | CodeAtlas |
| Sprint | Sprint 11 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2 |
| 預估 | 3h |
| 建立時間 | 2026-04-01T14:00:00.000Z |

---

## 任務描述

⛔ **G1 通過後才可開始**

將 Sprint 9 的四種視圖模式完全遷移為三種故事視角：

1. **型別替換**：
   - 新增 `PerspectiveName = 'system-framework' | 'logic-operation' | 'data-journey'`
   - 新增 `PerspectivePreset` 介面（layout + colorScheme + interaction + supports3D + filter + display）
   - `ViewModeName` 標記 deprecated

2. **ViewState 遷移**：
   - `activeViewMode: ViewModeName` → `activePerspective: PerspectiveName`（預設 `'logic-operation'`）
   - `SET_VIEW_MODE` → `SET_PERSPECTIVE`，同清除邏輯（impact/searchFocus/e2eTracing/filter）

3. **UI 遷移**：
   - ControlPanel：四選一 radio → 三選一 Perspective UI（含色標 Cyan/Magenta/Green）
   - Toolbar：viewModeLabel → perspectiveLabel + 色標 pill

4. **新增檔案**：
   - `packages/web/src/adapters/perspective-presets.ts` — 三種預設定義

5. **Deprecated 處理**：
   - `view-modes.ts` 保留但標記 deprecated

### 遷移對照（§2.2）
- panorama → logic-operation
- dependency → system-framework
- dataflow → data-journey
- callchain → logic-operation

## 驗收標準

- [ ] PerspectiveName 型別定義正確
- [ ] ViewState.activePerspective 替代 activeViewMode
- [ ] SET_PERSPECTIVE action 清除衝突狀態
- [ ] ControlPanel 三選一 UI 渲染正確，含色標
- [ ] Toolbar 顯示 Perspective label + 色標
- [ ] ViewModeName 標記 deprecated
- [ ] 切換動畫平滑（Framer Motion）

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
