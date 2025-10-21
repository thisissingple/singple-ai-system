# 成本獲利管理頁面 - Bug 修正與功能調整

**修正時間**: 2025-10-16
**修正數量**: 4 個問題

---

## ✅ 問題 1: 項目無法打字

### **問題描述**
在表格中無法在「項目」欄位輸入文字

### **根本原因**
使用 `sortedRows` 進行顯示後，`originalIndex` 的計算邏輯有問題：
```typescript
// 錯誤的做法：當多個項目有相同值時會找錯索引
const originalIndex = rows.findIndex(r =>
  r.category === row.category &&
  r.item === row.item &&
  r.amount === row.amount
);
```

### **解決方案**
1. 在 `EditableRow` 介面中新增 `tempId` 欄位作為唯一識別碼
2. 使用 `Map` 建立 `tempId` 到原始索引的映射
3. 在排序時保留映射關係

**實作細節**:
```typescript
// 1. 新增 tempId 欄位
interface EditableRow {
  // ...
  tempId?: string; // 用於排序後追蹤原始索引
}

// 2. 建立映射
const { sortedRows, tempIdToIndex } = useMemo(() => {
  const mapping = new Map<string, number>();
  rows.forEach((row, index) => {
    if (row.tempId) {
      mapping.set(row.tempId, index);
    }
  });

  const sorted = [...rows].sort(/* 排序邏輯 */);
  return { sortedRows: sorted, tempIdToIndex: mapping };
}, [rows]);

// 3. 使用 tempId 獲取正確索引
const originalIndex = row.tempId
  ? tempIdToIndex.get(row.tempId) ?? sortedIndex
  : sortedIndex;
```

**位置**: [cost-profit-manager.tsx:65,408-433,717](client/src/pages/reports/cost-profit-manager.tsx)

---

## ✅ 問題 2: 行內新增按鈕位置錯誤

### **問題描述**
「在此列下方新增」按鈕顯示在表格最後一欄，但應該顯示在表格中間

### **解決方案**
將行內新增按鈕從最後一欄移至「備註」欄位後面

**修改前的順序**:
```
Checkbox → 分類 → 項目 → 金額 → 備註 → 已確認 → 來源 → 記錄時間 → [刪除 + 新增]
```

**修改後的順序**:
```
Checkbox → 分類 → 項目 → 金額 → 備註 → [+ 新增] → 已確認 → 來源 → 記錄時間 → [刪除]
```

**實作細節**:
```tsx
// 在備註欄位後新增一欄
<TableCell>
  <Input value={row.notes} placeholder="備註（可選）" />
</TableCell>

{/* 新增按鈕欄位 */}
<TableCell className="text-center">
  <Button
    variant="ghost"
    size="sm"
    className="opacity-0 group-hover:opacity-100 transition-opacity"
    onClick={() => handleAddRowAfter(originalIndex)}
    title="在此列下方新增"
  >
    <Plus className="h-4 w-4" />
  </Button>
</TableCell>

<TableCell className="text-center">
  <Switch checked={row.isConfirmed} />
</TableCell>
```

**表頭更新**:
- 備註後新增「+」欄位
- 最後一欄改名為「刪除」

**位置**: [cost-profit-manager.tsx:690,792-802](client/src/pages/reports/cost-profit-manager.tsx)

---

## ✅ 問題 3: 記錄時間未更新

### **問題描述**
1. 新增項目時沒有創建時間
2. 修改項目時沒有更新修改時間

### **解決方案**

#### **1. 新增時設定創建時間**
在所有新增 row 的函數中添加 `createdAt` 和 `updatedAt`：

```typescript
// handleAddRow, handleAddRowAfter, handleBatchAdd 都加上：
const now = new Date().toLocaleString('zh-TW');
const newRow: EditableRow = {
  // ... 其他欄位
  createdAt: now,
  updatedAt: now,
};
```

#### **2. 修改時更新時間戳**
在 `handleRowChange` 函數中自動更新 `updatedAt`：

```typescript
const handleRowChange = (index: number, field: keyof EditableRow, value: string | boolean) => {
  setRows((prev) =>
    prev.map((row, idx) =>
      idx === index
        ? {
            ...row,
            [field]: value,
            updatedAt: new Date().toLocaleString('zh-TW'), // 自動更新
          }
        : row,
    ),
  );
};
```

**時間戳優先級**:
```tsx
// 顯示邏輯：優先顯示修改時間，其次創建時間，最後顯示 '-'
<TableCell className="text-xs text-muted-foreground">
  {row.updatedAt || row.createdAt || '-'}
</TableCell>
```

