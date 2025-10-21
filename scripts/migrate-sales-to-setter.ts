/**
 * Migrate all 'sales' identity types to 'setter'
 * 將所有 sales 角色身份改成 setter
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateSalesToSetter() {
  console.log('🔄 Starting migration: sales → setter...\n');

  try {
    // 1. 查詢所有 sales 身份
    const { data: salesIdentities, error: fetchError } = await supabase
      .from('business_identities')
      .select('*')
      .eq('identity_type', 'sales');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📊 Found ${salesIdentities?.length || 0} sales identities\n`);

    if (!salesIdentities || salesIdentities.length === 0) {
      console.log('✅ No sales identities to migrate');
      return;
    }

    // 顯示將要更新的資料
    console.log('將要更新的身份：');
    salesIdentities.forEach((identity, index) => {
      console.log(`  ${index + 1}. ${identity.identity_code} - ${identity.display_name} (User ID: ${identity.user_id.substring(0, 8)}...)`);
    });
    console.log('');

    // 2. 更新所有 sales → setter
    const { data: updatedData, error: updateError } = await supabase
      .from('business_identities')
      .update({ identity_type: 'setter' })
      .eq('identity_type', 'sales')
      .select();

    if (updateError) {
      throw updateError;
    }

    console.log(`✅ Successfully updated ${updatedData?.length || 0} identities from 'sales' to 'setter'\n`);

    // 3. 驗證結果
    const { data: remainingSales, error: verifyError } = await supabase
      .from('business_identities')
      .select('id')
      .eq('identity_type', 'sales');

    if (verifyError) {
      throw verifyError;
    }

    if (remainingSales && remainingSales.length > 0) {
      console.warn(`⚠️  Warning: Still found ${remainingSales.length} sales identities`);
    } else {
      console.log('✅ Verification passed: No sales identities remaining');
    }

    // 4. 顯示 setter 數量
    const { data: setterIdentities, error: countError } = await supabase
      .from('business_identities')
      .select('id')
      .eq('identity_type', 'setter');

    if (countError) {
      throw countError;
    }

    console.log(`📊 Total setter identities now: ${setterIdentities?.length || 0}`);
    console.log('\n✨ Migration completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateSalesToSetter();
