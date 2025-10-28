/**
 * Simple Node.js script to fix teaching quality scores
 * Run with: node scripts/fix-scores-simple.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Manually set your database URL here or use environment variable
const DB_URL = process.env.SUPABASE_SESSION_DB_URL ||
               process.env.SESSION_DB_URL ||
               process.env.DATABASE_URL ||
               'postgresql://postgres.vqkkqkjaywkjtraepqbg:2pE7N7HnKzw4n3TK@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🚀 Running migration 040_fix_teaching_scores.sql...\n');

    const sqlFile = path.join(__dirname, '../supabase/migrations/040_fix_teaching_scores.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    await pool.query(sql);

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
