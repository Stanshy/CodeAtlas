# OllamaProvider 架構 + 設定優先級設計

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 6 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T10:05:00.000Z |
| 完工時間 | 2026-03-31T10:15:00.000Z |
| 依賴 | — |
| 預估 | 1h |
| 建立時間 | 2026-03-31T10:00:00.000Z |

---

## 任務描述

1. 設計 OllamaProvider 架構（符合 SummaryProvider 介面）
2. 設計設定優先級系統（CLI > json > env > disabled）
3. 設計 .codeatlas.json schema
4. 設計 GET /api/ai/status 擴充格式
5. 設計 PrivacyBadge 三模式
6. 產出設計文件：`.knowledge/sprint6-ollama-architecture.md`

## 驗收標準

- [x] 設計文件含 OllamaProvider 介面與 HTTP 協議
- [x] 設計文件含設定優先級完整規則
- [x] 設計文件含 .codeatlas.json schema 定義
- [x] 設計文件含 API 擴充格式
- [x] 設計文件含錯誤處理策略

---

## 事件紀錄

### 2026-03-31T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T10:05:00.000Z — 狀態變更 → in_progress
L1 自行執行設計

### 2026-03-31T10:15:00.000Z — 狀態變更 → done
設計文件完成：`.knowledge/sprint6-ollama-architecture.md`（9 章節）。涵蓋 OllamaProvider 介面、設定優先級、.codeatlas.json schema、API 擴充、PrivacyBadge 三模式、錯誤處理策略、向下相容性
