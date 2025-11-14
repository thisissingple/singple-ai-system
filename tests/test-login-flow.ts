import { loginWithPassword } from '../server/services/auth-service';

async function testLoginFlow() {
  console.log('🔐 測試登入流程');
  console.log('================\n');

  const email = 'mama725619@gmail.com';
  const password = 'np7LJuh45z';

  console.log('📧 Email:', email);
  console.log('🔑 密碼:', password);
  console.log();

  try {
    const result = await loginWithPassword(email, password);

    if (result.success) {
      console.log('✅ 登入成功！');
      console.log();
      console.log('👤 使用者資料:');
      console.log('  - ID:', result.user!.id);
      console.log('  - Email:', result.user!.email);
      console.log('  - 姓名:', result.user!.first_name, result.user!.last_name);
      console.log('  - 角色:', result.user!.role);
      console.log('  - 狀態:', result.user!.status);
      console.log('  - 需要修改密碼:', result.user!.must_change_password ? '是 ⚠️' : '否');
      console.log();

      if (result.user!.must_change_password) {
        console.log('📌 登入後流程:');
        console.log('  1. 登入 API 回傳 must_change_password: true');
        console.log('  2. 前端收到後應該跳轉到 /change-password');
        console.log('  3. 使用者設定新密碼');
        console.log('  4. 修改成功後 must_change_password 會被設為 false');
        console.log('  5. 才能正常使用系統');
        console.log();
        console.log('💡 如果員工無法登入，可能的原因:');
        console.log('  - 使用錯誤的密碼');
        console.log('  - 登入後沒有完成修改密碼流程');
        console.log('  - 瀏覽器 Cookie 被封鎖（Safari 隱私模式）');
        console.log('  - 使用舊密碼（已經修改過一次）');
      }
    } else {
      console.log('❌ 登入失敗！');
      console.log('錯誤訊息:', result.error);
      console.log();
      console.log('💡 可能的原因:');
      console.log('  - 密碼錯誤');
      console.log('  - 帳號已鎖定');
      console.log('  - 帳號未啟用');
    }
  } catch (error: any) {
    console.error('💥 測試過程發生錯誤:', error.message);
  }
}

testLoginFlow();
