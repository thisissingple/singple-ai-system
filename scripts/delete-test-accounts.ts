/**
 * 刪除測試帳號 (admin 和 test)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deleteTestAccounts() {
  console.log('🗑️  開始刪除測試帳號...\n');

  try {
    // 1. 找出要刪除的帳號
    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .or('email.eq.admin@company.com,email.eq.admin@example.com,first_name.eq.test');

    if (queryError) throw queryError;

    if (!users || users.length === 0) {
      console.log('✅ 沒有找到需要刪除的測試帳號');
      return;
    }

    console.log('📋 找到以下測試帳號：');
    users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name || user.email} (${user.email || 'no email'})`);
    });
    console.log('');

    // 2. 刪除相關的 employee_profiles
    for (const user of users) {
      const { error: profileError } = await supabase
        .from('employee_profiles')
        .delete()
        .eq('user_id', user.id);

      if (profileError) {
        console.log(`   ⚠️  刪除 ${user.first_name || user.email} 的 employee_profile 失敗: ${profileError.message}`);
      } else {
        console.log(`   ✅ 已刪除 ${user.first_name || user.email} 的 employee_profile`);
      }
    }

    console.log('');

    // 3. 刪除 users 記錄
    for (const user of users) {
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);

      if (deleteError) {
        console.error(`   ❌ 刪除 ${user.first_name || user.email} 失敗: ${deleteError.message}`);
      } else {
        console.log(`   ✅ 已刪除使用者: ${user.first_name || user.email}`);
      }
    }

    console.log('\n🎉 測試帳號刪除完成！');

    // 4. 顯示剩餘員工數量
    const { data: remainingUsers, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    if (!countError) {
      console.log(`\n📊 剩餘員工數: ${remainingUsers || 0}`);
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

deleteTestAccounts();
