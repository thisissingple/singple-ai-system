/**
 * 執行 Migration 045: Google Sheets 同步系統
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 讀取 migration 檔案
    const migrationPath = join(process.cwd(), 'supabase/migrations/045_create_google_sheets_sync.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('🔄 Running migration 045...');
    await client.query(sql);

    console.log('✅ Migration 045 completed successfully!');
    console.log('\n📊 Created tables:');
    console.log('  - google_sheets_sources');
    console.log('  - sheet_mappings');
    console.log('  - sync_logs');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
