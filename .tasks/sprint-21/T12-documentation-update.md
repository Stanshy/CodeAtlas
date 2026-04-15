# 文件更新

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 21 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T11 |
| 預估 | 1h |
| 建立時間 | 2026-04-09T08:56:57.895Z |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

Sprint 21 完成後的文件同步更新：

1. **`.knowledge/specs/feature-spec.md`** → v20.0
   - 新增 Sprint 21 i18n 描述
   - 新增 i18n 功能規格（語言切換、locale 傳遞、支援語言列表）

2. **`.knowledge/specs/api-design.md`** → v10.0
   - API 端點新增 `locale` 參數說明
   - POST /api/ai/analyze、POST /api/project/analyze 等端點

3. **`CLAUDE.md`** → 文件索引更新
   - 新增 Sprint 21 dev-plan 連結
   - 新增 i18n-design.md 連結

4. **確認 `.knowledge/specs/i18n-design.md` 與實作一致**

## 驗收標準

- [x] feature-spec.md 版本遞增至 v20.0，含 i18n 章節
- [x] api-design.md 版本遞增至 v10.0，含 locale 參數
- [x] CLAUDE.md 索引更新
- [x] 文件與程式碼一致（對規範 Review 通過）

---

## 事件紀錄

### 2026-04-09T08:56:57.895Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 21 i18n 全部完成。L1 補登任務完成狀態。
