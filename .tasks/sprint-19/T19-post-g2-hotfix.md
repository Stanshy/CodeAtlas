# Post-G2 Hotfix — WikiGraph 4 Bug 修正

| 欄位 | 值 |
|------|-----|
| ID | T19 |
| 專案 | CodeAtlas |
| Sprint | Sprint 19 |
| 指派給 | tech-lead |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T13,T14,T10 |
| 並行組 | — |
| 預估 | 1h |
| 建立時間 | 2026-04-09T01:39:43.553Z |
| 開始時間 | 2026-04-09T01:39:43.553Z |
| 完工時間 | 2026-04-09T01:39:43.553Z |

---

## 任務描述

G2 通過後老闆實測發現 4 個 bug，屬於 G2 Review 遺漏。全部由 tech-lead 直接修正。

### Bug 清單

| # | 嚴重度 | 問題 | 根因 | 修正檔案 |
|---|--------|------|------|---------|
| 1 | Critical | Edge 完全不顯示 | Core WikiEdge (`targetId/targetSlug/type`) vs Web WikiEdge (`source/target/relation`) 型別不匹配。`manifest.edges` 扁平化遺失 source，`e.source` = undefined → 全部被 filter 掉 | `packages/web/src/hooks/useWikiGraph.ts` + `packages/web/src/types/wiki.ts` |
| 2 | Major | Legend/Badge 攔截指標事件 | `styles.legend` 和 `styles.countBadge` 缺少 `pointerEvents: 'none'` | `packages/web/src/components/WikiGraph.tsx` |
| 3 | Major | SVG 不填滿 canvas 容器 | SVG 用固定 `width={900} height={600}` 而非 `width="100%" height="100%"` + viewBox | `packages/web/src/components/WikiGraph.tsx` |
| 4 | Critical | AI 深層分析覆寫「詳細說明」失敗 | Regex `\z` 在 JavaScript 不是字串結尾（那是 Ruby），導致最後一個 section 無法匹配 → fallback append 到檔案末尾，原佔位文字未被替換 | `packages/cli/src/server.ts` |

## 驗收標準

- [x] Edge 連線正常顯示（manifest.nodes 重建 links）
- [x] Legend/Badge 不攔截滑鼠事件
- [x] SVG 填滿 canvas 容器（width/height 100% + viewBox）
- [x] AI 深層分析正確替換「詳細說明」section
- [x] pnpm build 零錯誤

---

## 事件紀錄

### 2026-04-09T01:39:43.553Z — 建立任務（in_review）
G2 通過後老闆實測發現 4 個 bug。tech-lead 直接修正，提交 L1 自我 Review。

### 2026-04-09T01:41:45.057Z — 狀態變更 → done
L1 審核通過。4 個 bug 全部修正，pnpm build 零錯誤。Minor: regex 可合併為單一表達式（低優先）。
