# Web 專案初始化

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 2 |
| 指派給 | devops-automator |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 完工時間 | 2026-03-30T16:30:00.000Z |
| 建立時間 | 2026-03-30T16:00:00.000Z |

---

## 任務描述

將 `packages/web` 從 Sprint 1 佔位頁改為完整的 React + TypeScript + Vite 專案，安裝 React Flow / D3 / Framer Motion 依賴。

### 具體工作

1. 更新 `packages/web/package.json`：加入 React / React DOM / React Flow / d3-force / Framer Motion / Vite 依賴
2. 建立 `packages/web/vite.config.ts`
3. 建立 `packages/web/tsconfig.json`（繼承 root tsconfig.base.json，加入 JSX 設定）
4. 更新 `packages/web/index.html`：改為 React 入口（引用 `src/main.tsx`）
5. 建立 `packages/web/src/main.tsx`：React 入口（ReactDOM.createRoot）
6. 建立 `packages/web/src/App.tsx`：佔位主元件
7. 更新 build / dev / lint / type-check scripts
8. 確認 `pnpm install` + `pnpm build` + `pnpm dev` 可正常運作

### 規範參考

- 計畫書第 2 節架構決策
- CLAUDE.md 命名規範

## 驗收標準

- [x] `pnpm install` 成功
- [x] `pnpm build` 成功（web package 產出 dist/，328 KB JS bundle）
- [x] `pnpm dev` 可啟動 Vite 開發伺服器（port 5173）
- [x] React 基本頁面可在瀏覽器顯示
- [x] TypeScript strict mode + JSX 設定正確（moduleResolution: bundler）
- [x] React Flow (@xyflow/react) / d3-force / framer-motion 已安裝

---

## 事件紀錄

### 2026-03-30T16:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T16:30:00.000Z — 狀態變更 → in_review
devops-automator 完成。React 18 + Vite + TypeScript + React Flow v12 + d3-force + Framer Motion。三 package build 全通過。

### 2026-03-30T16:31:00.000Z — 狀態變更 → done
L1 審核通過。Web 專案初始化完整，moduleResolution bundler 正確。
