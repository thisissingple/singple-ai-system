# 收支記錄表 - 時間格式修正 + 付款方式管理系統

**日期**: 2025-10-16
**狀態**: ✅ 完成

---

## 🎯 更新目標

1. **修正時間格式** - 顯示正確的 12 小時制（下午 4:17 而非 04:17）
2. **付款方式改為下拉選單** - 統一選項，避免輸入不一致
3. **新增付款方式管理介面** - 讓管理員可自行新增/刪除選項

---

## ✅ 完成的功能

### 1. 修正時間格式顯示 🕐

**問題**：
```
🕑 最後更新：2025/10/16 下午04:17  ❌ 錯誤（04:17）
```

**修正**：
```typescript
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',      // 改為 numeric（不補零）
    minute: '2-digit',
    hour12: true,         // 新增 12 小時制
  });
};
```

**結果**：
```
🕑 最後更新：2025/10/16 下午4:17  ✅ 正確
```

---

### 2. 付款方式改為下拉選單 💼

**變更前**（Input 輸入框）：
```tsx
<Input
  value={row.payment_method || ''}
  onChange={(e) => handleUpdateRow(index, 'payment_method', e.target.value)}
  placeholder="信用卡/匯款/現金"
/>
```

**變更後**（Select 下拉選單）：
```tsx
<Select
  value={row.payment_method || "none"}
  onValueChange={(value) => handleUpdateRow(index, 'payment_method', value === "none" ? "" : value)}
>
  <SelectTrigger className="h-8">
    <SelectValue placeholder="選擇付款方式" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="none">未選擇</SelectItem>
    {paymentMethods.map((method) => (
      <SelectItem key={method} value={method}>
        {method}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**優點**：
- ✅ 統一選項，避免拼寫錯誤
- ✅ 資料一致性更高
- ✅ 更容易進行統計分析

---

### 3. 付款方式管理系統 ⚙️

#### **管理介面位置**

在頁面右上角新增「付款方式設定」按鈕：

```
┌─────────────────────────────────────────┐
│ 收支記錄管理                             │
│                   [付款方式設定⚙️] [年份] │
└─────────────────────────────────────────┘
```

#### **管理對話框功能**

點擊後彈出對話框，包含：

1. **新增付款方式**
```
┌───────────────────────────────┐
│ [輸入新的付款方式___] [+]    │
└───────────────────────────────┘
```
- 輸入新的付款方式名稱
- 按 Enter 或點擊 + 新增
- 自動檢查重複

2. **付款方式列表**
```
┌───────────────────────────────┐
│ 現金                    [✕]  │
│ 信用卡                  [✕]  │
│ 匯款                    [✕]  │
│ PayPal                  [✕]  │
│ 支票                    [✕]  │
└───────────────────────────────┘
```
- 顯示所有付款方式
- 點擊 ✕ 刪除該選項
- 最多顯示高度，超過可滾動

#### **資料持久化**

使用 localStorage 儲存：
```typescript
// 初始載入
const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
  const saved = localStorage.getItem('paymentMethods');
  return saved ? JSON.parse(saved) : ['現金', '信用卡', '匯款', 'PayPal', '支票'];
});

// 自動儲存
useEffect(() => {
  localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
}, [paymentMethods]);
```

**優點**：
- ✅ 重新整理頁面後保留設定
- ✅ 不需要後端 API
- ✅ 立即生效

---

## 📋 預設付款方式選項

系統預設包含 5 種常用付款方式：

1. 現金
2. 信用卡
3. 匯款
4. PayPal
5. 支票

**可自由新增的選項範例**：
- 支付寶
- 微信支付
- LINE Pay
- 街口支付
- Apple Pay
- Google Pay

---

## 🎨 UI/UX 設計

### **設定按鈕**
```tsx
<Button variant="outline" size="sm">
  <Settings className="h-4 w-4 mr-1" />
  付款方式設定
