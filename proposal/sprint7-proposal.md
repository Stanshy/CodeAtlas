# Sprint 提案書: Sprint 7 — 函式級解析 + 呼叫鏈

> **提案人**: PM
> **日期**: 2026-03-31
> **專案**: CodeAtlas
> **Sprint 類型**: 功能開發
> **六問診斷**: `proposal/sprint7-diagnosis.md`（全部通過，Q6 標注高複雜度）
> **前置 Sprint**: Sprint 6 — Ollama + 隱私強化（✅ 已完成）

---

## 1. 目標

從模組級深入到函式級。使用者不只看到「A 檔案 import B 檔案」，還能看到「A 裡的 handleLogin() 呼叫了 B 裡的 validateUser()」。點進檔案看到內部函式/class 節點，選一個函式展開完整呼叫路徑。從「看架構」深入到「看邏輯」。

**一句話驗收**：點進檔案 → 看到函式節點 → 選一個函式 → 呼叫鏈亮起 → 「原來邏輯是這樣跑的」。

---

## 2. 確認的流程

```
需求 → 設計 → 實作 → G2（程式碼審查）→ 測試 → G3（測試驗收）
```

> 無 G1（延續現有 2D/3D 視覺風格，無新視覺模式設計）。
> core 層為主力（解析引擎擴充），web 層跟進（函式級視圖）。

### 阻斷規則

- 無額外阻斷規則
- 但建議 **先 core 後 web** — core 解析正確後再做視覺化

---

## 3. 功能清單

### P0（必做）

| # | 功能 | 描述 |
|---|------|------|
| S7-1 | 函式/類別/方法定義解析 | tree-sitter 擴充：解析 function declaration、arrow function、class declaration、class method。產出 function/class 類型的 GraphNode，掛在所屬 file 節點下 |
| S7-2 | 呼叫關係分析 | 靜態分析函式之間的呼叫關係。產出 `call` 類型的 GraphEdge。支援：直接呼叫 `foo()`、方法呼叫 `obj.foo()`、new 建構 `new Foo()`。無法分析的動態呼叫標記 confidence: low |
| S7-3 | 呼叫鏈圖 | 選一個函式 → 展開完整呼叫路徑（caller → callee 鏈）。復用 Sprint 5 的路徑追蹤 BFS 演算法（擴充為支援 call edge） |
| S7-4 | 節點第三層（Zoom Into File） | 2D/3D 中雙擊檔案節點 → 展開該檔案內部 → 看到函式/class 子節點。再次雙擊或按 Escape → 收合回檔案級 |
| S7-5 | 函式 I/O 視覺化 | 函式節點顯示參數（輸入）和回傳型別（輸出）。面板中展示函式簽名詳情 |
| S7-6 | 2D + 3D 雙模式適配 | 函式級節點、呼叫邊、zoom into 在 2D 和 3D 模式下都可用 |

### P1（應做，視時間）

| # | 功能 | 描述 |
|---|------|------|
| S7-7 | API 路徑視圖 | 偵測 Express/Fastify route 定義 → handler → service → data access 的呼叫路徑。自動高亮「一個 API 從入口到資料庫」的完整鏈路 |
| S7-8 | 函式複雜度標記 | 函式節點大小/亮度反映複雜度（行數 + 呼叫數 + 參數數） |

---

## 4. 範圍界定

### 做

- tree-sitter 擴充：函式/類別/方法定義解析
- 靜態呼叫關係分析（直接呼叫 + 方法呼叫 + new）
- 呼叫鏈圖（BFS 路徑追蹤）
- 節點第三層 zoom into file
- 函式 I/O（參數 + 回傳型別）
- 2D + 3D 適配
- data-model 擴充（function/class node、call edge）
- API 端點擴充（函式級資料）

### 不做

