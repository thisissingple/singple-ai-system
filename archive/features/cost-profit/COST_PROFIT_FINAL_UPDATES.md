# 成本獲利管理頁面 - 最終優化更新

**更新時間**: 2025-10-16
**更新數量**: 2 項重要優化

---

## ✅ 更新 1: 新增按鈕位置調整至備註欄位內

### **問題描述**
用戶反饋：新增按鈕應該顯示在備註欄位內的右側（類似截圖中的位置），而不是獨立的一欄

### **修改前**
```
分類 → 項目 → 金額/幣別 → 備註 → [+ 新增欄] → 已確認 → 來源 → 時間 → 刪除
```

### **修改後**
```
分類 → 項目 → 金額/幣別 → [備註 + 新增按鈕] → 已確認 → 來源 → 時間 → 刪除
```

### **實作細節**

#### **1. 移除獨立的新增欄位**
```tsx
// 移除表頭的「+」欄位
<TableHead className="w-[60px] text-center">+</TableHead> // ❌ 刪除
```

#### **2. 備註欄位改為 Flex 容器**
```tsx
<TableCell>
  <div className="flex items-center gap-1">
    {/* 備註輸入框 */}
    <Input
      value={row.notes}
      placeholder="備註（可選）"
      onChange={(event) =>
        handleRowChange(originalIndex, 'notes', event.target.value)
      }
      className="flex-1"
    />

    {/* 新增按鈕（Hover 顯示）*/}
    <Button
      variant="ghost"
      size="sm"
      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      onClick={() => handleAddRowAfter(originalIndex)}
      title="在此列下方新增"
    >
      <Plus className="h-4 w-4" />
    </Button>
  </div>
</TableCell>
```

### **視覺效果**
- ✅ 新增按鈕緊貼備註輸入框右側
- ✅ 預設隱藏（`opacity-0`）
- ✅ 鼠標移到該列時淡入顯示（`group-hover:opacity-100`）
- ✅ 平滑過渡動畫（`transition-opacity`）
- ✅ 按鈕不會壓縮輸入框（`flex-shrink-0`）

### **表格欄位最終配置**
```
1. ☑️ Checkbox (50px)
2. 📋 分類 (160px)
3. 📝 項目 (220px)
4. 💰 金額/幣別 (180px)
5. 📄 [備註 + ➕] (彈性寬度) ← 新增按鈕在此
6. ✅ 已確認 (120px)
7. 🏷️ 來源 (140px)
8. 🕐 記錄時間 (140px)
9. 🗑️ 刪除 (90px)
```

