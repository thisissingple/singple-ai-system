/**
 * 為所有現有員工建立員工編號
 *
 * 此腳本會：
 * 1. 為所有沒有 employee_profiles 的使用者建立記錄
 * 2. 資料庫 Trigger 會自動產生 E001, E002, E003... 編號
 * 3. 按照帳號建立時間順序分配編號
 * 4. 不會影響現有的角色身份編號 (T001, C001, S001...)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數：SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function createEmployeeNumbers() {
  console.log('🚀 開始為員工建立編號...\n');

  try {
    // 1. 查詢所有使用者
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, created_at')
      .order('created_at', { ascending: true });

    if (usersError) throw usersError;

    console.log(`📋 找到 ${users?.length || 0} 位使用者\n`);

    // 2. 查詢現有的 employee_profiles
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('employee_profiles')
      .select('user_id, employee_number');

    if (profilesError) throw profilesError;

    const existingUserIds = new Set(existingProfiles?.map(p => p.user_id) || []);
    console.log(`✅ 已有 ${existingUserIds.size} 位員工有 employee_profiles\n`);

    // 3. 找出需要建立 profile 的使用者
    const usersNeedingProfiles = users?.filter(u => !existingUserIds.has(u.id)) || [];

    if (usersNeedingProfiles.length === 0) {
      console.log('✅ 所有員工都已有員工編號，無需建立！');
      return;
    }

    console.log(`📝 需要建立 employee_profiles 的員工：`);
    usersNeedingProfiles.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.first_name || user.email} (${new Date(user.created_at).toLocaleDateString()})`);
    });
    console.log('');

    // 4. 為每位使用者建立 employee_profile
    console.log('⏳ 開始建立 employee_profiles...\n');

    for (const user of usersNeedingProfiles) {
      const { data, error } = await supabase
        .from('employee_profiles')
        .insert({
          user_id: user.id,
          hire_date: new Date(user.created_at).toISOString().split('T')[0],
          employment_type: 'full_time',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('employee_number')
        .single();

      if (error) {
        console.error(`   ❌ 失敗: ${user.first_name || user.email} - ${error.message}`);
      } else {
        console.log(`   ✅ ${user.first_name || user.email} → ${data.employee_number}`);
      }
    }

    console.log('\n🎉 完成！\n');

    // 5. 顯示最終結果
    const { data: allProfiles, error: finalError } = await supabase
      .from('employee_profiles')
      .select(`
        employee_number,
        user_id,
        users!inner(first_name, email)
      `)
      .order('employee_number', { ascending: true });

    if (finalError) throw finalError;

    console.log('📊 最終員工編號列表：\n');
    console.log('編號    姓名');
    console.log('─────────────────────');
    allProfiles?.forEach((profile: any) => {
      const name = profile.users?.first_name || profile.users?.email || 'Unknown';
      console.log(`${profile.employee_number}   ${name}`);
    });

    console.log('\n✅ 所有員工編號建立完成！');
    console.log('ℹ️  注意：現有的角色身份編號 (T001, C001, S001...) 完全沒有被更動');

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

// 執行
createEmployeeNumbers();
