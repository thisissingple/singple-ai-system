/**
 * 檢查47帳號的詳細資訊
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAccountDetails() {
  console.log('🔍 檢查 mama725619@gmail.com 的帳號資訊\n');

  // 查詢使用者完整資訊
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'mama725619@gmail.com')
    .single();

  if (error || !user) {
    console.log('❌ 找不到此帳號');
    return;
  }

  console.log('📋 使用者基本資訊：');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   名字: ${user.first_name} ${user.last_name || ''}`);
  console.log(`   部門: ${user.department || '未設定'}`);
  console.log(`   狀態: ${user.status}`);
  console.log(`   角色 (role): ${user.role || '未設定'}`);
  console.log(`   角色列表 (roles): ${JSON.stringify(user.roles)}`);
  console.log(`   建立時間: ${user.created_at}`);
  console.log(`   更新時間: ${user.updated_at}`);

  // 檢查是否有 admin 角色
  const isAdmin = user.roles?.includes('admin');
  console.log(`\n🔑 權限檢查：`);
  console.log(`   是否為管理員: ${isAdmin ? '✅ 是' : '❌ 否'}`);

  if (isAdmin) {
    console.log(`   ⚠️  此帳號有 admin 權限，所以會顯示管理員介面`);
  }

  // 查詢員工檔案
  const { data: profile } = await supabase
    .from('employee_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log(`\n👤 員工檔案：`);
  if (profile) {
    console.log(`   員工編號: ${profile.employee_number || '未設定'}`);
    console.log(`   到職日: ${profile.hire_date || '未設定'}`);
    console.log(`   聘用類型: ${profile.employment_type || '未設定'}`);
  } else {
    console.log(`   ⚠️  尚未建立員工檔案`);
  }

  // 查詢業務身份
  const { data: identities } = await supabase
    .from('business_identities')
    .select('*')
    .eq('user_id', user.id);

  console.log(`\n🎭 業務身份：`);
  if (identities && identities.length > 0) {
    identities.forEach(identity => {
      const activeStatus = identity.is_active ? '✅ 啟用' : '❌ 停用';
      console.log(`   - ${identity.identity_type} (${identity.identity_code}): ${activeStatus}`);
      console.log(`     顯示名稱: ${identity.display_name || '未設定'}`);
      console.log(`     生效期間: ${identity.effective_from} ~ ${identity.effective_to || '現在'}`);
    });
  } else {
    console.log(`   ⚠️  尚未設定業務身份`);
  }

  // 建議
  console.log(`\n💡 建議修正：`);
  if (isAdmin) {
    console.log(`   1. 如果47不應該是管理員，需要移除 'admin' 從 roles 陣列`);
    console.log(`   2. 一般員工應該只有 'user' 角色`);
  }
  if (!profile) {
    console.log(`   3. 建議建立員工檔案（employee_profiles）`);
  }
  if (!identities || identities.length === 0) {
    console.log(`   4. 建議新增業務身份（例如：teacher, consultant 等）`);
  }
}

checkAccountDetails().catch(console.error);
