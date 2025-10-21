/**
 * 測試47登入後的 API 返回資料
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLoginResponse() {
  console.log('🔍 模擬47登入後的 getUserById 返回資料\n');

  const userId = '0a0be4f3-28cb-40df-9cb6-eeeba351fabe'; // 47的 user_id

  // 模擬 getUserById 函數的查詢
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, role, roles, department, status, must_change_password, profile_image_url')
    .eq('id', userId)
    .single();

  if (error || !user) {
    console.log('❌ 查詢使用者失敗:', error);
    return;
  }

  console.log('📋 使用者資料（從 users 表）：');
  console.log(JSON.stringify(user, null, 2));

  // 查詢業務身份
  const { data: identities } = await supabase
    .from('business_identities')
    .select('identity_type, identity_code, display_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('identity_type')
    .order('identity_code');

  console.log('\n🎭 業務身份：');
  console.log(JSON.stringify(identities, null, 2));

  // 組合最終返回的資料（模擬 getUserById 的返回值）
  const finalUserData = {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role,
    roles: user.roles || [],
    department: user.department,
    status: user.status,
    must_change_password: user.must_change_password || false,
    profile_image_url: user.profile_image_url,
    business_identities: identities || [],
  };

  console.log('\n📦 最終 API 返回資料（/api/auth/me）：');
  console.log(JSON.stringify(finalUserData, null, 2));

  // 檢查前端會怎麼顯示
  console.log('\n🖥️  前端會顯示：');
  console.log(`   姓名: ${finalUserData.first_name || '管理員'} ${finalUserData.last_name || ''}`);
  console.log(`   Email: ${finalUserData.email || 'admin@example.com'}`);
  console.log(`   角色: ${finalUserData.roles?.join(', ') || finalUserData.role || 'admin'}`);

  // 診斷
  console.log('\n🔍 診斷：');
  if (!finalUserData.first_name) {
    console.log('   ⚠️  first_name 是空的，所以會顯示「管理員」');
  } else if (finalUserData.first_name === '47') {
    console.log('   ✅ first_name 是 "47"，應該顯示 "47"');
  }

  if (!finalUserData.roles || finalUserData.roles.length === 0) {
    console.log('   ⚠️  roles 陣列是空的，會回退到 role 欄位');
    console.log(`   → 顯示角色: ${finalUserData.role || 'admin'}`);
  }
}

testLoginResponse().catch(console.error);
