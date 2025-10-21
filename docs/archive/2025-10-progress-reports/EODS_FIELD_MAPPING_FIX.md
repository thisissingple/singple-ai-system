# EODs for Closers 欄位對應修正報告

**日期**: 2025-10-05
**表格**: eods_for_closers

---

## ✅ 修正完成

### 已修正的欄位對應

| Google Sheets 欄位 | 修正前 | 修正後 | Supabase 欄位 |
|-------------------|--------|--------|--------------|
| 電話負責人 | `電訪人員` | `（諮詢）電話負責人` | caller_name |
| 是否上線 | `是否線上` | `（諮詢）是否上線` | is_online |
| 名單來源 | `名單來源` | `（諮詢）名單來源` | lead_source |
| 諮詢結果 | `咨詢結果` | `（諮詢）諮詢結果` | consultation_result |
| 成交方案 | `成交方案` | `（諮詢）成交方案` | deal_package |
| 方案數量 | `方案數量` | `（諮詢）方案數量` | package_quantity |
| 付款方式 | `付款方式` | `（諮詢）付款方式` | payment_method |
| 分期期數 | `分期期數` | `（諮詢）分期期數` | installment_periods |
| 方案價格 | `方案價格` | `（諮詢）方案價格` | package_price |
| 實收金額 | `實際金額` | `（諮詢）實收金額` | actual_amount |
| 諮詢日期 | `諮詢日期` | `（諮詢）諮詢日期` | consultation_date |
| 提交時間 | `表單提交時間` | `提交表單時間` | form_submitted_at |
| 週別 | `週數` | `週別` | week_number |

### 資料型別調整

| 欄位 | 修正前型別 | 修正後型別 | 原因 |
|-----|-----------|-----------|------|
| is_online | boolean | text | 實際值為「已上線/未上線」文字 |
| package_price | integer | text | 包含貨幣符號（如 $4,000.00） |
| actual_amount | integer | text | 包含貨幣符號（如 $4,000.00） |
| form_submitted_at | timestamp | text | 格式為文字（如 2025/9/23 15:27） |
| month | integer | text | 格式為中文（如 9月） |
| week_number | integer | text | 格式為中文（如 第39週） |

---

## 🧪 測試結果

### 欄位對應測試
```
✅ 所有欄位都已正確映射
✅ 無缺失欄位
```

### 資料轉換測試

**測試資料**:
```json
{
  "Name": "Law Joey",
  "Email": "law-joey@hotmail.com",
  "（諮詢）成交日期": "2025/9/23",
  "（諮詢）實收金額": "$4,000.00",
  ...
}
```

**轉換結果**:
```
✅ student_name: Law Joey
✅ student_email: law-joey@hotmail.com
✅ closer_name: 47
✅ deal_date: 2025-09-23
✅ actual_amount: $4,000.00
✅ package_price: $4,000.00
✅ month: 9月
✅ week_number: 第39週
✅ raw_data: 包含所有 20 個原始欄位
```

---

## 📊 現有資料驗證

### 資料庫查詢結果 (5 筆資料)

| 欄位 | 狀態 | 備註 |
|-----|------|------|
| student_name | ✅ 有值 | Law Joey, 子謙, 筑云, 洪瑀煬, 李振維 |
| student_email | ✅ 有值 | 所有記錄都有 email |
| deal_date | ✅ 有值 | 日期格式正確 |
| closer_name | ✅ 有值 | 諮詢人員編號或姓名 |
| actual_amount | ❌ null | **需要重新同步** |
| raw_data | ✅ 完整 | 包含所有原始欄位 |

**問題**: `actual_amount` 等欄位為 null，因為使用了舊的欄位對應（`實際金額` vs `（諮詢）實收金額`）

---

## 🎯 下一步行動

### 1. 重新同步 EODs for Closers 表

使用修正後的欄位對應重新同步，確保：
- ✅ `actual_amount` 有值（從 `（諮詢）實收金額` 欄位）
- ✅ `package_price` 有值（從 `（諮詢）方案價格` 欄位）
- ✅ `consultation_result` 有值（從 `（諮詢）諮詢結果` 欄位）
- ✅ 其他業務欄位正確填入

### 2. 驗證同步結果

```sql
SELECT
  student_name,
  student_email,
  deal_date,
  closer_name,
  actual_amount,    -- 應該有值（如：$4,000.00）
  package_price,    -- 應該有值（如：$4,000.00）
  consultation_result,  -- 應該有值（如：已成交）
  lead_source,      -- 應該有值（如：明星導師計劃2.0）
  payment_method,   -- 應該有值（如：信用卡）
  month,            -- 應該有值（如：9月）
  year              -- 應該有值（如：2025）
FROM eods_for_closers
LIMIT 5;
```

### 3. 資料清洗建議（選擇性）

如果需要將文字格式轉換為數字進行統計分析：

```sql
-- 建立 view 自動清洗資料
CREATE OR REPLACE VIEW eods_for_closers_cleaned AS
SELECT
  *,
  -- 移除貨幣符號和逗號，轉為數字
  CAST(REPLACE(REPLACE(actual_amount, '$', ''), ',', '') AS NUMERIC) AS actual_amount_numeric,
  CAST(REPLACE(REPLACE(package_price, '$', ''), ',', '') AS NUMERIC) AS package_price_numeric,
  -- 提取月份數字
  CAST(REPLACE(month, '月', '') AS INTEGER) AS month_numeric,
  -- 提取週數數字
  CAST(REPLACE(REPLACE(week_number, '第', ''), '週', '') AS INTEGER) AS week_number_numeric
FROM eods_for_closers;
```

---

## 📁 修改的檔案

- [configs/sheet-field-mappings-complete.ts](configs/sheet-field-mappings-complete.ts)
  - 修正所有 EODs for Closers 的欄位對應
  - 調整資料型別以符合實際格式

---

## 📝 補充說明

### Google Sheets 欄位命名規則

發現 Google Sheets 使用了統一的欄位前綴：
- `（諮詢）` 前綴：諮詢相關欄位
- 無前綴：基本資訊（Name, Email, 年份, 月份等）

這個規則應該在未來的欄位對應中保持一致。

### 關於資料型別

雖然 Supabase schema 中某些欄位定義為 `integer`，但實際 Google Sheets 的資料包含格式化文字（如貨幣符號、中文月份），因此 mapping 改為 `text` 型別以保留原始格式。

如需數字計算，建議：
1. 保留原始文字格式在主表
2. 建立 VIEW 或計算欄位進行資料清洗
3. 在應用層進行格式轉換

---

**結論**: EODs for Closers 欄位對應已修正完成，測試通過。需要重新同步以使新的對應生效。
