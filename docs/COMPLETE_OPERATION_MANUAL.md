

# Google Sheets → Supabase 完整操作手冊

**版本**: 2.0
**更新日期**: 2025-10-04
**適用環境**: Replit + Supabase

---

## 📋 目錄

1. [系統架構概覽](#系統架構概覽)
2. [部署 Migration](#部署-migration)
3. [重啟 PostgREST](#重啟-postgrest)
4. [啟動同步流程](#啟動同步流程)
5. [驗證同步結果](#驗證同步結果)
6. [執行測試](#執行測試)
7. [前端報表查詢](#前端報表查詢)
8. [新增 Google Sheets 欄位流程](#新增-google-sheets-欄位流程)
9. [故障排除](#故障排除)
10. [日常維運](#日常維運)

---

## 系統架構概覽

### 資料流程

```
Google Sheets
    ↓ (Extract)
原始資料 + Headers
    ↓ (Transform)
Supabase 格式資料 + raw_data
    ↓ (Load)
Supabase Database
    ↓ (Query)
前端報表 / AI 分析
```

### 核心元件

| 元件 | 檔案路徑 | 用途 |
|-----|---------|------|
| **Field Mappings** | `configs/sheet-field-mappings-complete.ts` | 定義 Google Sheets → Supabase 欄位映射 |
| **ETL Pipeline** | `server/services/etl/` | Extract, Transform, Load 模組 |
| **Sync Service** | `server/services/sheet-sync-service-v2.ts` | 同步服務主入口 |
| **Schema Authority** | `configs/supabase-schema-authority.ts` | Supabase Schema 權威定義 |
| **Migrations** | `supabase/migrations/` | 資料庫 Schema 變更 |
| **Views & Functions** | `supabase/migrations/009_create_report_views.sql` | 報表視圖和函數 |

### 三張核心業務表

| 表名 | 用途 | 關鍵欄位 |
|-----|------|---------|
| `trial_class_attendance` | 體驗課上課記錄 | `student_email`, `class_date`, `teacher_name`, `is_reviewed` |
| `trial_class_purchase` | 體驗課購買記錄 | `student_email`, `purchase_date`, `package_name`, `package_price` |
| `eods_for_closers` | 咨詢師業績記錄 | `student_email`, `closer_name`, `deal_date`, `actual_amount` |

**所有表共用的 JOIN 鍵**: `student_email`

---

## 部署 Migration

### 前置檢查

```bash
# 1. 確認 Supabase 連線
echo $SUPABASE_DB_URL

# 2. 檢查現有 migrations
ls -la supabase/migrations/
```

### 執行 Migration 步驟

#### 方法 1: Supabase Dashboard（推薦）

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案 → **SQL Editor**
3. 開啟 New Query

**Migration 008: 完整業務 Schema**

```bash
# 複製完整 SQL
cat supabase/migrations/008_complete_business_schema.sql
```

4. 貼上到 SQL Editor
5. 點擊 **Run**
6. 確認顯示 `✅ Migration 008 completed successfully!`

**Migration 009: 報表視圖和函數**

```bash
# 複製完整 SQL
cat supabase/migrations/009_create_report_views.sql
```

7. 重複步驟 4-6

#### 方法 2: psql 指令（Replit 環境）

```bash
# 設定環境變數
export SUPABASE_DB_URL="postgresql://postgres:YOUR_PASSWORD@db.xxx.supabase.co:5432/postgres"

# 執行 Migration 008
psql $SUPABASE_DB_URL -f supabase/migrations/008_complete_business_schema.sql

# 執行 Migration 009
psql $SUPABASE_DB_URL -f supabase/migrations/009_create_report_views.sql
```

### 驗證 Migration 成功

```sql
-- 檢查表結構
\d+ trial_class_attendance
\d+ trial_class_purchase
\d+ eods_for_closers

-- 檢查視圖
\dv

-- 檢查函數
\df get_student_journey
\df get_teacher_performance
\df get_conversion_statistics

-- 檢查索引
\di

-- 檢查 comments
SELECT
  table_name,
  column_name,
  col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) AS column_comment
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('trial_class_attendance', 'trial_class_purchase', 'eods_for_closers')
  AND col_description((table_schema||'.'||table_name)::regclass::oid, ordinal_position) IS NOT NULL;
```

---

## 重啟 PostgREST

**為什麼需要重啟？**
PostgREST 使用 schema cache 加速 API 查詢。執行 migration 後，cache 可能未更新，導致 API 找不到新欄位。

### 方法 1: Supabase Dashboard（推薦）

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. Settings → **API**
3. 找到 **PostgREST** 區塊
4. 點擊 **Restart** 按鈕
5. 等待 30-60 秒

### 方法 2: SQL NOTIFY（可能無效）

```sql
-- 嘗試通知 PostgREST 重新載入
NOTIFY pgrst, 'reload schema';
```

**注意**: Supabase 托管環境可能不允許此方式，建議使用方法 1。

### 方法 3: 等待自動刷新

PostgREST 會定期自動刷新 cache（通常 1-5 分鐘）。如果不急，可以等待。

### 驗證 PostgREST 狀態

```bash
# 測試 API 是否正常
curl "https://YOUR_PROJECT.supabase.co/rest/v1/trial_class_attendance?select=student_email&limit=1" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**預期回應**: 應該包含 `student_email` 欄位，不會報錯 "column not found"。

---

## 啟動同步流程

### 在 Replit 環境

#### 1. 檢查環境變數

```bash
# 必須設定以下環境變數（在 Replit Secrets 中）
echo $SUPABASE_DB_URL
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
echo $GOOGLE_SHEETS_CREDENTIALS
```

#### 2. 啟動 Node 服務

```bash
# 安裝依賴（首次執行）
npm install

# 開發模式
npm run dev

# 或生產模式
npm start
```

#### 3. 觸發同步

**方式 A: 透過前端 UI**

1. 開啟應用 URL: `https://your-project.replit.app`
2. 登入系統
3. 前往 **Worksheets** 頁面
4. 點擊 **Sync Now** 按鈕

**方式 B: 透過 API 呼叫**

```bash
# 手動觸發同步（需要認證 token）
curl -X POST "https://your-project.replit.app/api/sync/worksheet/WORKSHEET_ID" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE"
```

**方式 C: 透過排程（自動同步）**

系統會根據 `sync_frequency_minutes` 自動執行同步（在 `spreadsheets` 表中設定）。

### 同步流程日誌

```
=============================================================
🔄 Syncing: 體驗課上課記錄 → trial_class_attendance
=============================================================

📥 [EXTRACT] Extracting data from Google Sheets...
✅ Extracted 150 rows

🔄 [TRANSFORM] Transforming data to Supabase format...
📊 Transform Summary for trial_class_attendance
✅ Valid records: 145
❌ Invalid records: 5

💾 [LOAD] Loading data to Supabase...
🗑️  Deleting old data for worksheet xxx...
✅ Deleted 140 old records
💾 Batch inserting 145 records...
✅ Successfully loaded 145 records to trial_class_attendance

✅ [ETL] Pipeline completed successfully in 3245ms

============================================================
📊 ETL Summary: 體驗課上課記錄 → trial_class_attendance
============================================================

Status: ✅ SUCCESS
Duration: 3245ms (3.25s)

📥 Extract:
   - Rows extracted: 150

🔄 Transform:
   - Valid rows: 145
   - Invalid rows: 5

💾 Load:
   - Old records deleted: 140
   - New records inserted: 145

============================================================
```

---

## 驗證同步結果

### 1. 檢查同步歷史

```sql
-- 查詢最近的同步記錄
SELECT
  sh.*,
  w.worksheet_name,
  s.name AS spreadsheet_name
FROM sync_history sh
JOIN worksheets w ON sh.worksheet_id = w.id
JOIN spreadsheets s ON sh.spreadsheet_id = s.id
ORDER BY sh.started_at DESC
LIMIT 10;
```

### 2. 檢查資料完整性

```sql
-- trial_class_attendance
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(CASE WHEN source_worksheet_id IS NOT NULL THEN 1 END) AS with_tracking,
  MAX(synced_at) AS last_sync
FROM trial_class_attendance;

-- trial_class_purchase
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(CASE WHEN source_worksheet_id IS NOT NULL THEN 1 END) AS with_tracking,
  MAX(synced_at) AS last_sync
FROM trial_class_purchase;

-- eods_for_closers
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT student_email) AS unique_students,
  COUNT(CASE WHEN source_worksheet_id IS NOT NULL THEN 1 END) AS with_tracking,
  MAX(synced_at) AS last_sync
FROM eods_for_closers;
```

### 3. 檢查 raw_data 完整性

```sql
-- 驗證 raw_data 是否包含所有欄位
SELECT
  id,
  student_email,
  jsonb_object_keys(raw_data) AS original_columns
FROM trial_class_attendance
LIMIT 5;

-- 查詢 raw_data 中的特定欄位
SELECT
  student_name,
  student_email,
  raw_data->>'是否已審核' AS is_reviewed_raw,
  raw_data->>'未轉換原因' AS no_conversion_reason_raw
FROM trial_class_attendance
WHERE raw_data->>'是否已審核' IS NOT NULL
LIMIT 10;
```

### 4. 檢查資料溯源

```sql
-- 追蹤資料來源
SELECT
  a.*,
  w.worksheet_name,
  s.name AS spreadsheet_name
FROM trial_class_attendance a
JOIN worksheets w ON a.source_worksheet_id = w.id
JOIN spreadsheets s ON w.spreadsheet_id = s.id
WHERE a.student_email = 'test@example.com';
```

---

## 執行測試

### 安裝測試依賴

```bash
npm install --save-dev vitest @vitest/ui
```

### 執行所有測試

```bash
# 執行所有測試
npm test

# 執行特定測試檔案
npm test tests/etl/extract.test.ts
npm test tests/etl/transform.test.ts

# 執行測試並顯示覆蓋率
npm test -- --coverage

# 執行測試 UI
npm run test:ui
```

### Schema 驗證測試

```bash
# 確保 transformer 輸出與 schema 定義一致
npm test tests/schema-validation.test.ts
```

**預期輸出**:

```
✓ trial_class_attendance should output exactly the fields defined in schema authority
✓ trial_class_attendance should include raw_data with all original Google Sheets data
✓ trial_class_purchase should output exactly the fields defined in schema authority
✓ trial_class_purchase should include raw_data with all original Google Sheets data
✓ eods_for_closers should output exactly the fields defined in schema authority
✓ eods_for_closers should include raw_data with all original Google Sheets data
✓ Field counts match expected

Tests passed: 9/9
```

### ETL 測試

```bash
# Extract 模組測試
npm test tests/etl/extract.test.ts

# Transform 模組測試
npm test tests/etl/transform.test.ts
```

---

## 前端報表查詢

### 使用視圖查詢

#### 1. 學生旅程視圖

```typescript
// client/src/hooks/use-student-journey.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useStudentJourney(studentEmail: string) {
  return useQuery({
    queryKey: ['student-journey', studentEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_student_journey')
        .select('*')
        .eq('student_email', studentEmail)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
```

#### 2. 老師業績視圖

```typescript
// client/src/hooks/use-teacher-performance.ts
export function useTeacherPerformance() {
  return useQuery({
    queryKey: ['teacher-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_teacher_performance')
        .select('*')
        .order('conversion_rate', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

#### 3. 每日統計視圖

```typescript
// client/src/hooks/use-daily-statistics.ts
export function useDailyStatistics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['daily-statistics', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('v_daily_statistics')
        .select('*');

      if (startDate) {
        query = query.gte('date', startDate);
      }

      if (endDate) {
        query = query.lte('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

### 使用函數查詢

#### 1. 學生旅程函數

```typescript
// client/src/hooks/use-student-journey-function.ts
export function useStudentJourneyFunction(studentEmail: string) {
  return useQuery({
    queryKey: ['student-journey-fn', studentEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_student_journey', { p_student_email: studentEmail });

      if (error) throw error;
      return data[0]; // Function returns array with single result
    },
  });
}
```

#### 2. 老師業績函數（支援日期範圍）

```typescript
// client/src/hooks/use-teacher-performance-function.ts
export function useTeacherPerformanceFunction(
  teacherName?: string,
  startDate?: string,
  endDate?: string
) {
  return useQuery({
    queryKey: ['teacher-performance-fn', teacherName, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_teacher_performance', {
          p_teacher_name: teacherName || null,
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });

      if (error) throw error;
      return data;
    },
  });
}
```

#### 3. 轉換統計函數

```typescript
// client/src/hooks/use-conversion-statistics.ts
export function useConversionStatistics(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['conversion-stats', startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_conversion_statistics', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
        });

      if (error) throw error;
      return data[0];
    },
  });
}
```

### 直接查詢業務表

```typescript
// client/src/hooks/use-trial-classes.ts
export function useTrialClasses(filters?: {
  teacherName?: string;
  startDate?: string;
  endDate?: string;
  isReviewed?: boolean;
}) {
  return useQuery({
    queryKey: ['trial-classes', filters],
    queryFn: async () => {
      let query = supabase
        .from('trial_class_attendance')
        .select('*');

      if (filters?.teacherName) {
        query = query.eq('teacher_name', filters.teacherName);
      }

      if (filters?.startDate) {
        query = query.gte('class_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('class_date', filters.endDate);
      }

      if (filters?.isReviewed !== undefined) {
        query = query.eq('is_reviewed', filters.isReviewed);
      }

      const { data, error } = await query.order('class_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}
```

---

## 新增 Google Sheets 欄位流程

### 情境: Google Sheets 新增了「學生電話」欄位

#### 選項 1: 僅存 raw_data（推薦，零停機）

**不需要任何操作！** 新欄位會自動存入 `raw_data` JSONB 欄位。

**查詢範例**:

```sql
-- SQL 查詢
SELECT
  student_name,
  raw_data->>'學生電話' AS student_phone
FROM trial_class_attendance;
```

```typescript
// TypeScript 查詢
const { data } = await supabase
  .from('trial_class_attendance')
  .select('student_name, raw_data');

// 存取 raw_data 中的欄位
data.forEach(record => {
  const phone = record.raw_data['學生電話'];
  console.log(`${record.student_name}: ${phone}`);
});
```

#### 選項 2: 新增專用欄位（需要 migration，支援索引和複雜查詢）

**步驟 1: 更新 Field Mapping**

```typescript
// configs/sheet-field-mappings-complete.ts
export const TRIAL_CLASS_ATTENDANCE_MAPPING: FieldMapping[] = [
  // ... 現有 mappings
  {
    googleSheetColumn: '學生電話',
    supabaseColumn: 'student_phone',
    dataType: 'text',
    transform: Transforms.cleanText,
    description: '學生電話號碼',
  },
];
```

**步驟 2: 更新權威 Schema**

```typescript
// configs/supabase-schema-authority.ts
export const TrialClassAttendanceSchema = BaseTrackingFieldsSchema.merge(RawDataFieldSchema).extend({
  // ... 現有欄位
  student_phone: z.string().nullable(),
});

export const EXPECTED_INSERT_FIELDS = {
  trial_class_attendance: [
    // ... 現有欄位
    'student_phone',
  ] as const,
};

export const SQL_COLUMN_DEFINITIONS = {
  trial_class_attendance: {
    // ... 現有欄位
    student_phone: 'TEXT',
  },
};
```

**步驟 3: 建立 Migration**

```sql
-- supabase/migrations/010_add_student_phone.sql
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS student_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_trial_attendance_phone
  ON trial_class_attendance(student_phone);

COMMENT ON COLUMN trial_class_attendance.student_phone IS '學生電話號碼';

NOTIFY pgrst, 'reload schema';
```

**步驟 4: 執行測試**

```bash
npm test tests/schema-validation.test.ts
```

**步驟 5: 部署**

1. 執行 Migration 010（參考 [部署 Migration](#部署-migration)）
2. 重啟 PostgREST（參考 [重啟 PostgREST](#重啟-postgrest)）
3. 重新執行同步

**步驟 6: 更新前端（可選）**

```typescript
// client/src/types/trial-class-attendance.ts
export interface TrialClassAttendance {
  // ... 現有欄位
  student_phone: string | null;
}
```

---

## 故障排除

### 問題 1: "Could not find column in schema cache"

**症狀**: PostgREST API 回應 404 或報錯找不到欄位

**原因**: PostgREST schema cache 未更新

**解決方式**:

1. 確認 Migration 已執行成功
2. 執行 `NOTIFY pgrst, 'reload schema';`
3. 在 Supabase Dashboard 重啟 PostgREST
4. 等待 2-3 分鐘讓 cache 完全刷新
5. 如果仍未解決，檢查 Supabase Dashboard → Logs 查看錯誤訊息

### 問題 2: "All object keys must match" (PGRST102)

**症狀**: 批次插入時報錯

**原因**: PostgREST 要求批次插入的所有物件必須有相同的 keys

**解決方式**:

已在 ETL Transform 模組實作 `standardizeRecords` 函數自動處理。如果仍出現此錯誤：

1. 檢查 console 輸出的 `Sample record`
2. 找出缺少的欄位
3. 更新 Transform 模組確保補充該欄位為 `null`

### 問題 3: 同步後資料遺失

**症狀**: 舊資料被刪除，但新資料未插入

**原因**: Load 階段刪除成功但插入失敗

**解決方式**:

1. 檢查 console 錯誤訊息
2. 確認 Supabase 權限設定（RLS policies）
3. 檢查欄位型別是否正確
4. 從 `sync_history` 表查詢錯誤訊息

```sql
SELECT * FROM sync_history
WHERE status = 'failed'
ORDER BY started_at DESC
LIMIT 10;
```

### 問題 4: 測試失敗

**症狀**: Schema 驗證測試報錯欄位不匹配

**原因**: Field Mapping 與 Schema Authority 不一致

**解決方式**:

1. 查看測試錯誤訊息，找出缺少或多餘的欄位
2. 更新 `configs/supabase-schema-authority.ts`
3. 或更新 `configs/sheet-field-mappings-complete.ts`
4. 重新執行測試確認

### 問題 5: raw_data 是空的

**症狀**: `raw_data` 欄位為 `{}`

**原因**: Transform 階段未正確保存原始資料

**解決方式**:

檢查 `configs/sheet-field-mappings-complete.ts` 中的 `transformRowData` 函數：

```typescript
// 確保有這一行
transformed.raw_data = { ...rowData };
```

### 問題 6: Replit 環境變數遺失

**症狀**: 啟動服務時報錯 "Supabase not available"

**原因**: Replit Secrets 未設定或過期

**解決方式**:

1. 前往 Replit → Tools → Secrets
2. 確認以下 secrets 存在並正確：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL`
   - `GOOGLE_SHEETS_CREDENTIALS`
3. 重啟 Replit 服務

---

## 日常維運

### 每日檢查清單

- [ ] 檢查同步歷史 (`sync_history` 表)
- [ ] 查看是否有失敗的同步
- [ ] 檢查資料總量是否正常增長
- [ ] 查看 Supabase Dashboard → Logs 是否有異常

```sql
-- 每日同步狀態
SELECT
  DATE(started_at) AS sync_date,
  COUNT(*) AS total_syncs,
  COUNT(CASE WHEN status = 'success' THEN 1 END) AS successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failed
FROM sync_history
WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(started_at)
ORDER BY sync_date DESC;
```

### 每週檢查清單

- [ ] 檢查資料品質（是否有異常值）
- [ ] 檢查索引使用情況
- [ ] 檢查查詢效能
- [ ] 備份重要資料

```sql
-- 檢查索引使用情況
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### 每月檢查清單

- [ ] 檢查資料庫大小
- [ ] 清理過期的 sync_history
- [ ] 優化慢查詢
- [ ] 更新文件

```sql
-- 清理 90 天前的同步歷史
DELETE FROM sync_history
WHERE started_at < CURRENT_DATE - INTERVAL '90 days';

-- 檢查資料庫大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 監控指標

建議監控以下指標：

1. **同步成功率**: `successful_syncs / total_syncs`
2. **資料新鮮度**: `MAX(synced_at)` 距離現在的時間
3. **轉換率**: 體驗課 → 購買的比例
4. **資料增長**: 每日新增記錄數
5. **查詢效能**: 平均查詢時間

---

## 附錄

### A. 環境變數清單

| 變數名稱 | 說明 | 範例 |
|---------|------|------|
| `SUPABASE_URL` | Supabase 專案 URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key（後端用） | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_DB_URL` | PostgreSQL 直連 URL | `postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres` |
| `GOOGLE_SHEETS_CREDENTIALS` | Google OAuth 憑證（JSON 字串） | `{"type":"service_account",...}` |

### B. 常用查詢範例

**查詢學生完整旅程**:

```sql
SELECT * FROM get_student_journey('student@example.com');
```

**查詢老師業績（本月）**:

```sql
SELECT * FROM get_teacher_performance(
  NULL, -- 所有老師
  DATE_TRUNC('month', CURRENT_DATE)::DATE,
  CURRENT_DATE
);
```

**查詢轉換統計（本季）**:

```sql
SELECT * FROM get_conversion_statistics(
  DATE_TRUNC('quarter', CURRENT_DATE)::DATE,
  CURRENT_DATE
);
```

### C. 相關文件

- [Field Mapping 完整說明](./FIELD_MAPPING_COMPLETE.md)
- [Schema Fix 執行指南](../SCHEMA_FIX_EXECUTION_GUIDE.md)
- [Migration 歷史](../supabase/migrations/)
- [測試文件](../tests/)

---

**需要協助？**

- 查看 Supabase Dashboard → Logs
- 檢查 Replit Console 輸出
- 執行測試找出問題根源
- 參考本手冊的故障排除章節
