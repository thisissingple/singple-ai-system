# 收支表單完整欄位映射（最終版）

## 📊 Google Sheets 實際欄位

你提供的 Google Sheets 欄位：
```
Date, 付款方式, 收入項目, 數量, 收支類別, 課程類別, 授課教練,
商家姓名/顧客姓名, 顧客Email, 備註, 姓名類別, 金額（換算台幣）,
業績歸屬人 1, 業績歸屬人 2, 填表人, 成交方式, 諮詢來源, 提交時間
```

## 🎯 完整映射表（18 個欄位）

| # | Google Sheets 欄位 | → | Supabase 欄位 | 類型 | 說明 |
|---|-------------------|---|--------------|------|------|
| 1 | `Date` | → | `transaction_date` | DATE | 交易日期 ✅ 已映射 |
| 2 | `付款方式` | → | `payment_method` | VARCHAR(100) | 付款方式 |
| 3 | `收入項目` | → | `income_item` | VARCHAR(255) | 收入項目描述 |
| 4 | `數量` | → | `quantity` | INTEGER | 數量 |
| 5 | `收支類別` | → | `transaction_category` | VARCHAR(100) | 收入/支出/退款等 |
| 6 | `課程類別` | → | `course_category` | VARCHAR(100) | 課程類別 |
| 7 | `授課教練` | → | `teacher_name` | VARCHAR(100) | ⚠️ 教練姓名（文字，非 ID）|
| 8 | `商家姓名/顧客姓名` | → | `customer_name` | VARCHAR(255) | 顧客姓名 |
| 9 | `顧客Email` | → | `customer_email` | VARCHAR(255) | 顧客 Email ✅ 已映射 |
| 10 | `備註` | → | `notes` | TEXT | 備註 |
| 11 | `姓名類別` | → | `customer_type` | VARCHAR(50) | 學生/商家/其他 |
| 12 | `金額（換算台幣）` | → | `amount_twd` | DECIMAL(15,2) | 金額（台幣）|
| 13 | `業績歸屬人 1` | → | `closer_name` | VARCHAR(100) | ⚠️ 諮詢師姓名（文字）|
| 14 | `業績歸屬人 2` | → | `setter_name` | VARCHAR(100) | ⚠️ 電訪人員姓名（文字）|
| 15 | `填表人` | → | `form_filler_name` | VARCHAR(100) | ⚠️ 填表人姓名（文字）|
| 16 | `成交方式` | → | `deal_method` | VARCHAR(100) | 成交方式 |
| 17 | `諮詢來源` | → | `consultation_source` | VARCHAR(100) | 諮詢來源 |
| 18 | `提交時間` | → | `created_at` | TIMESTAMP | 表單提交時間 |

## ⚠️ 重要發現：欄位名稱不匹配

你的 Supabase 表目前的人員欄位是：
- `teacher_id` (UUID)
- `closer_id` (UUID)
- `setter_id` (UUID)
- `form_filler_id` (UUID)

但 Google Sheets 提供的是**姓名**（文字），不是 UUID。

## 🔧 解決方案：需要新增欄位

### 方案 A：新增姓名欄位（推薦）

在 `income_expense_records` 表新增以下欄位：

```sql
ALTER TABLE income_expense_records
ADD COLUMN teacher_name VARCHAR(100),
ADD COLUMN closer_name VARCHAR(100),
ADD COLUMN setter_name VARCHAR(100),
ADD COLUMN form_filler_name VARCHAR(100);
```

這樣可以：
- ✅ 直接儲存姓名，不需要查表轉換
- ✅ 同步速度快
- ✅ 資料不會遺失（即使 users 表沒有該人員）
- ✅ 之後可以用腳本批次轉換為 UUID（如果需要）

### 方案 B：同步時動態查表（不推薦）

修改 `sync-service.ts`，在同步時根據姓名查詢 users 表取得 UUID。

**缺點：**
- ❌ 速度慢（每筆都要查表）
- ❌ 如果姓名不在 users 表，資料會遺失
- ❌ 姓名重複時無法判斷

## 📝 建議執行步驟

### Step 1: 新增姓名欄位

執行以下 SQL（或建立 migration）：

```sql
-- Migration 065: 為收支表新增人員姓名欄位
ALTER TABLE income_expense_records
ADD COLUMN teacher_name VARCHAR(100),
ADD COLUMN closer_name VARCHAR(100),
ADD COLUMN setter_name VARCHAR(100),
ADD COLUMN form_filler_name VARCHAR(100);

COMMENT ON COLUMN income_expense_records.teacher_name IS '授課教練姓名';
COMMENT ON COLUMN income_expense_records.closer_name IS '諮詢師姓名（業績歸屬人 1）';
COMMENT ON COLUMN income_expense_records.setter_name IS '電訪人員姓名（業績歸屬人 2）';
COMMENT ON COLUMN income_expense_records.form_filler_name IS '填表人姓名';
```

### Step 2: 更新映射配置

在 Google Sheets 同步管理頁面，將現有的 2 個映射更新為 18 個：

**完整映射列表（JSON 格式）：**
```json
[
  { "googleColumn": "Date", "supabaseColumn": "transaction_date" },
  { "googleColumn": "付款方式", "supabaseColumn": "payment_method" },
  { "googleColumn": "收入項目", "supabaseColumn": "income_item" },
  { "googleColumn": "數量", "supabaseColumn": "quantity" },
  { "googleColumn": "收支類別", "supabaseColumn": "transaction_category" },
  { "googleColumn": "課程類別", "supabaseColumn": "course_category" },
  { "googleColumn": "授課教練", "supabaseColumn": "teacher_name" },
  { "googleColumn": "商家姓名/顧客姓名", "supabaseColumn": "customer_name" },
  { "googleColumn": "顧客Email", "supabaseColumn": "customer_email" },
  { "googleColumn": "備註", "supabaseColumn": "notes" },
  { "googleColumn": "姓名類別", "supabaseColumn": "customer_type" },
  { "googleColumn": "金額（換算台幣）", "supabaseColumn": "amount_twd" },
  { "googleColumn": "業績歸屬人 1", "supabaseColumn": "closer_name" },
  { "googleColumn": "業績歸屬人 2", "supabaseColumn": "setter_name" },
  { "googleColumn": "填表人", "supabaseColumn": "form_filler_name" },
  { "googleColumn": "成交方式", "supabaseColumn": "deal_method" },
  { "googleColumn": "諮詢來源", "supabaseColumn": "consultation_source" },
  { "googleColumn": "提交時間", "supabaseColumn": "created_at" }
]
```

### Step 3: 執行同步

```bash
curl -X POST "http://localhost:5001/api/sheets/sync/43c2f863-c1dc-48d4-9e8a-4781490cf605"
```

### Step 4: 驗證結果

```bash
npx tsx scripts/check-synced-sample.ts
```

---

## 🎯 快速操作

我可以幫你：

1. **建立 migration 檔案**（新增 4 個姓名欄位）
2. **執行 migration**
3. **通過 API 更新映射配置**（一次更新全部 18 個欄位）
4. **執行同步**

你想要我直接執行嗎？還是你想要分步驟來？
