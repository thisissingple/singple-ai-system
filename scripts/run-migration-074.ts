/**
 * Run Migration 074: Add deal_type column to eods_for_closers
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

// Load environment variables
dotenv.config();

const { Pool } = pg;

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🚀 Running migration 074: Add deal_type to eods_for_closers...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/074_add_deal_type_to_eods.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration 074 completed successfully!');
    console.log('\n📋 Changes made:');
    console.log('   - Added deal_type column to eods_for_closers');
    console.log('   - Created index idx_eods_deal_type');
    console.log('   - Created composite index idx_eods_deal_type_consultation_date');

    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers' AND column_name = 'deal_type'
    `);

    if (result.rows.length > 0) {
      console.log('\n✅ Verification: deal_type column exists');
      console.log('   Column details:', result.rows[0]);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
