# Schema Fix - 完整執行指南

## 📋 背景說明

這次修復解決了 PostgREST schema cache 的問題。主要完成：

1. **權威 Schema 定義**：[configs/supabase-schema-authority.ts](configs/supabase-schema-authority.ts)
2. **完整 Migration**：[supabase/migrations/007_schema_authority_final_fix.sql](supabase/migrations/007_schema_authority_final_fix.sql)
3. **同步服務更新**：[server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts)
4. **Schema 驗證測試**：[tests/schema-validation.test.ts](tests/schema-validation.test.ts)

---

## 🚀 執行步驟

### **步驟 1：執行 Migration 007**

在 Supabase Dashboard 中執行 SQL migration：

1. 前往 Supabase Dashboard → **SQL Editor**
2. 複製 [supabase/migrations/007_schema_authority_final_fix.sql](supabase/migrations/007_schema_authority_final_fix.sql) 的完整內容
3. 貼上並執行
4. 確認顯示 **Success**

**執行的 SQL 會做什麼：**
- 為 `trial_class_attendance` 新增 12 個欄位（如果不存在）
- 為 `trial_class_purchase` 新增 13 個欄位（如果不存在）
- 為 `eods_for_closers` 新增 13 個欄位（如果不存在）
- 建立索引（email, worksheet_id, synced_at）
- 發送 `NOTIFY pgrst, 'reload schema'` 重新載入 PostgREST cache

---

### **步驟 2：重啟 PostgREST（強制重新載入 schema cache）**

即使 SQL 執行成功，PostgREST 的 schema cache 可能仍需手動重啟。

**在 Supabase Dashboard：**

1. 前往 **Settings** → **API**
2. 找到 **PostgREST** 區塊
3. 點擊 **Restart** 或 **Reload Schema**（如果有這個按鈕）

**如果沒有重啟按鈕：**

執行以下 SQL 強制 PostgREST 重新載入：

```sql
NOTIFY pgrst, 'reload schema';
```

然後等待 **30-60 秒** 讓 PostgREST 完成重新載入。

---

### **步驟 3：在 Replit 重新啟動 Node 服務**

在 Replit 中：

1. 停止當前執行的 Node 伺服器（按 `Ctrl+C` 或點擊 Stop）
2. 重新執行：
   ```bash
   npm run dev
   ```

這會確保 Supabase client 使用最新的 schema。

---

### **步驟 4：測試同步功能**

在前端或 API 中觸發 Google Sheets 同步，觀察 console 輸出：

**預期正常輸出：**
```
📊 Syncing 10 rows to Supabase table: trial_class_attendance
✅ Transformed 10 valid records (0 invalid)
🔧 Standardized 10 records with 12 fields
🗑️  Deleting old data for worksheet xxx from trial_class_attendance...
✅ Deleted 0 old records
💾 Batch inserting 10 records to trial_class_attendance...
✅ Successfully inserted 10 records to trial_class_attendance
```

**如果仍出現 "Could not find column in schema cache" 錯誤：**

1. 前往 Supabase Dashboard
2. 檢查 **Database** → **Tables** → 確認欄位是否真的存在
3. 如果欄位存在，但仍報錯 → 再次重啟 PostgREST（步驟 2）
4. 等待更長時間（2-3 分鐘）讓 cache 完全刷新

---

### **步驟 5：執行 Schema 驗證測試**

確保 transformer 輸出的欄位與權威 schema 定義一致：

```bash
npm test tests/schema-validation.test.ts
```

**預期結果：**
```
✓ trial_class_attendance should output exactly the fields defined in schema authority
✓ trial_class_attendance should include raw_data with all original Google Sheets data
✓ trial_class_purchase should output exactly the fields defined in schema authority
✓ trial_class_purchase should include raw_data with all original Google Sheets data
✓ eods_for_closers should output exactly the fields defined in schema authority
✓ eods_for_closers should include raw_data with all original Google Sheets data
✓ trial_class_attendance should have exactly 12 insert fields
✓ trial_class_purchase should have exactly 13 insert fields
✓ eods_for_closers should have exactly 13 insert fields

Tests passed: 9/9
```

**如果測試失敗：**
- 檢查錯誤訊息，找出缺少或多餘的欄位
- 更新 [configs/supabase-schema-authority.ts](configs/supabase-schema-authority.ts) 的 `EXPECTED_INSERT_FIELDS`
- 更新 [server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts) 的欄位補充邏輯
- 執行新的 migration 新增欄位

---

## 📊 驗證資料完整性

同步完成後，在 Supabase Dashboard 查詢資料：

```sql
-- 檢查 trial_class_attendance
SELECT
  id,
  student_email,
  student_name,
  class_date,
  teacher_name,
  source_worksheet_id,
  origin_row_index,
  synced_at,
  raw_data
FROM trial_class_attendance
LIMIT 5;
```

