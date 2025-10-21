# Google Sheets → Supabase 完整欄位對應表

**更新日期**: 2025-10-04
**目的**: 作為 Google Sheets 與 Supabase 之間欄位映射的唯一權威來源（Single Source of Truth）

---

## 📊 1. trial_class_attendance (體驗課上課記錄表)

### Google Sheets 原始欄位 → Supabase 欄位

| Google Sheets 欄位 | Supabase 欄位 | 型別 | 必填 | 說明 | Transform |
|-------------------|--------------|------|------|------|-----------|
| 姓名 | `student_name` | TEXT | ✓ | 學生姓名 | - |
| email | `student_email` | TEXT | ✓ | 學生 Email（跨表 JOIN 鍵） | - |
| 上課日期 | `class_date` | DATE | ✓ | 體驗課上課日期 | 轉換為 ISO date |
| 授課老師 | `teacher_name` | TEXT | ✓ | 授課老師姓名 | - |
| 是否已審核 | `is_reviewed` | BOOLEAN | - | 是否已完成課後審核 | 轉換為 boolean |
| 未轉換原因 | `no_conversion_reason` | TEXT | - | 未成功購買的原因 | - |
| 課程記錄 | `class_transcript` | TEXT | - | 課程內容摘要 | - |
| - | `teacher_id` | TEXT | - | 老師 ID（系統欄位） | 系統補充 |
| - | `sales_id` | TEXT | - | 業務 ID（系統欄位） | 系統補充 |
| - | `department_id` | UUID | - | 部門 ID（系統欄位） | 系統補充 |
| - | `notes` | TEXT | - | 備註 | 系統補充 |

### 系統追蹤欄位（自動加入）

| 欄位名稱 | 型別 | 說明 |
|---------|------|------|
| `id` | UUID | Primary Key |
| `raw_data` | JSONB | 儲存所有 Google Sheets 原始資料 |
| `source_worksheet_id` | UUID | 來源工作表 ID（FK: worksheets.id） |
| `origin_row_index` | INTEGER | Google Sheets 原始列號 |
| `synced_at` | TIMESTAMPTZ | 同步時間 |
| `created_at` | TIMESTAMPTZ | 資料建立時間 |
| `updated_at` | TIMESTAMPTZ | 資料更新時間 |

### 現有業務 API 依賴欄位

- `getTeacherStudents(teacherName)`: 依賴 `teacher_name`, `student_email`, `student_name`, `class_date`, `is_reviewed`

---

## 📊 2. trial_class_purchase (體驗課購買記錄表)

### Google Sheets 原始欄位 → Supabase 欄位

| Google Sheets 欄位 | Supabase 欄位 | 型別 | 必填 | 說明 | Transform |
|-------------------|--------------|------|------|------|-----------|
| 姓名 | `student_name` | TEXT | ✓ | 學生姓名 | - |
| email | `student_email` | TEXT | ✓ | 學生 Email（跨表 JOIN 鍵） | - |
| 方案名稱 | `package_name` | TEXT | ✓ | 購買的方案名稱 | - |
| 體驗課購買日期 | `purchase_date` | DATE | ✓ | 購買日期 | 轉換為 ISO date |
| 方案價格 | `package_price` | INTEGER | - | 方案價格（新台幣） | 轉換為整數 |
| 備註 | `notes` | TEXT | - | 備註說明 | - |
| 年齡 | `age` | INTEGER | - | 學生年齡 | 轉換為整數 |
| 職業 | `occupation` | TEXT | - | 學生職業 | - |
| 已上體驗課堂數 | `trial_classes_total` | INTEGER | - | 已上體驗課總數 | 轉換為整數 |
| 剩餘堂數 | `remaining_classes` | INTEGER | - | 剩餘堂數 | 轉換為整數 |
| 目前狀態 | `current_status` | TEXT | - | 學員目前狀態 | - |
| 更新日期 | `updated_date` | DATE | - | 狀態更新日期 | 轉換為 ISO date |
| 最後上課日期 | `last_class_date` | DATE | - | 最後一次上課日期 | 轉換為 ISO date |
| - | `teacher_id` | TEXT | - | 老師 ID（系統欄位） | 系統補充 |
| - | `sales_id` | TEXT | - | 業務 ID（系統欄位） | 系統補充 |
| - | `department_id` | UUID | - | 部門 ID（系統欄位） | 系統補充 |

