# 測試

| 欄位 | 值 |
|------|-----|
| ID | T17 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | test-writer-fixer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13,T14,T15 |
| 預估 | 4h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | 2026-04-09T09:30:00.000Z |

---

## 任務描述

全面測試，目標：附錄 D 全部 10 項指標通過。

### 單元測試
- Page Generator：module/file/endpoint/method 四種 type（6+）
- Slug Registry：唯一性、衝突後綴、大小寫正規化（6+）
- Link Resolver：wiki-link 格式、dead link 過濾（4+）
- MD Renderer：frontmatter、HTML 註解、降級（6+）
- Dead Link Checker：零 dead links、false positive（3+）
- Wiki Exporter：fixture 端到端（4+）
- AI Prompt：輸出格式、降級（3+）

### Fixture 驗收（附錄 E）
- 四語言 fixture 各跑驗收矩陣 10 項
- 比對 expected-manifest.json

### 前端測試
- WikiGraph：D3 渲染、節點點擊、zoom、Level 切換（4+）
- WikiPreviewPanel：MD 渲染、viewAnchor、render timing（3+）
- 雙向跳轉：Wiki→SF/LO/DJ + 反向（4+）
- 3D 移除回歸：三視角正常、build 零殘留（3+）

### 回歸
- pnpm build 零錯誤
- pnpm test 零失敗
- SF/LO/DJ 正常 + AI 按需分析正常

## 驗收標準

- [x] 附錄 D 全部 10 項通過
- [x] pnpm build 零錯誤
- [x] pnpm test 零失敗
- [x] 四語言 fixture 全部通過

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立

### 2026-04-09T09:30:00.000Z — 狀態變更 → done（補登）
Sprint 19 已完成（G3 附條件通過）。L1 補登任務完成狀態。
