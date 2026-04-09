# MD 預覽面板 + AI 分析按鈕

| 欄位 | 值 |
|------|-----|
| ID | T14 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | assigned |
| 依賴 | T10,T13 |
| 預估 | 3h |
| 建立時間 | 2026-04-08T07:25:25.000Z |
| 開始時間 | — |
| 完工時間 | — |

---

## 任務描述

- `packages/web/src/components/WikiPreviewPanel.tsx` — 右側 MD 預覽面板

功能：
- 點擊知識圖節點 → 呼叫 `/api/wiki/page/:slug` lazy load
- markdown → HTML 渲染（使用 `marked` 或 `react-markdown`）
- 底部三視角跳轉連結（讀取 viewAnchors HTML 註解）
- 「✨ AI 分析」按鈕：
  - 呼叫 `POST /api/wiki/analyze { slug, scope }`
  - polling `GET /api/ai/jobs/:jobId`
  - 成功後 refresh preview
  - 失敗時顯示錯誤提示
- 渲染性能：fixture 級別 ≤ 300ms

## 驗收標準

- [ ] 點擊節點顯示 .md 內容
- [ ] markdown 渲染正確
- [ ] AI 分析觸發 → 完成後 preview 自動更新
- [ ] 三視角跳轉連結正確
- [ ] 渲染 ≤ 300ms（fixture）

---

## 事件紀錄

### 2026-04-08T07:25:25.000Z — 建立任務（assigned）
由 L1 透過 /task-delegation 建立
