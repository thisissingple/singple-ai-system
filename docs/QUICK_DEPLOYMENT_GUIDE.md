# 快速部署指南

**目標**: 5 分鐘內完成 Google Sheets → Supabase 同步系統部署

---

## ⚡ 快速步驟

### 1. 執行 Migrations（2 分鐘）

```bash
# 方法 A: 使用 Supabase Dashboard（推薦）
# 1. 前往 https://supabase.com/dashboard
# 2. SQL Editor → 貼上並執行以下檔案:

# Migration 008: 完整業務 Schema
cat supabase/migrations/008_complete_business_schema.sql
# 複製內容 → 貼上 → Run

# Migration 009: 報表視圖和函數
cat supabase/migrations/009_create_report_views.sql
# 複製內容 → 貼上 → Run
```

```bash
# 方法 B: 使用 psql（Replit 環境）
export SUPABASE_DB_URL="你的資料庫連線字串"
psql $SUPABASE_DB_URL -f supabase/migrations/008_complete_business_schema.sql
psql $SUPABASE_DB_URL -f supabase/migrations/009_create_report_views.sql
```

### 2. 重啟 PostgREST（1 分鐘）

1. Supabase Dashboard → Settings → API
2. 點擊 **Restart** 按鈕
3. 等待 30 秒

### 3. 替換同步服務（1 分鐘）

```typescript
// server/routes.ts 或使用新同步服務的地方
// 將舊的 import 替換為新的:

// 舊版（刪除）
// import { syncWorksheetToSupabase } from './services/sheet-sync-service';

// 新版（使用）
import { syncWorksheetToSupabase } from './services/sheet-sync-service-v2';
```

### 4. 重啟 Replit 服務（1 分鐘）

```bash
# Ctrl+C 停止服務
# 然後重新啟動
npm run dev
```

### 5. 觸發同步測試（30 秒）

前往應用 UI → Worksheets → 點擊 **Sync Now**

---

## ✅ 驗證清單

執行以下 SQL 確認部署成功：

```sql
-- 1. 檢查表是否有所有欄位
\d+ trial_class_attendance
-- 應該看到: student_email, student_name, class_date, teacher_name,
--          is_reviewed, no_conversion_reason, class_transcript,
--          raw_data, source_worksheet_id, origin_row_index, synced_at

-- 2. 檢查視圖是否建立
\dv
-- 應該看到: v_student_journey, v_teacher_performance, v_closer_performance,
--          v_caller_performance, v_daily_statistics, v_monthly_statistics

-- 3. 檢查函數是否建立
\df get_student_journey
-- 應該看到函數定義

-- 4. 檢查是否有資料
SELECT COUNT(*) FROM trial_class_attendance;
SELECT COUNT(*) FROM trial_class_purchase;
SELECT COUNT(*) FROM eods_for_closers;
```

---

## 🔧 如果遇到問題

### 問題 1: Migration 執行失敗

```sql
-- 回滾到 Migration 007
-- 然後重新執行 008, 009
```

### 問題 2: PostgREST 報錯 "column not found"

```sql
-- 手動重新載入 schema cache
NOTIFY pgrst, 'reload schema';
```

然後等待 2-3 分鐘，或在 Dashboard 重啟 PostgREST。

### 問題 3: 同步失敗

檢查 console 日誌，確認：
1. Supabase 連線正常
2. Field mapping 正確
3. 必填欄位 `student_email` 有值

---

## 📚 下一步

部署完成後，請閱讀:

- [完整操作手冊](./COMPLETE_OPERATION_MANUAL.md) - 詳細的操作指南
- [Field Mapping 文件](./FIELD_MAPPING_COMPLETE.md) - 欄位映射說明
- [新增欄位流程](./COMPLETE_OPERATION_MANUAL.md#新增-google-sheets-欄位流程) - 如何新增欄位

---

## 🎯 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `configs/sheet-field-mappings-complete.ts` | 完整欄位映射（包含所有業務欄位） |
| `server/services/sheet-sync-service-v2.ts` | 新版同步服務（使用 ETL 模式） |
| `server/services/etl/` | ETL 模組（Extract, Transform, Load） |
| `supabase/migrations/008_*.sql` | 完整業務 Schema |
| `supabase/migrations/009_*.sql` | 報表視圖和函數 |
| `tests/etl/*.test.ts` | ETL 測試 |

---

**完成！** 🎉

現在你的系統已經：
- ✅ 使用 Supabase 作為唯一資料來源（Single Source of Truth）
- ✅ 支援所有業務欄位的完整映射
- ✅ 提供 ETL 模式的清晰資料流程
- ✅ 包含報表視圖和函數以優化查詢
- ✅ 具備完整的測試覆蓋
