/**
 * 列出所有在職使用者帳號
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listActiveUsers() {
  console.log('📋 所有在職使用者帳號列表\n');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, roles, role, department')
    .eq('status', 'active')
    .order('first_name');

  if (error) {
    console.error('❌ 查詢失敗:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ 沒有在職使用者');
    return;
  }

  console.log(`找到 ${users.length} 個在職使用者：\n`);
  console.log('姓名'.padEnd(20) + 'Email'.padEnd(35) + '角色');
  console.log('='.repeat(80));

  users.forEach(user => {
    const name = `${user.first_name || '(無名字)'} ${user.last_name || ''}`.padEnd(20);
    const email = (user.email || '').padEnd(35);
    const rolesList = user.roles && user.roles.length > 0
      ? user.roles.join(', ')
      : (user.role || '未設定');

    console.log(`${name}${email}${rolesList}`);
  });

  // 找出所有有 password_hash 的帳號
  console.log('\n\n🔐 可以用密碼登入的帳號：\n');

  const { data: usersWithPassword } = await supabase
    .from('users')
    .select('first_name, last_name, email, password_hash')
    .eq('status', 'active')
    .not('password_hash', 'is', null)
    .order('first_name');

  if (usersWithPassword && usersWithPassword.length > 0) {
    usersWithPassword.forEach(user => {
      console.log(`   ✅ ${user.first_name || '(無名字)'} ${user.last_name || ''} - ${user.email}`);
    });
  } else {
    console.log('   ⚠️  沒有任何帳號可以用密碼登入');
  }
}

listActiveUsers().catch(console.error);
