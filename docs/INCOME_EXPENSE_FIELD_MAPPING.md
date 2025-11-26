# 收支表單完整欄位映射建議

## Supabase 表結構 (`income_expense_records`)

根據 Migration 064，表結構如下：

### 基本交易資訊
| Supabase 欄位 | 類型 | 必填 | 說明 |
|--------------|------|------|------|
| `transaction_date` | DATE | ✅ | 交易日期 |
| `payment_method` | VARCHAR(100) | ❌ | 付款方式 |
| `income_item` | VARCHAR(255) | ❌ | 收入項目 |
| `quantity` | INTEGER | ❌ | 數量 (預設 1) |
| `transaction_category` | VARCHAR(100) | ❌ | 收支類別 |
| `course_category` | VARCHAR(100) | ❌ | 課程類別 |

### 金額資訊
| Supabase 欄位 | 類型 | 必填 | 說明 |
|--------------|------|------|------|
| `amount_twd` | DECIMAL(15,2) | ❌* | 金額（台幣）|
| `amount_converted` | DECIMAL(15,2) | ❌ | 換算台幣金額 |
| `currency` | VARCHAR(3) | ❌ | 幣別 (預設 TWD) |

*註：已改為可空，但建議映射

### 客戶資訊
| Supabase 欄位 | 類型 | 必填 | 說明 |
|--------------|------|------|------|
| `customer_name` | VARCHAR(255) | ❌ | 商家/顧客姓名 |
| `customer_email` | VARCHAR(255) | ❌ | 顧客Email |
| `customer_type` | VARCHAR(50) | ❌ | 姓名類別 |

### 人員資訊
| Supabase 欄位 | 類型 | 必填 | 說明 |
|--------------|------|------|------|
| `teacher_id` | UUID | ❌ | 授課教練 (關聯 users) |
| `closer_id` | UUID | ❌ | 諮詢師 (關聯 users) |
| `setter_id` | UUID | ❌ | 電訪人員 (關聯 users) |
| `form_filler_id` | UUID | ❌ | 填表人員 (關聯 users) |

### 業務資訊
| Supabase 欄位 | 類型 | 必填 | 說明 |
|--------------|------|------|------|
| `deal_method` | VARCHAR(100) | ❌ | 成交方式 |
| `consultation_source` | VARCHAR(100) | ❌ | 諮詢來源 |
| `notes` | TEXT | ❌ | 備註 |

---

## 🎯 建議的完整欄位映射

基於一般收支表的常見欄位，建議以下映射：

### 核心欄位（必須映射）

| Google Sheets 欄位 | → | Supabase 欄位 | 說明 |
|-------------------|---|--------------|------|
| `Date` | → | `transaction_date` | ✅ 已映射 |
| `金額（台幣）` | → | `amount_twd` | ⚠️ 必須新增 |
| `顧客Email` | → | `customer_email` | ✅ 已映射 |

### 基本交易資訊

| Google Sheets 欄位 | → | Supabase 欄位 |
|-------------------|---|--------------|
| `付款方式` | → | `payment_method` |
| `收入項目` | → | `income_item` |
| `數量` | → | `quantity` |
| `收支類別` 或 `類別` | → | `transaction_category` |
| `課程類別` | → | `course_category` |

### 金額相關

| Google Sheets 欄位 | → | Supabase 欄位 |
|-------------------|---|--------------|
| `金額（台幣）` | → | `amount_twd` |
| `金額（換算台幣）` | → | `amount_converted` |
| `幣別` | → | `currency` |

### 客戶資訊

| Google Sheets 欄位 | → | Supabase 欄位 |
|-------------------|---|--------------|
| `商家姓名` 或 `顧客姓名` | → | `customer_name` |
| `顧客Email` | → | `customer_email` |
| `姓名類別` | → | `customer_type` |

### 人員資訊（需要查表轉換為 UUID）

