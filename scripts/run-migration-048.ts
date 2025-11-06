/**
 * Run migration 048: Add raw_markdown_output column
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log('Running migration 048: Add raw_markdown_output column...\n');

  const pool = new Pool({
    connectionString: 'postgresql://postgres.vqkkqkjaywkjtraepqbg:Fff1359746!@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/048_add_raw_markdown_output.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Executing migration SQL...');
    await pool.query(migrationSQL);
    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    console.log('Verifying column was added...');
    const verifyQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'consultation_quality_analysis'
      AND column_name = 'raw_markdown_output';
    `;
    const result = await pool.query(verifyQuery);

    if (result.rows.length > 0) {
      console.log('✅ Column raw_markdown_output verified:');
      console.log('   ', result.rows[0]);
    } else {
      console.log('❌ Column not found!');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
