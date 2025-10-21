# Google Sheets → Supabase 同步系統 - 部署指南

**目標**: 穩定同步三張表，確保資料完整性

---

## 🚀 快速部署（3 步驟）

### 1. 執行 Migration（2 分鐘）

```bash
# 選項 A: Supabase Dashboard（推薦）
# 1. 前往 https://supabase.com/dashboard
# 2. SQL Editor → 複製以下內容並執行

cat supabase/migrations/010_minimal_sync_schema.sql
```

```bash
# 選項 B: psql 指令
psql $SUPABASE_DB_URL -f supabase/migrations/010_minimal_sync_schema.sql
```

### 2. 重啟 PostgREST（1 分鐘）

1. Supabase Dashboard → Settings → API
2. 點擊 **Restart** 按鈕
3. 等待 30 秒

### 3. 重啟 Replit 服務（30 秒）

```bash
# Ctrl+C 停止服務，然後重啟
npm run dev
```

---

## ✅ 驗證部署

### 檢查 Schema

```sql
-- 檢查表結構
\d+ trial_class_attendance

-- 應該看到：
-- - student_name, student_email, class_date, teacher_name (必填)
-- - is_reviewed, no_conversion_reason, notes (業務)
-- - raw_data, source_worksheet_id, origin_row_index, synced_at (追蹤)

-- 檢查索引
SELECT indexname FROM pg_indexes
WHERE tablename = 'trial_class_attendance';

-- 應該看到：
-- - idx_trial_attendance_email
-- - idx_trial_attendance_class_date
-- - idx_trial_attendance_worksheet
```

### 執行測試

```bash
npm test tests/sync.test.ts
```

**預期結果**: 所有測試通過

### 測試同步

前往應用 UI → Worksheets → 點擊 **Sync Now**

---

## 📋 欄位映射

### trial_class_attendance

| Google Sheets 欄位 | Supabase 欄位 | 類型 | 必填 |
|-------------------|--------------|------|------|
| 姓名 | student_name | TEXT | ✓ |
| email | student_email | TEXT | ✓ |
| 上課日期 | class_date | DATE | ✓ |
| 授課老師 | teacher_name | TEXT | ✓ |
| 是否已審核 | is_reviewed | BOOLEAN | |
| 未轉換原因 | no_conversion_reason | TEXT | |
| 備註 | notes | TEXT | |
| *(所有欄位)* | raw_data | JSONB | ✓ |

### trial_class_purchase

| Google Sheets 欄位 | Supabase 欄位 | 類型 | 必填 |
|-------------------|--------------|------|------|
| 姓名 | student_name | TEXT | ✓ |
| email | student_email | TEXT | ✓ |
| 方案名稱 | package_name | TEXT | ✓ |
| 體驗課購買日期 | purchase_date | DATE | ✓ |
| 方案價格 | package_price | INTEGER | |
| 年齡 | age | INTEGER | |
| 職業 | occupation | TEXT | |
| 備註 | notes | TEXT | |
| *(所有欄位)* | raw_data | JSONB | ✓ |

### eods_for_closers

| Google Sheets 欄位 | Supabase 欄位 | 類型 | 必填 |
|-------------------|--------------|------|------|
| Name | student_name | TEXT | ✓ |
| Email | student_email | TEXT | ✓ |
| （諮詢）諮詢人員 | closer_name | TEXT | ✓ |
| （諮詢）成交日期 | deal_date | DATE | |
| 諮詢日期 | consultation_date | DATE | |
| 電訪人員 | caller_name | TEXT | |
| 是否線上 | is_online | BOOLEAN | |
| 咨詢結果 | consultation_result | TEXT | |
| 實際金額 | actual_amount | INTEGER | |
| 方案價格 | package_price | INTEGER | |
| （諮詢）備註 | notes | TEXT | |
| *(所有欄位)* | raw_data | JSONB | ✓ |

---

