# Sprint 提案書: Sprint 19 — Wiki 知識輸出 + Obsidian 知識圖

> **提案人**: PM
> **日期**: 2026-04-08
> **專案**: CodeAtlas
> **Sprint 類型**: 新功能 + UI 改造（core + web + cli）
> **前置 Sprint**: Sprint 18（✅ 完成 — Python + Java 多語言）
> **狀態**: 待 G0 審核

---

## 1. 目標

CodeAtlas 目前只有互動式 Web UI 一種輸出。本 Sprint 新增兩大功能：

1. **Wiki 知識輸出**：`codeatlas wiki` 指令掃描專案後產出一整套互連的 `.md` 檔案，用 Obsidian 開啟即可看到知識關聯圖。每份 `.md` 用 `[[wiki-link]]` 互相連結，內容由靜態分析 + AI 深度分析生成。

2. **知識圖 Tab**：Web UI 新增第四個 Tab「知識圖」，取代原有 3D 視覺層。使用 Obsidian 風格的 2D 力導向圖（圓點 + 連線 + 標籤），點擊節點顯示 `.md` 文件預覽，並可跳轉到 SF/LO/DJ 三視角。

核心優勢：CodeAtlas 的 wiki-link 不是 AI 猜的，是靠靜態分析的真實依賴關係生成的，比純 AI 整理的 wiki 精準得多。

---

## 2. 範圍定義

### 做

| # | 功能/任務 | 優先級 | 說明 |
|---|----------|--------|------|
| S19-1 | **Wiki Exporter 模組** | P0 | core 層新增 wiki-exporter：讀取 Graph JSON → 產出結構化 `.md` 檔案群（overview / modules / files / endpoints） |
| S19-2 | **Wiki-link 生成** | P0 | 根據 GraphEdge 真實依賴關係自動插入 `[[wiki-link]]`，不依賴 AI 猜測 |
| S19-3 | **AI 深度分析 Prompt** | P0 | 現有一句話摘要 prompt 改為「完整模組/檔案說明」，產出職責、核心方法、資料流、依賴關係等完整段落 |
| S19-4 | **雙層元資料** | P0 | 每個 `.md` 包含兩層元資料：(1) **YAML frontmatter**（文件頭）— 給 markdown 解析器和 Obsidian 用，放 id / type / displayName / lang / path 等結構欄位；(2) **HTML 註解**（文件底）— 給 CodeAtlas Web UI 用，放 `@codeatlas:sf/lo/dj` 三視角跳轉錨點，Obsidian 不可見。分兩層是因為 frontmatter 是標準格式、工具通用，而 viewAnchor 是 CodeAtlas 專屬邏輯，不應污染通用 metadata |
| S19-5 | **CLI `codeatlas wiki` 指令** | P0 | 新增 CLI 指令，掃描專案 → 輸出 `.md` 到指定目錄（預設 `.codeatlas/wiki/`） |
| S19-6 | **知識圖 Tab — 圖譜渲染** | P0 | Web UI 第四個 Tab，D3 force 2D 力導向圖，Obsidian 風格（圓點大小 = 連結數、簡單直線、常駐文字標籤） |
| S19-7 | **知識圖 Tab — MD 預覽面板** | P0 | 點擊節點 → 右側面板渲染 `.md` 內容（markdown → HTML）+ 底部三視角跳轉連結 |
| S19-8 | **雙向跳轉** | P0 | 知識圖 → 三視角（透過元資料跳轉）+ 三視角 → 知識圖（右面板新增「📚 查看知識文件」按鈕） |
| S19-9 | **移除 3D 視覺層** | P0 | 移除 3d-force-graph / Three.js 相關程式碼，2D/3D 切換改為 SF/LO/DJ/Wiki 四 Tab |
| S19-10 | **節點層級控制** | P1 | Level 1 模組（大圓點）+ Level 2 檔案（中圓點）+ Level 3 方法（小圓點，zoom in 展開） |
| S19-11 | **多語言 Wiki 支援** | P0 | Wiki 輸出對 Python/Java/JS/TS 專案都能正確產出（串接 Sprint 18 多語言成果） |
| S19-12 | **測試** | P0 | wiki-exporter 單元測試 + 知識圖 Tab 測試 + 回歸 |
| S19-13 | **文件更新** | P0 | feature-spec + CLAUDE.md + API 規格更新 |

