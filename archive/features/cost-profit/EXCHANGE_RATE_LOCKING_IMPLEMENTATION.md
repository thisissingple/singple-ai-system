# 匯率鎖定功能實作計劃（選項 1）

**功能**: 記錄每筆交易當時的匯率，確保歷史資料不受匯率波動影響
**狀態**: 📋 待實作
**預估時間**: 30-45 分鐘

---

## 📋 實作步驟總覽

1. ✅ 資料庫 Schema 更新（新增 2 個欄位）
2. ✅ TypeScript 類型定義更新
3. ✅ 前端資料載入邏輯更新
4. ✅ 儲存邏輯更新（鎖定匯率）
5. ✅ 計算邏輯更新（使用已鎖定匯率）
6. ✅ UI 顯示優化（顯示匯率資訊）

---

## 步驟 1: 資料庫 Schema 更新

### **SQL Migration 腳本**

建立新的 migration 檔案：`supabase/migrations/028_add_exchange_rate_fields.sql`

```sql
-- =====================================================
-- Migration 028: 新增匯率鎖定欄位
-- 目的: 記錄每筆交易當時的匯率，避免歷史資料受匯率波動影響
-- 日期: 2025-10-16
-- =====================================================

-- 1. 新增匯率相關欄位
ALTER TABLE cost_profit
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'TWD',
ADD COLUMN IF NOT EXISTS exchange_rate_used DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS amount_in_twd DECIMAL(15,2);

-- 2. 為現有資料補充預設值
UPDATE cost_profit
SET
  currency = 'TWD',
  exchange_rate_used = 1.0,
  amount_in_twd = amount
WHERE currency IS NULL;

-- 3. 新增註解
COMMENT ON COLUMN cost_profit.currency IS '幣別：TWD, USD, RMB';
COMMENT ON COLUMN cost_profit.exchange_rate_used IS '儲存時使用的匯率（對 TWD）';
COMMENT ON COLUMN cost_profit.amount_in_twd IS '換算為 TWD 的金額（使用 exchange_rate_used）';

-- 4. 建立索引（優化查詢效能）
CREATE INDEX IF NOT EXISTS idx_cost_profit_currency ON cost_profit(currency);
CREATE INDEX IF NOT EXISTS idx_cost_profit_year_month ON cost_profit(year, month);
```

### **執行方式**

```bash
# 方式 1: 透過 Supabase Dashboard
# 1. 登入 Supabase Dashboard
# 2. 進入 SQL Editor
# 3. 貼上上述 SQL
# 4. 執行

# 方式 2: 透過 Supabase CLI（如果已安裝）
supabase migration new add_exchange_rate_fields
# 將 SQL 內容貼到新建的 migration 檔案
supabase db push
```

---

## 步驟 2: TypeScript 類型定義更新

### **檔案**: `client/src/types/cost-profit.ts`

```typescript
export interface CostProfitRecord {
  id?: string;
  category_name: string;
  item_name: string;
  amount: number | null;
  notes?: string | null;
  month: string;
  year: number;
  is_confirmed?: boolean;
  source?: 'existing' | 'ai' | 'manual';
  created_at?: string;
  updated_at?: string;

  // 🆕 新增：幣別相關欄位
  currency?: 'TWD' | 'USD' | 'RMB';
  exchange_rate_used?: number;  // 儲存時的匯率（對 TWD）
  amount_in_twd?: number;       // 換算後的 TWD 金額
}

export interface CostProfitPrediction {
  category_name: string;
  item_name: string;
  predicted_amount: number;
  confidence?: number;
  reason?: string;
}
```

**說明**:
- `currency`: 該筆交易的幣別
- `exchange_rate_used`: 儲存時使用的匯率（例如：1 USD = 31.5 TWD，則此值為 31.5）
- `amount_in_twd`: 已換算的 TWD 金額（= amount × exchange_rate_used）

---

## 步驟 3: 前端資料載入邏輯更新

### **檔案**: `client/src/pages/reports/cost-profit-manager.tsx`

**位置**: `useEffect` - 資料載入後的轉換邏輯

