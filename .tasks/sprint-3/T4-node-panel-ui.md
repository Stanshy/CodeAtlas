# 節點詳情面板 UI

| 欄位 | 值 |
|------|-----|
| ID | T4 |
| 專案 | CodeAtlas |
| Sprint | Sprint 3 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 完工時間 | 2026-03-31T11:30:00.000Z |
| 依賴 | — |
| 預估 | 3h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

建立節點詳情面板（右側滑出），顯示模組完整資訊。

### 具體工作

1. `packages/web/src/components/NodePanel.tsx`：
   - 右側滑出面板，使用 Framer Motion `AnimatePresence` + `motion.div`
   - 滑入動畫：translateX(100%) → translateX(0)，duration 300ms
   - 面板寬度：400px（桌面），100%（手機）
   - 面板背景：`colors.bg.overlay`（#1a1a2e）
   - 邊框：`rgba(255, 255, 255, 0.08)`
   - 關閉按鈕：右上角 X

2. 面板內容區塊：
   - **Header**：檔案名稱 + 完整路徑
   - **Metadata**：language、fileSize、exportCount、importCount、dependencyCount
   - **Imports**：列出此模組 import 的其他模組（可點擊跳轉）
   - **Exports**：列出 import 此模組的其他模組
   - **Source Code**：預留 slot（T5 填入）
   - **AI Summary**：預留 slot（T6 填入）

3. `packages/web/src/hooks/useNodeDetail.ts`：
   - 呼叫 `fetchNode(nodeId)` 取得節點詳情
   - 回傳 `{ detail, isLoading, error }`
   - 使用 web API 層 `packages/web/src/api/node.ts`

4. `packages/web/src/api/node.ts`：
   - `fetchNodeDetail(id)` — 呼叫 `/api/node/:id`
   - 使用既有的 `apiFetch` pattern（graph.ts 中的模式）

### 視覺規範

- 嚴格引用 theme.ts 色碼，不硬編碼
- 面板背景：`colors.bg.overlay`
- 標題色：`colors.text.primary`
- 次要文字：`colors.text.secondary`
- 互動色：`colors.primary.DEFAULT`

## 驗收標準

- [x] 點擊節點 → 面板從右側滑出
- [x] 顯示完整資訊（路徑、metadata、imports、exports）
- [x] 再點擊關閉按鈕 → 面板滑出
- [x] 點擊面板外區域 → 面板關閉
- [x] Loading 狀態有 spinner
- [x] Error 狀態有提示

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-31T11:02:00.000Z — 狀態變更 → in_progress
開始執行任務

### 2026-03-31T11:27:00.000Z — 狀態變更 → in_review
完成。NodePanel.tsx 右側滑出（Framer Motion AnimatePresence），useNodeDetail hook，api/node.ts fetch 層。Metadata + imports/exports 清單 + CodePreview/AiSummary render slots。

### 2026-03-31T11:30:00.000Z — 狀態變更 → done
L1 審核通過。色碼嚴格引用 theme.ts，面板外點擊 + Esc 關閉。
