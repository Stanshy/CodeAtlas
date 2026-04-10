# Sprint 提案書: Sprint 21 — i18n 國際化（中英雙語）

> **提案人**: PM
> **日期**: 2026-04-09
> **專案**: CodeAtlas
> **Sprint 類型**: 全端 i18n 改造（core + cli + web）
> **前置 Sprint**: Sprint 20（✅ 完成 — 啟動體驗改造）
> **狀態**: ✅ G0 調整後通過（2026-04-09）

---

## 1. 目標

CodeAtlas 準備開源，目前所有 UI 文字和 AI Prompt 皆為硬編碼中文，對國際用戶不友好。本 Sprint 將建立 i18n 基礎框架，實現繁體中文 / English 完整切換，為開源的第一印象做好準備。

範圍涵蓋三層：
1. **Web UI**：所有面板、按鈕、標籤、提示文字 i18n 化 + Settings 語言切換
2. **AI 分析輸出**：Prompt 模板化，根據 locale 產出對應語言的摘要/分析
3. **Wiki 輸出**：`codeatlas wiki --lang en/zh-TW` 支援語言選擇
4. **CLI 訊息**：終端機輸出訊息 i18n 化

---

## 2. 範圍定義

### 做

> **4 條 Rollout 線**：基礎層 → Web 線 → AI/Wiki 線 → CLI 線，依序交付、逐線驗收。

#### 🔵 Line 0：基礎層（所有線的前置）

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S21-1 | **i18n 架構設計** | P0 | key 命名規範、locale 傳遞鏈設計、web/core/cli 共用規則、Prompt locale 傳遞方式（見附錄 C） |
| S21-2 | **型別定義** | P0 | `Locale` type（`'en' | 'zh-TW'`）、i18n config type、翻譯 key type-safe 定義、locale 欄位加入 AnalysisOptions / WikiOptions |
| S21-3 | **i18n 框架建立** | P0 | react-i18next 安裝設定、locale 結構、語言偵測邏輯（localStorage → navigator.language → 預設 en） |

#### 🟢 Line 1：Web UI 線（P0，最大改動量）

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S21-4 | **翻譯檔 — 英文（主語言）** | P0 | `locales/en.json` — 所有產品內建 UI 字串抽取為 key |
| S21-5 | **翻譯檔 — 繁體中文** | P0 | `locales/zh-TW.json` — 繁體中文，與英文 1:1 對照 |
| S21-6 | **Web UI i18n 改造** | P0 | ~60 個元件硬編碼字串替換為 `t('key')`。範圍：產品內建 UI 字串（不含第三方元件、AI 回傳內容） |
| S21-7 | **Settings 語言切換** | P0 | SettingsPopover 新增語言選擇（English / 繁體中文），切換即時生效，持久化 localStorage |

#### 🟡 Line 2：AI + Wiki 線（P1，需設計 locale 傳遞）

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S21-8 | **AI Prompt 模板化** | P1 | Prompt 從硬編碼改為模板，吃 `locale` 參數。Web 呼叫時從 UI locale 傳入，CLI 呼叫時從 `--lang` 傳入 |
| S21-9 | **Wiki 輸出語言** | P1 | `codeatlas wiki --lang en/zh-TW`，.md 檔案標題、描述、分類標籤根據 locale 切換 |

#### ⚪ Line 3：CLI 線（P2，可獨立交付）

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S21-10 | **CLI 訊息 i18n** | P2 | 終端輸出的進度、錯誤、幫助文字。輕量方案（共用翻譯 JSON，不引重型框架） |

#### 跨線

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S21-11 | **測試覆蓋** | P0 | i18n 切換測試、翻譯 key 1:1 一致性測試、元件渲染測試、Prompt 雙語輸出測試 |
| S21-12 | **文件更新** | P0 | feature-spec + api-design 更新（新增 locale 參數、語言切換功能描述） |

### 不做（明確排除）

- 不做第三語言（日文、簡中等）— 框架預留擴充即可
- 不做 RTL（右到左）佈局支援
- 不做翻譯管理平台整合（Crowdin 等）
- 不做動態載入翻譯檔（bundle size 可接受的情況下直接打包）
- 不改現有功能邏輯，純粹文字 i18n 化

