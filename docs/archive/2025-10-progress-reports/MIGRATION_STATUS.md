# 🔄 Migration 執行狀態報告

**日期:** 2025-10-04
**狀態:** ⏳ 等待手動執行 SQL

---

## ✅ 已完成項目

### 1. 程式碼遷移（100%）

- ✅ [shared/schema.ts](shared/schema.ts) - UUID + snake_case schema
- ✅ [server/supabase-storage.ts](server/supabase-storage.ts) - 完整 IStorage 實作
- ✅ [server/storage.ts](server/storage.ts#L1542) - Export 改為 supabase-storage
- ✅ 所有 routes & services 自動使用新 storage

### 2. 環境配置（100%）

- ✅ `.env` 添加 `SUPABASE_DB_URL`
- ✅ 使用 Pooler connection string (更穩定)
- ✅ 保留舊 `DATABASE_URL` (待移除)

### 3. Migration 檔案（100%）

- ✅ [supabase/migrations/000_drop_old_tables.sql](supabase/migrations/000_drop_old_tables.sql) - 清理舊表
- ✅ [supabase/migrations/001_create_all_tables.sql](supabase/migrations/001_create_all_tables.sql) - 建立新 schema
- ✅ [scripts/verify-supabase-migration.ts](scripts/verify-supabase-migration.ts) - 驗證腳本

### 4. 文檔（100%）

- ✅ [SUPABASE_MIGRATION_STEPS.md](SUPABASE_MIGRATION_STEPS.md) - 詳細執行步驟
- ✅ [scripts/print-migration-sql.sh](scripts/print-migration-sql.sh) - SQL 輸出工具
- ✅ 本文件 (狀態報告)

---

## ⏳ 待執行項目（需要手動操作）

### 步驟 1: 在 Supabase Dashboard 執行 SQL

**原因:** `psql` 連線受限,需透過 Dashboard 執行

**操作:**
1. 開啟 [Supabase SQL Editor](https://supabase.com/dashboard/project/vqkkqkjaywkjtraepqbg/sql)
2. 執行清理 SQL:
   ```sql
   -- 複製 supabase/migrations/000_drop_old_tables.sql 內容
   DROP TABLE IF EXISTS member_activity_log CASCADE;
   DROP TABLE IF EXISTS members CASCADE;
   ...
   ```
3. 執行建立 SQL:
   ```sql
   -- 複製 supabase/migrations/001_create_all_tables.sql 完整內容
   ```

**預期時間:** 2-3 分鐘

---

### 步驟 2: 本地驗證

執行驗證腳本:
```bash
npx tsx scripts/verify-supabase-migration.ts
```

**預期結果:**
```
✅ 通過: 25+ 項
❌ 失敗: 0 項
```

---

### 步驟 3: 測試同步功能

```bash
npm run dev
```

測試項目:
- [ ] 使用者登入
- [ ] Google Sheets 同步
- [ ] Dashboard 資料顯示
- [ ] KPI Calculator
- [ ] Reports 產生

---

## 📊 資料庫狀態

### 當前狀況

**資料筆數:** 0 筆 (所有表為空)

**Schema 類型:**
- 現有: VARCHAR ID (舊 Neon schema)
- 目標: UUID ID (新 Supabase schema)

**衝突:**
- ⚠️ 現有表使用 VARCHAR,但新 schema 需要 UUID
- ⚠️ 需先刪除舊表再建立新表

**安全性:** ✅ 沒有資料遺失風險 (0 筆資料)

---

## 🔧 技術細節

### Schema 變更摘要

| 欄位類型 | 舊 Schema | 新 Schema |
|---------|----------|----------|
| 主鍵 ID | VARCHAR | UUID |
| 欄位命名 | camelCase | snake_case (DB) + camelCase (TS) |
| 時間戳 | TIMESTAMP | TIMESTAMPTZ |
| 外鍵 | VARCHAR | UUID |

### Drizzle 映射

```typescript
// TypeScript Code (camelCase)
const spreadsheet = {
  spreadsheetId: "abc123",
  ownerUserId: "user-uuid",
  lastSyncAt: new Date()
}

// Database (snake_case) - Drizzle 自動轉換
spreadsheet_id: "abc123"
owner_user_id: "user-uuid"
last_sync_at: "2025-10-04T..."
```

---

## 📁 關鍵檔案位置

```
workspace/
├── supabase/
│   └── migrations/
│       ├── 000_drop_old_tables.sql      ← 步驟 1
│       └── 001_create_all_tables.sql    ← 步驟 2
├── scripts/
│   ├── verify-supabase-migration.ts     ← 步驟 3
│   └── print-migration-sql.sh           ← 輔助工具
├── shared/
│   └── schema.ts                         ← UUID Schema
└── server/
    ├── supabase-storage.ts               ← 新 Storage
    └── storage.ts                        ← Export point
```

---

## 🎯 執行檢查清單

**程式碼準備:**
- [x] Schema 定義完成
- [x] Storage 實作完成
- [x] Routes 整合完成
- [x] 環境變數配置

**Migration 執行:**
- [ ] 執行 000_drop_old_tables.sql
- [ ] 執行 001_create_all_tables.sql
- [ ] 驗證腳本通過
- [ ] 測試同步功能

**清理:**
- [ ] 移除 `.env` 中的 `DATABASE_URL`
- [ ] 確認所有功能正常
- [ ] 更新文檔

---

## 📞 快速指令

```bash
# 1. 查看 Migration SQL
./scripts/print-migration-sql.sh

# 2. 執行驗證
npx tsx scripts/verify-supabase-migration.ts

# 3. 啟動開發伺服器
npm run dev
```

---

## ✨ 完成後效果

1. ✅ **UUID 主鍵** - 更好的擴展性與安全性
2. ✅ **統一 Schema** - Supabase 為單一真實來源
3. ✅ **自動映射** - Drizzle 處理 snake_case ↔ camelCase
4. ✅ **型別安全** - TypeScript 完整型別支援
5. ✅ **效能提升** - 正確的索引與外鍵約束

---

**下一步:** 請依照 [SUPABASE_MIGRATION_STEPS.md](SUPABASE_MIGRATION_STEPS.md) 執行 SQL Migration