### 不做（明確排除）

- Obsidian plugin 整合（使用者自行用 Obsidian 開啟 wiki 目錄）
- Wiki 即時同步（每次需手動執行 `codeatlas wiki`）
- Wiki 編輯功能（只讀輸出，不支援使用者在 Web UI 內編輯）
- Wiki 網頁發佈（不做 static site generator，使用者可自行用 Obsidian Publish 等工具）
- 3D 視覺保留選項（完全移除，不做 2D/3D 切換）
- 開源發佈（推到 Sprint 21）
- i18n 中英多語系（推到 Sprint 20）

---

## 3. 流程決策（G0 核心產出）

### 步驟勾選

| 勾選 | 步驟 | 說明 | 對應關卡 | 備註 |
|------|------|------|---------|------|
| [x] | 需求分析 | 本文件 | G0 | 必選 |
| [x] | 設計 | wiki exporter 架構 + 知識圖 Tab 設計 | — | |
| [x] | UI 圖稿 | 知識圖 Tab + MD 預覽面板 mockup | G1: 圖稿審核 | 有 UI 新增 |
| [x] | 實作 | core + web + cli 三層改動 | G2: 程式碼審查 | |
| [x] | 測試 | wiki-exporter + 知識圖 + 回歸 | G3: 測試驗收 | |
| [x] | 文件 | feature-spec + api-design + CLAUDE.md | G4: 文件審查 | |
| [ ] | 部署 | — | — | 不需 |
| [ ] | 發佈 | — | — | Sprint 21 |

### 確認的流程

```
需求 → 設計 → UI 圖稿 → G1（圖稿審核）→ 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）→ 文件 → G4（文件審查）
```

### 阻斷規則

- [x] G1（圖稿）通過前不得開始前端實作（知識圖 Tab 是新 UI）

---

## 4. 團隊分配

| 角色 | Agent | 負責範圍 |
|------|-------|---------|
| L1 領導 | tech-lead | 整體架構、wiki-exporter 設計、Review |
| L2 Core | backend-architect | wiki-exporter 模組 + wiki-link 生成 + 元資料標記 |
| L2 Web | frontend-developer | 知識圖 Tab + MD 預覽面板 + 雙向跳轉 + 3D 移除 |
| L2 CLI | backend-architect | `codeatlas wiki` 指令 |
| L2 AI | ai-engineer | 深度分析 Prompt 改造 |
| L2 測試 | test-writer-fixer | wiki-exporter + 知識圖 + 回歸 |
| DD | ui-designer | 知識圖 Tab G1 圖稿 |

---

## 附錄 A：Wiki Export Contract

> **本節定義 wiki-exporter 的中介資料格式，core 產出、web/cli 消費，三方必須對齊。**

### Wiki Node 型別

| type | 說明 | 來源 | 對應頁面 |
|------|------|------|---------|
| `module` | 目錄/模組 | GraphNode（directory aggregation） | `modules/{slug}.md` |
| `file` | 原始碼檔案 | GraphNode（file 級） | `files/{slug}.md` |
| `endpoint` | API 端點 | endpoint-detector | `endpoints/{slug}.md` |
| `method` | 方法/函式（★ 核心方法） | function-extractor + role-classifier | `methods/{slug}.md`（僅 ★ 標記） |

### Wiki Edge 型別

| type | 說明 | 來源 |
|------|------|------|
| `imports` | A import B | import-extractor |
| `calls` | A 呼叫 B | call-analyzer |
| `owns` | 目錄包含檔案 / 檔案包含方法 | scanner + function-extractor |
| `exposes` | 模組對外 export | import-extractor（export 分析） |
| `dataflow` | 資料旅程步驟連接 | endpoint-detector + call-analyzer |

### Wiki Node Schema

