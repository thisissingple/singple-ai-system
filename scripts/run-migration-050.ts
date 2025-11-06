/**
 * Run Migration 050: Create Consultant Knowledge Base
 */

import 'dotenv/config';
import { createPool } from '../server/services/pg-client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const pool = createPool();

  try {
    console.log('🚀 Running Migration 050: Create Consultant Knowledge Base...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/050_create_consultant_knowledge_base.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Execute migration
    await pool.query(sql);

    console.log('✅ Migration 050 completed successfully!');
    console.log('\n📝 Changes:');
    console.log('   - Created consultant_knowledge_base table');
    console.log('   - Added indexes for email, name, updated_at, average_rating');

    // Verify the table structure
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'consultant_knowledge_base'
      ORDER BY ordinal_position;
    `);

    console.log('\n📊 Table structure:');
    console.table(result.rows);

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