### 系統追蹤欄位（自動加入）

同 trial_class_attendance

---

## 📊 3. eods_for_closers (EODs for Closers 咨詢師業績表)

### Google Sheets 原始欄位 → Supabase 欄位

| Google Sheets 欄位 | Supabase 欄位 | 型別 | 必填 | 說明 | Transform |
|-------------------|--------------|------|------|------|-----------|
| Name | `student_name` | TEXT | ✓ | 學生姓名 | - |
| Email | `student_email` | TEXT | ✓ | 學生 Email（跨表 JOIN 鍵） | - |
| （諮詢）諮詢人員 | `closer_name` | TEXT | ✓ | 諮詢師姓名（closer） | - |
| （諮詢）成交日期 | `deal_date` | DATE | - | 成交日期 | 轉換為 ISO date |
| （諮詢）備註 | `notes` | TEXT | - | 備註說明 | - |
| 電訪人員 | `caller_name` | TEXT | - | 電訪人員姓名 | - |
| 是否線上 | `is_online` | BOOLEAN | - | 是否為線上諮詢 | 轉換為 boolean |
| 名單來源 | `lead_source` | TEXT | - | 潛在客戶來源 | - |
| 咨詢結果 | `consultation_result` | TEXT | - | 諮詢結果（成交/未成交等） | - |
| 成交方案 | `deal_package` | TEXT | - | 成交的方案名稱 | - |
| 方案數量 | `package_quantity` | INTEGER | - | 購買方案數量 | 轉換為整數 |
| 付款方式 | `payment_method` | TEXT | - | 付款方式（一次/分期等） | - |
| 分期期數 | `installment_periods` | INTEGER | - | 分期期數 | 轉換為整數 |
| 方案價格 | `package_price` | INTEGER | - | 方案原價（新台幣） | 轉換為整數 |
| 實際金額 | `actual_amount` | INTEGER | - | 實際成交金額（新台幣） | 轉換為整數 |
| 諮詢日期 | `consultation_date` | DATE | - | 諮詢日期 | 轉換為 ISO date |
| 表單提交時間 | `form_submitted_at` | TIMESTAMPTZ | - | Google Form 提交時間 | 轉換為 ISO timestamp |
| 月份 | `month` | INTEGER | - | 成交月份 (1-12) | 轉換為整數 |
| 年份 | `year` | INTEGER | - | 成交年份 (YYYY) | 轉換為整數 |
| 週數 | `week_number` | INTEGER | - | 成交週數 (1-53) | 轉換為整數 |
| - | `closer_id` | TEXT | - | 諮詢師 ID（系統欄位） | 系統補充 |
| - | `setter_id` | TEXT | - | Setter ID（系統欄位） | 系統補充 |
| - | `department_id` | UUID | - | 部門 ID（系統欄位） | 系統補充 |
| - | `report_date` | DATE | - | 報表日期（系統欄位） | 系統補充 |

### 系統追蹤欄位（自動加入）

同 trial_class_attendance

### 現有業務 API 依賴欄位

- `getCloserPerformance(closerName)`: 依賴 `closer_name`, `deal_date`, `actual_amount`, `deal_package`, `consultation_result`
- `getCallerPerformance(callerName)`: 依賴 `caller_name`, `consultation_date`, `consultation_result`

---

## 🔄 Transform 函數定義

### Date Transform
```typescript
(value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
}
```

### Timestamp Transform
```typescript
(value: any) => {
  if (!value) return null;
  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
}
```

### Integer Transform
```typescript
(value: any) => {
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}
```

### Boolean Transform
```typescript
(value: any) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    return lower === 'true' || lower === 'yes' || lower === '是' || lower === '1';
  }
  return Boolean(value);
}
```