**確認以下事項：**
- ✅ `student_email` 有值（必填欄位）
- ✅ `source_worksheet_id` 有值（追蹤欄位）
- ✅ `origin_row_index` 有值（Google Sheets 列號）
- ✅ `synced_at` 有值（同步時間）
- ✅ `raw_data` 包含所有 Google Sheets 原始欄位（JSONB 格式）

---

## 🔄 未來新增 Google Sheets 欄位時的流程

### **情境：Google Sheets 新增了「學生電話」欄位**

#### **選項 1：僅儲存在 raw_data（推薦，零停機）**

不需要做任何事！新欄位會自動儲存在 `raw_data` JSONB 欄位中。

**查詢範例：**
```sql
SELECT
  student_name,
  raw_data->>'學生電話' AS student_phone
FROM trial_class_attendance;
```

#### **選項 2：新增專用欄位（需要 migration）**

如果需要對新欄位建立索引或做複雜查詢：

1. **更新 field mapping**：
   ```typescript
   // configs/sheet-field-mappings.ts
   export const TRIAL_CLASS_ATTENDANCE_MAPPING: FieldMapping[] = [
     // ... 現有 mappings
     { googleSheetColumn: '學生電話', supabaseColumn: 'student_phone', dataType: 'text' },
   ];
   ```

2. **更新權威 schema**：
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

3. **建立 migration**：
   ```sql
   -- supabase/migrations/008_add_student_phone.sql
   ALTER TABLE trial_class_attendance
     ADD COLUMN IF NOT EXISTS student_phone TEXT;

   CREATE INDEX IF NOT EXISTS idx_trial_attendance_phone
     ON trial_class_attendance(student_phone);

   NOTIFY pgrst, 'reload schema';
   ```

4. **執行測試**：
   ```bash
   npm test tests/schema-validation.test.ts
   ```

5. **重啟 PostgREST** → **重新同步 Google Sheets**

---

## 🛠️ 疑難排解

### **問題 1：執行 Migration 後仍然報錯 "column not found"**

**原因：** PostgREST cache 未更新

**解決方式：**
1. 執行 `NOTIFY pgrst, 'reload schema';`
2. 在 Supabase Dashboard 重啟 PostgREST
3. 等待 1-2 分鐘
4. 重新觸發同步

---

### **問題 2：同步時出現 "All object keys must match"**

**原因：** PostgREST 批次插入要求所有物件有相同的 keys

**解決方式：**
已經在 [server/services/sheet-sync-service.ts:122-134](server/services/sheet-sync-service.ts) 實作了 standardization 邏輯，所有記錄會自動補齊缺少的欄位為 `null`。

如果仍出現此錯誤，檢查 console 輸出的 `Sample record` 找出問題欄位。

---

### **問題 3：Schema 驗證測試失敗**

**錯誤訊息：**
```
Expected: ["class_date", "department_id", "notes", ...]
Received: ["class_date", "department_id", "new_field", ...]
```

**解決方式：**
1. 找出多出來的欄位（例如 `new_field`）
2. 更新 [configs/supabase-schema-authority.ts](configs/supabase-schema-authority.ts)：
   - 加入 Zod schema: `new_field: z.string().nullable(),`
   - 加入 `EXPECTED_INSERT_FIELDS`
   - 加入 `SQL_COLUMN_DEFINITIONS`
3. 建立新的 migration 新增該欄位
4. 重新執行測試

---

## 📚 參考檔案

- **權威 Schema 定義**：[configs/supabase-schema-authority.ts](configs/supabase-schema-authority.ts)
- **Field Mapping**：[configs/sheet-field-mappings.ts](configs/sheet-field-mappings.ts)
- **同步服務**：[server/services/sheet-sync-service.ts](server/services/sheet-sync-service.ts)
- **Schema 驗證測試**：[tests/schema-validation.test.ts](tests/schema-validation.test.ts)
- **Migration 007**：[supabase/migrations/007_schema_authority_final_fix.sql](supabase/migrations/007_schema_authority_final_fix.sql)

---

## ✅ 完成檢查清單

執行完所有步驟後，確認以下事項：

- [ ] Migration 007 執行成功（Supabase Dashboard 顯示 Success）
- [ ] PostgREST 已重啟（Dashboard 或 SQL NOTIFY）
- [ ] Replit Node 服務已重啟
- [ ] Google Sheets 同步成功（無 "column not found" 錯誤）
- [ ] Schema 驗證測試全部通過（9/9 tests passed）
- [ ] Supabase 資料表包含正確的追蹤欄位（source_worksheet_id, origin_row_index, synced_at）
- [ ] raw_data 欄位包含完整的 Google Sheets 原始資料

**全部完成後，你的系統就已經：**
✅ 修復了 schema cache 問題
✅ 建立了權威 schema 定義
✅ 實作了自動化驗證測試
✅ 支援未來新增欄位時的零停機更新（透過 raw_data）