---

## 3. 流程決策（G0 核心產出）

> **本區由老闆在 G0 審核時勾選確認，決定後續要走哪些步驟和關卡。**

### 步驟勾選

| 勾選 | 步驟 | 說明 | 對應關卡 | 備註 |
|------|------|------|---------|------|
| [x] | 需求分析 | 需求文件、任務拆解 | G0（本文件） | 必選 |
| [x] | 設計 | i18n 架構設計：key 命名規範、locale 傳遞鏈、Prompt 模板規格 | — | 必選：4 條線（web/core/cli/wiki）需統一規則 |
| [ ] | UI 圖稿 | Settings 語言切換 | G1: 圖稿審核 | 不需要，UI 變更範圍小 |
| [x] | 實作 | 程式碼開發（分 4 條線 rollout） | G2: 程式碼審查 | 必選 |
| [x] | 測試 | 單元測試 + 翻譯完整性測試 | G3: 測試驗收 | 必選 |
| [x] | 文件 | feature-spec、api-design 更新 | G4: 文件審查 | 必選：i18n 改變 API 參數和功能行為 |
| [ ] | 部署 | 環境配置 | G5: 部署就緒 | 不需要 |
| [ ] | 發佈 | 正式發佈 | G6: 正式發佈 | 不需要（下個 Sprint 開源時處理） |

### 阻斷規則（勾選適用的）

- [ ] G1（圖稿）通過前不得開始實作
- [ ] G3（測試）通過前不得進入文件階段

### 額外步驟（不在標準清單內的）

| 勾選 | 步驟名稱 | 說明 | 審核方式 |
|------|---------|------|---------|
| [ ] | 翻譯完整性檢查 | 自動化腳本比對 en.json 和 zh-TW.json 的 key 一致性 | 自動化（測試中涵蓋） |

---

## 4. 團隊分配

| 角色 | Agent | 負責範圍 |
|------|-------|---------|
| L1 領導 | tech-lead | 整體規劃、i18n 架構設計、Review、回報 |
| L2 後端 | backend-architect | AI Prompt 模板化、Wiki 語言切換、CLI i18n |
| L2 前端 | frontend-developer | Web UI i18n 改造、Settings 語言切換、翻譯檔 |
| L2 測試 | test-writer-fixer | i18n 測試、翻譯完整性測試 |

---

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| 硬編碼字串遺漏 | 高 | 中 | 開發完成後全域搜尋中文字元，確保無遺漏 |
| react-i18next 與現有元件衝突 | 低 | 中 | i18next 生態成熟，React 整合穩定 |
| 翻譯品質不一致 | 中 | 中 | 建立翻譯風格指南（術語表），統一用語 |
| AI Prompt 翻譯後效果變差 | 中 | 高 | 英文 Prompt 以現有中文效果為基準，逐一比對輸出品質 |
| Web 元件 ~60 個改動量大 | 高 | 中 | 批次處理，先改共用元件再改頁面級元件 |

---

## 6. 失敗模式分析

| 失敗場景 | 可能性 | 影響 | 偵測方式 | 緩解措施 |
|---------|--------|------|---------|---------|
| 翻譯 key 打錯導致顯示 key 名 | 高 | 中 | 測試 + 視覺檢查 | TypeScript type-safe key + 測試覆蓋 |
| 切換語言後部分元件未更新 | 中 | 中 | 手動切換測試 | i18next 的 React binding 自動 re-render |
| en/zh-TW key 不一致 | 中 | 高 | 自動化腳本 | 測試中加入 key 一致性檢查 |
| AI 英文 Prompt 輸出品質差 | 中 | 高 | 人工 Review | 逐功能比對中英 Prompt 輸出 |

---

## 7. 可觀測性

> 壞了怎麼知道？

- **翻譯完整性**: 測試套件自動比對 en.json 和 zh-TW.json 的 key 數量和結構
- **缺失翻譯**: i18next 設定 `saveMissing: true`（開發模式），console 警告未翻譯 key
- **Prompt 品質**: AI 輸出結果人工抽檢（開源前）

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | git revert sprint-21 merge commit，所有 i18n 改動在單一分支 |
| 判斷標準 | 翻譯完整性 < 95% 或 AI 輸出品質明顯退化 |
| 負責人 | Tech Lead |
| 備註 | i18n 是純加法改動（加翻譯層），不改功能邏輯，回滾風險低 |

