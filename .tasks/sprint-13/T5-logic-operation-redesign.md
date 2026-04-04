# T5 邏輯運作改造

| 欄位 | 值 |
|------|-----|
| ID | T5 |
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

邏輯運作視角從 dimmed + click 聚焦，徹底改造為分類群組 + 方法呼叫鏈流程圖。

**嚴格對照圖稿 Tab 2 + 規格書 §5**

### 新增元件

1. **`LOCategoryGroup.tsx`**（分類群組卡片）：
   - 5 個群組：routes / middleware / services / models / utils
   - 每張卡片寬 240px，行高 24px，標頭 36px
   - >5 個方法預設收合，附「▼ 展開更多 (N)」按鈕
   - 展開/收合切換時重算佈局
   - 群組色碼：routes #1565c0, middleware #00838f, services #7b1fa2, models #4e342e, utils #546e7a
   - dagre TB 方向佈局（Layer 0~3）
   - 群組間虛線依賴箭頭（stroke-dasharray: 6 3, opacity: 0.6）

2. **`LOCallChain.tsx`**（呼叫鏈流程圖）：
   - 點擊方法 → loFindChainForMethod → 查 LO_METHOD_TO_CHAIN → loSelectChain
   - 群組消失 → dagre TB 流程圖展開
   - nodeW=200, nodeH=44, layerH=100
   - 每節點：左側 3px 色條 + 方法名 + class/module
   - 左側裝飾：● 色圓點 + 層號
   - 邊：Bezier 曲線，分類色
   - 3 條預定義鏈：upload (10 nodes), query (7 nodes), auth (6 nodes)

3. **`LODetailPanel.tsx`**（方法簽名面板 300px）：
   - 🔧 Method name（帶分類色條）
   - Signature（mono 字體）
   - Class + File path（方法→位置映射）
   - Lines / Complexity 指標
   - ⬆ Callers (N)
   - ⬇ Callees (N)
   - 📊 Avg execution / Error rate

4. **LO_METHOD_TO_CHAIN 映射表**：44 個方法→鏈映射

5. **清除選取**：click「清除選取」→ 重建群組卡片

## 驗收標準

- [ ] 初始 5 群組卡片正確渲染
- [ ] >5 方法收合 + 展開/收合切換正常
- [ ] click 方法展開 dagre TB 流程圖
- [ ] 右側面板顯示方法簽名 + class + file
- [ ] 清除選取重建群組正確
- [ ] 與圖稿 Tab 2 一致

---

## 事件紀錄

### 2026-04-02T10:00:00.000Z — 建立任務
由 L1 透過 /task-delegation 建立