```typescript
useEffect(() => {
  if (recordsQuery.data) {
    const converted: EditableRow[] = recordsQuery.data.map((record: CostProfitRecord, index) => ({
      id: record.id,
      category: record.category_name ?? '',
      item: record.item_name ?? '',
      amount:
        record.amount === null || record.amount === undefined
          ? ''
          : String(record.amount),
      notes: record.notes ?? '',
      isConfirmed: record.is_confirmed ?? false,
      source: 'existing' as RowSource,
      selected: false,
      createdAt: record.created_at ? new Date(record.created_at).toLocaleString('zh-TW') : undefined,
      updatedAt: record.updated_at ? new Date(record.updated_at).toLocaleString('zh-TW') : undefined,
      tempId: `row-${Date.now()}-${index}`,

      // 🆕 新增：載入幣別和匯率資訊
      currency: record.currency || 'TWD',
      exchangeRateUsed: record.exchange_rate_used,
      amountInTWD: record.amount_in_twd,
    }));
    setRows(converted);
  } else if (!recordsQuery.isLoading) {
    setRows([]);
  }
}, [recordsQuery.data, recordsQuery.isLoading]);
```

**同時更新 `EditableRow` 介面**:

```typescript
interface EditableRow {
  id?: string;
  category: string;
  item: string;
  amount: string;
  notes: string;
  isConfirmed: boolean;
  source: RowSource;
  aiReason?: string;
  aiConfidence?: number;
  selected?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tempId?: string;
  currency?: 'TWD' | 'USD' | 'RMB';

  // 🆕 新增：匯率鎖定欄位
  exchangeRateUsed?: number;  // 已記錄的匯率
  amountInTWD?: number;       // 已換算的 TWD 金額
}
```

---

## 步驟 4: 儲存邏輯更新（鎖定匯率）

### **檔案**: `client/src/pages/reports/cost-profit-manager.tsx`

**位置**: `handleSave` 函數

```typescript
const handleSave = () => {
  if (validationErrors.length > 0) {
    toast({
      title: '資料未完整',
      description: validationErrors.join('\n'),
      variant: 'destructive',
    });
    return;
  }

  const payload = {
    year: selectedYear,
    month: selectedMonth,
    records: rows
      .filter((row) => row.category.trim() && row.item.trim())
      .map((row) => {
        const amount = row.amount.trim() === ''
          ? null
          : Number.parseFloat(row.amount.trim());

        // 🆕 計算並鎖定當前匯率
        let exchangeRateUsed = 1;
        let amountInTwd = amount;
        const currency = row.currency || 'TWD';

        if (amount !== null && amount !== 0) {
          if (currency === 'USD') {
            exchangeRateUsed = exchangeRates.USD;
            amountInTwd = amount * exchangeRates.USD;
          } else if (currency === 'RMB') {
            exchangeRateUsed = exchangeRates.RMB;
            amountInTwd = amount * exchangeRates.RMB;
          } else {
            // TWD 不需要轉換
            exchangeRateUsed = 1;
            amountInTwd = amount;
          }
        }

        return {
          category_name: row.category.trim(),
          item_name: row.item.trim(),
          amount: amount,
          notes: row.notes.trim() === '' ? null : row.notes.trim(),
          is_confirmed: row.isConfirmed,

          // 🆕 儲存幣別和匯率資訊
          currency: currency,
          exchange_rate_used: exchangeRateUsed,
          amount_in_twd: amountInTwd,
        };
      }),
  };

  saveMutation.mutate(payload);
};
```

**重點說明**:
1. **儲存時計算**: 在儲存時根據當前匯率計算 `amount_in_twd`
2. **鎖定匯率**: 將當時的 `exchange_rate_used` 一併儲存
3. **未來不變**: 之後查看時使用已儲存的 `amount_in_twd`，不受匯率變動影響

---

## 步驟 5: 計算邏輯更新（使用已鎖定匯率）

### **檔案**: `client/src/pages/reports/cost-profit-manager.tsx`

**位置**: `totals` useMemo

```typescript
const totals = useMemo(() => {
  let revenue = 0;
  let cost = 0;

  rows.forEach((row) => {
    let amountInTWD: number;

    // 🆕 優先使用已鎖定的 TWD 金額
    if (row.amountInTWD !== undefined && row.amountInTWD !== null) {
      // 使用已儲存的 TWD 金額（歷史資料，匯率已鎖定）
      amountInTWD = row.amountInTWD;
    } else {
      // 即時計算（新增或未儲存的資料）
      const amount = Number.parseFloat(row.amount);
      if (!Number.isFinite(amount)) return;
      amountInTWD = convertToTWD(amount, row.currency);
    }

    if (isRevenueCategory(row.category)) {
      revenue += amountInTWD;
    } else {
      cost += amountInTWD;
    }
  });

  const profit = revenue - cost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cost,
    profit,
    margin,
  };
}, [rows, exchangeRates]);
```

**邏輯說明**:
```
如果有 amountInTWD（已儲存的記錄）
  → 使用已鎖定的 TWD 金額 ✅ 不受匯率影響
否則（新增或未儲存）
  → 使用當前匯率即時計算 🔄 動態更新
```

