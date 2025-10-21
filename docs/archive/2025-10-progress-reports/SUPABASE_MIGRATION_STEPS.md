# Supabase Migration 執行步驟

## 📋 目前狀態

您的 Supabase 資料庫中有舊的 VARCHAR ID schema,需要遷移到新的 UUID schema。

**資料狀況：**
- users: 0 筆
- spreadsheets: 0 筆
- 其他表: 0 筆

✅ **安全遷移：目前沒有資料,可以直接刪除重建**

---

## 🚀 執行步驟（5分鐘完成）

### 步驟 1: 開啟 Supabase SQL Editor

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案：`vqkkqkjaywkjtraepqbg`
3. 左側選單 → **SQL Editor**
4. 點擊 **+ New query**

### 步驟 2: 清理舊表

複製以下 SQL 到編輯器:

```sql
-- 清理舊的 VARCHAR ID tables
DROP TABLE IF EXISTS member_activity_log CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS custom_dashboards CASCADE;
DROP TABLE IF EXISTS dashboard_templates CASCADE;
DROP TABLE IF EXISTS sheet_data CASCADE;
DROP TABLE IF EXISTS worksheets CASCADE;
DROP TABLE IF EXISTS spreadsheets CASCADE;
DROP TABLE IF EXISTS google_oauth_tokens CASCADE;
DROP TABLE IF EXISTS user_spreadsheets CASCADE;
DROP TABLE IF EXISTS sync_history CASCADE;
DROP TABLE IF EXISTS trial_class_attendance CASCADE;
DROP TABLE IF EXISTS trial_class_purchase CASCADE;
DROP TABLE IF EXISTS eods_for_closers CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

SELECT '✅ 舊表已清理完成！' as status;
```

點擊 **Run** 執行。

預期結果: `✅ 舊表已清理完成！`

---

### 步驟 3: 建立新的 UUID Schema

1. 複製整個檔案內容：[supabase/migrations/001_create_all_tables.sql](supabase/migrations/001_create_all_tables.sql)
2. 貼到 SQL Editor 的新 query
3. 點擊 **Run** 執行

預期結果:
```
CREATE EXTENSION
CREATE TABLE
CREATE INDEX
...
✅ Supabase 架構建立完成！
```

---

### 步驟 4: 驗證 Migration

回到終端機執行:

```bash
npx tsx scripts/verify-supabase-migration.ts
```

預期結果:
```
✅ 通過: 25+ 項
❌ 失敗: 0 項
```

---

### 步驟 5: 測試同步功能

```bash
npm run dev
```

然後:
1. 開啟瀏覽器: http://localhost:5000
2. 登入系統
3. 前往 Dashboard → 同步 Google Sheets
4. 確認資料成功寫入 Supabase

---

## ⚠️ 疑難排解

### 問題 1: Migration SQL 執行失敗

**症狀:** `ERROR: relation "xxx" already exists`

**解決:**
1. 重新執行步驟 2 (清理舊表)
2. 確認所有 DROP TABLE 都成功
3. 再次執行步驟 3

### 問題 2: 連線錯誤

**症狀:** `connection refused` 或 `timeout`

**解決:**
1. 檢查 `.env` 中的 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`
2. 確認 Supabase 專案沒有暫停
3. 檢查網路連線

### 問題 3: 驗證腳本失敗

**症狀:** `Could not find table 'public.xxx'`

**解決:**
1. 確認步驟 3 (建立新 schema) 完整執行
2. 在 Supabase Dashboard → Table Editor 檢查表是否存在
3. 檢查 schema 是否為 `public`

---

## 📝 檔案位置

- **清理 SQL:** `supabase/migrations/000_drop_old_tables.sql`
- **建立 SQL:** `supabase/migrations/001_create_all_tables.sql`
- **驗證腳本:** `scripts/verify-supabase-migration.ts`

---

## ✅ 完成檢查清單

- [ ] 步驟 1: 開啟 Supabase SQL Editor
- [ ] 步驟 2: 執行清理 SQL (000_drop_old_tables.sql)
- [ ] 步驟 3: 執行建立 SQL (001_create_all_tables.sql)
- [ ] 步驟 4: 驗證通過 (25+ 項)
- [ ] 步驟 5: 測試同步成功

---

## 🎯 下一步

Migration 完成後:

1. ✅ **移除舊的 DATABASE_URL**
   ```bash
   # 編輯 .env,刪除或註解此行:
   # DATABASE_URL=postgresql://postgres:...
   ```

2. ✅ **同步 Google Sheets 資料**
   - Dashboard → Sync → 執行完整同步
   - 確認資料正確寫入 Supabase

3. ✅ **測試 KPI Calculator**
   - 前往 KPI Calculator 頁面
   - 確認資料來源為 Supabase

4. ✅ **測試 Reports**
   - 檢查報表產生
   - 確認資料完整性

---

## 📞 需要協助？

如遇到問題,請提供:
1. 錯誤訊息截圖
2. 執行的步驟
3. `.env` 配置（遮蔽敏感資訊）
