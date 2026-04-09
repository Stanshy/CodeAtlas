# Page Generator

| 欄位 | 值 |
|------|-----|
| ID | T2 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | backend-architect |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T1 |
| 預估 | 2h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

在 `packages/core/src/wiki-exporter/page-generator.ts` 實作 Graph JSON → WikiNode[] 轉換：

- 從 AnalysisResult 的 nodes/edges 產出四種 WikiNode type：
  - `module`：directory 級 GraphNode → WikiNode
  - `file`：file 級 GraphNode → WikiNode
  - `endpoint`：endpoint-detector 結果 → WikiNode
  - `method`：function 級 GraphNode（僅 ★ 核心方法）→ WikiNode
- 生成 stable canonical id（附錄 B：`{type}:{relative-path}:{name}`）
- 生成 slug（附錄 B：`{type}--{path-segments}`）
- 填充 viewAnchors（SF=目錄ID, LO=方法ID[], DJ=端點ID[]）
- 產出 ruleSummary（規則骨架描述）

## 驗收標準

- [ ] fixture 專案產出正確 WikiNode[]
- [ ] 四種 type 都有產出
- [ ] canonical id 格式正確
- [ ] slug 格式正確且全域唯一
- [ ] viewAnchors 正確填充

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
