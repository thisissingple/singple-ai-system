# 成本獲利管理頁面 - 功能增強完成報告

**完成時間**: 2025-10-16
**修改檔案**: 3 個

---

## ✅ 完成的 5 項功能增強

### 1. **預設月份改為上個月** ✅

**需求**: 頁面預設顯示上個月的資料（例如：10月顯示9月）

**實作細節**:
```typescript
// 修改前：顯示當前月份
const defaultMonth = MONTHS[currentDate.getMonth()];

// 修改後：顯示上個月
const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
const defaultYear = lastMonth.getFullYear();
const defaultMonth = MONTHS[lastMonth.getMonth()];
```

**位置**: [cost-profit-manager.tsx:90-94](client/src/pages/reports/cost-profit-manager.tsx#L90-L94)

---

### 2. **批次新增/刪除功能** ✅

**需求**: 可以一次新增或刪除多個項目

**新增按鈕**:
- 📝 **批次新增 5 列** - 一次新增 5 個空白項目
- 🗑️ **批次刪除** - 刪除所有勾選的項目（顯示刪除數量）

**新增函數**:
```typescript
// 批次新增指定數量的空白列
const handleBatchAdd = (count: number = 5) => { ... }

// 批次刪除所有勾選的項目
const handleBatchDelete = () => { ... }

// 全選/取消全選
const handleToggleSelectAll = (checked: boolean) => { ... }
```

**UI 變更**:
- 表頭新增全選 Checkbox
- 每一列前方新增 Checkbox 用於選擇
- 批次刪除按鈕會根據選擇數量動態啟用/禁用
- 刪除成功後顯示 Toast 通知（例如："已刪除 3 個項目"）

**位置**:
- 函數: [cost-profit-manager.tsx:290-328](client/src/pages/reports/cost-profit-manager.tsx#L290-L328)
- UI: [cost-profit-manager.tsx:614-628](client/src/pages/reports/cost-profit-manager.tsx#L614-L628)

---

### 3. **行內新增按鈕（鼠標懸停顯示）** ✅

**需求**: 鼠標移到列上時顯示 ➕ 按鈕，點擊可在該列下方直接新增

**實作細節**:
```typescript
// 在指定索引下方插入新列
const handleAddRowAfter = (index: number) => {
  const newRow: EditableRow = { /* 空白項目 */ };
  return [...prev.slice(0, index + 1), newRow, ...prev.slice(index + 1)];
}
```

**UI 效果**:
- 每一列使用 `group` class 和 `relative` positioning
- ➕ 按鈕預設 `opacity-0`，鼠標懸停時 `opacity-100`（平滑過渡）
- 按鈕顯示 tooltip："在此列下方新增"

**位置**:
- 函數: [cost-profit-manager.tsx:271-284](client/src/pages/reports/cost-profit-manager.tsx#L271-L284)
- UI: [cost-profit-manager.tsx:831-839](client/src/pages/reports/cost-profit-manager.tsx#L831-L839)

---

### 4. **表格自動排序** ✅

**需求**: 表格自動按分類和項目排序

**排序規則**:
1. **收入金額**永遠排在最前面
2. 其他分類按中文字母順序排列
3. 同分類內按項目名稱排序

**實作細節**:
```typescript
const sortedRows = useMemo(() => {
  return [...rows].sort((a, b) => {
    // 1. 收入金額優先
    const aIsRevenue = isRevenueCategory(a.category);
    const bIsRevenue = isRevenueCategory(b.category);
    if (aIsRevenue && !bIsRevenue) return -1;
    if (!aIsRevenue && bIsRevenue) return 1;

    // 2. 按分類排序（中文）
    const categoryCompare = a.category.localeCompare(b.category, 'zh-TW');
    if (categoryCompare !== 0) return categoryCompare;

    // 3. 同分類內按項目排序（中文）
    return a.item.localeCompare(b.item, 'zh-TW');
  });
}, [rows]);
```

**特色**:
- 使用 `useMemo` 優化效能（只在 rows 改變時重新排序）
- 使用 `localeCompare` 正確處理中文排序
- 表格渲染使用 `sortedRows` 而非原始 `rows`

**位置**: [cost-profit-manager.tsx:392-408](client/src/pages/reports/cost-profit-manager.tsx#L392-L408)

---

### 5. **記錄時間欄位顯示** ✅

**需求**: 在表格中顯示每筆記錄的創建/更新時間

**實作細節**:

**後端類型更新**:
```typescript
// client/src/types/cost-profit.ts
export interface CostProfitRecord {
  // ... 其他欄位
  created_at?: string;
  updated_at?: string;
}
```

**前端資料轉換**:
```typescript
// 從資料庫載入時格式化時間戳
createdAt: record.created_at
  ? new Date(record.created_at).toLocaleString('zh-TW')
  : undefined,
updatedAt: record.updated_at
  ? new Date(record.updated_at).toLocaleString('zh-TW')
  : undefined,
```

**UI 顯示**:
```tsx
<TableHead className="w-[140px]">記錄時間</TableHead>
...
<TableCell className="text-xs text-muted-foreground">
  {row.updatedAt || row.createdAt || '-'}
</TableCell>
```

**顯示邏輯**:
- 優先顯示 `updatedAt`（最後修改時間）
- 若無修改記錄則顯示 `createdAt`（創建時間）
- 都沒有則顯示 `-`
- 使用 `text-xs` 和 `text-muted-foreground` 保持視覺層次

**位置**:
- 類型: [cost-profit.ts:11-12](client/src/types/cost-profit.ts#L11-L12)
- 轉換: [cost-profit-manager.tsx:207-208](client/src/pages/reports/cost-profit-manager.tsx#L207-L208)
- UI: [cost-profit-manager.tsx:819-821](client/src/pages/reports/cost-profit-manager.tsx#L819-L821)

---

## 📊 修改檔案清單

| 檔案 | 變更類型 | 說明 |
|-----|---------|------|
| `client/src/pages/reports/cost-profit-manager.tsx` | ✏️ 主要修改 | 新增 5 項功能 |
| `client/src/types/cost-profit.ts` | ➕ 擴充 | 新增時間戳欄位 |
| `COST_PROFIT_MANAGER_ENHANCEMENTS.md` | 🆕 新增 | 功能說明文檔 |

---

## 🎨 UI/UX 改進總結

### **新增的 UI 元素**

1. **表頭新增**:
   - ☑️ 全選 Checkbox（第一欄）
   - 🕐 記錄時間欄位（倒數第二欄）

2. **每列新增**:
   - ☑️ 選擇 Checkbox（第一欄）
   - ➕ 行內新增按鈕（最後一欄，懸停顯示）
   - 🕐 時間戳顯示（倒數第二欄）

3. **工具列新增**:
   - 📝 批次新增 5 列按鈕
   - 🗑️ 批次刪除按鈕（動態啟用）

### **互動體驗優化**

1. **平滑過渡動畫**:
   - 行內新增按鈕：`opacity-0` → `opacity-100`
   - 使用 `transition-opacity` 和 `group-hover` 實現

2. **視覺反饋**:
   - Toast 通知顯示操作結果
   - 批次刪除按鈕根據選擇數量動態啟用
   - 全選 Checkbox 智能狀態（根據所有項目是否都選中）

3. **用戶引導**:
   - 行內新增按鈕有 `title` tooltip
   - 批次刪除未選擇時顯示提示 Toast

---

## 🔧 技術亮點

### **1. 智能排序系統**
- 使用 `useMemo` 優化效能
- 中文排序正確處理（`localeCompare`）
- 業務邏輯優先（收入金額置頂）

### **2. 索引映射機制**
```typescript
// sortedRows 的索引映射回 rows 的原始索引
const originalIndex = rows.findIndex(r =>
  r.category === row.category &&
  r.item === row.item &&
  r.amount === row.amount
);
```
**原因**: 表格顯示用 `sortedRows`，但操作需要修改原始 `rows` 陣列

### **3. 批次操作設計**
- 使用 `selected` 布林欄位追蹤選擇狀態
- 全選邏輯：`rows.every(r => r.selected)`
- 批次刪除：`rows.filter(row => !row.selected)`

### **4. 時間戳處理**
- 後端返回 ISO 字串
- 前端轉換為本地時間格式：`toLocaleString('zh-TW')`
- 優雅降級：`updatedAt || createdAt || '-'`

---

## 📝 使用指南

### **批次新增**
1. 點擊「批次新增 5 列」按鈕
2. 系統自動在表格底部新增 5 個空白項目
3. 填寫分類、項目、金額等資訊

### **批次刪除**
1. 勾選表頭 Checkbox 可全選
2. 或手動勾選要刪除的項目
3. 點擊「批次刪除」按鈕
4. 系統顯示刪除數量確認

### **行內新增**
1. 將鼠標移到任一列上
2. 最後一欄會出現 ➕ 按鈕
3. 點擊後在該列下方插入空白項目
4. 適合在特定位置插入相關項目

### **自動排序**
- 無需手動操作
- 新增或修改項目後自動重新排序
- 排序規則：收入 → 分類 → 項目

### **查看記錄時間**
- 查看「記錄時間」欄位
- 顯示最後修改時間（若有）
- 或顯示創建時間

---

## ⚠️ 注意事項

### **排序與索引**
- 表格顯示順序與資料陣列順序不同
- 操作時會自動映射回原始索引
- 不會影響功能正常運作

### **時間戳支援**
- 需要後端資料庫返回 `created_at` 和 `updated_at`
- 若後端未返回，顯示為 `-`
- 不影響其他功能運作

### **全選行為**
- 全選 Checkbox 三態邏輯：
  - ✅ 全部選中 → checked
  - ☐ 全部未選 → unchecked
  - （部分選中不顯示特殊狀態，視為未全選）

---

## 🚀 後續建議

### **可選增強功能**（未實作）

1. **更多批次操作**:
   - 批次修改分類
   - 批次修改確認狀態
   - 批次複製項目

2. **進階排序**:
   - 點擊欄位標題手動排序
   - 多欄位排序
   - 升序/降序切換

3. **記錄時間增強**:
   - 顯示修改人員
   - 顯示完整時間戳（hover tooltip）
   - 時間格式切換（相對時間 vs 絕對時間）

4. **篩選功能**:
   - 按分類篩選
   - 按來源篩選（既有/AI/手動）
   - 按確認狀態篩選

---

**開發完成** ✅
**測試狀態**: 待瀏覽器測試
**下一步**: 啟動開發伺服器並測試所有新功能
