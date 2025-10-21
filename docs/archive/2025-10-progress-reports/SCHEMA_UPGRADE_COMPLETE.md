# ✅ Schema 升級完成報告

**日期**: 2025-10-04
**Migration**: 006_complete_schema_upgrade.sql

---

## 🎯 升級目標

根據您提供的 Google Sheets 實際欄位，完整重建 Supabase schema，支援：
1. ✅ **student_email** 作為 key value 串接三張表
2. ✅ 四種角度查詢：老師、咨詢師、電訪人員、學生
3. ✅ 所有 Google Sheets 欄位完整同步
4. ✅ 資料來源追蹤 (source tracking)
5. ✅ 原始資料保留 (raw_data JSONB)

---

## 📊 Google Sheets 欄位清單

### 體驗課上課記錄表 (7 欄位)
```
姓名, email, 上課日期, 授課老師, 是否已評價, 未轉單原因, 體驗課文字檔
```

### 體驗課購買記錄表 (12 欄位)
```
姓名, email, 年齡, 職業, 方案名稱, 體驗堂數, 剩餘堂數（自動計算）,
體驗課購買日期, 目前狀態（自動計算）, 更新日期, 最近一次上課日期, 備註
```

### EODs for Closers (20 欄位)
```
Name, Email, （諮詢）電話負責人, （諮詢）諮詢人員, （諮詢）是否上線,
（諮詢）名單來源, （諮詢）諮詢結果, （諮詢）成交方案, （諮詢）方案數量,
（諮詢）付款方式, （諮詢）分期期數, （諮詢）方案價格, （諮詢）實收金額,
（諮詢）諮詢日期, （諮詢）成交日期, （諮詢）備註, 提交表單時間,
月份, 年份, 週別
```

---

## 🗄️ Supabase Schema (英文版)

### trial_class_attendance

| 欄位名稱 | 資料型別 | 說明 |
|---------|---------|------|
| `id` | UUID | Primary Key |
| `student_name` | TEXT | 學員姓名 |
| `student_email` | TEXT | **KEY VALUE** - 學員信箱 |
| `class_date` | DATE | 上課日期 |
| `teacher_name` | TEXT | 授課老師 |
| `is_reviewed` | BOOLEAN | 是否已評價 |
| `no_conversion_reason` | TEXT | 未轉單原因 |
| `class_transcript` | TEXT | 體驗課文字檔 |
| `raw_data` | JSONB | 原始 Google Sheets 資料 |
| `source_worksheet_id` | UUID | 資料來源工作表 |
| `origin_row_index` | INTEGER | Google Sheets 列號 |
| `synced_at` | TIMESTAMPTZ | 同步時間 |
| `teacher_id` | TEXT | 權限控制 |
| `sales_id` | TEXT | 權限控制 |
| `department_id` | UUID | 權限控制 |
| `created_at` | TIMESTAMPTZ | 建立時間 |
| `updated_at` | TIMESTAMPTZ | 更新時間 |

### trial_class_purchase

| 欄位名稱 | 資料型別 | 說明 |
|---------|---------|------|
| `id` | UUID | Primary Key |
| `student_name` | TEXT | 學員姓名 |
| `student_email` | TEXT | **KEY VALUE** - 學員信箱 |
| `age` | INTEGER | 年齡 |
| `occupation` | TEXT | 職業 |
| `package_name` | TEXT | 方案名稱 |
| `trial_classes_total` | INTEGER | 體驗堂數 |
| `remaining_classes` | INTEGER | 剩餘堂數 |
| `purchase_date` | DATE | 購買日期 |
| `current_status` | TEXT | 目前狀態 |
| `updated_date` | DATE | 更新日期 |
| `last_class_date` | DATE | 最近一次上課日期 |
| `notes` | TEXT | 備註 |
| `raw_data` | JSONB | 原始 Google Sheets 資料 |
| `source_worksheet_id` | UUID | 資料來源工作表 |
| `origin_row_index` | INTEGER | Google Sheets 列號 |
| `synced_at` | TIMESTAMPTZ | 同步時間 |
| `teacher_id` | TEXT | 權限控制 |
| `sales_id` | TEXT | 權限控制 |
| `department_id` | UUID | 權限控制 |
| `created_at` | TIMESTAMPTZ | 建立時間 |
| `updated_at` | TIMESTAMPTZ | 更新時間 |