```typescript
interface WikiNode {
  // 身份
  id: string;              // stable canonical id（見附錄 B）
  slug: string;            // 檔名用 slug（見附錄 B）
  type: 'module' | 'file' | 'endpoint' | 'method';
  displayName: string;     // 人類可讀名稱（如 "auth-service.ts"、"POST /api/users"）
  lang: SupportedLanguage; // 'javascript' | 'typescript' | 'python' | 'java'

  // 內容
  path: string;            // 相對專案根目錄路徑
  summary?: string;        // AI 生成摘要（可能為空 = AI 未分析或失敗）
  ruleSummary: string;     // 規則生成骨架（永遠有值）

  // 關聯
  edges: WikiEdge[];       // 出邊列表
  mdPath: string;          // 產出的 .md 相對路徑

  // 三視角錨點
  viewAnchors: {
    sf?: string;           // SF 視角對應 ID（目錄級）
    lo?: string[];         // LO 視角對應 ID（方法級，可能多個）
    dj?: string[];         // DJ 視角對應 ID（端點級，可能多個）
  };
}

interface WikiEdge {
  type: 'imports' | 'calls' | 'owns' | 'exposes' | 'dataflow';
  targetId: string;        // 目標 WikiNode.id
  targetSlug: string;      // 用於生成 [[wiki-link]]
  label?: string;          // 邊標籤（如 import 的 symbol 名稱）
}
```

### 三視角 Metadata 粒度對應

| 視角 | 對應粒度 | viewAnchors 欄位 | 說明 |
|------|---------|-----------------|------|
| SF（系統框架） | 目錄級 | `sf` | 一個 wiki page → 一個 SF 目錄卡片 |
| LO（邏輯運作） | 方法級 | `lo[]` | 一個 wiki page 可能包含多個 LO 方法 |
| DJ（資料旅程） | 端點級 | `dj[]` | 一個 wiki page 可能關聯多個 DJ 端點 |

---

## 附錄 B：Page ID / Slug / Link 命名規則

### Stable Canonical ID

```
{type}:{relative-path}:{name}
```

| 範例 | 說明 |
|------|------|
| `module:src/auth` | 目錄 |
| `file:src/auth/auth-service.ts` | 檔案 |
| `endpoint:POST:/api/users` | 端點 |
| `method:src/auth/auth-service.ts:generateToken` | 方法 |

- ID 基於檔案路徑，保證跨次執行穩定
- 路徑使用 `/` 分隔（不管 OS）
- **canonical id**：全部小寫正規化，用於 registry 比對和唯一性判定
- **slug**：保留原始大小寫（Java class `UserService` 需可讀），用於 .md 檔名和 `[[wiki-link]]` 顯示
- **registry 比對規則**：使用 canonical id（小寫）比對，slug 衝突判定也基於小寫正規化後的值
- **跨平台檔名安全**：slug 產出後額外過一次 `sanitizeFilename()`，移除 OS 不合法字元，但盡量保留可讀性

### Slug 規則（用於 .md 檔名 + wiki-link target）

```
{type}--{path-segments-joined-by-double-dash}
```

| Canonical ID | Slug | 檔名 |
|---|---|---|
| `module:src/auth` | `module--src--auth` | `modules/module--src--auth.md` |
| `file:src/auth/auth-service.ts` | `file--src--auth--auth-service-ts` | `files/file--src--auth--auth-service-ts.md` |
| `endpoint:POST:/api/users` | `endpoint--post--api--users` | `endpoints/endpoint--post--api--users.md` |
| `method:src/auth/auth-service.ts:generateToken` | `method--src--auth--auth-service-ts--generateToken` | `methods/method--src--auth--auth-service-ts--generateToken.md` |

### 規則

1. **slug 全域唯一** — exporter 產出時建立 slug registry，衝突時附加數字後綴（`-2`、`-3`）
2. **displayName 與 slug 分離** — `[[module--src--auth|auth 認證模組]]` 格式，`|` 後面是人類可讀文字
3. **特殊字元處理** — `.` → `-`、`/` → `--`、`:` → `--`、空白 → `-`
4. **大小寫** — slug 保留原始大小寫（Java class 需要）；跨平台安全由 slug 正規化保證（不使用 Windows 不合法字元 `<>:"/\|?*`）
5. **Dead link 防護** — exporter 只生成 registry 中已存在 slug 的 `[[link]]`。產出完畢後跑 dead link checker，count 必須 = 0

### 同名衝突處理

