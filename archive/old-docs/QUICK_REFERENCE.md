# Neon → Supabase 遷移快速參考

## 📌 核心變更總結

### 資料模型
- **ID 型別**: varchar → UUID
- **欄位命名**: DB 使用 snake_case，TS 使用 camelCase
- **真實來源**: Supabase Migration SQL

### 檔案變更
| 檔案 | 變更 |
|------|------|
| `shared/schema.ts` | 完全重寫（289行） |
| `server/supabase-storage.ts` | 新建（400行） |
| `server/storage.ts` | L1542: export 改用 supabase-storage |
| `server/replitAuth.ts` | L30-31: 使用 SUPABASE_DB_URL |

## 🚀 執行步驟

```bash
# 1. 執行 Migration SQL
# 在 Supabase Dashboard → SQL Editor 執行:
supabase/migrations/001_create_all_tables.sql

# 2. 驗證
npx tsx scripts/verify-supabase-migration.ts

# 3. 測試
npm run dev
```

## ⚙️ 環境變數

```bash
# .env 必須有：
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_DB_URL=postgresql://...

# 可移除：
# DATABASE_URL=postgresql://...neon.tech...
```

## 💡 程式碼範例

### Drizzle Schema
```typescript
export const spreadsheets = pgTable("spreadsheets", {
  id: uuid("id").primaryKey().defaultRandom(),
  spreadsheetId: text("spreadsheet_id"),  // DB: snake_case
  lastSyncAt: timestamp("last_sync_at"),
});
```

### Storage 寫入
```typescript
await this.supabase.from('spreadsheets').insert({
  spreadsheet_id: data.spreadsheetId,  // camelCase → snake_case
  last_sync_at: data.lastSyncAt,
})
```

### Storage 讀取
```typescript
const { data } = await this.supabase.from('spreadsheets').select('*');
return data as Spreadsheet;  // 自動映射為 camelCase
```

## ⚠️ 常見錯誤

| 錯誤 | 原因 | 解決 |
|------|------|------|
| Supabase client not available | 環境變數未設定 | 檢查 .env |
| Table 'spreadsheets' not found | Migration 未執行 | 執行 SQL |
| Field 'spreadsheetId' doesn't exist | 使用了 camelCase | 改用 snake_case 或 storage interface |

## 📚 完整文件

- [IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md) - 完整實作報告
- [MIGRATION_QUICK_START.md](./MIGRATION_QUICK_START.md) - 10分鐘快速指南
- [NEON_TO_SUPABASE_MIGRATION.md](./NEON_TO_SUPABASE_MIGRATION.md) - 詳細遷移指南