### eods_for_closers

| 欄位名稱 | 資料型別 | 說明 |
|---------|---------|------|
| `id` | UUID | Primary Key |
| `student_name` | TEXT | 學員姓名 |
| `student_email` | TEXT | **KEY VALUE** - 學員信箱 |
| `caller_name` | TEXT | 電話負責人 (Setter) |
| `closer_name` | TEXT | 諮詢人員 (Closer) |
| `is_online` | BOOLEAN | 是否上線 |
| `lead_source` | TEXT | 名單來源 |
| `consultation_result` | TEXT | 諮詢結果 |
| `deal_package` | TEXT | 成交方案 |
| `package_quantity` | INTEGER | 方案數量 |
| `payment_method` | TEXT | 付款方式 |
| `installment_periods` | INTEGER | 分期期數 |
| `package_price` | DECIMAL(10,2) | 方案價格 |
| `actual_amount` | DECIMAL(10,2) | 實收金額 |
| `consultation_date` | DATE | 諮詢日期 |
| `deal_date` | DATE | 成交日期 |
| `notes` | TEXT | 備註 |
| `form_submitted_at` | TIMESTAMPTZ | 提交表單時間 |
| `month` | INTEGER | 月份 |
| `year` | INTEGER | 年份 |
| `week_number` | INTEGER | 週別 |
| `raw_data` | JSONB | 原始 Google Sheets 資料 |
| `source_worksheet_id` | UUID | 資料來源工作表 |
| `origin_row_index` | INTEGER | Google Sheets 列號 |
| `synced_at` | TIMESTAMPTZ | 同步時間 |
| `closer_id` | TEXT | 權限控制 |
| `department_id` | UUID | 權限控制 |
| `created_at` | TIMESTAMPTZ | 建立時間 |
| `updated_at` | TIMESTAMPTZ | 更新時間 |

---

## 🔍 索引清單

### student_email 索引（跨表 JOIN 用）
- `idx_trial_attendance_email` on `trial_class_attendance(student_email)`
- `idx_trial_purchase_email` on `trial_class_purchase(student_email)`
- `idx_eods_email` on `eods_for_closers(student_email)`

### source_worksheet_id 索引（同步追蹤用）
- `idx_trial_attendance_worksheet` on `trial_class_attendance(source_worksheet_id)`
- `idx_trial_purchase_worksheet` on `trial_class_purchase(source_worksheet_id)`
- `idx_eods_worksheet` on `eods_for_closers(source_worksheet_id)`

### 日期索引（時間範圍查詢用）
- `idx_trial_attendance_class_date` on `trial_class_attendance(class_date)`
- `idx_trial_purchase_purchase_date` on `trial_class_purchase(purchase_date)`
- `idx_eods_deal_date` on `eods_for_closers(deal_date)`

### 同步時間索引
- `idx_trial_attendance_synced` on `trial_class_attendance(synced_at)`
- `idx_trial_purchase_synced` on `trial_class_purchase(synced_at)`
- `idx_eods_synced` on `eods_for_closers(synced_at)`

---

## 📝 更新的檔案

### 1. Migration SQL
- ✅ `/supabase/migrations/006_complete_schema_upgrade.sql`

### 2. Field Mapping 設定
- ✅ `/configs/sheet-field-mappings.ts` - 完整的中英文欄位對應表
  - `TRIAL_CLASS_ATTENDANCE_MAPPING` (7 欄位)
  - `TRIAL_CLASS_PURCHASE_MAPPING` (12 欄位)
  - `EODS_FOR_CLOSERS_MAPPING` (20 欄位)
  - `transformRowData()` - 資料轉換函數
  - `transformBatchData()` - 批次轉換函數

### 3. 同步服務
- ✅ `/server/services/sheet-sync-service.ts` - 新的同步服務
  - `syncWorksheetToSupabase()` - 同步工作表到 Supabase
  - `getStudentJourney()` - 查詢學生完整旅程
  - `getTeacherStudents()` - 老師角度查詢
  - `getCloserPerformance()` - 咨詢師角度查詢
  - `getCallerPerformance()` - 電訪人員角度查詢

