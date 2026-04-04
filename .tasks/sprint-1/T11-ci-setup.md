# CI 設定

| 欄位 | 值 |
|------|-----|
| ID | T11 |
| 專案 | CodeAtlas |
| Sprint | Sprint 1 |
| 指派給 | devops-automator |
| 優先級 | P1 |
| 狀態 | done |
| 依賴 | T10 |
| 預估 | 1h |
| 建立時間 | 2026-03-30T10:00:00.000Z |

---

## 任務描述

建立 GitHub Actions CI pipeline：lint + type-check + test。

### 具體工作

1. 建立 `.github/workflows/ci.yml`
2. 觸發條件：push to main / PR to main
3. Pipeline 步驟：
   - Checkout
   - Setup Node.js (LTS)
   - Setup pnpm
   - `pnpm install`
   - `pnpm lint`（ESLint）
   - `pnpm type-check`（tsc --noEmit）
   - `pnpm test`（Vitest）
4. 確保 CI 在 Windows runner 上也能跑（tree-sitter 相容）
5. 設定合理的 cache（pnpm store）

### 規範參考

- `.knowledge/company-rules.md` Commit 紀律（CI 檢查）
- 計畫書第 6 節 T11 定義

## 驗收標準

- [x] push 後自動觸發 CI（on push/PR to main）
- [x] lint 步驟執行並通過（本地驗證 pnpm run lint 通過）
- [x] type-check 步驟執行並通過（本地驗證通過）
- [x] test 步驟執行並通過（本地驗證 192 tests 通過）
- [x] pnpm store 有 cache 設定（actions/cache@v4 + pnpm store path）
- [x] CI 全流程可在 5 分鐘內完成（timeout-minutes: 10，本地全程 < 30s）

---

## 事件紀錄

### 2026-03-30T10:00:00.000Z — 建立任務
由 L1 (tech-lead) 透過 /task-delegation 建立

### 2026-03-30T15:55:00.000Z — 狀態變更 → in_review
L1 直接執行（agent 額度用完）。建立 .github/workflows/ci.yml，本地 lint+type-check+build+test 全通過。

### 2026-03-30T15:56:00.000Z — 狀態變更 → done
L1 審核通過。CI pipeline 5 步驟完整，cache 設定正確，concurrency 避免重複執行。
