/**
 * Run Migration 042: Know-it-all System
 *
 * Purpose: Execute the Know-it-all database migration
 * Usage: npx tsx scripts/run-migration-042.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function runMigration() {
  console.log('🚀 Starting Migration 042: Know-it-all System\n');

  // Create database connection
  const dbUrl = process.env.SUPABASE_SESSION_DB_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error('❌ Error: SUPABASE_DB_URL or SUPABASE_SESSION_DB_URL not found in environment');
    console.log('💡 Please set the database URL in .env file');
    process.exit(1);
  }

  console.log('📡 Connecting to database...');
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully\n');

    // Read migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/042_create_know_it_all_system.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);

    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log(`✅ Migration file loaded (${migrationSQL.length} characters)\n`);

    // Execute migration
    console.log('⚙️  Executing migration...\n');
    const result = await pool.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify tables created
    console.log('🔍 Verifying tables...');
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE 'know%'
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`✅ Found ${tablesResult.rows.length} Know-it-all tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Warning: No Know-it-all tables found');
    }

    // Check pgvector extension
    console.log('\n🔍 Checking pgvector extension...');
    const extensionResult = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'vector'
    `);

    if (extensionResult.rows.length > 0) {
      console.log('✅ pgvector extension is enabled');
    } else {
      console.log('⚠️  Warning: pgvector extension not found');
      console.log('💡 You may need to enable it manually in Supabase dashboard');
    }

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename LIKE 'know%'
      ORDER BY indexname
    `);

    if (indexResult.rows.length > 0) {
      console.log(`✅ Found ${indexResult.rows.length} indexes:`);
      indexResult.rows.forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
    }

    // Check functions
    console.log('\n🔍 Checking functions...');
    const functionResult = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name LIKE '%knowledge%'
      ORDER BY routine_name
    `);

    if (functionResult.rows.length > 0) {
      console.log(`✅ Found ${functionResult.rows.length} functions:`);
      functionResult.rows.forEach(row => {
        console.log(`   - ${row.routine_name}`);
      });
    }

    console.log('\n🎉 Migration 042 completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   - Tables: ${tablesResult.rows.length}`);
    console.log(`   - Indexes: ${indexResult.rows.length}`);
    console.log(`   - Functions: ${functionResult.rows.length}`);
    console.log('   - pgvector: ' + (extensionResult.rows.length > 0 ? 'Enabled' : 'Not found'));

  } catch (error: any) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);

    if (error.message.includes('already exists')) {
      console.log('\n💡 Some objects already exist. This might be okay if migration was partially run before.');
      console.log('   You can drop the tables and try again, or continue if everything looks correct.');
    }

    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n📡 Database connection closed');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