---

## 9. 驗收標準

**Line 0 基礎層：**
- [ ] i18n 框架建立完成，支援 en / zh-TW 兩種 locale
- [ ] Locale type + i18n config type 定義完成
- [ ] locale 傳遞鏈規則明確且實作完成（見附錄 C）

**Line 1 Web UI：**
- [ ] 所有產品內建 UI 字串通過 `t()` 呼叫（不含第三方元件字串、AI 回傳內容、使用者輸入內容）
- [ ] Settings 可切換語言，切換後即時生效，重新整理後保持選擇
- [ ] en.json 和 zh-TW.json key 100% 一致（自動化測試驗證）

**Line 2 AI + Wiki：**
- [ ] AI 分析輸出語言跟隨 locale 設定（Web 來源 = UI locale，CLI 來源 = `--lang` flag）
- [ ] Wiki 輸出支援 `--lang en/zh-TW` 參數
- [ ] Prompt 模板化完成，中英雙語輸出品質經 Review 確認

**Line 3 CLI：**
- [ ] CLI 終端訊息支援 `--lang` 切換

**整體：**
- [ ] 現有功能全部正常（無回歸）
- [ ] 勾選的所有關卡皆通過（G0 → G2 → G3 → G4）

---

## 附錄 A：i18n 技術方案建議

### 框架選型

| 方案 | 優點 | 缺點 | 建議 |
|------|------|------|------|
| react-i18next | 生態最大、SSR/CSR 皆支援、TypeScript 友好 | 依賴較多 | ✅ 推薦 |
| react-intl (FormatJS) | ICU 標準、格式化強 | API 較繁瑣 | 備選 |
| 自建輕量方案 | 零依賴、完全掌控 | 缺 plural/interpolation | 不建議 |

### 翻譯檔結構

```
packages/web/src/locales/
  ├── en.json          # 英文（主語言）
  ├── zh-TW.json       # 繁體中文
  └── index.ts         # i18n 初始化 + 匯出
```

### Key 命名規範建議

```json
{
  "toolbar.switchProject": "Switch Project",
  "toolbar.settings": "Settings",
  "welcome.title": "Welcome to CodeAtlas",
  "welcome.subtitle": "Visualize any codebase in 5 minutes",
  "progress.scanning": "Scanning files...",
  "progress.parsing": "Parsing source code...",
  "settings.language": "Language",
  "settings.aiProvider": "AI Provider",
  "panel.sf.title": "System Framework",
  "panel.lo.title": "Logic Operation",
  "panel.dj.title": "Data Journey"
}
```

規則：`{區域}.{子區域}.{元素}` 三層結構，全小寫 camelCase。

### 語言偵測優先順序

```
用戶手動設定（localStorage）
  → 瀏覽器語系（navigator.language）
  → 預設 English
```

---

## 附錄 B：影響範圍估算

| Package | 影響檔案數 | 說明 |
|---------|----------|------|
| web | ~60 個元件 + ~10 個頁面/hooks | 所有含 UI 文字的元件 |
| core | ~8 個 AI prompt 檔案 | ai/ 目錄下的 prompt 模板 |
| cli | ~5 個指令/訊息檔案 | 終端輸出訊息 |
| 新增 | ~6 個檔案 | 翻譯檔 + i18n 設定 + 型別 |

### Web 元件改動清單（主要）

| 元件 | 字串類型 |
|------|---------|
| Toolbar.tsx | 按鈕標籤、Tooltip |
| TabBar.tsx | Tab 名稱（SF/LO/DJ/Wiki） |
| SearchBar.tsx | Placeholder |
| FilterPanel.tsx | 篩選標籤 |
| SettingsPopover.tsx | 設定項目名稱 + 新增語言選擇 |
| NodePanel.tsx | 面板標題、欄位名 |
| FunctionPanel.tsx | 面板內容 |
| ImpactPanel.tsx | 面板內容 |
| Toast.tsx | 通知訊息 |
| WelcomePage.tsx | 歡迎頁所有文字 |
| ProgressPage.tsx | 進度頁所有文字 |
| WikiPreviewPanel.tsx | Wiki 面板文字 |
| ProjectInput.tsx | 輸入提示 |
| RecentProjects.tsx | 列表文字 |

