# 架構設計：函式提取器 + 呼叫分析器 + data-model 擴充 + zoom 互動設計

| 欄位 | 值 |
|------|-----|
| ID | T1 |
| 專案 | CodeAtlas |
| Sprint | Sprint 7 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 開始時間 | 2026-03-31T12:05:00.000Z |
| 完工時間 | 2026-03-31T12:20:00.000Z |
| 依賴 | — |
| 預估 | 2h |
| 建立時間 | 2026-03-31T12:00:00.000Z |

---

## 任務描述

1. 撰寫 `.knowledge/sprint7-function-architecture.md` 架構設計文件：
   - function-extractor 設計：AstNode 遍歷策略、7 種函式定義語法對應的 tree-sitter node type
   - call-analyzer 設計：呼叫表達式匹配策略、跨檔案 import 解析、confidence 分級
   - data-model 擴充細節：NodeMetadata 新欄位、EdgeMetadata 新欄位、FunctionParam 型別
   - graph-builder 第二 pass 策略：不改既有 pass，新增 buildFunctionGraph
   - API 載入策略：預設不含函式級、按需載入端點
   - ViewState 擴充：expandedFileId、zoom into/out action
   - 2D subflow 策略 + 3D camera 飛入策略
   - 節點 ID 命名規範：{fileId}#{funcName}

2. 確認規範文件已更新：
   - data-model.md v2.0 ✓
   - api-design.md v3.0 ✓
   - feature-spec.md v7.0 ✓

## 驗收標準

- [x] 架構設計文件涵蓋 function-extractor + call-analyzer + graph-builder 擴充
- [x] tree-sitter node type 對應表完整（7+ 種函式定義）
- [x] 呼叫分析策略明確（同檔案 + 跨檔案 + confidence 分級）
- [x] ViewState 擴充設計完成
- [x] 節點 ID / Edge ID 命名規範定義

---

## 事件紀錄

### 2026-03-31T12:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-03-31T12:05:00.000Z — 狀態變更 → in_progress
L1 自行執行設計任務

### 2026-03-31T12:20:00.000Z — 狀態變更 → done
`.knowledge/sprint7-function-architecture.md` 完成（9 章節）：tree-sitter node type 對應表、function-extractor 遍歷策略、call-analyzer 匹配策略、graph-builder 第二 pass、API 載入策略、ViewState 擴充、節點 ID 規範、2D/3D 策略