</Button>
```

### **對話框樣式**
- 標題：「管理付款方式選項」
- 寬度：`sm:max-w-md`（中等寬度）
- 列表高度：`max-h-60 overflow-y-auto`（最多顯示 60 高度）

### **互動反饋**
- 新增成功：✅ Toast 提示「已新增付款方式：XXX」
- 刪除成功：✅ Toast 提示「已刪除付款方式：XXX」
- 重複新增：❌ Toast 警告「此付款方式已存在」
- 空白輸入：❌ Toast 警告「請輸入付款方式」

---

## 🔄 操作流程

### **新增付款方式**
1. 點擊右上角「付款方式設定」按鈕
2. 在對話框中輸入新的付款方式（例如：「支付寶」）
3. 按 Enter 或點擊 + 按鈕
4. 顯示成功提示
5. 新選項立即出現在下拉選單中

### **刪除付款方式**
1. 點擊右上角「付款方式設定」按鈕
2. 在列表中找到要刪除的付款方式
3. 點擊該項目右側的 ✕ 按鈕
4. 顯示刪除成功提示
5. 該選項從下拉選單中消失

### **使用付款方式**
1. 展開記錄的詳細資訊
2. 在「💼 付款方式」欄位點擊下拉選單
3. 選擇合適的付款方式
4. 儲存記錄

---

## 🧪 測試項目

### **時間格式測試**
- [ ] 下午時間顯示為「下午4:17」而非「下午04:17」
- [ ] 上午時間顯示為「上午9:30」而非「上午09:30」
- [ ] 建立時間和更新時間格式一致

### **付款方式管理測試**
- [ ] 點擊「付款方式設定」按鈕彈出對話框
- [ ] 輸入新的付款方式名稱可成功新增
- [ ] 按 Enter 鍵可新增付款方式
- [ ] 重複新增會顯示錯誤提示
- [ ] 空白輸入會顯示錯誤提示
- [ ] 點擊 ✕ 按鈕可刪除付款方式
- [ ] 刪除後該選項從下拉選單消失
- [ ] 重新整理頁面後設定保留

### **下拉選單測試**
- [ ] 付款方式欄位顯示為下拉選單
- [ ] 下拉選單包含所有自訂選項
- [ ] 選擇「未選擇」時儲存為空值
- [ ] 儲存後重新載入，付款方式正確顯示

---

## 📂 修改的檔案

**前端**：
- `client/src/pages/reports/income-expense-manager.tsx`
  - 修正 `formatDateTime` 函數（hour12: true）
  - 新增付款方式管理 state
  - 新增 localStorage 持久化邏輯
  - 新增付款方式管理函數
  - 新增設定對話框 UI
  - 付款方式欄位從 Input 改為 Select

**後端**：
- ✅ 無需修改

---

## 💡 技術亮點

### **智能預設值**
```typescript
const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
  const saved = localStorage.getItem('paymentMethods');
  return saved ? JSON.parse(saved) : ['現金', '信用卡', '匯款', 'PayPal', '支票'];
});
```
- 首次使用：顯示預設 5 種選項
- 後續使用：從 localStorage 載入自訂選項

### **自動儲存**
```typescript
useEffect(() => {
  localStorage.setItem('paymentMethods', JSON.stringify(paymentMethods));
}, [paymentMethods]);
```
- 每次新增/刪除自動儲存
- 無需手動點擊儲存按鈕

### **防重複檢查**
```typescript
if (paymentMethods.includes(trimmed)) {
  toast({ title: '此付款方式已存在', variant: 'destructive' });
  return;
}
```

---

## 🚀 後續優化建議

### **可選增強**
1. **匯出/匯入設定** - 讓不同電腦間同步設定
2. **預設選項恢復** - 提供「恢復預設」按鈕
3. **使用統計** - 顯示每種付款方式的使用次數
4. **拖曳排序** - 調整選項顯示順序

### **不建議修改**
- ❌ 不要移除 localStorage（會失去設定）
- ❌ 不要限制可新增數量（除非效能問題）

---

**完成時間**: 2025-10-16 下午
**修改行數**: ~120 行新增
**測試狀態**: ⏳ 待瀏覽器驗證