- 動態呼叫追蹤（`obj[method]()`）— 標記 confidence: low 即可
- Runtime profiling / 執行時間分析
- 跨語言呼叫分析
- 變數級 taint analysis
- 控制流分析（if/else/loop 分支）
- callback 深度追蹤（`setTimeout(fn)` 中的 fn）

---

## 5. 團隊

| 角色 | Agent | 職責 |
|------|-------|------|
| L1 領導 | tech-lead | 任務拆解、解析器架構設計、Review、Gate 回報 |
| 後端開發 | backend-architect | tree-sitter 解析擴充、呼叫分析、data-model 擴充 |
| 前端開發 | frontend-developer | 節點第三層、呼叫鏈視圖、函式節點元件 |
| 測試 | test-writer-fixer | 解析測試（各種函式寫法）、呼叫鏈測試、回歸 |

---

## 6. 驗收標準

### 解析驗收

- [ ] tree-sitter 正確解析 JS/TS 的 function declaration、arrow function、class declaration、class method
- [ ] 解析結果產出 function/class 類型的 GraphNode，含 parentFileId 關聯
- [ ] 靜態呼叫分析產出 call 類型的 GraphEdge，含 caller → callee 關係
- [ ] 動態呼叫（無法靜態分析）標記 confidence: low

### 功能驗收

- [ ] 雙擊檔案節點 → 展開內部函式/class 子節點（2D + 3D）
- [ ] Escape 或再次雙擊 → 收合回檔案級
- [ ] 選一個函式 → 呼叫鏈高亮（caller → callee 完整路徑）
- [ ] 函式節點顯示參數列表和回傳型別
- [ ] 面板顯示函式簽名詳情

### 資料模型驗收

- [ ] GraphNode 支援 type: 'function' | 'class'，含 parentFileId
- [ ] GraphEdge 支援 type: 'call'，含 caller/callee 資訊
- [ ] 既有模組級 nodes/edges 不受影響（向下相容）
- [ ] Graph JSON 格式向下相容（新增欄位為 optional）

### 回歸驗收

- [ ] 現有 523+ tests 全部通過，零回歸
- [ ] 模組級圖譜（Sprint 1-6）所有功能不受影響

---

## 7. 風險

| 風險 | 等級 | 緩解方式 |
|------|------|---------|
| tree-sitter query 複雜度 | 高 | JS/TS 函式定義變化多（宣告/箭頭/method/getter/setter），逐一寫 query 測試 |
| 靜態呼叫分析不完整 | 中 | 明確標記 confidence，不追求 100%，> 70% 覆蓋率即可 |
| Graph JSON 資料量暴增 | 中 | 函式級節點數可能是檔案級的 5-10 倍。預設只展開被雙擊的檔案，不全部載入 |
| 節點第三層 zoom 的 UX | 中 | 2D 用 React Flow 的 subflow/group，3D 用 camera 飛入 + 子場景 |
| Sprint 時程緊張 | 高 | P1（API 路徑視圖、複雜度標記）視時間調整，P0 優先 |
| core 解析引擎修改影響現有分析 | 中 | 函式級解析為新增 pass，不改現有 import/export 解析邏輯 |

---

## 8. 初步時程

| 階段 | 任務 | 預估 |
|------|------|------|
| 設計 | 解析器架構 + data-model 擴充 + zoom 互動設計 | 1 天 |
| 實作 — core | 函式定義解析 + 呼叫分析 + data-model 擴充 | 2 天 |
| 實作 — web | 函式節點元件 + zoom into + 呼叫鏈圖 + 面板 | 2 天 |
| 實作 — API | Graph JSON 擴充 + API 端點 | 0.5 天 |
| 測試 | 解析測試 + 呼叫鏈測試 + zoom 測試 + 回歸 | 1.5 天 |

---

## G0 審核

**老闆決策**: [x] 通過

**審核意見**: 2026-03-31 老闆核准 G0。P1 視時間調整。

**確認的流程**: 需求 → 設計 → 實作 → G2 → 測試 → G3
