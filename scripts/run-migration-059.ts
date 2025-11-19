/**
 * Run Migration 059: Create Consultant AI Conversations Table
 */

import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { createPool } from '../server/services/pg-client.ts';

// Load environment variables
dotenv.config({ override: true });

async function runMigration() {
  const pool = createPool('session');

  try {
    console.log('📋 Running Migration 059: Create Consultant AI Conversations Table');

    // Read the migration file
    const migrationSQL = readFileSync('supabase/migrations/059_create_consultant_ai_conversations.sql', 'utf-8');

    // Execute the migration
    await pool.query(migrationSQL);

    console.log('✅ Migration 059 completed successfully!');
    console.log('');
    console.log('Created table: consultant_ai_conversations');
    console.log('Created indexes:');
    console.log('  - idx_consultant_ai_conversations_consultant_id');
    console.log('  - idx_consultant_ai_conversations_student_email');
    console.log('  - idx_consultant_ai_conversations_eod_id');
    console.log('  - idx_consultant_ai_conversations_student_kb_id');
    console.log('  - idx_consultant_ai_conversations_created_at');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
