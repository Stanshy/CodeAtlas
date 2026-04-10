# CodeAtlas

> 5 分鐘看懂任何專案架構。本地優先、隱私至上。

[English](README.md) | **繁體中文**

<!-- 截圖稍後補充 -->
**截圖即將新增**

---

## 功能特色

- 三視角分析：系統架構 (SF) / 邏輯操作 (LO) / 資料旅程 (DJ)
- AI 智慧分析（Claude、Gemini、OpenAI、Ollama — 自由選擇，或完全關閉）
- Wiki 知識輸出 + Obsidian 相容知識圖譜
- 雙語介面：English + 繁體中文
- 本地優先：程式碼不出站
- 支援 JavaScript、TypeScript、Python、Java

---

## 快速開始

```bash
npm install -g codeatlas
codeatlas
```

就這樣。瀏覽器會自動開啟歡迎頁 — 選擇專案資料夾即可開始探索。

---

## CLI 指令

| 指令 | 說明 |
|------|------|
| `codeatlas` | 零參數啟動 — 開啟瀏覽器，選擇專案 |
| `codeatlas web [path]` | 分析指定路徑並開啟 Web UI |
| `codeatlas wiki [path]` | 匯出知識 Wiki（Markdown，相容 Obsidian） |
| `codeatlas analyze [path]` | 純 CLI 分析（不開瀏覽器） |

### 常用參數

| 參數 | 說明 |
|------|------|
| `--lang en\|zh-TW` | 設定 UI 與輸出語言（預設：`en`） |
| `--ai anthropic\|gemini\|openai\|ollama\|disabled` | 選擇 AI 供應商 |
| `--port N` | 伺服器埠號（預設：`3000`） |

---

## 三種視角

### 系統架構 (SF — System Framework)

目錄層級的架構總覽。看到模組如何組織、各資料夾包含哪些角色 — 路由、服務、模型、中間層。專為快速掌握陌生專案設計。

### 邏輯操作 (LO — Logic Operation)

方法層級的呼叫流程。看到函式之間的呼叫關係，依類別分組（路由、中間層、服務、資料存取、工具）。AI 分析每個方法的角色與目的，讓你不只看到「誰呼叫誰」，更理解「為什麼」。

### 資料旅程 (DJ — Data Journey)

端點層級的資料流。從 API 入口追蹤請求經過中間層、商業邏輯到資料存取 — 逐步、依序展示。適合除錯或快速理解 API 密集型專案。

---

## AI 分析

CodeAtlas 支援多家 AI 供應商進行智慧程式碼分析：

- **Claude** (Anthropic) — 推薦
- **Gemini** (Google)
- **OpenAI** (GPT)
- **Ollama** — 本地執行，不需 API Key，完全隱私
- **關閉** — 不使用 AI 也能運作，只是不會有智慧摘要

在 Web UI 設定面板或透過 `--ai` CLI 參數配置。雲端 AI 供應商會將程式碼片段傳送至其 API — UI 中會明確標示。若隱私是首要考量，請使用 Ollama 或關閉 AI。

---

## Wiki 知識輸出

從程式碼庫產生 Obsidian 相容的 Markdown 檔案：

```bash
codeatlas wiki ./my-project --lang zh-TW
```

產出包含 frontmatter、交叉引用的互連 `.md` 檔案，以及可在 Web UI 中瀏覽的互動式知識圖譜。將輸出資料夾直接匯入 Obsidian，即可將程式碼庫作為知識庫探索。

---

## 技術棧

| 層級 | 技術 |
|------|------|
| 語言 | TypeScript（全端） |
| 前端 | React + React Flow + D3.js |
| 本地伺服器 | Fastify |
| 程式碼解析 | tree-sitter |
| Monorepo | pnpm workspace |

---

## 系統需求

- Node.js >= 18
- pnpm >= 9（僅開發時需要）

---

## 貢獻

請參閱 [CONTRIBUTING.md](CONTRIBUTING.md) 了解開發環境設定與貢獻指南。

---

## 授權

[MIT](LICENSE) — Copyright 2026 Stanshy
