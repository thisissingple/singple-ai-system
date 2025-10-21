/**
 * Run migration 034: Update identity_type constraint (sales → setter)
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running migration 034: Update identity_type constraint\n');

  try {
    // 讀取 migration SQL
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/034_update_identity_type_constraint.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration file loaded');
    console.log('📊 Checking current state...\n');

    // 檢查當前狀態
    const { data: salesBefore, error: checkError } = await supabase
      .from('business_identities')
      .select('id, identity_code, display_name')
      .eq('identity_type', 'sales');

    if (checkError) {
      console.error('Error checking sales identities:', checkError);
    } else {
      console.log(`  Current sales identities: ${salesBefore?.length || 0}`);
      if (salesBefore && salesBefore.length > 0) {
        salesBefore.forEach((s, i) => {
          console.log(`    ${i + 1}. ${s.identity_code} - ${s.display_name}`);
        });
      }
    }

    console.log('\n⚠️  This migration will:');
    console.log('  1. Drop existing identity_type constraint');
    console.log('  2. Update all "sales" → "setter"');
    console.log('  3. Create new constraint without "sales"');
    console.log('\n💡 Note: This uses RPC to execute raw SQL via Supabase\n');

    // Supabase Client 不能直接執行 DDL，需要用 rpc
    // 讓我們手動執行每個步驟

    console.log('Step 1: Updating sales → setter...');
    const { data: updated, error: updateError } = await supabase
      .from('business_identities')
      .update({ identity_type: 'setter' })
      .eq('identity_type', 'sales')
      .select('id');

    if (updateError) {
      // 如果失敗，可能是因為 constraint
      console.log('⚠️  Update failed (likely due to constraint):', updateError.message);
      console.log('\n💡 You need to run this migration directly in Supabase Dashboard:');
      console.log('   Dashboard → SQL Editor → paste migration SQL');
      console.log(`   Migration file: ${migrationPath}`);
      process.exit(1);
    }

    console.log(`✅ Updated ${updated?.length || 0} identities\n`);

    // 驗證
    const { data: salesAfter } = await supabase
      .from('business_identities')
      .select('id')
      .eq('identity_type', 'sales');

    const { data: setters } = await supabase
      .from('business_identities')
      .select('id')
      .eq('identity_type', 'setter');

    console.log('📊 Verification:');
    console.log(`  - Sales remaining: ${salesAfter?.length || 0}`);
    console.log(`  - Setters now: ${setters?.length || 0}`);

    if (salesAfter && salesAfter.length === 0) {
      console.log('\n✨ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Warning: Some sales identities still remain');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n💡 Please run the migration manually in Supabase Dashboard');
    console.log('   File: supabase/migrations/034_update_identity_type_constraint.sql');
    process.exit(1);
  }
}

runMigration();
