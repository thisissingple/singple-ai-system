import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    const sql = fs.readFileSync('supabase/migrations/091_create_system_settings.sql', 'utf8');
    await pool.query(sql);
    console.log('✅ Migration 091 executed successfully');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
