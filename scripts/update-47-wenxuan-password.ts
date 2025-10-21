/**
 * 更新47和文軒的帳號密碼
 * 帳號：他們的 email
 * 密碼：他們的 email
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePasswords() {
  console.log('🔍 查詢47和文軒的帳號...\n');

  // 查詢47和文軒
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name')
    .or('first_name.eq.47,first_name.eq.文軒,first_name.ilike.%47%,first_name.ilike.%文軒%');

  if (error) {
    console.error('❌ 查詢失敗:', error);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('❌ 找不到47或文軒的帳號');
    console.log('\n📋 顯示所有使用者：');

    const { data: allUsers } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .order('first_name');

    if (allUsers) {
      allUsers.forEach(u => {
        console.log(`  - ${u.first_name || '(無名字)'} ${u.last_name || ''} (${u.email})`);
      });
    }
    process.exit(1);
  }

  console.log(`✅ 找到 ${users.length} 個使用者：\n`);
  users.forEach(u => {
    console.log(`  - ${u.first_name} ${u.last_name || ''} (${u.email})`);
  });

  console.log('\n🔐 開始更新密碼...\n');

  for (const user of users) {
    const password = user.email; // 密碼設為 email
    const passwordHash = await bcrypt.hash(password, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        must_change_password: false, // 不強制修改密碼
        last_password_change_at: new Date().toISOString(),
        auth_methods: ['password'],
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error(`❌ 更新 ${user.first_name} 的密碼失敗:`, updateError);
    } else {
      console.log(`✅ ${user.first_name} ${user.last_name || ''}`);
      console.log(`   帳號: ${user.email}`);
      console.log(`   密碼: ${password}`);
      console.log('');
    }
  }

  console.log('✅ 密碼更新完成！');
}

updatePasswords().catch(console.error);
