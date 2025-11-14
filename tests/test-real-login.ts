/**
 * 模擬真實的 HTTP 登入請求
 * 測試 Session Cookie 是否正常工作
 */

async function testRealLogin() {
  const baseUrl = 'https://singple-ai-system.zeabur.app';
  const email = 'mama725619@gmail.com';
  const password = 'np7LJuh45z';

  console.log('🔐 測試真實登入流程');
  console.log('='.repeat(60));
  console.log('目標伺服器:', baseUrl);
  console.log('Email:', email);
  console.log();

  try {
    // 步驟 1: 嘗試登入
    console.log('📋 步驟 1: POST /api/auth/login');
    console.log('-'.repeat(60));

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // 重要：允許設定 cookie
      body: JSON.stringify({ email, password }),
    });

    console.log('HTTP Status:', loginResponse.status);
    console.log('HTTP Status Text:', loginResponse.statusText);

    // 檢查 Set-Cookie header
    const setCookie = loginResponse.headers.get('set-cookie');
    console.log('Set-Cookie:', setCookie || '(無)');

    const loginData = await loginResponse.json();
    console.log('Response:', JSON.stringify(loginData, null, 2));
    console.log();

    if (!loginData.success) {
      console.log('❌ 登入失敗:', loginData.error);
      return;
    }

    console.log('✅ 登入成功');
    console.log('   User ID:', loginData.user.id);
    console.log('   Email:', loginData.user.email);
    console.log('   需要修改密碼:', loginData.user.must_change_password);
    console.log();

    // 步驟 2: 測試 Session 是否有效
    console.log('📋 步驟 2: GET /api/auth/me (驗證 Session)');
    console.log('-'.repeat(60));

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    console.log('HTTP Status:', meResponse.status);

    if (meResponse.status === 401) {
      console.log('❌ Session 無效！');
      console.log('   這表示登入成功但 Cookie 沒有被保存');
      console.log();
      console.log('💡 可能原因:');
      console.log('   1. Cookie 的 secure 設定問題');
      console.log('   2. Cookie 的 sameSite 設定問題');
      console.log('   3. 瀏覽器封鎖第三方 Cookie');
      console.log('   4. CORS 設定問題');
      return;
    }

    const meData = await meResponse.json();
    console.log('Response:', JSON.stringify(meData, null, 2));

    if (meData.success) {
      console.log('✅ Session 有效！');
      console.log('   使用者:', meData.user.email);
    } else {
      console.log('❌ Session 驗證失敗');
    }
    console.log();

    // 步驟 3: 檢查權限
    console.log('📋 步驟 3: GET /api/permissions/my-permissions');
    console.log('-'.repeat(60));

    const permResponse = await fetch(`${baseUrl}/api/permissions/my-permissions`, {
      method: 'GET',
      credentials: 'include',
    });

    console.log('HTTP Status:', permResponse.status);

    const permData = await permResponse.json();
    console.log('Response:', JSON.stringify(permData, null, 2));

    if (permData.success && permData.data) {
      console.log(`✅ 找到 ${permData.data.length} 個權限模組`);
      permData.data.forEach((perm: any, idx: number) => {
        console.log(`   ${idx + 1}. ${perm.module_name} (${perm.module_id})`);
      });
    }

    console.log();
    console.log('='.repeat(60));
    console.log('測試完成');

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
    console.error('詳細錯誤:', error);
  }
}

testRealLogin();
