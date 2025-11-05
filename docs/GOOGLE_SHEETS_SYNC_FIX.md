# Google Sheets 同步頁面修復指南

## 問題描述

頁面 `https://singple-ai-system.zeabur.app/settings/google-sheets-sync` 無法訪問。

## 根本原因

該頁面需要以下資料庫表：
- `google_sheets_sources` - Google Sheets 資料來源
- `sheet_mappings` - 工作表映射設定
- `sync_logs` - 同步歷史記錄

這些表由 Migration 045 建立，但**尚未在生產環境執行**。

## 修復步驟

### 方法 1: 使用 Supabase Dashboard（推薦）

1. 登入 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案
3. 進入 **SQL Editor**
4. 複製 `supabase/migrations/045_create_google_sheets_sync.sql` 的內容
5. 貼上並執行 SQL

### 方法 2: 使用本地腳本（需要資料庫連線）

需要環境變數 `SUPABASE_DB_URL`（PostgreSQL 連線字串）：

```bash
# 設定環境變數
export SUPABASE_DB_URL="postgresql://postgres:[password]@[host]:5432/postgres"

# 執行 migration
npx tsx scripts/run-migration-045.ts
```

## 驗證

執行 migration 後，在 SQL Editor 中執行：

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('google_sheets_sources', 'sheet_mappings', 'sync_logs');
```

應該返回 3 個表名稱。

## 頁面功能

Migration 完成後，Google Sheets 同步頁面將提供：

1. **資料來源管理** - 新增/刪除 Google Sheets
2. **欄位映射設定** - 設定 Sheets 欄位對應
3. **手動同步** - 即時同步進度顯示
4. **同步歷史** - 查看同步記錄

## 相關檔案

- Migration: `supabase/migrations/045_create_google_sheets_sync.sql`
- 執行腳本: `scripts/run-migration-045.ts`
- 前端頁面: `client/src/pages/settings/google-sheets-sync.tsx`
- 後端 API: `server/routes.ts` (line 8465+)

---
**建立日期**: 2025-11-05