| Google Sheets 欄位 | → | Supabase 欄位 | 處理方式 |
|-------------------|---|--------------|---------|
| `授課教練` | → | `teacher_id` | 需通過姓名查詢 users 表取得 UUID |
| `諮詢師` | → | `closer_id` | 需通過姓名查詢 users 表取得 UUID |
| `電訪人員` | → | `setter_id` | 需通過姓名查詢 users 表取得 UUID |
| `填表人員` | → | `form_filler_id` | 需通過姓名查詢 users 表取得 UUID |

### 業務資訊

| Google Sheets 欄位 | → | Supabase 欄位 |
|-------------------|---|--------------|
| `成交方式` | → | `deal_method` |
| `諮詢來源` | → | `consultation_source` |
| `備註` | → | `notes` |

---

## ⚠️ 重要注意事項

### 1. 人員欄位的 UUID 轉換
Google Sheets 中的人員姓名是**文字**，但 Supabase 需要 **UUID**。

有兩種處理方式：

**方案 A：暫時不映射人員欄位**（推薦）
- 先同步基本資料（日期、金額、客戶資訊）
- 人員欄位留空，之後再用後續的資料處理腳本轉換

**方案 B：同步時動態查詢**
- 需要修改 `sync-service.ts`，在插入前查詢 users 表
- 效能較差，但資料完整

### 2. 幣別預設值
如果 Google Sheets 沒有幣別欄位，`currency` 會自動使用預設值 `'TWD'`

### 3. 日期格式
確保 Google Sheets 的日期格式為：
- `YYYY-MM-DD` (例如：2025-11-25)
- 或 Google Sheets 標準日期格式

---

## 📋 優先級建議

### Phase 1：最小可用映射（立即執行）
```
✅ Date → transaction_date
✅ 顧客Email → customer_email
🔲 金額（台幣） → amount_twd
🔲 商家姓名/顧客姓名 → customer_name
🔲 付款方式 → payment_method
```

### Phase 2：完整基本資訊
```
🔲 收支類別 → transaction_category
🔲 課程類別 → course_category
🔲 收入項目 → income_item
🔲 數量 → quantity
🔲 幣別 → currency
```

### Phase 3：業務資訊
```
🔲 成交方式 → deal_method
🔲 諮詢來源 → consultation_source
🔲 備註 → notes
```

### Phase 4：人員資訊（需要額外處理）
```
🔲 授課教練 → teacher_id (需 UUID 轉換)
🔲 諮詢師 → closer_id (需 UUID 轉換)
🔲 電訪人員 → setter_id (需 UUID 轉換)
🔲 填表人員 → form_filler_id (需 UUID 轉換)
```

---

## 🚀 立即執行步驟

### 1. 更新映射（通過 UI 或 API）

在 Google Sheets 同步管理頁面，為「收支表單」添加以下映射：

**最小必要映射：**
1. ✅ Date → transaction_date
2. ✅ 顧客Email → customer_email
3. ➕ 金額（台幣） → amount_twd
4. ➕ 商家姓名 或 顧客姓名 → customer_name
5. ➕ 付款方式 → payment_method

### 2. 執行同步

```bash
curl -X POST "http://localhost:5001/api/sheets/sync/43c2f863-c1dc-48d4-9e8a-4781490cf605"
```

### 3. 驗證結果

```bash
npx tsx scripts/check-synced-sample.ts
```

---

## 📝 如何在 UI 中添加映射

1. 進入「設定 > Google Sheets 同步管理」
2. 找到「收支表單 → income_expense_records」
3. 點擊「編輯映射」
4. 在現有的 2 個映射基礎上，添加新的欄位映射
5. 儲存後執行「手動同步」

---

## 🔧 如果需要自動處理人員 UUID

需要修改 `sync-service.ts` 的 `transformData` 函數，添加姓名到 UUID 的轉換邏輯。

參考實作可見其他表格的處理方式（例如 `trial_class_attendance` 的 `teacher_name` → `teacher_id` 轉換）。