| 場景 | 處理 |
|------|------|
| 同名檔案不同路徑（`src/utils.ts` vs `lib/utils.ts`） | 路徑已包含在 slug，天然不衝突 |
| Java class 名 = 檔名 | `file:` 和 `method:` type 前綴不同，不衝突 |
| rename 後舊 link | Wiki 每次全量重新產出，不保留舊檔。使用者如需差異追蹤，自行 git diff |

---

## 附錄 C：AI vs 規則責任邊界

### 原則

> **規則負責結構，AI 負責語義。規則永遠產出，AI 可選增強。AI 禁止虛構不存在的程式碼元素。**

### 欄位責任對照

| .md 段落 | 資料來源 | 規則（必有） | AI（可選增強） | AI 失敗時降級 |
|---------|---------|------------|--------------|-------------|
| **標題** | displayName | ✅ 規則產出 | ❌ 不參與 | — |
| **職責摘要** | — | ❌ 無 | ✅ AI 生成 | 顯示「（待分析）」 |
| **核心檔案/方法列表** | scanner + extractor | ✅ 規則產出完整列表 | ✅ AI 補充一句話描述 | 列表保留，描述欄空白 |
| **資料流描述** | call-analyzer + endpoint-detector | ✅ 規則產出呼叫鏈序列 | ✅ AI 轉為人類可讀描述 | 顯示原始呼叫鏈（`A → B → C`） |
| **依賴關係** | import-extractor | ✅ 規則產出 import/export 列表 | ❌ 不參與 | — |
| **wiki-link** | GraphEdge | ✅ 規則產出 | ❌ 不參與 | — |
| **注意事項/建議** | — | ❌ 無 | ✅ AI 推論 | 整段不顯示 |
| **viewAnchors 元資料** | graph mapping | ✅ 規則產出 | ❌ 不參與 | — |

### AI 硬性禁令

1. **禁止虛構方法/檔案/依賴** — AI 不得在 wiki 中提及靜態分析未發現的程式碼元素
2. **禁止生成 wiki-link** — 所有 `[[link]]` 只由 exporter 規則層產出
3. **禁止修改結構資料** — AI 只填充描述欄位，不得改動列表、依賴、呼叫鏈等結構欄位
4. **AI 輸出必須標記** — AI 生成的段落前綴 `<!-- @ai-generated -->` 註解，方便區分

### 降級保證

即使 AI 完全不可用（disabled / 全部失敗），wiki 仍可產出：
- 結構完整（目錄、檔案、方法列表、依賴關係、呼叫鏈）
- 所有 wiki-link 正常
- 所有 viewAnchors 正常
- 只缺語義描述（職責、注意事項）

---

## 附錄 D：G3 可機械驗收指標

| # | 指標 | 條件 | 檢查方式 |
|---|------|------|---------|
| 1 | Dead links | = 0 | exporter 內建 dead link checker，輸出報告 |
| 2 | Wiki page coverage | page count / graph node count ≥ 80%。module + file 級 = 100%；method 級僅輸出核心方法（★ 標記），不追求全量頁面化，以可讀性與訊號密度為優先 | exporter 輸出統計 |
| 3 | Frontmatter parse | 100% success | 每個 .md 必須有合法 YAML frontmatter，exporter 產出後驗證 |
| 4 | Metadata completeness | module / endpoint page 必須有 ≥1 viewAnchor；file / method page 若無對應視角可允許 empty，但 frontmatter 須標記 `unmapped: true` | 掃描所有 `<!-- @codeatlas: -->` 註解 + frontmatter unmapped 欄位 |
| 5 | MD preview render | 在 fixture 專案與測試環境 baseline 下，點擊節點 → preview mock render ≤ 300ms | 前端測試 mock render timing（fixture 級別，不含網路延遲） |
| 6 | 三視角跳轉成功率 | 100% | 測試每個 viewAnchor 跳轉目標存在 |
| 7 | 3D 移除乾淨度 | bundle 不含 `three` / `3d-force-graph` / `Graph3DCanvas` | build 後 grep 產出物 |
| 8 | pnpm build | 零錯誤 | CI |
| 9 | pnpm test | 零失敗 | CI |
| 10 | 回歸 | SF/LO/DJ 三視角 + AI 按需分析正常 | 既有測試全過 |

---

## 附錄 E：四語言 Fixture 測試矩陣

