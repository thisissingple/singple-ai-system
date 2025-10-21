# Google Sheets → Supabase 欄位對應指南

本文件說明如何將 Google Sheets 資料同步到 Supabase，包含欄位對應規則、同步流程、以及驗證方法。

---

## 📋 目錄

1. [欄位對應表](#欄位對應表)
2. [同步流程](#同步流程)
3. [驗證方法](#驗證方法)
4. [常見問題](#常見問題)

---

## 欄位對應表

### 1. 體驗課上課記錄 (trial_class_attendance)

| Supabase 欄位 | Google Sheets 可能欄位名稱 | 資料類型 | 必填 | 說明 |
|--------------|--------------------------|---------|-----|------|
| `student_name` | 姓名, 學生姓名, studentName, name, student | TEXT | ✓ | 學生姓名 |
| `student_email` | 學員信箱, email, mail, 信箱, student_email | TEXT | ✓ | 學生信箱（唯一識別） |
| `teacher_name` | 教師, 老師, teacherName, 教師姓名, instructor | TEXT | - | 授課老師 |
| `class_date` | 上課日期, classDate, date, 日期, trialDate | TIMESTAMPTZ | - | 上課日期 |
| `course_type` | 課程類型, courseType, course, 類型, subject | TEXT | - | 課程類型 |
| `status` | 狀態, status, state, stage | TEXT | - | 學生狀態 |
| `intent_score` | 意向分數, intentScore, intent, score | NUMERIC | - | 意向分數 (0-100) |
| `satisfaction` | 滿意度, satisfaction, rating, 評分 | NUMERIC | - | 滿意度 (1-5) |
| `attended` | 出席, attended, present, 是否出席 | BOOLEAN | - | 是否出席 |

**工作表識別規則**：
- 名稱包含「體驗課上課」或「上課打卡」或「attendance」

### 2. 體驗課購買記錄 (trial_class_purchase)

| Supabase 欄位 | Google Sheets 可能欄位名稱 | 資料類型 | 必填 | 說明 |
|--------------|--------------------------|---------|-----|------|
| `student_name` | 姓名, 學生姓名, studentName, name | TEXT | ✓ | 學生姓名 |
| `student_email` | 學員信箱, email, mail, 信箱 | TEXT | ✓ | 學生信箱（唯一識別） |
| `teacher_name` | 教師, 老師, teacherName | TEXT | - | 授課老師 |
| `purchase_date` | 購買日期, purchaseDate, buyDate, 成交日期 | TIMESTAMPTZ | - | 購買日期 |
| `class_date` | 上課日期, classDate, date | TIMESTAMPTZ | - | 上課日期 |
| `course_type` | 課程類型, courseType, course | TEXT | - | 課程類型 |
| `plan` | 方案, plan, courseType | TEXT | - | 購買方案 |
| `status` | 狀態, status, state | TEXT | - | 購買狀態 |
| `intent_score` | 意向分數, intentScore, intent | NUMERIC | - | 意向分數 (0-100) |

**工作表識別規則**：
- 名稱包含「體驗課購買」或「體驗課學員」或「purchase」

### 3. 成交記錄 (eods_for_closers)

| Supabase 欄位 | Google Sheets 可能欄位名稱 | 資料類型 | 必填 | 說明 |
|--------------|--------------------------|---------|-----|------|
| `student_name` | 姓名, 學生姓名, studentName, name | TEXT | ✓ | 學生姓名 |
| `student_email` | 學員信箱, email, mail, 信箱 | TEXT | ✓ | 學生信箱（唯一識別） |
| `teacher_name` | 教師, 老師, teacherName | TEXT | - | 授課老師 |
| `deal_date` | 成交日期, dealDate, closedDate, deal_date | TIMESTAMPTZ | - | 成交日期 |
| `class_date` | 上課日期, classDate, date | TIMESTAMPTZ | - | 體驗課日期 |
| `course_type` | 課程類型, courseType, course | TEXT | - | 課程類型 |
| `deal_amount` | 成交金額, dealAmount, amount, 金額, price | NUMERIC | - | 成交金額 |
| `status` | 狀態, status, state | TEXT | - | 成交狀態 |
| `intent_score` | 意向分數, intentScore, intent | NUMERIC | - | 意向分數 (0-100) |

**工作表識別規則**：
- 名稱包含「EODs」或「closer」或「升高階」或「成交」

### 共用欄位（所有表都有）

| 欄位 | 說明 | 自動填入 |
|------|------|---------|
| `id` | UUID 主鍵 | ✓ |
| `source_spreadsheet_id` | 來源 Google Sheets ID | ✓ |
| `origin_row_index` | 原始資料行號 | ✓ |
| `raw_data` | 原始資料 (JSONB) | ✓ |
| `synced_at` | 同步時間 | ✓ |
| `created_at` | 建立時間 | ✓ |
| `updated_at` | 更新時間 | ✓ |

---

## 同步流程

### 流程圖

```
Google Sheets
    ↓
讀取原始資料 (headers + data rows)
    ↓
識別目標 Supabase 表 (identifyTargetTable)
    ↓
套用欄位對應 (transformToSupabaseRecord)
    ├─ 解析欄位別名 (resolveField)
    ├─ 轉換資料類型 (parseDateField, parseNumberField)
    └─ 驗證必填欄位 (validateRecord)
    ↓
批次寫入 Supabase
    ├─ 刪除舊資料 (by source_spreadsheet_id)
    └─ 插入新資料 (batch size: 500)
    ↓
回報結果 (insertedCount, invalidCount, tableName)
```

### 關鍵邏輯

#### 1. 識別目標表 (`identifyTargetTable`)

```typescript
function identifyTargetTable(spreadsheetName: string): SupabaseTableName | null {
  const lowerName = spreadsheetName.toLowerCase();

  if (lowerName.includes('體驗課上課') || lowerName.includes('上課打卡') || lowerName.includes('attendance')) {
    return 'trial_class_attendance';
  }

  if (lowerName.includes('體驗課購買') || lowerName.includes('體驗課學員') || lowerName.includes('purchase')) {
    return 'trial_class_purchase';
  }

  if (lowerName.includes('eods') || lowerName.includes('closer') || lowerName.includes('升高階') || lowerName.includes('成交')) {
    return 'eods_for_closers';
  }

  return null; // 無法識別，不同步
}
```

#### 2. 欄位解析 (`resolveField`)

```typescript
// 範例：找 'studentEmail' 欄位
const aliases = ['studentEmail', '學員信箱', 'email', 'mail', '信箱'];

for (const alias of aliases) {
  if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
    return row[alias]; // 找到第一個有值的欄位就回傳
  }
}
```

#### 3. 資料轉換 (`transformToSupabaseRecord`)

```typescript
const record = {
  source_spreadsheet_id: 'test-sheet-123',
  origin_row_index: 0,
  raw_data: { "姓名": "張三", "email": "zhang@example.com", "上課日期": "2025/10/01" },
  student_name: "張三",                    // 從 "姓名" 解析
  student_email: "zhang@example.com",      // 從 "email" 解析
  class_date: "2025-10-01T00:00:00Z",     // 從 "上課日期" 解析並轉換為 ISO 8601
  synced_at: "2025-10-01T08:00:00Z",
};
```

#### 4. 唯一鍵策略 (`generateUniqueKey`)

**策略 1**（優先）：`spreadsheet_id` + `row_index`
```typescript
key = "test-sheet-123:0"  // 同一個 spreadsheet 的第 0 行
```

**策略 2**（備選）：`student_email` + `class_date`
```typescript
key = "zhang@example.com:2025-10-01"  // 同一個學生在同一天的記錄
```

**用途**：判斷是「更新」還是「插入」
- 目前實作：**刪除後重新插入**（delete by `source_spreadsheet_id` → insert all）
- 未來可改為：**upsert**（根據 unique key 更新或插入）

---

## 驗證方法

### 方法 1：使用驗證腳本（推薦）

```bash
tsx test-sync-validation.ts
```

**輸出範例**：
```
🔍 Google Sheets → Supabase 同步驗證

Step 1: 執行資料同步...
  ✓ Spreadsheets created: 3
  ✓ Supabase available: true
  ✓ Total synced: 100 rows

Step 2: 驗證 Supabase 資料品質...

📊 Validating: trial_class_attendance
  Total rows: 3
  欄位覆蓋率：
    ✓ student_name          100.0% (3/3)
    ✓ student_email         100.0% (3/3)
    ✓ class_date            100.0% (3/3)
  樣本資料 (第 1 筆):
    student_name  : 張小明
    student_email : zhang@example.com
    class_date    : 2025-10-01T00:00:00+00:00
  ✓ No issues found

驗證總結：
  ✓ trial_class_attendance: 3 rows, 0 issues
  ✓ trial_class_purchase: 95 rows, 0 issues
  ✓ eods_for_closers: 2 rows, 0 issues

🎉 驗證通過！所有資料欄位對應正確。
```

### 方法 2：手動查詢 Supabase

#### 連接 Supabase

```bash
# 使用 psql
psql "postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres"
```

#### 檢查資料筆數

```sql
SELECT
  'trial_class_attendance' as table_name,
  COUNT(*) as row_count
FROM trial_class_attendance

UNION ALL

SELECT
  'trial_class_purchase' as table_name,
  COUNT(*) as row_count
FROM trial_class_purchase

UNION ALL

SELECT
  'eods_for_closers' as table_name,
  COUNT(*) as row_count
FROM eods_for_closers;
```

#### 檢查欄位覆蓋率

```sql
-- 檢查 trial_class_attendance 欄位有多少筆有值
SELECT
  COUNT(*) as total_rows,
  COUNT(student_name) as has_student_name,
  COUNT(student_email) as has_student_email,
  COUNT(teacher_name) as has_teacher_name,
  COUNT(class_date) as has_class_date
FROM trial_class_attendance;
```

#### 查看樣本資料

```sql
-- 取前 5 筆資料
SELECT
  student_name,
  student_email,
  teacher_name,
  class_date,
  status
FROM trial_class_attendance
ORDER BY synced_at DESC
LIMIT 5;
```

### 方法 3：使用 Supabase Dashboard

1. 登入 [Supabase Dashboard](https://app.supabase.com)
2. 選擇專案
3. 前往 **Table Editor**
4. 選擇表（`trial_class_attendance`, `trial_class_purchase`, `eods_for_closers`）
5. 檢查資料：
   - 總筆數
   - 欄位是否有值
   - `raw_data` JSONB 欄位是否包含原始資料

---

## 常見問題

### Q1: 為什麼有些欄位是 0.0% 覆蓋率？

**原因**：Google Sheets 中沒有對應的欄位名稱，或欄位值為空。

**解決方法**：
1. 檢查 Google Sheets 的欄位名稱是否在別名清單中
2. 如果欄位名稱特殊，在 `field-mapping-v2.ts` 的 `FIELD_ALIASES` 中新增別名

範例：
```typescript
export const FIELD_ALIASES: Record<string, string[]> = {
  teacher: ['teacher', '教師', '老師', 'teacherName', '教師姓名', 'instructor', '講師'], // 新增「講師」
};
```

### Q2: 同步後資料消失了？

**原因**：每次同步會**刪除舊資料**再插入新資料（根據 `source_spreadsheet_id`）。

**檢查步驟**：
1. 確認 Google Sheets 有資料
2. 確認 spreadsheet 名稱符合識別規則
3. 檢查 server logs：`console.log` 會顯示同步結果

### Q3: 如何新增自訂欄位？

**步驟**：

1. **修改 Supabase Schema**（`docs/supabase-schema.sql`）
```sql
ALTER TABLE trial_class_attendance
ADD COLUMN custom_field TEXT;
```

2. **在 Supabase SQL Editor 執行**

3. **更新欄位對應**（`sheet-to-supabase-mapping.ts`）
```typescript
const ATTENDANCE_SPECIFIC_FIELDS: FieldMapping[] = [
  // ... 現有欄位
  {
    supabaseColumn: 'custom_field',
    standardKey: 'customField', // 需要先在 field-mapping-v2.ts 定義別名
  },
];
```

4. **新增欄位別名**（`field-mapping-v2.ts`）
```typescript
export const FIELD_ALIASES: Record<string, string[]> = {
  // ... 現有別名
  customField: ['customField', '自訂欄位', 'custom'],
};
```

5. **重新同步**
```bash
tsx test-sync-validation.ts
```

### Q4: 如何更新既有資料而非刪除重建？

**目前實作**：刪除 + 插入

**改為 Upsert**：

修改 `google-sheets.ts` 的 `syncToSupabase` 方法：

```typescript
// 不刪除，改用 upsert
for (const record of validRecords) {
  await client
    .from(tableName)
    .upsert(record, {
      onConflict: 'source_spreadsheet_id,origin_row_index', // 需要先建立 unique constraint
    });
}
```

**注意**：需先在 Supabase 建立 unique constraint：
```sql
ALTER TABLE trial_class_attendance
ADD CONSTRAINT unique_spreadsheet_row
UNIQUE (source_spreadsheet_id, origin_row_index);
```

### Q5: 如何處理多個來源的相同學生資料？

**情境**：同一個學生的資料可能來自不同的 Google Sheets。

**解決方法**：

使用 `student_email` + `class_date` 作為 unique key：

```sql
-- 建立 unique constraint
ALTER TABLE trial_class_attendance
ADD CONSTRAINT unique_student_class
UNIQUE (student_email, class_date);

-- 然後使用 upsert
INSERT INTO trial_class_attendance (...)
VALUES (...)
ON CONFLICT (student_email, class_date)
DO UPDATE SET
  student_name = EXCLUDED.student_name,
  teacher_name = EXCLUDED.teacher_name,
  updated_at = NOW();
```

---

## 附錄：完整欄位別名清單

詳見 `server/services/reporting/field-mapping-v2.ts`

```typescript
export const FIELD_ALIASES: Record<string, string[]> = {
  studentName: ['studentName', '姓名', '學生姓名', 'name', 'student', '學員姓名'],
  studentEmail: ['studentEmail', '學員信箱', 'email', 'mail', '信箱', 'student_email'],
  teacher: ['teacher', '教師', '老師', 'teacherName', '教師姓名', 'instructor'],
  classDate: ['classDate', '上課日期', 'date', '日期', 'class_date', 'trialDate', '體驗日期'],
  purchaseDate: ['purchaseDate', '購買日期', 'buyDate', '成交日期', 'purchase_date'],
  dealDate: ['dealDate', '成交日期', 'closedDate', 'deal_date', 'closed_at'],
  courseType: ['courseType', '課程類型', 'course', '類型', 'plan', '方案', 'subject'],
  dealAmount: ['dealAmount', '成交金額', 'amount', '金額', 'price', 'revenue', '收入'],
  attended: ['attended', '出席', 'present', '是否出席', 'attendance'],
  status: ['status', '狀態', 'state', 'stage', '階段'],
  intentScore: ['intentScore', '意向分數', 'intent', '意願分數', 'score'],
  satisfaction: ['satisfaction', '滿意度', 'rating', '評分'],
};
```

---

## 相關文件

- [Supabase Schema SQL](./supabase-schema.sql) - 資料庫結構定義
- [QUICK_START_v2.md](../QUICK_START_v2.md) - 快速開始指南
- [VALIDATION_CHECKLIST.md](../VALIDATION_CHECKLIST.md) - 驗收清單

---

最後更新：2025-10-01
