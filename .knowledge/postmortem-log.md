# CodeAtlas 踩坑紀錄

> **版本**: v1.0
> **最後更新**: 2026-03-30

---

## 踩坑紀錄

| 日期 | Sprint | 分類 | 問題摘要 | 根因 | 解法 | 狀態 |
|------|--------|------|---------|------|------|------|
| 2026-03-30 | 1 | process | API 端點遺漏（ai/summary） | 實作時未逐一對照 api-design.md | G2 Review 發現並補齊 | resolved |
| 2026-03-30 | 1 | runtime | JSON.parse 無 try-catch | readAnalysis 只包了 readFile 未包 parse | 加 try-catch + EPARSE 錯誤碼 | resolved |
| 2026-03-30 | 1 | process | 版本號不一致（1.0.0 vs 0.1.0） | analyzer 和 server 各自硬編碼版本 | 統一為 0.1.0（未來應抽常數） | resolved |
| 2026-03-30 | 1 | runtime | Fastify 無安全限制 | 預設無 bodyLimit/timeout | 加入 bodyLimit 1MB + requestTimeout 30s | resolved |
| 2026-03-30 | 1 | build | tsup DTS + composite:true 衝突 | tsup worker 不認 composite 專案引用 | tsup dts.compilerOptions 覆寫 composite:false | resolved |
| 2026-03-30 | 2 | runtime | resolveWebDir 路徑錯誤 | tsup 打平後 __dirname 是 cli/dist/ 而非 cli/dist/commands/，往上 4 層多跳一層 | 改為 3 層：path.resolve(__dirname, '..', '..', '..') | resolved |
| 2026-04-09 | 20 | process | harness runtime 檔案被 git 追蹤 | .claude/hook-execution.jsonl 未加入 .gitignore | 加入 .gitignore + git rm --cached | resolved |

> 使用 `/pitfall-record` 新增紀錄，`/pitfall-resolve` 標記已解決。

---

### 2026-03-30 — G2 Review 發現多項 Blocker

| 項目 | 內容 |
|------|------|
| 分類 | process |
| 問題 | G2 Code Review 發現 3 Blocker + 1 Major：(1) POST /api/ai/summary 端點缺失 (2) JSON.parse 無 try-catch (3) 版本號不一致 (4) Fastify 無安全限制 |
| 原因 | 各 Agent 獨立實作時未交叉對照規範文件（api-design.md），L1 未在分派時強調必須逐端點核對 |
| 解法 | G2 Review 時一次性修復所有問題，加入 handleAnalysisError 共用 helper |
| 預防 | (1) 分派任務時附上規範 checklist，要求 Agent 逐項確認 (2) 版本號抽為共用常數 (3) server 端點必須與 api-design.md 1:1 對照 |
| 狀態 | resolved |
| 到期日 | 2026-04-13 |

### 2026-03-30 — tsup + composite:true DTS 衝突

| 項目 | 內容 |
|------|------|
| 分類 | build |
| 問題 | tsup 的 DTS 生成 worker 在 composite: true 的 tsconfig 下報 TS6307（檔案不在專案列表中） |
| 原因 | tsup 啟動獨立的 TypeScript worker 進行 DTS 生成，不認 composite 專案引用 |
| 解法 | 在 tsup.config.ts 的 dts 欄位加入 `compilerOptions: { composite: false }` 覆寫 |
| 預防 | 新 package 建立時，tsup.config.ts 一律加 dts.compilerOptions.composite: false |
| 狀態 | resolved |
| 到期日 | 2026-04-13 |

### 2026-04-09 — harness runtime 檔案被 git 追蹤導致 merge 失敗

| 項目 | 內容 |
|------|------|
| 分類 | process |
| 問題 | .claude/hook-execution.jsonl 被 git 追蹤，harness 持續寫入導致每次 stash/checkout/merge 操作都因 dirty state 失敗 |
| 原因 | 專案初始化時未將 harness runtime 檔案加入 .gitignore，hook-execution.jsonl 和 settings.local.json 是 session 級別的檔案不應被版控 |
| 解法 | 在 .gitignore 加入 .claude/hook-execution.jsonl 和 .claude/settings.local.json，並用 git rm --cached 移除追蹤 |
| 預防 | (1) project-kickoff 模板的 .gitignore 加入 harness runtime 檔案 (2) 所有 .claude/ 下非 commands/ 非 settings.json 的檔案都應 gitignore |
| 狀態 | resolved |
| 到期日 | 2026-04-23 |
