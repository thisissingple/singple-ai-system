# 收支表單同步完成報告

## ✅ 同步完成狀態

**日期**: 2025-11-25
**總記錄數**: 5,047 筆 (from 6,786 rows)
**成功同步**: ✅ 18 個欄位完整映射

---

## 📋 最終欄位映射（18個欄位）

| Google Sheets 欄位 | Supabase 欄位 | 資料類型 | 狀態 |
|--------------------|--------------|---------|------|
| Date | `transaction_date` | DATE | ✅ |
| 付款方式 | `payment_method` | VARCHAR(100) | ✅ |
| 收入項目 | `income_item` | VARCHAR(255) | ✅ |
| 支出項目 | `expense_item` | VARCHAR(255) | ✅ |
| 數量 | `quantity` | INTEGER | ✅ |
| 收支類別 | `transaction_category` | VARCHAR(100) | ✅ |
| 商家類別 | `customer_type` | VARCHAR(50) | ✅ |
| 授課教練 | `teacher_name` | VARCHAR(100) | ✅ |
| 商家姓名/顧客姓名 | `customer_name` | VARCHAR(255) | ✅ |
| 顧客Email | `customer_email` | VARCHAR(255) | ✅ |
| 備註 | `notes` | TEXT | ✅ |
| 金額（換算台幣）| `amount_twd` | DECIMAL(15,2) | ✅ |
| 業績歸屬人 1 | `closer` | VARCHAR(100) | ✅ |
| 業績歸屬人 2 | `setter` | VARCHAR(100) | ✅ |
| 填表人 | `form_filler` | VARCHAR(100) | ✅ |
| 成交方式 | `deal_method` | VARCHAR(100) | ✅ |
| 諮詢來源 | `consultation_source` | VARCHAR(100) | ✅ |
| 提交時間 | `submitted_at` | TIMESTAMP | ✅ |

---

## 🔧 關鍵技術問題與解決方案

### 問題 1: 數字格式錯誤
**錯誤**: `invalid input syntax for type numeric: "$4,000"`

**原因**: Google Sheets 中的金額欄位包含 `$` 符號和逗號（如 `"$4,000"`, `"-$1,797"`）

**解決方案**:
修改 `sync-service.ts` 的 `transformData` 函數，添加數據清理邏輯：

```typescript
// 特殊處理數字欄位（amount_twd, quantity）
if (mapping.supabaseColumn === 'amount_twd' || mapping.supabaseColumn === 'quantity') {
  if (typeof value === 'string') {
    // 移除 $ 符號和逗號
    value = value.replace(/[\$,]/g, '');

    // 如果清理後還包含非數字字元（除了負號和小數點），設為 null
    if (!/^-?\d+\.?\d*$/.test(value.trim())) {
      record[mapping.supabaseColumn] = null;
      return;
    }
  }
}
```

### 問題 2: 非數字值映射到數字欄位
**錯誤**: `invalid input syntax for type integer: "高階一對一訓練"`

**原因**: 某些行的 `quantity` 欄位包含中文文字而非數字

**解決方案**: 同上的數據清理邏輯，將無效數字轉換為 `NULL`

### 問題 3: 中文全形數字
**錯誤**: `invalid input syntax for type integer: "１"`

**解決方案**:
```typescript
// 清理中文數字（例如 "１" -> "1"）
if (typeof value === 'string' && /[０-９]/.test(value)) {
  value = value.replace(/[０-９]/g, (ch) => {
    return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30);
  });
}
```

---

## 📊 同步結果範例

```
1.
   交易日期: Thu Apr 11 2024
   顧客Email: bear19981204@gmail.com
   顧客姓名: 英玄 陳
   金額: 168.00
   付款方式: 信用卡
   授課教練: Orange
   業績歸屬人1: (無)
   業績歸屬人2: (無)
   諮詢來源: (無)

2.
   交易日期: Wed Apr 10 2024
   顧客Email: asdc31024@yahoo.com.tw
   顧客姓名: 范昕瑜
   金額: 5000.00
   付款方式: 信用卡
   授課教練: Orange
   業績歸屬人1: 47
   業績歸屬人2: 昕誼
   諮詢來源: FB廣告
```

---

## 🗂️ 相關檔案

- **Migration**: [`supabase/migrations/065_rebuild_income_expense_clean.sql`](../supabase/migrations/065_rebuild_income_expense_clean.sql)
- **Sync Service**: [`server/services/sheets/sync-service.ts`](../server/services/sheets/sync-service.ts) (Lines 227-274)
- **Mapping Configuration**: `sheet_mappings` table (ID: `43c2f863-c1dc-48d4-9e8a-4781490cf605`)

---

## ⚙️ 如何執行同步

### 手動同步
```bash
curl -X POST "http://localhost:5001/api/sheets/sync/43c2f863-c1dc-48d4-9e8a-4781490cf605"
```

### 檢查同步結果
```bash
npx tsx scripts/check-synced-sample.ts
```

### 查看所有記錄數
```sql
SELECT COUNT(*) FROM income_expense_records;
-- Result: 5047 records
```

---

## 🎯 後續工作建議

### 1. 人員欄位優化（可選）
目前人員欄位儲存的是**姓名文字**（`closer`, `setter`, `teacher_name`, `form_filler`），而非 UUID。

如果未來需要關聯到 `users` 表，可以：
1. 建立查詢腳本將姓名轉換為 UUID
2. 新增對應的 `_id` 欄位（如 `closer_id`）
3. 保留原始姓名欄位作為備份

### 2. 資料驗證
建議定期檢查：
```sql
-- 檢查空白金額
SELECT COUNT(*) FROM income_expense_records WHERE amount_twd IS NULL;

-- 檢查空白日期
SELECT COUNT(*) FROM income_expense_records WHERE transaction_date IS NULL;
```

### 3. 自動排程同步
系統已配置每日自動同步時段（8個時段），確保資料即時性。

---

## ✅ 驗證清單

- [x] 18 個欄位全部成功映射
- [x] 數字欄位格式清理（移除 $, 逗號）
- [x] 中文全形數字轉換
- [x] 無效數字轉為 NULL
- [x] 同步完成：5,047 筆記錄
- [x] 資料範例驗證通過
- [x] Student KB 自動同步完成

---

**完成時間**: 2025-11-25 16:08 (台北時間)
**同步耗時**: 約 2 分鐘（含 Student KB sync）
