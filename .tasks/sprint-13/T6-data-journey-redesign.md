# T6 資料旅程改造

| 欄位 | 值 |
|------|-----|
| ID | T6 |
| 專案 | CodeAtlas |
| Sprint | Sprint 13 |
| 指派給 | frontend-developer |
| 優先級 | P0 |
| 狀態 | done |
| 依賴 | T4 |
| 預估 | 5h |
| 建立時間 | 2026-04-02T10:00:00.000Z |

---

## 任務描述

資料旅程視角從檔案入口，徹底改造為 API 端點入口 + 請求鏈追蹤 + 步驟節點 + 資料轉換面板。

**嚴格對照圖稿 Tab 3 + 規格書 §6**

### 新增元件

1. **`DJEndpointSelector.tsx`**（端點分類選擇畫面）：
   - 讀取 endpointGraph.endpoints
   - URL prefix 自動分類（videos → 🎬, auth → 🔐, billing → 💳）
   - 分類群組 + 2 欄網格
   - 端點卡片 260×64px，綠色虛線框 1.5px dashed
   - 左側分類色條
   - Hover：虛線變實線 + translateY(-2px) + shadow 加深
   - 脈衝環動畫 @keyframes dj-pulse 2s
   - 卡片顯示：HTTP method + path + 描述 + [N steps]

2. **`DJStepNode.tsx`**（步驟節點元件）：
   - 340×76px
   - Step N + 方法名 + 描述
   - 結構：.dj-step-num + .dj-step-name + .dj-step-desc

3. **改造 JourneyPanel → DJPanel**（右側面板 300px）：
   - .dj-panel-header-block：旅程標題（mono 綠）+ 副標題 + 步驟數
   - .dj-step-list：可滾動步驟列表
   - .dj-step-item：三態（未到達/進行中/已完成）
     - 未到達：灰底灰字，空心圓
     - 進行中：綠底白字 + 光暈
     - 已完成：淡綠底綠字 + 實心圓
   - 明細展開（.dj-step-detail，預設 display:none，手動點擊展開）：
     - 📥 Input
     - 📤 Output
     - 🔄 Transform
     - 📍 Method + File（方法→位置映射）
   - [重播此旅程] + [清除選取] 按鈕

4. **Stagger Animation 適配**：
   - 點擊端點卡片 → 隱藏選擇畫面 → 顯示旅程
   - fadeIn: opacity 0→1 (20ms interval, 0.15 step)
   - 邊 .appeared (opacity 0→0.8)
   - 當前節點 .active-step（綠色光圈）
   - 面板同步 djPanelHighlight（只高亮不展開明細）
   - 350ms 步進

5. **方法→位置映射**：每步 ChainStep 含 method + className + fileId

## 驗收標準

- [ ] 端點卡片按分類正確展示
- [ ] click 端點卡片啟動 stagger 播放
- [ ] 步驟節點 340×76 正確渲染
- [ ] 面板三態正確（未到/進行/完成）
- [ ] 明細展開顯示 Input/Output/Transform/Method+File
- [ ] 重播 + 清除正常
- [ ] 與圖稿 Tab 3 一致

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
