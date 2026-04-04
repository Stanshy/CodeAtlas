# CodeAtlas — 專案概述

> **版本**: v1.0
> **最後更新**: 2026-03-30

---

## 產品定位

**一句話**：讓任何人在 5 分鐘內看懂一個陌生專案的架構與資料流。

**產品形態**：開源 local-first 專案視覺化工具，CLI 入口 + 本地 Web 視覺介面。

**核心差異化**：不是靜態圖表工具，而是一張「活的、可探索的系統地圖」，視覺衝擊力就是產品本身。

## 目標用戶

| 層級 | 用戶 | 主要場景 |
|------|------|---------|
| 第一層 | 工程師 | 接手專案、debug、review、看 legacy code |
| 第二層 | Vibe coder / 非本科開發者 | 理解 AI 生成的 code、掌握架構 |
| 第三層 | 非工程角色（PM/QA/老闆） | 理解系統架構、評估需求影響 |

## 核心功能（依 Phase）

| Phase | 核心功能 |
|-------|---------|
| Phase 1 | JS/TS 解析 + 模組依賴圖 + 高層資料流 + 視覺衝擊 + AI 節點摘要 |
| Phase 2 | 函式級呼叫鏈 + 影響分析 + Python/Java 擴充 |
| Phase 3 | CLI 強化 + VSC 插件 + Git diff 視覺化 |
| Phase 4 | 社群生態（plugin、語言包、GitHub Action） |

## 使用方式

```bash
npm install -g codeatlas
cd my-project
codeatlas analyze       # 掃描專案
codeatlas web           # 本地 Web UI → localhost:3000
```

## 關鍵決策

| 決策 | 內容 | 日期 |
|------|------|------|
| 產品形態 | 開源 local-first，不商業化 | 2026-03-30 |
| 語言優先 | JS/TS 先行，語言無關設計 | 2026-03-30 |
| 視覺策略 | 全保留，衝擊力是核心賣點 | 2026-03-30 |
| AI 策略 | 可插拔 provider，不綁單一模型商 | 2026-03-30 |
| 隱私策略 | 程式碼不出站，local-first | 2026-03-30 |
| 架構 | Monorepo 三層分離（core / cli / web） | 2026-03-30 |

## 相關文件

| 文件 | 說明 |
|------|------|
| `proposal/roadmap.md` | 產品路線圖 v1.2 |
| `proposal/sprint1-diagnosis.md` | Sprint 1 六問診斷 |
| `proposal/sprint1-proposal.md` | Sprint 1 提案書（G0 通過） |
| `proposal/sprint1-dev-plan.md` | Sprint 1 開發計畫書 |
| `.knowledge/specs/data-model.md` | 資料模型規格 |
| `.knowledge/specs/api-design.md` | API 設計規格 |
| `.knowledge/specs/feature-spec.md` | 功能規格 |