### Fixture 專案定義

| Fixture | 語言 | 結構 | 預期規模 |
|---------|------|------|---------|
| `fixtures/wiki-ts-sample` | TypeScript | Express-like：routes/ + services/ + models/ | 8-12 檔案 |
| `fixtures/wiki-js-sample` | JavaScript | 簡單 Node.js：lib/ + utils/ + index.js | 5-8 檔案 |
| `fixtures/wiki-py-sample` | Python | Flask-like：app/ + models/ + routes/ + `__init__.py` | 8-12 檔案 |
| `fixtures/wiki-java-sample` | Java | Spring Boot-like：controller/ + service/ + model/ | 8-12 檔案 |

### 每個 Fixture 驗收矩陣

| 檢查項 | 條件 | 說明 |
|--------|------|------|
| page count | > 0 且與 graph node count 匹配 | 不能少頁面 |
| dead links | = 0 | 零壞連結 |
| wiki-link count | > 0 | 至少要有互連 |
| module page | ≥ 1 | 至少產出一個模組頁 |
| file page | = 掃描到的檔案數 | 每個檔案都有頁面 |
| endpoint page | ≥ 0（Python/Java 如有 route 則 > 0） | 端點頁依專案而定 |
| frontmatter valid | 100% | YAML 解析成功 |
| viewAnchor present | ≥ 80% pages | 多數頁面有三視角連結 |
| language field | 正確（py→python, java→java, ts→typescript, js→javascript） | 語言偵測正確 |
| Obsidian graph | 開啟後有連線圖（手動驗證 1 次） | 最終人工確認 |

---

## 附錄 F：3D 移除 Migration Checklist

### 待移除檔案/模組

| 檔案/模組 | 說明 | 確認方式 |
|-----------|------|---------|
| `packages/web/src/components/Graph3DCanvas.tsx` | 3D 主畫布元件 | 刪除 |
| `packages/web/src/components/three-scene-helpers.ts` | Three.js 場景工具（Sprint 17 拆出） | 刪除 |
| `packages/web/src/hooks/use3DHighlightEffects.ts` | 3D 高亮效果 hook（Sprint 17 拆出） | 刪除 |
| `packages/web/src/components/Graph3DCanvas*.test.*` | 3D 相關測試 | 刪除 |
| `3d-force-graph` 依賴 | package.json | 移除 + `pnpm install` |
| `three` 依賴 | package.json（如無其他使用） | 確認無其他引用後移除 |

### 待修改檔案

| 檔案 | 修改內容 | 確認方式 |
|------|---------|---------|
| `App.tsx` | 移除 3D 相關 import + 2D/3D 切換邏輯 → 四 Tab 切換 | build 通過 |
| `ControlPanel` / `SettingsPopover` | 移除 2D/3D 切換開關 | build 通過 |
| `viewState` | 移除 `is3D` / `renderMode` 等 3D 狀態 | build 通過 |
| `graph-adapter` | 如有 3D 專用轉換邏輯，移除 | build 通過 |
| 測試檔案 | 移除 3D 相關 mock 和 test case | test 通過 |

### 驗證步驟

1. `grep -r "3d-force-graph\|Graph3DCanvas\|three-scene\|use3DHighlight\|is3D\|renderMode.*3d" packages/web/src/` → 零命中
2. `pnpm build` → 零錯誤
3. `pnpm test` → 零失敗
4. build 產出物 `grep -r "three\|3d-force-graph" packages/web/dist/` → 零命中
5. SF / LO / DJ 三視角手動驗證正常

---

## 5. 風險評估

| 風險 | 可能性 | 影響 | 緩解措施 |
|------|--------|------|---------|
| AI 深度分析品質不穩 | 中 | 中 | 規則骨架永遠產出，AI 只補語義描述；AI 禁止虛構（附錄 C）；降級時骨架仍完整 |
| 移除 3D 影響現有功能 | 低 | 高 | migration checklist（附錄 F）逐項確認；grep 驗證零殘留 |
| D3 force 知識圖效能（大專案節點多） | 中 | 中 | Level 控制預設只顯示 Level 1+2，Level 3 zoom in 才展開 |
| Wiki .md 檔案量太大 | 低 | 低 | method 級只產出 ★ 核心方法；level 控制 |
| 跨三層改動（core+web+cli）協調 | 中 | 中 | Wiki Export Contract（附錄 A）統一 schema，三方開發前先對齊 |
| Wiki-link slug 衝突 | 低 | 中 | slug registry + 衝突後綴（附錄 B）；dead link checker 兜底 |
| AI 生成內容摻幻覺 | 中 | 高 | AI 硬性禁令（附錄 C）：禁止虛構、禁止生成 link、必須標記 `@ai-generated` |