**位置**: [cost-profit-manager.tsx:804-828](client/src/pages/reports/cost-profit-manager.tsx#L804-L828)

---

## ✅ 更新 2: 自動匯率轉換功能

### **需求描述**
用戶有 USD、TWD、RMB 混合的金額資料，主要貨幣是 TWD，需要：
1. 自動獲取即時匯率
2. 計算總額時自動轉換為 TWD
3. 顯示當前使用的匯率

### **解決方案**

#### **1. 新增匯率 State**
```typescript
const [exchangeRates, setExchangeRates] = useState<{
  USD: number;
  RMB: number;
}>({
  USD: 31.5, // 預設匯率（USD to TWD）
  RMB: 4.3,  // 預設匯率（RMB to TWD）
});
```

#### **2. 自動獲取即時匯率**
```typescript
useEffect(() => {
  const fetchExchangeRates = async () => {
    try {
      // 使用免費的匯率 API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/TWD');
      const data = await response.json();

      if (data.rates) {
        // 計算 USD 和 RMB 對 TWD 的匯率
        const usdToTwd = 1 / data.rates.USD;
        const rmbToTwd = 1 / data.rates.CNY;

        setExchangeRates({
          USD: Number(usdToTwd.toFixed(2)),
          RMB: Number(rmbToTwd.toFixed(2)),
        });
      }
    } catch (error) {
      console.error('獲取匯率失敗，使用預設值:', error);
      // 保持預設匯率
    }
  };

  fetchExchangeRates();
  // 每小時更新一次匯率
  const interval = setInterval(fetchExchangeRates, 60 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

#### **3. 匯率轉換函數**
```typescript
const convertToTWD = (
  amount: number,
  currency: 'TWD' | 'USD' | 'RMB' = 'TWD'
): number => {
  if (currency === 'TWD') return amount;
  if (currency === 'USD') return amount * exchangeRates.USD;
  if (currency === 'RMB') return amount * exchangeRates.RMB;
  return amount;
};
```

#### **4. 計算總額時自動轉換**
```typescript
const totals = useMemo(() => {
  let revenue = 0;
  let cost = 0;

  rows.forEach((row) => {
    const amount = Number.parseFloat(row.amount);
    if (!Number.isFinite(amount)) return;

    // 🔥 自動轉換為 TWD
    const amountInTWD = convertToTWD(amount, row.currency);

    if (isRevenueCategory(row.category)) {
      revenue += amountInTWD;
    } else {
      cost += amountInTWD;
    }
  });

  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return { revenue, cost, profit, margin };
}, [rows, exchangeRates]); // 依賴匯率變更
```

#### **5. 顯示匯率資訊**
```tsx
<CardDescription>
  金額單位為新台幣（已自動換算外幣）｜
  匯率：1 USD = {exchangeRates.USD} TWD, 1 RMB = {exchangeRates.RMB} TWD
</CardDescription>
```

### **功能特色**

#### **✅ 即時匯率**
- 使用 exchangerate-api.com 免費 API
- 頁面載入時立即獲取
- 每小時自動更新一次
- 網路失敗時使用預設匯率

#### **✅ 自動轉換**
- 所有計算（收入、成本、淨利、利率）都自動轉為 TWD
- 不影響原始輸入資料
- 支援 TWD、USD、RMB 三種貨幣

#### **✅ 透明顯示**
- 即時摘要卡片顯示當前匯率
- 用戶可清楚知道轉換使用的匯率
- 匯率更新後自動重新計算

### **範例計算**

假設有以下資料：
```
收入：
- 100,000 TWD (營收)
- 5,000 USD (海外收入)

成本：
- 30,000 TWD (人力成本)
- 2,000 USD (軟體費用)
```

**假設匯率**: 1 USD = 31.5 TWD

**自動轉換後**:
```
收入總額 = 100,000 + (5,000 × 31.5) = 257,500 TWD
成本總額 = 30,000 + (2,000 × 31.5) = 93,000 TWD
淨利 = 257,500 - 93,000 = 164,500 TWD
淨利率 = (164,500 / 257,500) × 100 = 63.9%
```

### **匯率 API 說明**

#### **使用的 API**
- **服務**: exchangerate-api.com
- **免費額度**: 1,500 requests/month
- **更新頻率**: 每天更新
- **回應速度**: < 200ms

#### **API 回應格式**
```json
{
  "base": "TWD",
  "rates": {
    "USD": 0.0317,  // TWD 到 USD
    "CNY": 0.2326,  // TWD 到 RMB
    // ... 其他貨幣
  }
}
```

#### **換算邏輯**
```typescript
// TWD → USD: 0.0317
// 反向計算 USD → TWD: 1 / 0.0317 ≈ 31.5

usdToTwd = 1 / data.rates.USD;
rmbToTwd = 1 / data.rates.CNY;
```

### **錯誤處理**

#### **網路失敗**
```typescript
catch (error) {
  console.error('獲取匯率失敗，使用預設值:', error);
  // 保持預設匯率：USD = 31.5, RMB = 4.3
}
```

#### **API 限制**
- 免費版每月 1,500 次請求
- 每小時更新一次 = 每月約 720 次
- 遠低於限制，無需擔心

#### **預設匯率**
如果 API 失敗，使用以下預設值：
- 1 USD = 31.5 TWD（約為近期平均匯率）
- 1 RMB = 4.3 TWD（約為近期平均匯率）

---

## 📊 修改統計

### **修改檔案**
- `client/src/pages/reports/cost-profit-manager.tsx` - 主要修改檔案

### **新增程式碼**
- **State**: 1 個（`exchangeRates`）
- **Hook**: 1 個（`useEffect` 獲取匯率）
- **函數**: 1 個（`convertToTWD`）
- **依賴**: 修改 `totals` useMemo 依賴項

### **UI 修改**
- 備註欄位改為 Flex 容器
- 即時摘要顯示匯率資訊
- 新增按鈕移至備註欄位內

---

## 🎨 UI 改進效果

### **新增按鈕位置**
```
┌─────────────────────────────────────────────────────┐
│ 分類    項目      金額/幣別    備註                  │
├─────────────────────────────────────────────────────┤
│ 收入    營收    100000 TWD   [備註輸入框........] ➕│
│                                ↑                    ↑ │
│                            輸入備註              懸停顯示
└─────────────────────────────────────────────────────┘
```

### **匯率顯示**
```
┌────────────────────────────────────────────┐
│ 即時摘要                                    │
│ 金額單位為新台幣（已自動換算外幣）         │
│ 匯率：1 USD = 31.50 TWD, 1 RMB = 4.30 TWD │
├────────────────────────────────────────────┤
│ 收入總額    成本總額    淨利    淨利率     │
│ $257,500    $93,000   $164,500   63.9%    │
└────────────────────────────────────────────┘
```

---

## 🧪 測試建議

### **測試新增按鈕位置**
1. ✅ 啟動開發伺服器
2. ✅ 鼠標移到任一列
3. ✅ 確認 ➕ 按鈕出現在備註欄位右側
4. ✅ 點擊按鈕在下方新增列

### **測試匯率轉換**
1. ✅ 檢查頁面載入時匯率是否顯示
2. ✅ 新增一筆 USD 金額（例如：5000 USD）
3. ✅ 新增一筆 TWD 金額（例如：100000 TWD）
4. ✅ 確認即時摘要正確計算（100000 + 5000 × 匯率）
5. ✅ 開啟瀏覽器開發者工具 Console
6. ✅ 確認沒有匯率獲取錯誤

### **測試網路失敗情況**
1. ✅ 關閉網路連線
2. ✅ 重新載入頁面
3. ✅ 確認使用預設匯率（Console 應顯示錯誤訊息）
4. ✅ 確認計算仍然正常運作

---

## 💡 未來增強建議

### **1. 匯率來源選擇**
- 支援多個匯率 API（備援）
- 手動設定匯率
- 匯率歷史記錄

### **2. 更多貨幣支援**
- 新增 EUR、GBP、JPY 等
- 動態貨幣清單
- 自訂貨幣

### **3. 匯率鎖定**
- 儲存時記錄當時匯率
- 避免歷史資料因匯率變動而改變
- 顯示歷史匯率

### **4. 視覺化改進**
- 匯率變動趨勢圖
- 不同貨幣佔比圓餅圖
- 貨幣別分類統計

---

## ⚠️ 注意事項

### **匯率更新頻率**
- 每小時自動更新
- 不會過度消耗 API 配額
- 可根據需求調整更新頻率

### **精度考量**
- 匯率保留 2 位小數
- 金額計算可能有微小誤差
- 適合一般財務記錄使用

### **API 依賴**
- 依賴外部 API 服務
- 建議定期檢查 API 可用性
- 可考慮增加備援 API

### **資料庫儲存**
- 目前幣別僅在前端使用
- 若需後端支援，需要：
  - 資料庫 schema 新增 `currency` 欄位
  - API 儲存/讀取邏輯更新
  - 後端匯率轉換邏輯（可選）

---

**更新完成** ✅
**測試狀態**: 待瀏覽器測試
**下一步**: 啟動開發伺服器測試所有功能

**API 額度監控**: 建議定期檢查 API 使用量，避免超出免費額度
