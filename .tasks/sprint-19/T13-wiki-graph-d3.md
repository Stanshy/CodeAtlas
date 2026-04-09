# 知識圖 Tab — D3 渲染

| 欄位 | 值 |
|------|-----|
| ID | T13 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | in_review |
| 依賴 | T9,T11,T12 |
| 預估 | 4h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | 2026-04-08T08:31:24.319Z |
| 完工時間 | 2026-04-08T08:41:06.515Z |

---

## 任務描述

⚠️ **G1 阻斷**：T11 圖稿通過 + T12 合併後才可開始。

新增知識圖 Tab 主元件：

- `packages/web/src/components/WikiGraph.tsx` — D3 force 2D 力導向圖
- `packages/web/src/components/WikiNodeCircle.tsx` — 節點圓點元件
- `packages/web/src/hooks/useWikiGraph.ts` — 資料 + 互動邏輯
- `packages/web/src/api/wiki.ts` — Wiki API 呼叫

功能：
- Obsidian 風格：圓點（大小 = 連結數）+ 簡單直線 + 常駐文字標籤
- Level 1/2/3 控制：L1 模組大圓 + L2 檔案中圓 + L3 方法小圓（zoom 展開）
- 拖拽 / zoom / hover highlight
- 點擊節點 → 觸發 MD 預覽面板（T14）
- 從 `/api/wiki` 取得 WikiManifest 資料
- wiki 未產生時顯示引導「請先執行 `codeatlas wiki`」

四 Tab 切換整合到 App.tsx（SF / LO / DJ / Wiki）。

## 驗收標準

- [x] D3 force 圖可渲染
- [x] 拖拽/zoom/hover 正常
- [x] Level 1/2/3 控制正確
- [x] 四 Tab 切換正常
- [x] wiki 未產生時顯示引導

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T08:31:24.319Z — 狀態變更 → in_progress
開始執行任務

### 2026-04-08T08:41:06.515Z — 狀態變更 → in_review
新增 wiki.ts（types）、api/wiki.ts、useWikiGraph.ts、WikiNodeCircle.tsx、WikiGraph.tsx；更新 App.tsx、TabBar.tsx、ViewStateContext.tsx、perspective-presets.ts。全驗收標準通過，tsc --noEmit 無新增錯誤。