### 4. Google Sheets 服務更新
- ✅ `/server/services/google-sheets.ts` - 使用新的同步服務

---

## 🚀 四種角度查詢範例

### 1. 老師角度
```typescript
import { getTeacherStudents } from './server/services/sheet-sync-service';

const students = await getTeacherStudents('Teacher A');
// 回傳該老師的所有學員上課記錄
```

### 2. 咨詢師角度
```typescript
import { getCloserPerformance } from './server/services/sheet-sync-service';

const performance = await getCloserPerformance('某咨詢師');
// 回傳該咨詢師的所有成交記錄
```

### 3. 電訪人員角度
```typescript
import { getCallerPerformance } from './server/services/sheet-sync-service';

const performance = await getCallerPerformance('某電訪人員');
// 回傳該電訪人員的所有諮詢記錄
```

### 4. 學生角度（完整旅程）
```typescript
import { getStudentJourney } from './server/services/sheet-sync-service';

const journey = await getStudentJourney('student@example.com');
// 回傳：
// {
//   studentEmail: 'student@example.com',
//   attendance: [...],  // 上課記錄
//   purchases: [...],   // 購買記錄
//   eods: [...]        // 諮詢/成交記錄
// }
```

### SQL 查詢範例（跨表 JOIN）
```sql
SELECT
  a.student_email,
  a.student_name,
  a.class_date,
  a.teacher_name,
  a.is_reviewed,
  p.purchase_date,
  p.package_name,
  p.current_status,
  e.consultation_date,
  e.deal_date,
  e.actual_amount
FROM trial_class_attendance a
LEFT JOIN trial_class_purchase p ON a.student_email = p.student_email
LEFT JOIN eods_for_closers e ON a.student_email = e.student_email
WHERE a.student_email = 'student@example.com'
ORDER BY a.class_date DESC;
```

---

## ✅ 完成事項

- [x] 建立 Migration 006 SQL 檔案
- [x] 執行 Migration 到 Supabase
- [x] 新增所有必要欄位（student_email, raw_data, source_worksheet_id 等）
- [x] 建立所有索引（student_email, source_worksheet_id, 日期等）
- [x] 建立完整的 Field Mapping 設定檔
- [x] 建立新的同步服務 (sheet-sync-service.ts)
- [x] 更新 Google Sheets 服務使用新同步邏輯
- [x] 支援四種角度查詢函數
- [x] 伺服器成功啟動並運行

---

## 📌 下一步操作

1. **測試同步功能**
   - 在前端 Dashboard 選擇工作表
   - 設定對應的 Supabase 表名
   - 點擊「確認」觸發同步
   - 檢查 Supabase 資料是否正確同步

2. **驗證資料**
   ```sql
   -- 檢查 student_email 是否正確填入
   SELECT student_email, COUNT(*)
   FROM trial_class_attendance
   GROUP BY student_email;

   -- 檢查 raw_data 是否保留原始資料
   SELECT raw_data
   FROM trial_class_attendance
   LIMIT 1;

   -- 測試跨表查詢
   SELECT a.student_email, COUNT(DISTINCT a.id) as classes,
          COUNT(DISTINCT p.id) as purchases,
          COUNT(DISTINCT e.id) as deals
   FROM trial_class_attendance a
   LEFT JOIN trial_class_purchase p ON a.student_email = p.student_email
   LEFT JOIN eods_for_closers e ON a.student_email = e.student_email
   GROUP BY a.student_email;
   ```

3. **建立報表功能**
   - 使用四種角度查詢 API
   - 建立數據總報表頁面
   - 支援篩選和匯出功能

---

## 🎉 總結

您的 Supabase schema 已完全升級，現在：

✅ **所有 Google Sheets 欄位都已對應到英文版 Supabase 欄位**
✅ **student_email 作為 key value 可串接三張表**
✅ **支援四種角度查詢：老師、咨詢師、電訪人員、學生**
✅ **所有原始資料保留在 raw_data JSONB 欄位**
✅ **完整的資料來源追蹤 (source_worksheet_id, origin_row_index)**
✅ **高效索引支援快速查詢和 JOIN 操作**

現在可以開始同步 Google Sheets 資料到 Supabase，並建立強大的數據分析報表！
