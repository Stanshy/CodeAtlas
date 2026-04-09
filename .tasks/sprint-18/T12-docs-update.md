# 文件更新

| 欄位 | 值 |
|------|-----|
| ID | T12 |
| 專案 | CodeAtlas |
| Sprint | Sprint 18 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-04-08T02:33:53.000Z |
| 完工時間 | 2026-04-08T02:36:54.000Z |
| 依賴 | T11 |
| 預估 | 1h |
| 建立時間 | 2026-04-08T01:58:28.859Z |

---

## 任務描述

更新專案文件，反映 Python + Java 多語言支援。

### 更新清單

1. **`.knowledge/specs/feature-spec.md`** — v17.0：新增 Python/Java 支援章節
   - 支援語言列表
   - Python import/function 支援範圍
   - Java import/function 支援範圍
   - 語言偵測機制
2. **`CLAUDE.md`** — Sprint 18 完成標記
   - feature-spec 版本更新
   - Sprint 18 狀態
3. **`README.md`**（如有）— 支援語言列表更新

## 驗收標準

- [x] feature-spec.md 已更新至 v17.0，含 Python/Java 支援章節（F101-F105）
- [x] CLAUDE.md Sprint 18 標記 + feature-spec 版本更新
- [x] 文件與程式碼一致（支援的語言、import 模式、function 類型）

---

## 事件紀錄

### 2026-04-08T01:58:28.859Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-08T02:36:54.000Z — 完成（done）
feature-spec v17.0：新增 F101-F105（多語言型別、Python 解析、Java 解析、語言感知 resolver、語言感知 call-analyzer）+ 驗收標準。CLAUDE.md 更新 feature-spec 版本 + Sprint 18 狀態。Scanner F1 擴充 .py/.java 副檔名。
