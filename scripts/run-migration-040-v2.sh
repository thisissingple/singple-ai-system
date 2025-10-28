#!/bin/bash

# Run migration 040: Fix teaching quality scores (Version 2 - Fixed regex)
# Usage: ./scripts/run-migration-040-v2.sh

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

echo "🚀 Running migration 040_fix_teaching_scores.sql (Version 2 - Fixed regex)..."
echo ""
echo "This will re-create the extraction functions with the corrected regex patterns"
echo "and re-process all records with zero scores."
echo ""

# Note: We need to use psql command which may not be available locally
# User should run this SQL directly in Supabase SQL Editor

echo "⚠️  Please run the SQL file directly in Supabase SQL Editor:"
echo "   1. Open Supabase Dashboard → SQL Editor"
echo "   2. Copy content from: supabase/migrations/040_fix_teaching_scores.sql"
echo "   3. Execute the SQL"
echo ""
echo "The migration will:"
echo "   - Re-create extract_sales_score() function with fixed regex"
echo "   - Re-process all records where teaching_score=0 OR sales_score=0"
echo "   - Update database with corrected scores"
