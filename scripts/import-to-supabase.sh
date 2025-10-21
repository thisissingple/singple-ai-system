#!/bin/bash
# 匯入資料到 Supabase

set -e

if [ -z "$1" ]; then
  echo "❌ 請指定匯出目錄"
  echo "用法: $0 <export-directory>"
  exit 1
fi

EXPORT_DIR="$1"

if [ ! -d "$EXPORT_DIR" ]; then
  echo "❌ 目錄不存在: $EXPORT_DIR"
  exit 1
fi

# 取得 Supabase 連線字串
SUPABASE_CONN="$SUPABASE_DB_URL"

if [ -z "$SUPABASE_CONN" ]; then
  echo "❌ SUPABASE_DB_URL 未設定"
  echo "請到 Supabase Dashboard > Project Settings > Database > Connection String"
  echo "選擇 'Session pooler'，複製 connection string"
  exit 1
fi

echo "📦 開始匯入資料到 Supabase..."

# 匯入 users
if [ -f "$EXPORT_DIR/users.csv" ]; then
  echo "  - users"
  psql "$SUPABASE_CONN" -c "\COPY users FROM '$EXPORT_DIR/users.csv' WITH CSV HEADER"
fi

# 匯入 spreadsheets
if [ -f "$EXPORT_DIR/spreadsheets.csv" ]; then
  echo "  - spreadsheets"
  psql "$SUPABASE_CONN" -c "\COPY spreadsheets FROM '$EXPORT_DIR/spreadsheets.csv' WITH CSV HEADER"
fi

# 匯入 worksheets
if [ -f "$EXPORT_DIR/worksheets.csv" ]; then
  echo "  - worksheets"
  psql "$SUPABASE_CONN" -c "\COPY worksheets FROM '$EXPORT_DIR/worksheets.csv' WITH CSV HEADER"
fi

# 匯入 sheet_data
if [ -f "$EXPORT_DIR/sheet_data.csv" ]; then
  echo "  - sheet_data"
  psql "$SUPABASE_CONN" -c "\COPY sheet_data FROM '$EXPORT_DIR/sheet_data.csv' WITH CSV HEADER"
fi

# 匯入 roles
if [ -f "$EXPORT_DIR/roles.csv" ]; then
  echo "  - roles"
  psql "$SUPABASE_CONN" -c "\COPY roles FROM '$EXPORT_DIR/roles.csv' WITH CSV HEADER"
fi

# 匯入 custom_dashboards
if [ -f "$EXPORT_DIR/custom_dashboards.csv" ]; then
  echo "  - custom_dashboards"
  psql "$SUPABASE_CONN" -c "\COPY custom_dashboards FROM '$EXPORT_DIR/custom_dashboards.csv' WITH CSV HEADER"
fi

echo "✅ 匯入完成！"
