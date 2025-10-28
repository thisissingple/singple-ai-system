#!/bin/bash

# Run migration 040: Fix teaching quality scores
# Usage: ./scripts/run-migration-040.sh

# Load .env file if exists
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

if [ -z "$SUPABASE_SESSION_DB_URL" ] && [ -z "$SESSION_DB_URL" ] && [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: No database URL found in environment variables"
  echo "   Please set SUPABASE_SESSION_DB_URL, SESSION_DB_URL, or DATABASE_URL"
  exit 1
fi

DB_URL="${SUPABASE_SESSION_DB_URL:-${SESSION_DB_URL:-$DATABASE_URL}}"

echo "🚀 Running migration 040_fix_teaching_scores.sql..."
echo ""

psql "$DB_URL" -f supabase/migrations/040_fix_teaching_scores.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi
