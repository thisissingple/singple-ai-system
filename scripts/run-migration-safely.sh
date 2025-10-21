#!/bin/bash
# 安全執行 Migration 腳本
# 確保永遠連到正確的 Supabase 資料庫

set -e  # 遇到錯誤立即停止

echo "================================================"
echo "安全 Migration 執行器"
echo "================================================"
echo ""

# 檢查環境變數
if [ -z "$SUPABASE_DB_URL" ]; then
  echo "❌ 錯誤：SUPABASE_DB_URL 環境變數未設定"
  exit 1
fi

echo "✅ 已找到 SUPABASE_DB_URL"
echo "   連線主機: $(echo $SUPABASE_DB_URL | sed 's/.*@//' | sed 's/\/.*//')"
echo ""

# 驗證連線
echo "🔍 驗證資料庫連線..."
if ! psql "$SUPABASE_DB_URL" -c "SELECT 1" > /dev/null 2>&1; then
  echo "❌ 錯誤：無法連線到資料庫"
  exit 1
fi
echo "✅ 資料庫連線成功"
echo ""

# 驗證是否為正確的資料庫（檢查 income_expense_records 表）
echo "🔍 驗證是否為 Supabase 正式資料庫..."
if ! psql "$SUPABASE_DB_URL" -c "SELECT 1 FROM income_expense_records LIMIT 1" > /dev/null 2>&1; then
  echo "❌ 錯誤：找不到 income_expense_records 表"
  echo "   這可能不是正確的 Supabase 資料庫！"
  echo "   請檢查 SUPABASE_DB_URL 是否正確"
  exit 1
fi
echo "✅ 已確認為 Supabase 正式資料庫（找到 income_expense_records）"
echo ""

# 執行 Migration
MIGRATION_FILE="$1"

if [ -z "$MIGRATION_FILE" ]; then
  echo "❌ 錯誤：請提供 Migration 檔案路徑"
  echo "用法: ./scripts/run-migration-safely.sh supabase/migrations/031_xxx.sql"
  exit 1
fi

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ 錯誤：找不到檔案 $MIGRATION_FILE"
  exit 1
fi

echo "📄 執行 Migration: $MIGRATION_FILE"
echo ""
echo "================================================"
echo ""

# 執行 Migration
psql "$SUPABASE_DB_URL" -f "$MIGRATION_FILE"

echo ""
echo "================================================"
echo "✅ Migration 執行完成"
echo "================================================"
