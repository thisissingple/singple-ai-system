/**
 * 測試47和文軒是否能成功登入
 */

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testLogin(email: string, password: string) {
  console.log(`\n🔐 測試登入：${email}`);
  console.log(`   密碼：${password}`);

  // 查詢使用者
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, password_hash, status, must_change_password')
    .eq('email', email)
    .single();

  if (error || !user) {
    console.log(`   ❌ 找不到此帳號`);
    return false;
  }

  console.log(`   ✅ 找到帳號：${user.first_name} ${user.last_name || ''}`);

  // 檢查密碼雜湊是否存在
  if (!user.password_hash) {
    console.log(`   ❌ 此帳號沒有設定密碼`);
    return false;
  }

  console.log(`   ✅ 密碼雜湊已設定`);

  // 驗證密碼
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    console.log(`   ❌ 密碼錯誤`);
    return false;
  }

  console.log(`   ✅ 密碼驗證成功`);

  // 檢查帳號狀態
  if (user.status !== 'active') {
    console.log(`   ⚠️  帳號狀態：${user.status}（非 active）`);
  } else {
    console.log(`   ✅ 帳號狀態：active`);
  }

  // 檢查是否需要修改密碼
  if (user.must_change_password) {
    console.log(`   ⚠️  需要修改密碼`);
  } else {
    console.log(`   ✅ 不需要強制修改密碼`);
  }

  console.log(`   ✅ 登入測試通過！`);
  return true;
}

async function runTests() {
  console.log('=================================');
  console.log('  測試47和文軒的登入功能');
  console.log('=================================');

  const results = [];

  // 測試47
  const result1 = await testLogin('mama725619@gmail.com', 'mama725619@gmail.com');
  results.push({ name: '47', email: 'mama725619@gmail.com', success: result1 });

  // 測試文軒
  const result2 = await testLogin('xk4xk4563022@gmail.com', 'xk4xk4563022@gmail.com');
  results.push({ name: '文軒', email: 'xk4xk4563022@gmail.com', success: result2 });

  // 總結
  console.log('\n=================================');
  console.log('  測試結果總結');
  console.log('=================================');

  results.forEach(r => {
    const icon = r.success ? '✅' : '❌';
    console.log(`${icon} ${r.name} (${r.email}): ${r.success ? '可以登入' : '無法登入'}`);
  });

  const allPassed = results.every(r => r.success);
  if (allPassed) {
    console.log('\n🎉 所有測試通過！兩位都可以順利登入。');
  } else {
    console.log('\n⚠️  部分測試失敗，請檢查上方錯誤訊息。');
  }
}

runTests().catch(console.error);
