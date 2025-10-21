/**
 * 重新排列員工編號
 *
 * 新順序：
 * E001 - Orange
 * E002 - 文軒
 * E003 - Elena
 * E004 - 47
 * E005+ - 其他員工（按原順序）
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function reorderEmployeeNumbers() {
  console.log('🔄 開始重新排列員工編號...\n');

  try {
    // 1. 查詢所有使用者
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, email, created_at')
      .order('created_at', { ascending: true });

    if (usersError) throw usersError;

    console.log(`📋 找到 ${users?.length || 0} 位員工\n`);

    // 2. 定義優先順序
    const priorityOrder = ['Orange', '文軒', 'Elena', '47'];

    // 3. 分組員工
    const priorityUsers: any[] = [];
    const otherUsers: any[] = [];

    users?.forEach(user => {
      const name = user.first_name || user.email;
      const priorityIndex = priorityOrder.indexOf(name);

      if (priorityIndex !== -1) {
        priorityUsers[priorityIndex] = user;
      } else {
        otherUsers.push(user);
      }
    });

    // 4. 組合最終順序
    const finalOrder = [...priorityUsers.filter(u => u), ...otherUsers];

    console.log('📝 新的員工編號順序：');
    finalOrder.forEach((user, index) => {
      const empNum = `E${String(index + 1).padStart(3, '0')}`;
      console.log(`   ${empNum} - ${user.first_name || user.email}`);
    });
    console.log('');

    // 5. 刪除所有現有的 employee_profiles
    console.log('⏳ 刪除現有的 employee_profiles...');
    const { error: deleteError } = await supabase
      .from('employee_profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // 刪除所有

    if (deleteError) throw deleteError;
    console.log('✅ 已刪除所有現有記錄\n');

    // 6. 按新順序重新建立
    console.log('⏳ 按新順序建立 employee_profiles...\n');

    for (let i = 0; i < finalOrder.length; i++) {
      const user = finalOrder[i];
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
        console.log(`   ✅ ${data.employee_number} - ${user.first_name || user.email}`);
      }
    }

    console.log('\n🎉 員工編號重新排列完成！\n');

    // 7. 驗證結果
    const { data: verifyProfiles, error: verifyError } = await supabase
      .from('employee_profiles')
      .select(`
        employee_number,
        user_id,
        users!inner(first_name, email)
      `)
      .order('employee_number', { ascending: true });

    if (verifyError) throw verifyError;

    console.log('📊 最終結果：\n');
    console.log('編號    姓名');
    console.log('─────────────────────');
    verifyProfiles?.forEach((profile: any) => {
      const name = profile.users?.first_name || profile.users?.email || 'Unknown';
      console.log(`${profile.employee_number}   ${name}`);
    });

    console.log('\n✅ 完成！');

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
    process.exit(1);
  }
}

reorderEmployeeNumbers();
