---
name: sop-review
description: L1 Code Review SOP — 強制規範對照 + 審核決策，不得跳過任何 checkpoint
allowed-tools: Read, Glob, Grep, Bash
---

# L1 Code Review SOP

L1 審核任務時，**必須依序完成以下所有步驟**，不得跳過任何 ⛔ CHECKPOINT。

## 使用方式
```
/sop-review <task-id>
```

## 參數
- `$0`: 任務 ID（如 `T3`）

## 執行步驟

### ⛔ STEP 1 — 載入任務
找到任務檔案：
!`find .tasks -name "$0-*" -o -name "$0.*" 2>/dev/null | head -1`

確認並記錄：
- 任務描述與目標
- 驗收標準清單（逐項列出）
- 指派對象（確認是正確的 L2）
- 完工時間（確認事件紀錄有記錄）

> ✋ 確認任務內容清楚後再繼續。

---

### ⛔ STEP 2 — 載入審查規範

必讀：
- `.knowledge/coding-standards.md`（或 `.knowledge/company/standards/coding-standards.md`）

依任務類型額外讀取：

| 任務類型 | 必讀規範 |
|---------|---------|
| 後端 / API | `.knowledge/specs/api-design.md` + `.knowledge/specs/data-model.md` |
| 前端 / UI | `.knowledge/specs/feature-spec.md` |
| 全端 | 以上全部 |

輸出：
```
📋 審查規範載入完成
- coding-standards ✅
- [對應規範] ✅

審查重點（從規範中提取）：
- [與本任務相關的規範條目]
```

> ✋ 確認規範已讀、審查重點已列出後再繼續。

---

### ⛔ STEP 3 — 執行 Code Review
執行 `/review`（讀取 `.claude/commands/review.md` 並依步驟執行）

Review 必須逐項對照：
1. 驗收標準 — 每個 `- [x]` 是否確實完成
2. 規範條目 — 程式碼是否符合已載入的規範
3. postmortem 地雷 — 是否有重蹈覆轍

> ✋ Review 報告完成後再繼續。

---

### ⛔ STEP 4 — 審核決策

**通過** — 所有驗收標準與規範均符合：
→ 執行 `/task-approve $0 {備註}`（讀取 `.claude/commands/task-approve.md`）

**退回** — 有不符合項目：
→ 執行 `/task-status $0 rejected {具體說明哪些項目不通過、需要修改什麼}`
→ 通知 L2 重新執行 `/sop-execute $0`

> ✋ 決策必須明確，不得含糊帶過。

---

### STEP 5 — 輸出審核結果

```
[✅ 通過 / ❌ 退回] $0 審核完成

審核結果：[通過 / 退回]
驗收標準對照：[全部通過 / {列出未通過項目}]
規範對照：[符合 / {列出違規項目}]
備註：{說明}

[若通過] 下一步：PM 執行 /pm-review
[若退回] 下一步：L2 修正後重新執行 /sop-execute $0
```