---

## 步驟 6: UI 顯示優化

### **選項 A: 在金額欄位旁顯示換算資訊**

在金額和幣別欄位下方顯示換算詳情：

```typescript
// 在表格渲染中，金額欄位的部分
<TableCell>
  <div className="flex flex-col gap-1">
    {/* 金額輸入和幣別選擇（現有代碼）*/}
    <div className="flex gap-2 items-center">
      <Input
        className="text-right flex-1"
        value={row.amount}
        placeholder="0"
        onChange={(event) =>
          handleRowChange(originalIndex, 'amount', event.target.value)
        }
      />
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

    {/* 🆕 顯示換算資訊 */}
    {row.currency !== 'TWD' && row.amount && (
      <div className="text-xs text-muted-foreground">
        {row.exchangeRateUsed ? (
          // 已鎖定匯率（歷史資料）
          <span className="flex items-center gap-1">
            <span className="text-green-600">🔒</span>
            ≈ {formatCurrency(row.amountInTWD || 0)}
            (匯率: {row.exchangeRateUsed})
          </span>
        ) : (
          // 即時匯率（未儲存）
          <span className="flex items-center gap-1">
            <span className="text-blue-600">🔄</span>
            ≈ {formatCurrency(
              parseFloat(row.amount) * (
                row.currency === 'USD'
                  ? exchangeRates.USD
                  : exchangeRates.RMB
              )
            )}
            (當前匯率)
          </span>
        )}
      </div>
    )}
  </div>
</TableCell>
```

### **選項 B: 在即時摘要中顯示匯率狀態**

```tsx
<CardDescription>
  金額單位為新台幣（已自動換算外幣）｜
  即時匯率：1 USD = {exchangeRates.USD} TWD, 1 RMB = {exchangeRates.RMB} TWD
  {rows.some(r => r.exchangeRateUsed) && (
    <span className="ml-2 text-green-600">
      🔒 部分資料使用歷史鎖定匯率
    </span>
  )}
</CardDescription>
```

### **選項 C: 新增匯率資訊欄位（完整顯示）**

在表格中新增一個「匯率」欄位：

```tsx
{/* 表頭新增 */}
<TableHead className="w-[100px]">匯率資訊</TableHead>

{/* 表格內容 */}
<TableCell className="text-xs">
  {row.currency === 'TWD' ? (
    <span className="text-muted-foreground">-</span>
  ) : row.exchangeRateUsed ? (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-green-600">
        <span>🔒</span>
        <span>已鎖定</span>
      </div>
      <div className="text-muted-foreground">
        1 {row.currency} = {row.exchangeRateUsed}
      </div>
      <div className="font-medium">
        = {formatCurrency(row.amountInTWD || 0)}
      </div>
    </div>
  ) : (
    <div className="space-y-1">
      <div className="flex items-center gap-1 text-blue-600">
        <span>🔄</span>
        <span>即時</span>
      </div>
      <div className="text-muted-foreground">
        1 {row.currency} = {
          row.currency === 'USD'
            ? exchangeRates.USD
            : exchangeRates.RMB
        }
      </div>
    </div>
  )}
</TableCell>
```

**推薦**: 使用**選項 A**（金額欄位下方顯示），既清晰又不佔用太多空間。

---

## 步驟 7: 後端 API 更新（如需要）

### **檔案**: `server/services/cost-profit-service.ts`

確認後端服務可以處理新欄位：

```typescript
// 查詢時返回新欄位
async getRecordsByPeriod(year: number, month: string) {
  const query = `
    SELECT
      id,
      category_name,
      item_name,
      amount,
      notes,
      month,
      year,
      is_confirmed,
      created_at,
      updated_at,
      currency,              -- 🆕
      exchange_rate_used,    -- 🆕
      amount_in_twd          -- 🆕
    FROM cost_profit
    WHERE year = $1 AND month = $2
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [year, month]);
  return result.rows;
}