---

## 6. 失敗模式分析

| 失敗場景 | 可能性 | 影響 | 偵測方式 | 緩解措施 |
|---------|--------|------|---------|---------|
| Wiki-link 指向不存在的頁面 | 中 | 低 | dead link checker（附錄 D #1） | exporter 建立 slug registry，只生成已存在頁面的 link |
| AI 虛構不存在的方法/依賴 | 中 | 高 | code review + AI 硬性禁令 | AI 只填描述欄位，結構欄位全由規則產出（附錄 C） |
| AI 產出的 .md 格式不符 Obsidian 規範 | 低 | 中 | frontmatter parse 驗證（附錄 D #3） | 固定 YAML frontmatter + 標準 markdown |
| 移除 3D 後遺漏引用導致 build 失敗 | 低 | 高 | grep + build（附錄 F） | migration checklist 逐項確認 |
| 跨層 schema 理解不一致 | 中 | 高 | 開發前對齊 + 單元測試 | Wiki Export Contract（附錄 A）作為唯一真相來源 |

---

## 7. 可觀測性

- **pnpm build**：零錯誤
- **pnpm test**：零失敗 + 新測試覆蓋
- **Dead link checker**：exporter 產出後自動跑，count = 0
- **Wiki 統計**：exporter 輸出 page count / link count / coverage 報告
- **知識圖 Tab**：`codeatlas web` → 第四個 Tab 可正常渲染 + 點擊 + 跳轉
- **3D 移除驗證**：build 產出物 grep 零命中

---

## 8. Rollback 計畫

| 項目 | 說明 |
|------|------|
| 程式碼回滾 | git revert Sprint 19 commits |
| 3D 移除回滾 | 3D 移除是獨立 commit（不與其他功能混合），可單獨 revert |
| 判斷標準 | Wiki 功能破壞 SF/LO/DJ 現有視角 |
| 負責人 | tech-lead |
| 注意 | 3D 移除必須作為獨立 commit，確保可單獨回滾 |

---

## 9. 驗收標準

### 必達（可機械檢查）

- [ ] `codeatlas wiki` 指令產出 `.md` 檔案到 `.codeatlas/wiki/`
- [ ] Dead links = 0（exporter 內建 checker）
- [ ] Wiki page coverage ≥ 80%（module + file 級 = 100%）
- [ ] Frontmatter parse 100% success
- [ ] module / endpoint page 必須有 viewAnchor；file / method page 無對應時標記 `unmapped: true`
- [ ] 點擊知識圖節點 → 300ms 內顯示 MD 預覽
- [ ] 三視角跳轉成功率 100%
- [ ] Build 產出物不含 `three` / `3d-force-graph` / `Graph3DCanvas`
- [ ] 四語言 fixture 全部通過驗收矩陣（附錄 E）
- [ ] pnpm build 零錯誤
- [ ] pnpm test 零失敗

### 回歸

- [ ] SF / LO / DJ 三視角正常
- [ ] AI 按需分析正常
- [ ] 2D 渲染正常

---

**G0 審核結果**

**老闆決策**: [x] 通過

**審核意見**: 老闆 2026-04-08 審核通過。首輪提出 6 項必補（Export Contract / Page ID 規則 / AI 邊界 / 機械驗收 / Fixture 矩陣 / 3D 移除 checklist），PM 補齊後二輪微調 5 項（frontmatter vs HTML 註解角色區分 / viewAnchor 完整性放寬 file/method / slug 大小寫三層規則 / render 300ms 前提 / coverage 80% rationale）。規格完整，可進入 G1 及實作準備。

**確認的流程**: 需求 → 設計 → UI 圖稿 → G1 → 實作 → G2 → 測試 → G3 → 文件 → G4
