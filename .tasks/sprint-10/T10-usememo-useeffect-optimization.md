# T10 graph-adapter + GraphCanvas useMemo 精確化 + 3D useEffect 減量

| 欄位 | 值 |
|------|-----|
| ID | T10 |
| 專案 | CodeAtlas |
| Sprint | Sprint 10 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T7 |
| 預估 | 2h |
| 建立時間 | 2026-04-01T14:00:00.000Z |
| 開始時間 | 2026-04-01T14:30:00.000Z |
| 完工時間 | 2026-04-01T20:00:00.000Z |

---

## 任務描述

1. **graph-adapter useMemo 精確化**：
   - styledNodes useMemo 依賴項拆分為多個小 useMemo
   - styledEdges 同上
   - applyViewMode 結果獨立快取

2. **GraphCanvas useMemo**：
   - 確認依賴陣列精確
   - 移除不必要的 object/array 直接放 deps

3. **Graph3DCanvas useEffect 減量**：
   - 合併相關 useEffect（e2eTracing highlight + restore）
   - 避免 object/array 直接放 deps（用 JSON stable key 或 useRef）

## 驗收標準

- [x] useMemo 命中率提升
- [x] useEffect 觸發頻率降低
- [x] graph-adapter 計算耗時降低
- [x] 893+ tests 全通過

---

## 事件紀錄

### 2026-04-01T14:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立

### 2026-04-01T20:00:00.000Z — 完成任務
任務完成，所有驗收標準通過。
