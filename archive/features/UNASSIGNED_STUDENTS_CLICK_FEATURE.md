# 待分配學生卡片點擊跳轉功能 (2025-10-13)

## 🎯 需求

用戶希望點擊「待分配教師學生」卡片時，能像點擊「老師待跟進統計」一樣，自動跳轉到學生跟進表格並篩選出相關學生。

## ✅ 實作功能

### 1. 點擊跳轉功能 ✅

**待分配學生卡片**：
- 點擊整個卡片區域
- 自動篩選：教師 = "未知教師" + 狀態 = "未開始"
- 平滑滾動到學生跟進表格

**老師統計卡片**（同步優化）：
- 點擊教師卡片
- 自動篩選該教師的學生
- 平滑滾動到學生跟進表格

---

## 🛠️ 技術實作

### A. 添加滾動引用 (useRef)

```typescript
import { useState, useEffect, useRef } from 'react';

// 在組件內添加
const tableRef = useRef<HTMLDivElement>(null);

// 滾動函數
const scrollToTable = () => {
  if (tableRef.current) {
    tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};
```

### B. 待分配學生卡片點擊處理

```typescript
<Card
  className="border-orange-200 bg-orange-50/50 cursor-pointer hover:bg-orange-100/50 transition-colors"
  onClick={() => {
    setTeacherFilter('未知教師');
    setStatusFilter('未開始');
    setTimeout(scrollToTable, 100);
  }}
>
  {/* ... */}
  <CardDescription className="text-xs">
    這些學生已購買體驗課但尚未開始上課，需要電話人員聯繫並分配教師（點擊查看詳細列表）
  </CardDescription>
</Card>
```

**變更點**：
1. 添加 `cursor-pointer` - 游標顯示手型
2. 添加 `hover:bg-orange-100/50` - hover 時顏色加深
3. 添加 `onClick` 處理函數：
   - 設定教師篩選為「未知教師」
   - 設定狀態篩選為「未開始」
   - 100ms 後滾動到表格（確保篩選完成後再滾動）
4. 更新說明文字，提示用戶可以點擊

### C. 老師統計卡片同步優化

```typescript
<div
  key={teacher}
  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
  onClick={() => {
    setTeacherFilter(teacher);
    setTimeout(scrollToTable, 100);
  }}
>
  {/* ... */}
</div>
```

**新增**：滾動功能（原本只有篩選功能）

### D. 表格 Ref 綁定

```typescript
<Card ref={tableRef}>
  <CardHeader className="pb-3">
    <CardTitle>學生跟進狀態</CardTitle>
    {/* ... */}
  </CardHeader>
  {/* ... */}
</Card>
```

---

## 🎨 UI/UX 改進

### 視覺回饋
1. **游標變化**：hover 時顯示手型（cursor-pointer）
2. **背景變化**：hover 時背景色加深
3. **平滑滾動**：使用 `behavior: 'smooth'` 提供流暢體驗
4. **提示文字**：卡片說明中新增「點擊查看詳細列表」

### 互動流程

**操作步驟**：
1. 用戶看到「待分配教師學生 27」卡片
2. 滑鼠移上去，背景色變化 + 游標變手型
3. 點擊卡片
4. 表格自動篩選出 27 位未分配學生
5. 頁面平滑滾動到表格位置
6. 用戶可以立即看到學生列表

**篩選結果顯示**：
```
┌─────────────────────────────────────────────────────┐
│ 📊 當前排序： 優先級 ↑                              │
└─────────────────────────────────────────────────────┘

篩選條件：
- 所有教師 → 未知教師 ✓
- 所有狀態 → 未開始 ✓

表格顯示：
🔴 高優先 | 張三 | 購買 7 天內 | 未分配 | 未開始
🔴 高優先 | 李四 | 購買 5 天內 | 未分配 | 未開始
🟡 中優先 | 王五 | 購買 10 天內 | 未分配 | 未開始
...
```

---

## 📊 使用場景

### 場景 1：電話人員工作流程

**需求**：快速找到所有需要分配教師的學生

**操作**：
1. 打開體驗課報告頁面
2. 看到「待分配教師學生 27」卡片
3. 點擊卡片
4. 頁面滾動到表格，自動顯示 27 位學生
5. 按優先級排序，高優先的在最上面
6. 開始打電話聯繫

**優勢**：
- 一鍵直達，節省時間
- 自動篩選，無需手動操作
- 按優先級排序，先處理最重要的

---

### 場景 2：查看特定教師學生

**需求**：查看 Elena 的待跟進學生

