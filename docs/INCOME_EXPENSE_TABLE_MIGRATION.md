# 收支表系統重建文件

## 更新日期
2025-11-25

## 更新原因
原有的收支表 (`income_expense_records`) 與 Google Sheets 的欄位結構不一致，需要重新建立一個新的表格來完全對應 Google Sheets 的收支表欄位。

## 主要變更

### 1. 資料表結構重建
- **Migration**: `064_recreate_income_expense_table.sql`
- **刪除舊表**: 刪除了原有的 `income_expense_records`、`salary_calculations`、`consultant_bonus_rules`、`salary_rules` 等表
- **建立新表**: 建立了完全對應 Google Sheets 欄位的新 `income_expense_records` 表

### 2. 欄位對應

#### Google Sheets 欄位 → 資料庫欄位

| Google Sheets 欄位 | 資料庫欄位 | 資料類型 | 說明 |
|-------------------|-----------|---------|------|
| Date | `transaction_date` | DATE | 交易日期（必填） |
| 付款方式 | `payment_method` | VARCHAR(100) | 付款方式 |
| 收入項目 | `income_item` | VARCHAR(255) | 收入項目描述 |
| 數量 | `quantity` | INTEGER | 數量（預設 1） |
| 收支類別 | `transaction_category` | VARCHAR(100) | 收支類別 |
| 課程類別 | `course_category` | VARCHAR(100) | 課程類別 |
| 金額（台幣） | `amount_twd` | DECIMAL(15,2) | 台幣金額（必填） |
| 金額（換算台幣） | `amount_converted` | DECIMAL(15,2) | 換算後台幣金額 |
| 幣別 | `currency` | VARCHAR(3) | 幣別（預設 TWD） |
| 商家姓名/顧客姓名 | `customer_name` | VARCHAR(255) | 客戶姓名 |
| 顧客Email | `customer_email` | VARCHAR(255) | 客戶 Email |
| 姓名類別 | `customer_type` | VARCHAR(50) | 姓名類別 |
| 授課教練 | `teacher_id` | UUID | 教練 ID（關聯 users 表） |
| 諮詢師 | `closer_id` | UUID | 諮詢師 ID（關聯 users 表）|
| 電訪人員 | `setter_id` | UUID | 電訪人員 ID（關聯 users 表） |
| 填表人員 | `form_filler_id` | UUID | 填表人員 ID（關聯 users 表） |
| 成交方式 | `deal_method` | VARCHAR(100) | 成交方式 |
| 諮詢來源 | `consultation_source` | VARCHAR(100) | 諮詢來源 |
| 備註 | `notes` | TEXT | 備註 |

### 3. 命名規範統一

專案統一命名規範：
- **諮詢師**: `closer_id` (NOT `consultant_id`)
- **電訪人員**: `setter_id` (NOT `telemarketing_id` or `sales_person_id`)

### 4. 新增欄位

以下欄位為新增的系統管理欄位：

| 欄位名稱 | 資料類型 | 說明 |
|---------|---------|------|
| `source` | VARCHAR(20) | 資料來源：`manual`、`google_sheets`、`system` |
| `is_confirmed` | BOOLEAN | 是否已確認 |
| `confirmed_by` | UUID | 確認人員 |
| `confirmed_at` | TIMESTAMP | 確認時間 |
| `is_deleted` | BOOLEAN | 軟刪除標記 |
| `deleted_at` | TIMESTAMP | 刪除時間 |
| `deleted_by` | UUID | 刪除人員 |
| `created_at` | TIMESTAMP | 建立時間 |
| `updated_at` | TIMESTAMP | 更新時間 |
| `created_by` | UUID | 建立人員 |

## 程式碼更新

### 1. Service 層
- **檔案**: `server/services/income-expense-service.ts`
- **完全重寫**: 移除了舊的欄位邏輯，改用新的欄位結構
- **移除 Pool**: 不再使用 `this.pool`，改用 `queryDatabase` 函數
- **新增方法**:
  - `deleteRecord()`: 軟刪除
  - `hardDeleteRecord()`: 永久刪除