---

## 🚨 重要業務規則

### 1. 跨表 JOIN 鍵
- **主鍵**: `student_email`
- 所有報表和分析都基於 `student_email` 串接三張表

### 2. 必填欄位檢查
- 所有記錄必須有 `student_email`，否則跳過同步
- 建議在 UI 提示使用者缺少必填欄位

### 3. raw_data 策略
- **所有** Google Sheets 欄位都儲存在 `raw_data` JSONB
- 未來新增欄位時，資料會自動存入 `raw_data`，無需 schema migration
- 查詢範例: `SELECT raw_data->>'新欄位' FROM trial_class_attendance`

### 4. 同步去重策略
- 每次同步前先刪除 `source_worksheet_id` 相同的舊資料
- 確保同一個 worksheet 的資料不會重複

---

## 📈 索引策略

### 必要索引（已建立）

```sql
-- JOIN 鍵索引
CREATE INDEX idx_trial_attendance_email ON trial_class_attendance(student_email);
CREATE INDEX idx_trial_purchase_email ON trial_class_purchase(student_email);
CREATE INDEX idx_eods_email ON eods_for_closers(student_email);

-- 日期範圍查詢索引
CREATE INDEX idx_trial_attendance_class_date ON trial_class_attendance(class_date);
CREATE INDEX idx_trial_purchase_purchase_date ON trial_class_purchase(purchase_date);
CREATE INDEX idx_eods_deal_date ON eods_for_closers(deal_date);

-- 同步追蹤索引
CREATE INDEX idx_trial_attendance_worksheet ON trial_class_attendance(source_worksheet_id);
CREATE INDEX idx_trial_purchase_worksheet ON trial_class_purchase(source_worksheet_id);
CREATE INDEX idx_eods_worksheet ON eods_for_closers(source_worksheet_id);
```

### 建議新增索引（報表優化）

```sql
-- 老師名稱索引（用於 getTeacherStudents）
CREATE INDEX idx_trial_attendance_teacher ON trial_class_attendance(teacher_name);

-- 諮詢師名稱索引（用於 getCloserPerformance）
CREATE INDEX idx_eods_closer ON eods_for_closers(closer_name);

-- 電訪人員索引（用於 getCallerPerformance）
CREATE INDEX idx_eods_caller ON eods_for_closers(caller_name);

-- 複合索引（用於時間範圍 + 人員查詢）
CREATE INDEX idx_eods_closer_date ON eods_for_closers(closer_name, deal_date);
CREATE INDEX idx_trial_attendance_teacher_date ON trial_class_attendance(teacher_name, class_date);
```

---

## 🔮 未來擴充指南

### 當 Google Sheets 新增欄位時

#### 選項 1：僅存 raw_data（推薦，零停機）
不需要任何操作，新欄位會自動存入 `raw_data`。

查詢範例：
```sql
SELECT
  student_name,
  raw_data->>'新欄位' AS new_field
FROM trial_class_attendance;
```

#### 選項 2：新增專用欄位（需要 migration）

1. 更新 `configs/sheet-field-mappings.ts`
2. 更新 `configs/supabase-schema-authority.ts`
3. 建立 migration SQL
4. 執行測試 `npm test tests/schema-validation.test.ts`
5. 部署 migration
6. 重啟 PostgREST

詳見 [SCHEMA_FIX_EXECUTION_GUIDE.md](../SCHEMA_FIX_EXECUTION_GUIDE.md)

---

## 📚 相關文件

- [configs/sheet-field-mappings.ts](../configs/sheet-field-mappings.ts) - TypeScript Field Mapping 定義
- [configs/supabase-schema-authority.ts](../configs/supabase-schema-authority.ts) - Supabase Schema 權威定義
- [shared/schema.ts](../shared/schema.ts) - Drizzle ORM Schema
- [supabase/migrations/006_complete_schema_upgrade.sql](../supabase/migrations/006_complete_schema_upgrade.sql) - 最新 Schema Migration