**位置**:
- handleRowChange: [cost-profit-manager.tsx:345-361](client/src/pages/reports/cost-profit-manager.tsx#L345-L361)
- handleAddRow: [cost-profit-manager.tsx:265-283](client/src/pages/reports/cost-profit-manager.tsx#L265-L283)
- handleAddRowAfter: [cost-profit-manager.tsx:285-303](client/src/pages/reports/cost-profit-manager.tsx#L285-L303)
- handleBatchAdd: [cost-profit-manager.tsx:309-325](client/src/pages/reports/cost-profit-manager.tsx#L309-L325)

---

## ✅ 問題 4: 金額幣別選擇

### **問題描述**
金額有時是 USD、有時是 TWD、有時是 RMB，需要一個幣別選擇功能

### **解決方案**
在金額欄位旁邊新增幣別下拉選單

#### **1. 新增 currency 欄位**
```typescript
interface EditableRow {
  // ...
  currency?: 'TWD' | 'USD' | 'RMB';
}
```

#### **2. 修改金額欄位為組合欄位**
```tsx
<TableCell>
  <div className="flex gap-2 items-center">
    {/* 金額輸入框 */}
    <Input
      className="text-right flex-1"
      value={row.amount}
      placeholder="0"
      onChange={(event) =>
        handleRowChange(originalIndex, 'amount', event.target.value)
      }
    />

    {/* 幣別下拉選單 */}
    <Select
      value={row.currency || 'TWD'}
      onValueChange={(value) =>
        handleRowChange(originalIndex, 'currency', value)
      }
    >
      <SelectTrigger className="w-[80px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TWD">TWD</SelectItem>
        <SelectItem value="USD">USD</SelectItem>
        <SelectItem value="RMB">RMB</SelectItem>
      </SelectContent>
    </Select>
  </div>
</TableCell>
```

#### **3. 更新表頭**
```tsx
<TableHead className="w-[180px]">金額 / 幣別</TableHead>
```

#### **4. 預設值設定**
所有新增的項目預設為 TWD：
```typescript
const newRow = {
  // ...
  currency: 'TWD',
};
```

**位置**:
- 類型定義: [cost-profit-manager.tsx:66](client/src/pages/reports/cost-profit-manager.tsx#L66)
- UI 實作: [cost-profit-manager.tsx:774-804](client/src/pages/reports/cost-profit-manager.tsx#L774-L804)
- 表頭: [cost-profit-manager.tsx:696](client/src/pages/reports/cost-profit-manager.tsx#L696)

---

## 📊 修改統計

### **修改檔案**
- `client/src/pages/reports/cost-profit-manager.tsx` - 主要修正檔案

### **程式碼變更**
- 新增欄位: 2 個（`tempId`, `currency`）
- 修改函數: 6 個（handleAddRow, handleAddRowAfter, handleBatchAdd, handleRowChange, 排序邏輯, 渲染邏輯）
- 修改 UI: 3 處（表頭、金額欄位、行內新增按鈕位置）

### **新增功能**
- ✅ tempId 唯一識別系統
- ✅ 時間戳自動更新機制
- ✅ 幣別選擇下拉選單
- ✅ 優化的表格欄位順序

---

## 🎨 UI 改進總結

### **表格欄位最終順序**
```
1. ☑️ Checkbox (50px)
2. 📋 分類 (160px)
3. 📝 項目 (220px)
4. 💰 金額 / 幣別 (180px) - 組合欄位
5. 📄 備註 (彈性寬度)
6. ➕ 新增 (60px) - 鼠標懸停顯示
7. ✅ 已確認 (120px)
8. 🏷️ 來源 (140px)
9. 🕐 記錄時間 (140px)
10. 🗑️ 刪除 (90px)
```

### **互動體驗**
1. **項目輸入正常** - 修正索引映射邏輯
2. **行內新增位置合理** - 位於表格中間區域
3. **時間戳即時更新** - 每次修改自動記錄
4. **幣別切換方便** - 下拉選單快速選擇

---

## 🧪 測試建議

啟動開發伺服器後，測試以下修正：

### **1. 測試項目輸入**
- ✅ 在「項目」欄位輸入文字
- ✅ 在「備註」欄位輸入文字
- ✅ 確認所有欄位都能正常編輯

### **2. 測試行內新增**
- ✅ 鼠標移到任一列
- ✅ 確認「+」按鈕出現在備註後面（中間位置）
- ✅ 點擊後在該列下方插入新列

### **3. 測試時間戳**
- ✅ 新增項目 - 確認創建時間顯示
- ✅ 修改項目 - 確認修改時間更新
- ✅ 批次新增 - 確認所有項目都有時間

### **4. 測試幣別選擇**
- ✅ 新增項目預設為 TWD
- ✅ 切換為 USD
- ✅ 切換為 RMB
- ✅ 不同項目可以有不同幣別

---

## 💡 額外建議

### **可選增強功能**（未實作）

#### **1. 幣別顯示優化**
- 在即時摘要中分幣別顯示
- 例如：TWD $100,000 + USD $5,000 + RMB ¥10,000
- 提供匯率轉換功能

#### **2. 記錄時間增強**
- Hover 顯示完整時間戳（含秒數）
- 顯示相對時間（5 分鐘前、1 小時前）
- 顯示修改人員（需要後端支援）

#### **3. 欄位寬度調整**
- 可拖拉調整欄位寬度
- 記住用戶的寬度偏好設定
- 響應式設計優化

#### **4. 批次幣別修改**
- 勾選多個項目
- 批次修改幣別
- 批次修改分類

---

## ⚠️ 注意事項

### **tempId 機制**
- tempId 使用時間戳 + 索引生成
- 僅用於前端排序追蹤
- 儲存到資料庫時不會包含此欄位

### **時間戳精度**
- 使用本地時間格式（zh-TW）
- 格式：2025/10/16 下午3:45:00
- 僅在前端更新，後端時間戳由資料庫管理

### **幣別儲存**
- 目前幣別僅在前端記錄
- 若需要後端支援，需更新：
  - `CostProfitRecord` 介面
  - 資料庫 schema（新增 `currency` 欄位）
  - API 儲存邏輯

---

**修正完成** ✅
**測試狀態**: 待瀏覽器測試
**下一步**: 啟動開發伺服器測試所有修正
