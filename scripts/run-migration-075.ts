/**
 * Run Migration 075: Create consultant AI reports cache table
 */

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('Pool error (ignored):', err.message);
  });

  try {
    const migrationPath = path.join(__dirname, '../supabase/migrations/075_create_consultant_ai_reports_cache.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration 075...');
    await pool.query(sql);
    console.log('✅ Migration 075 completed successfully!');

    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'consultant_ai_reports'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
