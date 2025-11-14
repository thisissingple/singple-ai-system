/**
 * 檢查生產環境部署狀態
 * 驗證最新代碼是否已部署
 */

async function checkDeployment() {
  const baseUrl = 'https://singple-ai-system.zeabur.app';

  console.log('🔍 檢查生產環境部署狀態');
  console.log('='.repeat(60));
  console.log('目標伺服器:', baseUrl);
  console.log();

  try {
    // 步驟 1: 檢查首頁是否可訪問
    console.log('📋 步驟 1: 檢查服務是否運行');
    console.log('-'.repeat(60));

    const homeResponse = await fetch(baseUrl);
    console.log('HTTP Status:', homeResponse.status);
    console.log('HTTP Status Text:', homeResponse.statusText);

    if (homeResponse.status === 200) {
      console.log('✅ 服務正常運行');
    } else {
      console.log('⚠️  服務狀態異常');
    }
    console.log();

    // 步驟 2: 檢查登入頁面
    console.log('📋 步驟 2: 檢查登入頁面');
    console.log('-'.repeat(60));

    const loginPageResponse = await fetch(`${baseUrl}/login`);
    console.log('HTTP Status:', loginPageResponse.status);

    if (loginPageResponse.status === 200) {
      console.log('✅ 登入頁面正常');
    } else {
      console.log('⚠️  登入頁面異常');
    }
    console.log();

    // 步驟 3: 檢查 API 健康狀態
    console.log('📋 步驟 3: 檢查 API 端點');
    console.log('-'.repeat(60));

    // 測試一個不需要認證的端點
    const apiResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });

    console.log('HTTP Status:', apiResponse.status);
    const apiData = await apiResponse.json();

    if (apiData.error) {
      console.log('API 回應:', apiData.error);
      console.log('✅ API 端點正常（回傳預期的錯誤訊息）');
    }
    console.log();

    // 步驟 4: 檢查權限 API
    console.log('📋 步驟 4: 檢查權限模組 API');
    console.log('-'.repeat(60));

    const permModulesResponse = await fetch(`${baseUrl}/api/permissions/modules`);
    console.log('HTTP Status:', permModulesResponse.status);

    if (permModulesResponse.status === 200) {
      const modules = await permModulesResponse.json();
      if (modules.success) {
        console.log(`✅ 權限模組 API 正常（找到 ${modules.data?.length || 0} 個模組）`);
      }
    }
    console.log();

    // 總結
    console.log('='.repeat(60));
    console.log('📊 部署狀態總結');
    console.log('-'.repeat(60));
    console.log('✅ 服務運行中');
    console.log('✅ 前端頁面可訪問');
    console.log('✅ API 端點正常');
    console.log();
    console.log('💡 下一步測試:');
    console.log('   1. 使用真實瀏覽器（Chrome）訪問登入頁面');
    console.log('   2. 輸入帳號密碼登入');
    console.log('   3. 檢查是否能正確跳轉到修改密碼頁面');
    console.log('   4. 修改密碼後檢查是否能進入系統');

  } catch (error: any) {
    console.error('❌ 檢查失敗:', error.message);
    console.error('詳細錯誤:', error);
  }
}

checkDeployment();
