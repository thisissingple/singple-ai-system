# 🚀 Neon → Supabase 遷移快速指南

## 當前狀態

✅ **程式碼已更新**：
- `server/storage.ts` → 使用 `supabase-storage.ts`
- `server/replitAuth.ts` → Session 改用 `SUPABASE_DB_URL`
- `drizzle.config.ts` → 優先使用 `SUPABASE_DB_URL`
- `.env.example` → 新增 Supabase 環境變數說明

❌ **需要執行**：
- Migration SQL 尚未在 Supabase 執行
- 環境變數需要更新

---

## 📋 遷移步驟（10 分鐘內完成）

### 步驟 1: 更新 .env 檔案（2 分鐘）

編輯 `.env`，新增以下內容：

```bash
# Supabase Database URL (for Drizzle ORM)
# 從 Supabase Dashboard → Settings → Database → Connection String → Direct
SUPABASE_DB_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# 註解掉舊的 Neon URL
# DATABASE_URL=postgresql://...neon.tech/...
```

**如何取得 SUPABASE_DB_URL**：
1. 登入 https://supabase.com/dashboard
2. 選擇你的專案
3. Settings → Database
4. Connection String → Direct connection
5. 複製並替換 `[YOUR-PASSWORD]` 為你的實際密碼

---

### 步驟 2: 執行 Migration SQL（3 分鐘）

#### 方法 1: 使用 Supabase Dashboard（推薦）

1. 開啟 Supabase Dashboard → SQL Editor
2. 複製檔案內容：`supabase/migrations/001_create_all_tables.sql`
3. 貼上到 SQL Editor
4. 點擊 "Run" 執行

#### 方法 2: 使用命令列

```bash
# 確認 SUPABASE_DB_URL 已設定
echo $SUPABASE_DB_URL

# 執行 migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/001_create_all_tables.sql
```

---

### 步驟 3: 驗證遷移（2 分鐘）

```bash
npx tsx scripts/verify-supabase-migration.ts
```

**預期結果**：
```
✅ 通過: 18 項
❌ 失敗: 0 項
⚠️  警告: 0-1 項

🎉 遷移驗證成功！所有測試都通過了。
```

---

### 步驟 4: 測試應用（3 分鐘）

```bash
# 啟動應用
npm run dev

# 在瀏覽器中測試：
# 1. 登入/登出 → Session 應該持久化
# 2. Google Sheets 同步 → 資料應該儲存到 Supabase
# 3. KPI Calculator → 數據正常顯示
# 4. 報表頁面 → 所有功能正常
```

---

## 🎯 完成檢查清單

- [ ] `.env` 已新增 `SUPABASE_DB_URL`
- [ ] Migration SQL 已在 Supabase 執行
- [ ] 驗證腳本顯示 ✅ 18 項通過
- [ ] 應用啟動無錯誤
- [ ] 登入/登出功能正常
- [ ] Google Sheets 同步正常
- [ ] KPI 計算正確顯示

---

## ⚠️ 疑難排解

### 問題：驗證腳本顯示 "資料表不存在"

**原因**：Migration SQL 尚未執行

**解決**：執行步驟 2

---

### 問題："Supabase client not available"

**原因**：環境變數未設定

**解決**：
```bash
# 檢查環境變數
cat .env | grep SUPABASE

# 確認這三個存在：
# SUPABASE_URL=https://...
# SUPABASE_SERVICE_ROLE_KEY=eyJ...
# SUPABASE_DB_URL=postgresql://...
```

---

### 問題：Session 無效/需要重新登入

**說明**：這是正常的！Session 儲存位置改變了

**動作**：重新登入一次即可

---

## 📊 當前資料狀態

根據驗證結果：

| 資料表 | 狀態 | 筆數 |
|--------|------|------|
| trial_class_attendance | ✅ 已存在 | 143 |
| trial_class_purchase | ✅ 已存在 | 97 |
| eods_for_closers | ✅ 已存在 | 995 |
| users | ❌ 需建立 | - |
| sessions | ❌ 需建立 | - |
| roles | ❌ 需建立 | - |
| spreadsheets | ❌ 需建立 | - |
| worksheets | ❌ 需建立 | - |
| sheet_data | ❌ 需建立 | - |
| google_oauth_tokens | ❌ 需建立 | - |
| sync_history | ❌ 需建立 | - |

**執行 Migration SQL 後，所有表格都會建立完成！**

---

## 📚 詳細文件

如需完整說明，請參閱：
- [NEON_TO_SUPABASE_MIGRATION.md](./NEON_TO_SUPABASE_MIGRATION.md) - 完整遷移指南
- [supabase/migrations/001_create_all_tables.sql](./supabase/migrations/001_create_all_tables.sql) - SQL schema

---

**最後更新**: 2025-10-04
**預計完成時間**: 10 分鐘
