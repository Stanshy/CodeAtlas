# Claude CLI 穩定化

| 欄位 | 值 |
|------|-----|
| ID | T5 |
| 專案 | CodeAtlas |
| Sprint | Sprint 16 |
| 指派給 | ai-engineer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-04-07T18:00:00.000Z |
| 開始時間 | 2026-04-07T18:30:00.000Z |
| 完工時間 | 2026-04-07T19:00:00.000Z |

---

## 任務描述

修改 `packages/core/src/ai/claude-code.ts` 補完邊界情況：
1. execClaude() 空輸出 → return '{}' + console.warn
2. stderr 過濾：分離 stdout/stderr，只 parse stdout，warning 只 log
3. parseJsonFromResponse() 增加 markdown fence 移除 + JSON array [...] 提取
4. findBinary() Windows 路徑增加 %APPDATA%\npm\claude.cmd fallback + fs.access 驗證

## 驗收標準

- [x] Windows 環境 Claude CLI spawn 穩定
- [x] 空輸出不 crash，回傳 '{}'
- [x] stderr warning 不影響 JSON 解析
- [x] markdown 包裹的 JSON 可正確提取
- [x] 非 JSON 回應有 fallback + 有意義的 error message
- [x] pnpm build 通過

---

## 事件紀錄

### 2026-04-07T18:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-07T18:30:00.000Z — 開始執行
ai-engineer 開始執行

### 2026-04-07T19:00:00.000Z — 完成交付
空輸出 return {} + stderr 隔離 + stripMarkdownFences + 5 步 parseJson + Windows APPDATA fallback

### 2026-04-07T19:05:00.000Z — L1 Review 通過
0 Blocker / 0 Major / 0 Minor