---

## 附錄 C：Locale 傳遞鏈設計

> 老闆審核意見：locale 來源如果不先定，後面一定混亂。

### 問題：locale 到底從哪來？

| 場景 | locale 來源 | 說明 |
|------|------------|------|
| Web UI 顯示 | `localStorage('codeatlas-locale')` → `navigator.language` → `'en'` | 使用者在 Settings 切換，存 localStorage |
| Web → AI 分析 | Web UI 當前 locale，透過 API 的 `locale` 參數傳入 | POST /api/project/analyze body 加 `locale` 欄位 |
| CLI → AI 分析 | `--lang` flag → `.codeatlas.json` → `CODEATLAS_LANG` → `'en'` | CLI 使用者用 flag 指定 |
| CLI → Wiki 輸出 | `--lang` flag → `.codeatlas.json` → `CODEATLAS_LANG` → `'en'` | 同上 |
| CLI → 終端訊息 | `--lang` flag → `.codeatlas.json` → `CODEATLAS_LANG` → `'en'` | CLI 自身輸出 |

> **設計決策：config > env**（刻意）
> `.codeatlas.json` 是專案級設定（跟著 repo），`CODEATLAS_LANG` 是機器級設定。專案意圖優先於機器預設——一個中文團隊在 repo 裡設一次 `locale: "zh-TW"`，所有成員 clone 後即生效，不需每人設 env。`--lang` flag 仍為最高優先，個人可隨時覆蓋。

### 優先級鏈（單一真相來源）

```
Web 場景：
  localStorage > navigator.language > 'en'
  ↓ 傳入 API
  POST /api/project/analyze { locale: 'zh-TW' }
  ↓ server 轉發
  core AI prompt 吃 options.locale

CLI 場景：
  --lang flag > .codeatlas.json locale > CODEATLAS_LANG > 'en'
  ↓ 直接傳入
  core AI prompt 吃 options.locale
```

### 關鍵規則

1. **core 不猜 locale**：core 的所有 AI/Wiki 函式要求呼叫方明確傳入 `locale` 參數，core 不做偵測
2. **API 層 optional，server 層補齊**：`POST /api/project/analyze` body 的 `locale` 欄位為 optional，但 server 收到後在進 core 前一定補成明確值（未帶 → 填 `'en'`）。core 永遠收到明確的 locale，不需處理 undefined
3. **Web 和 CLI 各自負責解析**：Web 從 UI 設定取，CLI 從 flag/config 取，解析完傳給 core
4. **Web 和 Wiki 不衝突**：Wiki 是 CLI 指令，用 CLI 的 locale 鏈；Web 是瀏覽器，用 Web 的 locale 鏈。兩者獨立，不互相覆蓋

### 型別定義

```typescript
// packages/core/src/types.ts
export type Locale = 'en' | 'zh-TW';

// AI 分析選項加入 locale
export interface AnalysisOptions {
  locale?: Locale;  // 預設 'en'
  // ...existing fields
}

// Wiki 選項加入 locale
export interface WikiOptions {
  locale?: Locale;  // 預設 'en'
  // ...existing fields
}
```

---

**G0 審核結果**

**老闆決策**: [x] 調整後通過

**審核意見**:
1. ✅ 已修正：設計 + 文件步驟勾選補齊
2. ✅ 已修正：範圍切為 4 條 Rollout 線（基礎 → Web → AI/Wiki → CLI），逐線可控交付
3. ✅ 已修正：驗收標準改為「產品內建 UI 字串」，排除第三方元件/AI 回傳/使用者輸入
4. ✅ 已修正：新增附錄 C，明確定義 locale 傳遞鏈（Web vs CLI 各自負責，core 不猜 locale）

**確認的流程**: 需求 → 設計 → 實作（4 線 rollout）→ G2 → 測試 → G3 → 文件 → G4
