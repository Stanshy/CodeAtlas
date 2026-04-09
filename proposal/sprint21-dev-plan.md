# 開發計畫書: Sprint 21 — i18n 國際化（中英雙語）

> **撰寫者**: Tech Lead
> **日期**: 2026-04-09
> **專案**: CodeAtlas
> **Sprint 提案書**: `proposal/sprint21-proposal.md`（G0 調整後通過 2026-04-09）
> **狀態**: ⏳ 執行中
> **Base Branch**: master
> **Sprint Branch**: sprint-21

---

## 1. 需求摘要

CodeAtlas 準備開源，目前所有 UI 文字和 AI Prompt 皆為硬編碼中文，對國際用戶不友好。本 Sprint 建立 i18n 框架，實現繁體中文 / English 完整切換。

範圍涵蓋三層四線：
1. **Line 0 基礎層**：i18n 架構設計、型別定義、框架建立
2. **Line 1 Web UI**：~60 個元件硬編碼字串替換為 `t('key')`、Settings 語言切換
3. **Line 2 AI + Wiki**：Prompt 模板化吃 locale 參數、Wiki 輸出語言切換
4. **Line 3 CLI**：終端訊息 i18n 化

### 確認的流程

```
需求 → 設計 → 實作（4 線 rollout）→ G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- 無 G1 阻斷（UI 變更範圍小，不需圖稿審核）
- G3（測試）通過前不得進入文件階段：未勾選，不阻斷

---

## 2. 技術方案

### 架構概覽

```
packages/web/src/locales/         ← 新增：翻譯檔 + i18n 初始化
├── en.json                       ← 英文（主語言）
├── zh-TW.json                    ← 繁體中文
└── index.ts                      ← i18next 初始化 + 匯出

packages/core/src/ai/
├── prompt-templates.ts           ← 修改：硬編碼中文 → 模板函式吃 locale
└── prompt-locale.ts              ← 新增：locale 相關常數（語言指令、回覆規則）

packages/core/src/types.ts        ← 修改：新增 Locale type

packages/cli/src/
├── i18n.ts                       ← 新增：CLI 翻譯載入器（輕量，讀 JSON）
├── locales/
│   ├── en.json                   ← CLI 英文訊息
│   └── zh-TW.json                ← CLI 中文訊息
├── commands/web.ts               ← 修改：locale 解析 + 傳遞給 server
├── commands/wiki.ts              ← 修改：--lang flag
└── server.ts                     ← 修改：locale 參數接收 + 傳遞給 core
```

### 選定方案

**Web i18n 框架：react-i18next**

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: react-i18next | 生態最大、TypeScript 友好、useTranslation hook | 依賴較多（~30KB gzipped） | ✅ 選定 |
| B: 自建輕量方案 | 零依賴 | 缺 plural/interpolation、維護成本高 | ❌ 排除 |

**CLI i18n：共用 JSON + 輕量載入器**

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: 共用 JSON | 簡單、不引重型框架 | 無 plural（CLI 不需要） | ✅ 選定 |
| B: i18next (node) | 功能齊全 | 過度設計 | ❌ 排除 |

**AI Prompt 語言切換：模板參數化**

| 方案 | 優點 | 缺點 | 結論 |
|------|------|------|------|
| A: 模板函式吃 locale | 精確控制、Prompt 品質可逐一調校 | 每個 Prompt 要寫兩份 | ✅ 選定 |
| B: 系統指令前置 locale | 簡單 | 模型可能忽略、品質不穩定 | ❌ 排除 |

### Locale 傳遞鏈（附錄 C 設計）

```
Web 場景：
  localStorage('codeatlas-locale') > navigator.language > 'en'
  ↓ 透過 API body 傳入
  POST /api/ai/analyze { locale: 'zh-TW' }
  POST /api/project/analyze { locale: 'zh-TW' }
  ↓ server 層補齊（undefined → 'en'）
  core AI prompt / Wiki 吃 options.locale（永遠收到明確值）

CLI 場景：
  --lang flag > .codeatlas.json locale > CODEATLAS_LANG env > 'en'
  ↓ 直接傳入
  core AI prompt / Wiki 吃 options.locale