// 儲存時包含新欄位
async saveMonthlyRecords(data: {
  year: number;
  month: string;
  records: Array<{
    category_name: string;
    item_name: string;
    amount: number | null;
    notes: string | null;
    is_confirmed: boolean;
    currency?: string;              -- 🆕
    exchange_rate_used?: number;    -- 🆕
    amount_in_twd?: number;         -- 🆕
  }>;
}) {
  // 刪除舊資料
  await pool.query(
    'DELETE FROM cost_profit WHERE year = $1 AND month = $2',
    [data.year, data.month]
  );

  // 插入新資料（包含匯率欄位）
  for (const record of data.records) {
    await pool.query(
      `INSERT INTO cost_profit (
        year, month, category_name, item_name, amount, notes, is_confirmed,
        currency, exchange_rate_used, amount_in_twd
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.year,
        data.month,
        record.category_name,
        record.item_name,
        record.amount,
        record.notes,
        record.is_confirmed,
        record.currency || 'TWD',              -- 🆕
        record.exchange_rate_used || 1,        -- 🆕
        record.amount_in_twd || record.amount, -- 🆕
      ]
    );
  }
}
```

---

## 📊 實作前後對比

### **實作前（目前狀態）**

| 月份 | 項目 | 金額 | 幣別 | 查看時匯率 | 顯示 TWD |
|------|------|------|------|------------|----------|
| 8月 | AWS費用 | 1000 | USD | 31.5 | 31,500 |
| 9月查看8月 | AWS費用 | 1000 | USD | 32.0 | 32,000 ❌ |
| 10月查看8月 | AWS費用 | 1000 | USD | 31.0 | 31,000 ❌ |

**問題**: 歷史資料隨匯率變動

### **實作後（選項 1）**

| 月份 | 項目 | 金額 | 幣別 | 鎖定匯率 | TWD（鎖定） | 任何時候查看 |
|------|------|------|------|----------|-------------|--------------|
| 8月 | AWS費用 | 1000 | USD | 31.5 | 31,500 | 31,500 ✅ |
| 9月查看8月 | AWS費用 | 1000 | USD | 31.5 | 31,500 | 31,500 ✅ |
| 10月查看8月 | AWS費用 | 1000 | USD | 31.5 | 31,500 | 31,500 ✅ |

**改善**: 歷史資料永遠使用儲存時的匯率

---

## 🧪 測試計劃

### **測試 1: 新增 USD 項目**
1. ✅ 新增一筆 USD 支出（例如：1000 USD）
2. ✅ 當前匯率顯示為 31.5
3. ✅ 儲存資料
4. ✅ 確認資料庫記錄：
   - `currency = 'USD'`
   - `exchange_rate_used = 31.5`
   - `amount_in_twd = 31500`

### **測試 2: 匯率變動後查看歷史**
1. ✅ 修改 exchangeRates（模擬匯率變動）
2. ✅ 重新載入頁面
3. ✅ 確認 8月的 USD 項目仍顯示 31,500 TWD
4. ✅ 即時摘要使用歷史鎖定匯率

### **測試 3: 新舊資料混合**
1. ✅ 載入有鎖定匯率的舊資料
2. ✅ 新增未儲存的新資料
3. ✅ 確認舊資料使用鎖定匯率
4. ✅ 確認新資料使用即時匯率

### **測試 4: UI 顯示**
1. ✅ 已鎖定資料顯示 🔒 圖示
2. ✅ 未儲存資料顯示 🔄 圖示
3. ✅ 匯率資訊正確顯示

---

## ⚠️ 注意事項

### **資料遷移**
- 現有資料會自動設定為 `currency = 'TWD'`, `exchange_rate_used = 1.0`
- 不影響現有資料的準確性

### **效能考量**
- 新增 3 個欄位對效能影響極小
- 已建立索引優化查詢效能

### **向後相容**
- 舊資料自動補充預設值
- 不會破壞現有功能

### **匯率精度**
- `exchange_rate_used` 使用 DECIMAL(10,4)，精度到小數點後 4 位
- 足以應對大部分貨幣匯率需求

---

## 📝 執行檢查清單

實作時請依序確認：

- [ ] **資料庫**: Migration 執行成功
- [ ] **類型**: TypeScript 類型定義更新
- [ ] **載入**: 資料載入邏輯包含新欄位
- [ ] **儲存**: 儲存時計算並鎖定匯率
- [ ] **計算**: 總額計算優先使用鎖定匯率
- [ ] **顯示**: UI 顯示匯率狀態
- [ ] **後端**: API 支援新欄位（如需要）
- [ ] **測試**: 執行完整測試計劃

---

## 🚀 預期成果

實作完成後：

1. ✅ **8月的 USD 支出**在任何時候查看都顯示相同的 TWD 金額
2. ✅ **歷史報表穩定**，不受即時匯率波動影響
3. ✅ **新增資料**即時顯示，儲存後鎖定
4. ✅ **符合會計準則**，使用交易日匯率

---

**實作計劃建立完成** ✅
**待執行**: 按照步驟 1-7 依序實作
**預估時間**: 30-45 分鐘
