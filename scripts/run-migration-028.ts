import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { queryDatabase } from '../server/services/pg-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('\n🚀 Running Migration 028: Student Knowledge System\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '028_create_student_knowledge_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Execute the migration
    console.log('📝 Executing migration SQL...');
    await queryDatabase(migrationSQL);

    console.log('\n✅ Migration 028 completed successfully!\n');
    console.log('Created tables:');
    console.log('  ✓ student_knowledge_base');
    console.log('  ✓ teacher_ai_conversations');
    console.log('\nExtended tables:');
    console.log('  ✓ teaching_quality_analysis (added 4 columns)');
    console.log('\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Error details:', error);
    process.exit(1);
  }
}

runMigration();