### 2. API 層
- **檔案**: `server/routes.ts`
- **更新端點**: 所有 `/api/income-expense/*` 端點
- **簡化查詢**: 直接使用 `incomeExpenseService.queryRecords()` 方法

### 3. TypeScript 類型
- **重新定義**:
  - `IncomeExpenseRecord` 介面
  - `CreateIncomeExpenseInput` 介面
  - `UpdateIncomeExpenseInput` 介面
  - `QueryParams` 介面
  - `MonthlySummary` 介面

## 測試

### 測試檔案
- `scripts/test-income-expense-service.ts`

### 測試項目
1. ✅ 建立收支記錄
2. ✅ 查詢單筆記錄
3. ✅ 更新記錄
4. ✅ 查詢記錄列表
5. ✅ 月度統計
6. ✅ 軟刪除記錄
7. ✅ 驗證軟刪除
8. ✅ 永久刪除記錄

### 執行測試
```bash
npx tsx scripts/test-income-expense-service.ts
```

## 索引優化

建立的索引：
- `idx_income_expense_date`: 交易日期
- `idx_income_expense_category`: 收支類別
- `idx_income_expense_course_category`: 課程類別
- `idx_income_expense_customer_email`: 客戶 Email
- `idx_income_expense_teacher`: 教師 ID
- `idx_income_expense_closer`: 諮詢師 ID
- `idx_income_expense_setter`: 電訪人員 ID
- `idx_income_expense_confirmed`: 確認狀態
- `idx_income_expense_deleted`: 刪除狀態（過濾軟刪除記錄）

## API 使用範例

### 1. 建立收支記錄
```typescript
POST /api/income-expense/records
{
  "transaction_date": "2025-11-25",
  "amount_twd": 15000,
  "payment_method": "信用卡",
  "income_item": "體驗課購課",
  "transaction_category": "課程收入",
  "course_category": "英文",
  "customer_name": "王小明",
  "customer_email": "wang@example.com"
}
```

### 2. 查詢收支記錄
```typescript
GET /api/income-expense/records?month=2025-11&transaction_category=課程收入
```

### 3. 月度統計
```typescript
GET /api/income-expense/summary/2025-11
```

### 4. 批次匯入（Google Sheets 同步）
```typescript
POST /api/income-expense/bulk-import
{
  "records": [
    {
      "transaction_date": "2025-11-25",
      "amount_twd": 15000,
      ...
    }
  ]
}
```

## 注意事項

### 1. 資料遷移
⚠️ **重要**: 此次更新刪除了舊的收支表，如果舊表中有重要資料，請在執行 migration 前先備份。

### 2. Google Sheets 同步
下一步需要建立 Google Sheets 同步功能，將 Google Sheets 的收支表資料自動同步到新的資料表中。

### 3. 人員 ID 映射
當從 Google Sheets 同步時，需要將人員姓名映射到 `users` 表的 UUID：
- 授課教練名稱 → `teacher_id` (UUID)
- 諮詢師名稱 → `closer_id` (UUID)
- 電訪人員名稱 → `setter_id` (UUID)
- 填表人員名稱 → `form_filler_id` (UUID)

### 4. 軟刪除
系統預設使用軟刪除，刪除的記錄不會真正從資料庫中移除，只會標記 `is_deleted = true`。如需永久刪除，使用 `hardDeleteRecord()` 方法。

## 後續工作

1. [ ] 建立 Google Sheets 同步服務
2. [ ] 建立前端頁面顯示收支記錄
3. [ ] 建立報表功能
4. [ ] 建立人員薪資計算功能（基於收支記錄）

## 相關檔案

- Migration: `supabase/migrations/064_recreate_income_expense_table.sql`
- Service: `server/services/income-expense-service.ts`
- Routes: `server/routes.ts` (7210-7385 行)
- 測試: `scripts/test-income-expense-service.ts`
- 執行 Migration: `scripts/run-migration-064.ts`