**操作**：
1. 看到「老師待跟進統計」區域
2. 找到 Elena 的卡片（顯示 8 位學生，3 位高優先）
3. 點擊 Elena 卡片
4. 頁面滾動到表格，自動顯示 Elena 的 8 位學生
5. 高優先的在最上面

**優勢**：
- 快速定位特定教師的學生
- 自動滾動到表格，避免手動滾動
- 保持專注，提升工作效率

---

## 🔧 技術細節

### 為什麼使用 setTimeout？

```typescript
setTimeout(scrollToTable, 100);
```

**原因**：
- React 狀態更新是非同步的
- 篩選條件更新後，React 需要重新渲染表格
- 如果立即滾動，可能會滾動到舊的表格位置
- 100ms 延遲確保篩選完成、表格渲染完畢後再滾動

### scrollIntoView 參數

```typescript
tableRef.current.scrollIntoView({
  behavior: 'smooth',  // 平滑滾動動畫
  block: 'start'       // 將元素頂部對齊到可見區域頂部
});
```

**參數說明**：
- `behavior: 'smooth'` - 平滑滾動（約 300-500ms 動畫）
- `behavior: 'auto'` - 立即跳轉（無動畫）
- `block: 'start'` - 元素頂部對齊視窗頂部
- `block: 'center'` - 元素中心對齊視窗中心
- `block: 'end'` - 元素底部對齊視窗底部

**選擇原因**：
- `smooth` 提供更好的用戶體驗
- `start` 確保表格標題完整可見

---

## 📝 程式碼變更總結

### 修改檔案
- `client/src/components/trial-report/student-insights.tsx`

### 變更統計
- **新增**：
  - 1 個 import (`useRef` from 'react')
  - 1 個 ref 變數 (`tableRef`)
  - 1 個滾動函數 (`scrollToTable`)
  - 2 個點擊處理函數（待分配卡片 + 老師卡片）
  - 1 個 ref 綁定（表格 Card）

- **修改**：
  - 待分配卡片：添加點擊功能、hover 樣式、提示文字
  - 老師卡片：添加滾動功能
  - 表格：添加 ref

- **總計**：約 20 行程式碼新增/修改

---

## 🧪 測試建議

### 手動測試清單

**測試 1：待分配學生卡片點擊**
- [ ] 卡片顯示正確數字（例如 27）
- [ ] Hover 時背景色變化
- [ ] Hover 時游標變手型
- [ ] 點擊後自動篩選「未知教師」
- [ ] 點擊後自動篩選「未開始」狀態
- [ ] 點擊後平滑滾動到表格
- [ ] 表格顯示的學生數量與卡片數字一致

**測試 2：老師卡片點擊**
- [ ] 卡片顯示正確數字（例如 Elena 8 位）
- [ ] Hover 時背景色變化
- [ ] Hover 時游標變手型
- [ ] 點擊後自動篩選該教師
- [ ] 點擊後平滑滾動到表格
- [ ] 表格顯示的學生數量與卡片數字一致

**測試 3：連續點擊**
- [ ] 點擊「待分配學生」→ 顯示 27 位
- [ ] 點擊「Elena」→ 顯示 8 位
- [ ] 點擊「Karen」→ 顯示 5 位
- [ ] 篩選條件正確切換

**測試 4：篩選清除**
- [ ] 點擊卡片後篩選生效
- [ ] 手動點擊「清除篩選」按鈕
- [ ] 表格恢復顯示所有學生
- [ ] 再次點擊卡片，篩選重新生效

---

## 🎯 總結

### 達成目標 ✅
1. ✅ 待分配學生卡片可點擊
2. ✅ 點擊後自動篩選並跳轉到表格
3. ✅ 與老師卡片功能保持一致
4. ✅ 提供平滑滾動動畫
5. ✅ 視覺回饋（hover 效果、游標變化）

### 使用者體驗提升
- **效率提升**：一鍵直達，節省 3-5 秒操作時間
- **降低認知負荷**：自動篩選，無需記住篩選條件
- **視覺一致性**：卡片風格統一，操作模式一致
- **流暢體驗**：平滑滾動，專業感提升

### 技術亮點
- 使用 React useRef 實現精確定位
- setTimeout 確保狀態更新後再滾動
- scrollIntoView API 提供原生平滑滾動
- 最小化程式碼變更，最大化功能效果

---

**實作完成時間**：2025-10-13
**修改檔案**：`client/src/components/trial-report/student-insights.tsx`
**程式碼變更**：約 20 行
**向後相容**：✅ 完全相容，不影響現有功能
**測試狀態**：⏳ 待測試
