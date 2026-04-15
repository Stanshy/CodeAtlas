# Monorepo 骨架建立

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | devops-automator |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

建立 CodeAtlas Monorepo 骨架，使用 pnpm workspace 管理三個 package：`core`、`cli`、`web`。

### 具體工作

1. 建立 root `package.json`（private: true, workspaces 設定）
2. 建立 `pnpm-workspace.yaml`，定義 `packages/*`
3. 建立 `tsconfig.base.json`（共用 TypeScript 設定，strict mode）
4. 建立 `.eslintrc.js` + `.prettierrc`（程式碼品質工具）
5. 建立 `.gitignore`（node_modules, dist, .codeatlas 等）
6. 建立三個 package 的基本結構：
   - `packages/core/package.json` + `tsconfig.json` + `src/index.ts`
   - `packages/cli/package.json` + `tsconfig.json` + `src/index.ts`（含 bin 設定）
   - `packages/web/package.json` + `index.html`（佔位頁）
7. 安裝共用依賴：typescript, tsup, vitest, eslint, prettier
8. 確認 `pnpm install` 成功、三個 package 可獨立 build

### 規範參考

- 計畫書第 2 節技術方案
- `.knowledge/company-rules.md` 命名規範

## 驗收標準

- [x] `pnpm install` 成功，無錯誤
- [x] 三個 package 可獨立 `pnpm build`
- [x] `packages/cli` 有正確的 bin 設定
- [x] TypeScript strict mode 啟用
- [x] ESLint + Prettier 設定完成可執行
- [x] `.gitignore` 覆蓋 node_modules / dist / .codeatlas

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T10:30:00.000Z — 狀態變更 → in_review
devops-automator 完成。pnpm install 成功（206 packages），三個 package build + type-check 全通過。

### 2026-03-30T10:31:00.000Z — 狀態變更 → done
L1 審核通過。驗收標準全部達成，骨架結構正確。