```

**關鍵規則**：
1. **core 不猜 locale** — 所有 AI/Wiki 函式要求呼叫方明確傳入 `locale`
2. **API 層 optional，server 層補齊** — body 的 `locale` 為 optional，server 收到後補為明確值
3. **config > env** — `.codeatlas.json` 專案級優先於 `CODEATLAS_LANG` 機器級（刻意的產品決策）

### Key 命名規範

```
{區域}.{子區域}.{元素}
```

全小寫 camelCase，例：
- `toolbar.switchProject`, `toolbar.settings`
- `welcome.title`, `welcome.subtitle`
- `settings.language`, `settings.aiProvider`
- `panel.sf.title`, `panel.lo.title`

### 語言偵測優先順序（Web）

```
用戶手動設定（localStorage 'codeatlas-locale'）
  → 瀏覽器語系（navigator.language 'zh-TW' → 'zh-TW'，'zh' → 'zh-TW'）
  → 預設 English
```

---

## 3. UI 圖稿

> 提案書未勾選 UI 圖稿步驟，跳過。
>
> 唯一新增 UI 元素為 Settings 語言下拉選單，樣式與現有 AI Provider select 一致，不需獨立設計稿。

---

## 4. 檔案變更清單

### 新增

| 檔案 | 用途 |
|------|------|
| `packages/web/src/locales/en.json` | 英文翻譯檔（主語言） |
| `packages/web/src/locales/zh-TW.json` | 繁體中文翻譯檔 |
| `packages/web/src/locales/index.ts` | i18next 初始化 + 匯出 |
| `packages/core/src/ai/prompt-locale.ts` | Prompt locale 常數（語言指令、回覆規則） |
| `packages/cli/src/i18n.ts` | CLI 輕量翻譯載入器 |
| `packages/cli/src/locales/en.json` | CLI 英文訊息 |
| `packages/cli/src/locales/zh-TW.json` | CLI 中文訊息 |

### 修改

| 檔案 | 變更內容 |
|------|---------|
| `packages/core/src/types.ts` | 新增 `Locale` type、`AnalysisOptions.locale`、`WikiOptions.locale` |
| `packages/core/src/ai/prompt-templates.ts` | 6 個 prompt 模板函式加入 `locale` 參數，中英雙版本 |
| `packages/core/src/wiki-exporter/index.ts` | WikiExporter 接受 `locale` 參數 |
| `packages/core/src/wiki-exporter/md-renderer.ts` | Markdown 輸出標題/分類根據 locale 切換 |
| `packages/cli/src/server.ts` | API 路由接收 `locale` 參數、server 層補齊、傳遞給 core |
| `packages/cli/src/commands/web.ts` | `--lang` flag 解析 + locale 傳遞 |
| `packages/cli/src/commands/wiki.ts` | `--lang` flag |
| `packages/cli/src/index.ts` | 全域 `--lang` 選項 |
| `packages/cli/src/ai-pipeline.ts` | pipeline 接受 + 傳遞 locale 給 prompt 模板 |
| `packages/web/src/App.tsx` | 引入 i18n 初始化 |
| `packages/web/src/components/SettingsPopover.tsx` | 新增「語言」Section |
| `packages/web/src/components/settings/AISettingsSection.tsx` | 硬編碼中文 → `t()` |
| `packages/web/src/components/Toolbar.tsx` | 硬編碼中文 → `t()` |
| `packages/web/src/components/TabBar.tsx` | Tab 名稱 → `t()` |
| `packages/web/src/components/SearchBar.tsx` | Placeholder → `t()` |
| `packages/web/src/components/NodePanel.tsx` | 面板標題 → `t()` |
| `packages/web/src/components/LODetailPanel.tsx` | 面板內容 → `t()` |
| `packages/web/src/components/SFDetailPanel.tsx` | 面板內容 → `t()` |
| `packages/web/src/components/DJPanel.tsx` | 面板內容 → `t()` |
| `packages/web/src/components/WikiPreviewPanel.tsx` | 面板文字 → `t()` |
| `packages/web/src/components/WikiGraph.tsx` | 圖例/Badge → `t()` |
| `packages/web/src/components/Toast.tsx` | 通知訊息 → `t()` |
| `packages/web/src/pages/WelcomePage.tsx` | 歡迎頁所有文字 → `t()` |
| `packages/web/src/pages/ProgressPage.tsx` | 進度頁所有文字 → `t()` |
| `packages/web/src/components/ProjectInput.tsx` | 輸入提示 → `t()` |
| `packages/web/src/components/RecentProjects.tsx` | 列表文字 → `t()` |
| `packages/web/src/components/ContextMenu.tsx` | 右鍵選單 → `t()` |
| `packages/web/src/components/E2EPanel.tsx` | 面板文字 → `t()` |
| `packages/web/src/components/TracingPanel.tsx` | 面板文字 → `t()` |
| `packages/web/src/components/FilterPanel.tsx` | 篩選標籤 → `t()` |
| `packages/web/src/components/AIResultBlock.tsx` | AI 結果文字 → `t()` |
| `packages/web/src/components/FunctionPanel.tsx` | 面板內容 → `t()` |
| `packages/web/src/components/ImpactPanel.tsx` | 面板內容 → `t()` |
| `packages/web/src/components/GraphContainer.tsx` | 空狀態/載入文字 → `t()` |
| `packages/web/package.json` | 新增 `react-i18next`, `i18next` 依賴 |

### 刪除

| 檔案 | 原因 |
|------|------|
| 無 | 本 Sprint 不刪除檔案 |

---

## 5. 規範文件索引

| 文件 | 說明 |
|------|------|
| `.knowledge/specs/api-design.md` | API 端點新增 `locale` 參數（v10.0） |
| `.knowledge/specs/feature-spec.md` | 功能規格新增 i18n 章節（v20.0） |
| `.knowledge/specs/data-model.md` | 無變更（i18n 不改資料模型） |

---

## 6. 任務定義與分配

> L1 讀取本節後按依賴順序執行。第一步先執行 `/task-delegation` 建立 `.tasks/` 檔案，系統自動追蹤進度。

### 任務清單

| # | 任務名稱 | 說明 | 負責 Agent | 依賴 | 並行組 | 對應步驟 | 驗收標準 |
|---|---------|------|-----------|------|--------|---------|---------|
| T1 | i18n 架構設計 | key 命名規範文件、locale 傳遞鏈實作規則、web/core/cli 各層 i18n 策略。產出 `.knowledge/specs/i18n-design.md` | tech-lead | 無 | — | 設計 | 設計文件完成，locale 傳遞鏈清楚定義 Web / CLI 兩條路徑 |
| T2 | 型別定義 | `core/types.ts` 新增 `Locale` type（`'en' \| 'zh-TW'`）、`AnalysisOptions` 加 `locale?` 欄位、`WikiOptions` 加 `locale?` 欄位。`pnpm build` 零錯誤 | tech-lead | T1 | — | 實作 | 型別可被 cli 和 web 引用，build 零錯誤 |
| T3 | i18n 框架建立 | 安裝 `react-i18next` + `i18next`，建立 `packages/web/src/locales/index.ts` 初始化（語言偵測 localStorage → navigator → 'en'），`App.tsx` 引入。建立空的 `en.json` / `zh-TW.json` 骨架 | frontend-developer | T2 | — | 實作 | `useTranslation()` 可在任意元件使用，語言切換即時生效 |
| T4 | 翻譯檔 — 英文 | 掃描所有 Web 元件，提取產品內建 UI 字串為 key，建立完整 `en.json`。Key 遵循 `{區域}.{子區域}.{元素}` 命名規範 | frontend-developer | T3 | — | 實作 | en.json 包含所有產品 UI 字串（不含 AI 回傳/使用者輸入），key 命名一致 |
| T5 | 翻譯檔 — 繁體中文 | 根據 `en.json` 1:1 建立 `zh-TW.json`，使用現有元件中的中文字串 | frontend-developer | T4 | — | 實作 | zh-TW.json 與 en.json key 100% 一致，中文翻譯完整 |
| T6 | Web UI i18n 改造 | ~60 個元件硬編碼字串替換為 `t('key')`。範圍：產品內建 UI 字串（不含第三方元件、AI 回傳內容、使用者輸入） | frontend-developer | T5 | — | 實作 | 全部元件使用 `t()`，切換語言後所有 UI 文字即時更新，無遺漏硬編碼中文 |
| T7 | Settings 語言切換 | SettingsPopover 新增「語言」Section（English / 繁體中文 下拉選單），切換即時生效，持久化 localStorage `codeatlas-locale` | frontend-developer | T6 | — | 實作 | 切換語言即時生效，重新整理後保持選擇，樣式與現有 AI Provider select 一致 |
| T8 | AI Prompt 模板化 | `prompt-templates.ts` 6 個 prompt 模板從硬編碼中文改為模板函式吃 `locale` 參數。新增 `prompt-locale.ts` 常數檔。`ai-pipeline.ts` 傳遞 locale。`server.ts` 接收 locale 參數並補齊（未帶 → 'en'） | backend-architect | T2 | A | 實作 | 中文 Prompt 輸出品質不退化，英文 Prompt 可產出正確英文摘要/分析，locale 傳遞鏈正確 |
| T9 | Wiki 輸出語言 | `codeatlas wiki --lang en/zh-TW` 支援。WikiExporter 接受 `locale` 參數，.md 標題/描述/分類標籤根據 locale 切換。CLI `--lang` flag → `.codeatlas.json` → `CODEATLAS_LANG` → 'en' 優先級鏈 | backend-architect | T8 | — | 實作 | `--lang en` 產出英文 wiki，`--lang zh-TW` 產出中文 wiki，預設英文 |
| T10 | CLI 訊息 i18n | 新增 `packages/cli/src/i18n.ts` 輕量載入器 + `locales/en.json` + `locales/zh-TW.json`。終端輸出進度/錯誤/幫助文字 i18n 化。`--lang` flag 全域選項 | backend-architect | T9 | — | 實作 | CLI `--lang en/zh-TW` 切換終端訊息語言，預設英文 |
| T11 | 測試覆蓋 | i18n 切換測試（中→英→中保持正確）、翻譯 key 1:1 一致性測試（自動比對 en.json / zh-TW.json）、元件渲染雙語測試、Prompt 雙語輸出測試、locale 傳遞鏈整合測試 | test-writer-fixer | T7, T10 | — | 測試 | 所有新測試通過，翻譯完整性 100%，pnpm build 零錯誤，舊測試零回歸 |
| T12 | 文件更新 | feature-spec v20.0（新增 i18n 章節）、api-design v10.0（locale 參數）、CLAUDE.md 索引更新 | tech-lead | T11 | — | 文件 | 文件與程式碼一致，版本號遞增 |

### 依賴圖

```
T1（設計）→ T2（型別）→ T3（框架）→ T4（en.json）→ T5（zh-TW.json）→ T6（Web 改造）→ T7（語言切換）─┐
                    ↓                                                                                    │
                    T8（AI Prompt，並行組 A）→ T9（Wiki）→ T10（CLI）──────────────────────────────────────┤
                                                                                                         ↓
                                                                                                   T11（測試）→ T12（文件）
