/**
 * Facebook Webhook 測試腳本
 * 用途：本地測試 webhook 接收功能
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5000/api/webhooks/facebook-leads';

// 模擬 Facebook Lead Ads Webhook 資料
const mockFacebookWebhookData = {
  object: 'page',
  entry: [
    {
      id: '123456789',
      time: Date.now(),
      changes: [
        {
          field: 'leadgen',
          value: {
            leadgen_id: `test_${Date.now()}`,  // 使用時間戳確保唯一
            ad_id: 'ad_test_001',
            ad_name: '體驗課推廣廣告 - 測試',
            form_id: 'form_test_001',
            form_name: '免費體驗課報名表',
            campaign_id: 'campaign_test_001',
            campaign_name: 'Q4 體驗課推廣',
            created_time: new Date().toISOString(),
            field_data: [
              { name: '姓名', values: ['王小明'] },
              { name: '電話', values: ['0912345678'] },
              { name: 'Email', values: ['test@example.com'] },
            ],
          },
        },
      ],
    },
  ],
};

async function testWebhook() {
  console.log('🚀 開始測試 Facebook Webhook...\n');
  console.log('📍 Webhook URL:', WEBHOOK_URL);
  console.log('📦 測試資料:', JSON.stringify(mockFacebookWebhookData, null, 2));
  console.log('\n⏳ 送出請求...\n');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mockFacebookWebhookData),
    });

    const data = await response.json();

    console.log('📥 回應狀態:', response.status);
    console.log('📥 回應內容:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ 測試成功！');
      console.log(`✅ 成功接收 ${data.count} 筆名單`);
    } else {
      console.log('\n❌ 測試失敗！');
      console.log('❌ 錯誤:', data.error || '未知錯誤');
    }
  } catch (error: any) {
    console.error('\n❌ 請求失敗:', error.message);
    console.error('💡 提示：確認伺服器是否運行在', WEBHOOK_URL);
  }
}

// 測試 webhook 驗證端點
async function testWebhookVerification() {
  const VERIFY_TOKEN = 'singple_webhook_2024';
  const verifyUrl = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test_challenge_123`;

  console.log('\n🔍 測試 Webhook 驗證...');
  console.log('📍 驗證 URL:', verifyUrl);

  try {
    const response = await fetch(verifyUrl);
    const text = await response.text();

    console.log('📥 回應狀態:', response.status);
    console.log('📥 回應內容:', text);

    if (response.ok && text === 'test_challenge_123') {
      console.log('✅ Webhook 驗證成功！');
    } else {
      console.log('❌ Webhook 驗證失敗！');
    }
  } catch (error: any) {
    console.error('❌ 驗證請求失敗:', error.message);
  }
}

// 執行測試
async function runTests() {
  console.log('====================================');
  console.log('  Facebook Webhook 測試工具');
  console.log('====================================\n');

  // 測試 1: Webhook 驗證
  await testWebhookVerification();

  console.log('\n------------------------------------\n');

  // 測試 2: 名單接收
  await testWebhook();

  console.log('\n====================================');
  console.log('  測試完成');
  console.log('====================================\n');
}

runTests();
