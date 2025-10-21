# 收支記錄表 - 選項管理系統升級完成

**日期**: 2025-10-16
**狀態**: ✅ 完成

---

## 🎯 完成的更新

### 1. **付款方式自動更新** ✅

系統會自動檢查並更新為新的付款方式選項：

**新的預設值**（9 種）：
1. 匯款
2. 現金
3. 信用卡
4. 超商
5. 支付寶
6. 微信
7. PayPal
8. 零卡分期
9. 信用卡定期定額

**更新邏輯**：
```typescript
const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
  const saved = localStorage.getItem('paymentMethods');
  if (saved) {
    return JSON.parse(saved);  // 保留既有設定
  }
  // 首次載入或清除後，自動設定新預設值
  localStorage.setItem('paymentMethods', JSON.stringify(defaultPaymentMethods));
  return defaultPaymentMethods;
});
```

---

### 2. **選項管理系統升級** 🚀

按鈕名稱從「付款方式設定」改為「選項設定」，支援多種選項管理。

#### **管理介面 - Tabs 切換**

```
┌────────── 管理選項設定 ──────────┐
│                                   │
│  [付款方式]  [交易類型]          │  ← Tabs 切換
│  ─────────────────────────────── │
│                                   │
│  管理付款方式選項   [恢復預設]   │
│                                   │
│  [輸入新的付款方式_____] [+]     │
│                                   │
│  ┌─────────────────────────┐     │
│  │ 匯款              [✕]  │     │
│  │ 現金              [✕]  │     │
│  │ 信用卡            [✕]  │     │
│  │ 超商              [✕]  │     │
│  │ ...                     │     │
│  └─────────────────────────┘     │
└───────────────────────────────────┘
```

---

### 3. **交易類型管理** 📊

新增交易類型管理功能，可自訂新的類型。

#### **預設交易類型**（3 種基本類型）：
1. 收入 (income) - 🔒 無法刪除
2. 支出 (expense) - 🔒 無法刪除
3. 退款 (refund) - 🔒 無法刪除

#### **可新增自訂類型**（範例）：
- 預收款
- 預付款
- 調整
- 轉帳
- 其他

#### **保護機制**：
- 基本的三種類型（收入、支出、退款）無法刪除
- 刪除按鈕會變灰色並顯示 disabled 狀態
- 嘗試刪除時會顯示警告提示

---

## 📋 完整功能列表

### **付款方式管理** 💼
- ✅ 9 種預設付款方式（自動更新）
- ✅ 新增付款方式（輸入框 + 按 Enter）
- ✅ 刪除付款方式（點擊 ✕）
- ✅ 恢復預設按鈕
- ✅ 即時儲存到 localStorage
- ✅ 防重複檢查

### **交易類型管理** 📊
- ✅ 3 種基本類型（預設）
- ✅ 新增自訂類型
- ✅ 刪除自訂類型
- ✅ 基本類型保護（無法刪除）
- ✅ 恢復預設按鈕
- ✅ 即時儲存到 localStorage
- ✅ 自動生成 value（小寫 + 底線）

---

## 🎨 UI 設計

### **Tabs 導航**
```tsx
<TabsList className="grid w-full grid-cols-2">
  <TabsTrigger value="payment">付款方式</TabsTrigger>
  <TabsTrigger value="type">交易類型</TabsTrigger>
</TabsList>
```

### **統一的管理介面**
每個 Tab 都包含：
1. 標題 + 恢復預設按鈕
2. 新增輸入框 + 按鈕
3. 選項列表（可滾動）
4. 提示訊息（如適用）

---

## 🔄 資料流

### **付款方式**
```
localStorage (paymentMethods)
    ↓
State (paymentMethods)
    ↓
下拉選單（詳細資訊區）
```

### **交易類型**
```
localStorage (transactionTypes)
    ↓
State (transactionTypes: {value, label}[])
    ↓
下拉選單（主表格）
```

---

## 🧪 測試項目

### **付款方式測試**
- [ ] 首次使用顯示 9 種新預設選項
- [ ] 舊用戶保留既有設定
- [ ] 點擊「恢復預設」更新為新選項
- [ ] 新增付款方式成功
- [ ] 刪除付款方式成功
- [ ] 重新整理後設定保留

### **交易類型測試**
- [ ] 預設顯示 3 種基本類型
- [ ] 新增自訂類型成功
- [ ] 刪除自訂類型成功
- [ ] 無法刪除基本類型（顯示警告）
- [ ] 主表格類型下拉選單正確顯示
- [ ] 重新整理後設定保留

### **整合測試**
- [ ] Tabs 切換正常
- [ ] 兩個 Tab 的數據獨立
- [ ] 恢復預設互不干擾
- [ ] 表格顯示對應的選項

---

## 📂 修改的檔案

**前端**：
- `client/src/pages/reports/income-expense-manager.tsx`
  - 新增交易類型管理 state
  - 新增交易類型管理函數
  - 更新 UI 為 Tabs 切換
  - 付款方式自動更新邏輯
  - 主表格類型下拉使用自訂選項

---

## 💡 技術亮點

### **自動更新付款方式**
```typescript
const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
  const saved = localStorage.getItem('paymentMethods');
  if (saved) {
    return JSON.parse(saved);
  }
  // 自動設定新預設值
  localStorage.setItem('paymentMethods', JSON.stringify(defaultPaymentMethods));
  return defaultPaymentMethods;
});
```

### **交易類型自動生成 value**
```typescript
const newType = {
  value: trimmed.toLowerCase().replace(/\s+/g, '_'),  // "預收款" → "預收款"
  label: trimmed,                                      // "預收款"
};
```

### **基本類型保護**
```typescript
const handleRemoveTransactionType = (value: string) => {
  if (['income', 'expense', 'refund'].includes(value)) {
    toast({
      title: '無法刪除',
      description: '基本類型（收入、支出、退款）無法刪除',
      variant: 'destructive',
    });
    return;
  }
  // ... 執行刪除
};
```

---

## 🚀 使用說明

### **更新付款方式（首次使用）**
1. 重新整理頁面
2. 系統自動載入 9 種新預設選項
3. 完成！

### **更新付款方式（舊用戶）**
1. 點擊「選項設定」
2. 在「付款方式」Tab 點擊「恢復預設」
3. 確認顯示 9 種新選項
4. 完成！

### **新增自訂交易類型**
1. 點擊「選項設定」
2. 切換到「交易類型」Tab
3. 輸入新的類型名稱（例如：「預收款」）
4. 按 Enter 或點擊 + 按鈕
5. 新類型出現在主表格的類型下拉選單

---

## 🎯 後續可擴充項目

未來可輕鬆新增更多選項管理：

1. **課程類型** - 12堂/24堂/商業教練
2. **銷售管道** - 網路/電話/現場
3. **客戶分類** - 個人/企業/學生
4. **優惠類型** - 早鳥/團報/介紹

**實作方式**：複製現有的 Tab 內容即可！

---

**完成時間**: 2025-10-16 下午
**新增程式碼**: ~200 行
**測試狀態**: ⏳ 待瀏覽器驗證