```

**並行說明**：
- T3~T7（Web 線）和 T8（AI 線）可並行，因為 T8 只依賴 T2（型別定義），不依賴 Web 框架
- T9、T10 與 Web 線 T6、T7 可時間重疊（不同 Agent）
- T11 需等 T7 和 T10 都完成才能開始

### L1 執行指令

> PM 產出此區塊，老闆複製貼入 L1 session 即可啟動。

```
請執行 Sprint 21 i18n 國際化開發計畫。

📄 計畫書：proposal/sprint21-dev-plan.md
📋 你負責的任務：T1（設計）, T2（型別）, T12（文件）
🎨 委派 frontend-developer：T3, T4, T5, T6, T7
🔧 委派 backend-architect：T8, T9, T10
🧪 委派 test-writer-fixer：T11

⚠️ Git flow：循序任務直接在 sprint-21 commit，並行任務（T8 並行組 A）開 task/s21-T8-ai-prompt-i18n branch

第一步請先執行 /task-delegation 建立任務檔案。
```

### 共用檔案（需協調）

| 檔案 | 涉及任務 | 風險等級 |
|------|---------|---------|
| `packages/core/src/types.ts` | T2 | 低 — T2 先完成，後續只讀 |
| `packages/cli/src/server.ts` | T8, T10 | 中 — T8 加 locale 參數，T10 加 CLI 訊息，需循序 |
| `packages/core/src/ai/prompt-templates.ts` | T8 | 低 — 僅 T8 修改 |
| `packages/web/src/locales/en.json` | T4, T6 | 中 — T4 建立骨架，T6 可能補充遺漏 key |

---

## 7. 測試計畫

### 單元測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `packages/web/__tests__/i18n-setup.test.ts` | i18n 初始化、語言偵測、fallback |
| `packages/web/__tests__/i18n-completeness.test.ts` | en.json / zh-TW.json key 1:1 一致性 |
| `packages/web/__tests__/i18n-components.test.tsx` | 關鍵元件雙語渲染（Toolbar, TabBar, WelcomePage, Settings） |
| `packages/core/__tests__/prompt-locale.test.ts` | Prompt 模板雙語輸出（中文包含中文指令、英文包含英文指令） |
| `packages/cli/__tests__/cli-i18n.test.ts` | CLI 翻譯載入器、`--lang` flag 解析 |

### 整合測試

| 測試檔案 | 測試案例 |
|---------|---------|
| `packages/cli/__tests__/locale-chain.test.ts` | locale 傳遞鏈：CLI flag > .codeatlas.json > env > default |
| `packages/cli/__tests__/server-locale.test.ts` | API 路由 locale 參數接收、server 補齊邏輯 |

---

## 8. 風險與緩解

| 風險 | 影響 | 緩解措施 |
|------|------|---------|
| 硬編碼字串遺漏 | 中 — 部分 UI 仍顯示中文 | T6 完成後全域搜尋中文字元（排除 AI 回傳/locales/），確保無遺漏 |
| react-i18next bundle size | 低 — ~30KB gzipped | 可接受，不做動態載入 |
| AI 英文 Prompt 品質退化 | 高 — 摘要/分析品質下降 | T8 逐功能比對中英 Prompt 輸出，確保品質 |
| en/zh-TW key 不一致 | 高 — 缺翻譯顯示 key 名 | T11 自動化測試比對 key 一致性 |
| Web ~60 元件改動量大 | 中 — 容易出錯 | 批次處理，先改共用元件（Toolbar/TabBar/Settings）再改頁面級 |

---

## 9. 文件更新

完成後需同步更新的文件：

- [x] `.knowledge/specs/feature-spec.md` → v20.0（新增 Sprint 21 i18n 描述 + i18n 功能規格）
- [x] `.knowledge/specs/api-design.md` → v10.0（API 端點新增 `locale` 參數）
- [x] `CLAUDE.md` → 文件索引更新
- [x] `.knowledge/specs/i18n-design.md` → 新增（T1 產出，i18n 架構設計文件）

---

## 10. 任務與審核紀錄（備查）

> 每個任務完成後記錄結果，每次 Review/Gate 通過後記錄決策。本區作為 Sprint 完整稽核軌跡。

### 任務完成紀錄

| 任務 | 完成日期 | 結果 | 備註 |
|------|---------|------|------|
| T1 | 2026-04-09 | ✅ 完成 | i18n-design.md v1.0 產出 |
| T2 | 2026-04-09 | ✅ 完成 | Locale type + PipelineOptions + WikiExportOptions |
| T3 | 2026-04-09 | ✅ 完成 | react-i18next 框架 + 語言偵測 |
| T4 | 2026-04-09 | ✅ 完成 | en.json ~393 keys |
| T5 | 2026-04-09 | ✅ 完成 | zh-TW.json ~393 keys |
| T6 | 2026-04-09 | ✅ 完成 | ~20 元件 t() 替換 |
| T7 | 2026-04-09 | ✅ 完成 | Settings 語言切換 + localStorage |
| T8 | 2026-04-09 | ✅ 完成 | 6 prompt 模板雙語 + prompt-locale.ts + server locale 傳遞 |
| T9 | 2026-04-10 | ✅ 完成 | md-renderer LOCALE_STRINGS + wiki --lang |
| T10 | 2026-04-10 | ✅ 完成 | CLI i18n 載入器 + 25 keys + --lang 全域選項 |
| T11 | 2026-04-10 | ✅ 完成 | 103 新測試 + 36 回歸修復，全 999+983+226 通過 |
| T12 | 2026-04-10 | ✅ 完成 | feature-spec v20.0, api-design v10.0, CLAUDE.md 更新 |

### Review 紀錄

| Review 步驟 | 日期 | 結果 | Review 文件連結 |
|------------|------|------|---------------|
| 設計 Review | 2026-04-10 | 通過 | T1 i18n-design.md 通過 |
| 實作 Review（Web 線） | 2026-04-10 | 通過 | T3-T7 通過，3 Minor 記錄 |
| 實作 Review（AI/Wiki/CLI 線） | 2026-04-10 | 通過 | T8-T10 通過 |
| 測試 Review | 2026-04-10 | 通過 | T11 103 新測試 + 回歸修復 |
| 文件 Review | 2026-04-10 | 通過 | T12 feature-spec/api-design/CLAUDE.md |

### Gate 紀錄

| Gate | 日期 | 決策 | 審核意見 |
|------|------|------|---------|
| G0 | 2026-04-09 | ✅ 調整後通過 | 附錄 C locale 傳遞鏈 + 4 線 rollout |
| G2 | 2026-04-10 | ✅ 通過 | 0 Blocker, 0 Major, 3 Minor（chineseDescription 語義/AiSummary 遺留/en.json 重複 key） |
| G3 | | | |
| G4 | | | |

---

**確認**: [ ] L1 確認 / [ ] Tech Lead 確認