## 🔧 新增欄位流程

### 情境：Google Sheets 新增「學生電話」欄位

#### 選項 1：僅存 raw_data（推薦，零停機）

不需要任何操作！新欄位會自動存入 `raw_data`。

```sql
-- 查詢 raw_data 中的新欄位
SELECT
  student_name,
  raw_data->>'學生電話' AS phone
FROM trial_class_attendance;
```

#### 選項 2：新增專用欄位（需要 migration）

**步驟 1**: 更新 Field Mapping

```typescript
// configs/sheet-field-mappings.ts
export const TRIAL_CLASS_ATTENDANCE_MAPPING: FieldMapping[] = [
  // ... 現有欄位
  { googleSheetColumn: '學生電話', supabaseColumn: 'student_phone', dataType: 'text' },
];
```

**步驟 2**: 建立 Migration

```sql
-- supabase/migrations/011_add_student_phone.sql
ALTER TABLE trial_class_attendance
  ADD COLUMN IF NOT EXISTS student_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_trial_attendance_phone
  ON trial_class_attendance(student_phone);
```

**步驟 3**: 部署

1. 執行 Migration 011
2. 重啟 PostgREST
3. 重新同步資料

---

## 🔍 故障排除

### 問題 1: "column not found in schema cache"

**解決方式**:
1. 確認 Migration 已執行成功
2. 重啟 PostgREST（Dashboard → API → Restart）
3. 等待 1-2 分鐘

### 問題 2: 同步失敗

**檢查步驟**:
1. 查看 console 錯誤訊息
2. 確認 `student_email` 有值
3. 檢查 Supabase 連線：`echo $SUPABASE_DB_URL`

### 問題 3: 測試失敗

```bash
# 重新執行測試
npm test tests/sync.test.ts

# 檢查錯誤訊息，確認欄位映射是否正確
```

---

## 📊 監控同步狀態

### 檢查最近同步

```sql
-- 查詢最近同步的資料
SELECT
  COUNT(*) AS total_records,
  MAX(synced_at) AS last_sync,
  COUNT(DISTINCT source_worksheet_id) AS total_worksheets
FROM trial_class_attendance;
```

### 檢查資料品質

```sql
-- 檢查缺少 student_email 的記錄（應該為 0）
SELECT COUNT(*)
FROM trial_class_attendance
WHERE student_email IS NULL OR student_email = '';

-- 檢查 raw_data 是否保留原始資料
SELECT
  student_name,
  jsonb_object_keys(raw_data) AS original_columns
FROM trial_class_attendance
LIMIT 5;
```

---

## 📚 核心檔案

| 檔案 | 用途 |
|------|------|
| [configs/sheet-field-mappings.ts](configs/sheet-field-mappings.ts) | 欄位映射定義 |
| [server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts) | 同步服務（ETL） |
| [supabase/migrations/010_minimal_sync_schema.sql](supabase/migrations/010_minimal_sync_schema.sql) | Schema Migration |
| [tests/sync.test.ts](tests/sync.test.ts) | 同步測試 |

---

## 🎯 關鍵原則

1. **Supabase 是唯一資料來源** - 所有報表都從 Supabase 查詢
2. **raw_data 保留所有欄位** - 未來新增欄位無需 migration
3. **必填欄位驗證** - `student_email` 必須有值（用於跨表 JOIN）
4. **去重機制** - 同步前先刪除 `source_worksheet_id` 相同的舊資料
5. **資料溯源** - 每筆資料都有 `source_worksheet_id`, `origin_row_index`, `synced_at`

---

**部署完成！** 🎉

系統已經：
- ✅ 建立完整的欄位映射
- ✅ 實作 ETL 同步流程
- ✅ 補齊 Supabase Schema
- ✅ 提供測試覆蓋
- ✅ 支援資料溯源

**下一步**: 等同步穩定後，再建立 KPI 報表視圖和函數
