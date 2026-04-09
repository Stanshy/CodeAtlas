# T4 系統框架改造

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T2,T3 |
| 預估 | 4h |
| 建立時間 | 2026-04-02T10:00:00.000Z |
| 開始時間 | 2026-04-02T06:26:34.497Z |
| 完工時間 | 2026-04-02T23:59:00.000Z |

---

## 任務描述

系統框架視角從固定聚合 + hover 改為智慧聚合 + click 選取 + BFS 高亮 + 右側目錄詳情面板。

**嚴格對照圖稿 Tab 1 + 規格書 §4**

### 改造項目

1. **DirectoryCard 適配**：
   - 新增 sublabel 顯示完整路徑
   - 新增 category 色條（frontend 紫 #7b1fa2、backend 藍 #1565c0、infra 灰 #546e7a）
   - 卡片結構：`.sf-card-accent` 色條 + `.sf-card-body` + `.sf-card-name` + `.sf-card-badge` + `.sf-card-icon`

2. **Click 選取 + BFS 高亮**（取代 hover）：
   - 被選卡片：藍色光圈（border: 2.5px solid #1565c0）
   - BFS 找出所有相連節點
   - 相連邊：加粗 stroke-width:2.5，全不透明
   - 不相連邊：opacity 0.1
   - 不相連卡片：opacity 0.3
   - 修改 `useBfsClickFocus.ts` 適配

3. **新增 `SFDetailPanel.tsx`**（300px 右側面板）：
   - 📊 Statistics: files / functions / lines
   - 📄 Files: 可展開列表，點擊 ▶ 展開函式清單
   - ⬆ Upstream: 被誰 import
   - ⬇ Downstream: import 了誰

4. **graph-adapter + perspective-presets 更新**：
   - interaction: `'sf-click-select'`
   - dataSource: `'directory'`

5. **邊路徑 calcEdgePath()**：垂直 Bezier / 水平 Bezier 根據方向判斷

## 驗收標準

- [x] 17 張卡片正確渲染（含智慧展開）
- [x] 色條正確按 category 著色
- [x] click 選取 + BFS 高亮運作
- [x] 右側面板顯示目錄詳情
- [x] Files 可展開函式列表
- [x] 與圖稿 Tab 1 一致

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-02T06:26:34.497Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-02T23:59:00.000Z — 狀態變更 → done
任務完成，所有驗收標準通過
