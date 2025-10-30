/**
 * Run Migration 043: Create User Permission Management System
 *
 * This script runs the migration to create permission_modules and user_permissions tables.
 * It uses direct PostgreSQL connection via pg module.
 */

// Load environment variables
import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import { createPool } from '../server/services/pg-client';
import * as fs from 'fs';

async function runMigration() {
  console.log('='.repeat(60));
  console.log('Migration 043: Create User Permission Management System');
  console.log('='.repeat(60));
  console.log();

  const pool = createPool();

  try {
    // Read migration SQL file
    const migrationPath = path.join(__dirname, '../supabase/migrations/043_create_user_permissions.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded:', migrationPath);
    console.log();

    // Execute migration
    console.log('⚙️  Executing migration SQL...');
    await pool.query(migrationSQL);

    console.log('✅ Migration executed successfully!');
    console.log();

    // Verify tables were created
    console.log('🔍 Verifying tables...');

    const tablesQuery = `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('permission_modules', 'user_permissions')
      ORDER BY table_name;
    `;
    const tablesResult = await pool.query(tablesQuery);

    if (tablesResult.rows.length === 2) {
      console.log('✅ Tables verified:');
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.error('⚠️  Warning: Expected 2 tables, found', tablesResult.rows.length);
    }

    console.log();

    // Check how many modules were inserted
    const modulesCountQuery = 'SELECT COUNT(*) as count FROM permission_modules';
    const modulesResult = await pool.query(modulesCountQuery);
    const modulesCount = modulesResult.rows[0]?.count || 0;

    console.log(`✅ Inserted ${modulesCount} permission modules`);
    console.log();

    // Display modules by category
    const modulesByCategoryQuery = `
      SELECT module_category, COUNT(*) as count
      FROM permission_modules
      WHERE is_active = true
      GROUP BY module_category
      ORDER BY module_category;
    `;
    const categoryResult = await pool.query(modulesByCategoryQuery);

    console.log('📊 Modules by category:');
    categoryResult.rows.forEach((row) => {
      console.log(`   - ${row.module_category}: ${row.count} modules`);
    });

    console.log();
    console.log('='.repeat(60));
    console.log('✅ Migration 043 completed successfully!');
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error();
    console.error('='.repeat(60));
    console.error('❌ Migration failed!');
    console.error('='.repeat(60));
    console.error();
    console.error('Error details:');
    console.error(error);

    // Check if tables already exist
    if (error.code === '42P07') {
      console.error();
      console.error('ℹ️  Tables already exist. This migration may have been run before.');
      console.error('   If you need to re-run this migration, you must first drop the tables:');
      console.error('   DROP TABLE user_permissions CASCADE;');
      console.error('   DROP TABLE permission_modules CASCADE;');
    }

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
