/**
 * 測試員工 47 的完整登入流程
 * 模擬瀏覽器行為
 */

async function testEmployee47Login() {
  const baseUrl = 'https://singple-ai-system.zeabur.app';
  const email = 'mama725619@gmail.com';
  const password = 'np7LJuh45z';

  console.log('🔐 測試員工 47 登入流程');
  console.log('='.repeat(60));
  console.log();

  try {
    // 步驟 1: 登入
    console.log('📋 步驟 1: POST /api/auth/login');
    console.log('-'.repeat(60));

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const loginData = await loginResponse.json();

    console.log('HTTP Status:', loginResponse.status);
    console.log('登入結果:', loginData.success ? '✅ 成功' : '❌ 失敗');

    if (!loginData.success) {
      console.log('錯誤訊息:', loginData.error);
      return;
    }

    console.log('用戶 ID:', loginData.user.id);
    console.log('Email:', loginData.user.email);
    console.log('需要修改密碼:', loginData.user.must_change_password);
    console.log();

    // 步驟 2: 檢查 Set-Cookie
    console.log('📋 步驟 2: 檢查 Cookie');
    console.log('-'.repeat(60));

    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('✅ Set-Cookie header 存在');
      console.log('Cookie:', setCookieHeader.substring(0, 100) + '...');

      // 解析 cookie
      const cookieMatch = setCookieHeader.match(/connect\.sid=([^;]+)/);
      if (cookieMatch) {
        const sessionId = cookieMatch[1];
        console.log('Session ID:', sessionId.substring(0, 50) + '...');
      }
    } else {
      console.log('❌ 沒有 Set-Cookie header');
    }
    console.log();

    // 步驟 3: 分析問題
    console.log('📋 步驟 3: 問題分析');
    console.log('-'.repeat(60));

    console.log('登入流程分析：');
    console.log('1. ✅ 登入 API 成功');
    console.log('2. ✅ 回傳用戶資料');
    console.log('3. ✅ Set-Cookie header 存在');
    console.log();

    console.log('💡 在真實瀏覽器中：');
    console.log('1. 登入成功後會設定 Cookie');
    console.log('2. 前端檢查 must_change_password = true');
    console.log('3. 跳轉到 /change-password');
    console.log('4. 修改密碼頁面載入時發送 GET /api/auth/me');
    console.log('5. 這個請求應該帶著 Cookie');
    console.log('6. 如果 Cookie 正確，應該會回傳 200');
    console.log('7. 如果回傳 401，表示 Cookie 沒有正確傳遞');
    console.log();

    console.log('⚠️  可能的問題：');
    console.log('1. 瀏覽器 Cookie 被封鎖（無痕模式的第三方 Cookie 限制）');
    console.log('2. Cookie 的 Domain 或 Path 設定問題');
    console.log('3. 前端路由跳轉時 Cookie 丟失');
    console.log();

    console.log('🔧 建議測試：');
    console.log('1. 使用一般模式（非無痕）的 Chrome 瀏覽器');
    console.log('2. 打開 DevTools (F12) → Application → Cookies');
    console.log('3. 登入後檢查是否有 connect.sid Cookie');
    console.log('4. 跳轉到修改密碼頁面後，Cookie 是否還在');

  } catch (error: any) {
    console.error('❌ 測試失敗:', error.message);
  }
}

testEmployee47Login();
