# i18n 架構設計

> 版本: v1.0 | Sprint 21 | 最後更新: 2026-04-09

---

## 概述

CodeAtlas 準備開源，需支援繁體中文 / English 完整切換。本文件定義 i18n 架構的 key 命名規範、locale 傳遞鏈、各層策略。

## 支援語言

| Locale Code | 語言 | 備註 |
|-------------|------|------|
| `en` | English | 主語言、預設語言 |
| `zh-TW` | 繁體中文 | 現有 UI 語言 |

型別定義：`type Locale = 'en' | 'zh-TW'`（位於 `packages/core/src/types.ts`）

---

## Key 命名規範

格式：`{區域}.{子區域}.{元素}`，全小寫 camelCase。

### 區域劃分

| 區域 | 說明 | 範例 |
|------|------|------|
| `toolbar` | 頂部工具列 | `toolbar.switchProject`, `toolbar.settings`, `toolbar.search` |
| `tabBar` | Tab 切換列 | `tabBar.codeGraph`, `tabBar.wikiGraph` |
| `welcome` | 歡迎頁 | `welcome.title`, `welcome.subtitle`, `welcome.apiKeyLabel` |
| `progress` | 分析進度頁 | `progress.title`, `progress.scanning`, `progress.completed` |
| `settings` | 設定面板 | `settings.language`, `settings.aiProvider`, `settings.apiKey` |
| `panel` | 右側詳情面板 | `panel.sf.title`, `panel.lo.title`, `panel.dj.title` |
| `contextMenu` | 右鍵選單 | `contextMenu.expandAll`, `contextMenu.collapseAll` |
| `graph` | 圖譜相關 | `graph.loading`, `graph.empty`, `graph.legend` |
| `wiki` | Wiki 相關 | `wiki.preview`, `wiki.export`, `wiki.generating` |
| `toast` | 通知訊息 | `toast.copySuccess`, `toast.error` |
| `common` | 共用 | `common.confirm`, `common.cancel`, `common.close` |
| `ai` | AI 功能 | `ai.analyzing`, `ai.notConfigured`, `ai.resultTitle` |
| `filter` | 篩選面板 | `filter.byType`, `filter.byRole` |

### 規則

1. **不含 AI 回傳內容** — AI 分析結果由 Prompt locale 控制，不走前端 i18n
2. **不含使用者輸入** — 搜尋關鍵字、專案路徑等不翻譯
3. **不含開發者訊息** — console.log、error stack 等維持英文
4. **interpolation 用 `{{ }}`** — `t('progress.filesScanned', { count: 42 })`

---

## Locale 傳遞鏈

### Web 場景

```
用戶切換語言（Settings 下拉選單）
  ↓ 寫入
localStorage('codeatlas-locale')
  ↓ i18next 讀取（初始化時）
語言偵測優先序：localStorage > navigator.language > 'en'
  ↓ navigator.language 映射
'zh-TW' → 'zh-TW', 'zh' → 'zh-TW', 其他 → 'en'
  ↓ UI 即時切換
react-i18next useTranslation() 自動 re-render
  ↓ API 請求帶入
POST /api/ai/analyze { locale: 'zh-TW', ... }
POST /api/project/analyze { locale: 'zh-TW', ... }
  ↓ server 層補齊
const locale: Locale = body.locale ?? 'en'
  ↓ 傳入 core
core AI prompt / Wiki 吃 options.locale（永遠收到明確值）
```

### CLI 場景

```
用戶執行命令
  ↓ locale 解析優先序
--lang flag > .codeatlas.json locale > CODEATLAS_LANG env > 'en'
  ↓ 直接傳入
core AI prompt / Wiki 吃 options.locale
  ↓ CLI 終端訊息
i18n.t('key') 用同一 locale 輸出
```

### 關鍵規則

1. **core 不猜 locale** — 所有 AI/Wiki 函式簽名要求呼叫方明確傳入 `locale: Locale`
2. **API 層 optional，server 層補齊** — API body 的 `locale` 為 `string?`，server 收到後驗證並補為 `Locale`
3. **config > env** — `.codeatlas.json` 專案級優先於 `CODEATLAS_LANG` 機器級（刻意的產品決策）
4. **預設 English** — 開源產品，英文為預設語言

---

## 各層 i18n 策略

### Layer 0: 型別基礎（core/types.ts）

```typescript
export type Locale = 'en' | 'zh-TW';
```

- AnalysisOptions 加 `locale?: Locale`
- WikiOptions 加 `locale?: Locale`
- 所有 core 公開函式透過 options 物件接收 locale

### Layer 1: Web UI（react-i18next）

| 項目 | 選擇 | 說明 |
|------|------|------|
| 框架 | react-i18next + i18next | 生態最大、TypeScript 友好 |
| Hook | `useTranslation()` | 在元件中取得 `t()` 函式 |
| 翻譯檔 | `packages/web/src/locales/{locale}.json` | 靜態 JSON，不做動態載入 |
| 初始化 | `packages/web/src/locales/index.ts` | App.tsx import 即生效 |
| 持久化 | `localStorage('codeatlas-locale')` | 重新整理後保持選擇 |
| Bundle | ~30KB gzipped | 可接受 |

### Layer 2: AI Prompt（模板函式）

| 項目 | 選擇 | 說明 |
|------|------|------|
| 方式 | 模板函式吃 locale 參數 | 精確控制 Prompt 品質 |
| 常數檔 | `packages/core/src/ai/prompt-locale.ts` | 語言指令、回覆規則 |
| 模板 | `prompt-templates.ts` 6 個函式 | 每個接受 `locale: Locale` |
| 管線 | `ai-pipeline.ts` 傳遞 locale | 從 server/CLI 接收 |

### Layer 3: Wiki 輸出（md-renderer）

| 項目 | 選擇 | 說明 |
|------|------|------|
| 方式 | WikiExporter 接受 locale | 標題/分類根據 locale 切換 |
| CLI flag | `--lang en/zh-TW` | 預設 en |
| 優先序 | flag > .codeatlas.json > env > default | 與 CLI 場景一致 |

### Layer 4: CLI 終端訊息（輕量載入器）

| 項目 | 選擇 | 說明 |
|------|------|------|
| 方式 | 自建輕量 JSON 載入器 | 不引 i18next，零依賴 |
| 翻譯檔 | `packages/cli/src/locales/{locale}.json` | 進度/錯誤/幫助文字 |
| 全域選項 | `-l, --lang <locale>` | 影響 CLI 訊息 + core locale |

---

## 檔案結構

```
packages/web/src/locales/
├── index.ts              ← i18next 初始化 + 語言偵測
├── en.json               ← 英文翻譯（主語言）
└── zh-TW.json            ← 繁體中文翻譯

packages/core/src/ai/
├── prompt-templates.ts   ← 修改：6 個模板函式加 locale
└── prompt-locale.ts      ← 新增：locale 常數（語言指令、回覆規則）

packages/cli/src/
├── i18n.ts               ← 新增：輕量翻譯載入器
└── locales/
    ├── en.json            ← CLI 英文訊息
    └── zh-TW.json         ← CLI 中文訊息
```

---

## 變更紀錄

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-04-09 | 初版，Sprint 21 i18n 架構設計 |
