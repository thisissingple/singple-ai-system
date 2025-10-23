/**
 * GoHighLevel Webhook 測試腳本
 * 測試 webhook 接收與資料儲存功能
 */

import fetch from 'node-fetch';

// 測試資料（模擬 GoHighLevel webhook payload）
const testContact = {
  id: 'test-contact-123456',
  contactId: 'test-contact-123456',
  name: '測試聯絡人',
  firstName: '測試',
  lastName: '聯絡人',
  email: 'test@example.com',
  phone: '+886912345678',
  tags: ['潛在客戶', '體驗課', '高優先'],
  source: 'Facebook 廣告',
  locationId: 'loc-123',
  companyName: '簡單歌唱教室',
  address: '台北市信義區信義路五段',
  city: '台北市',
  state: '台灣',
  postalCode: '110',
  country: 'Taiwan',
  customFields: {
    interest: '歌唱課程',
    budget: '5000-10000',
  },
};

async function testWebhook() {
  console.log('🧪 開始測試 GoHighLevel Webhook\n');

  try {
    // 測試 1: 發送 webhook 資料
    console.log('📤 測試 1: 發送 webhook 資料...');
    const webhookResponse = await fetch('http://localhost:5000/api/webhooks/gohighlevel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testContact),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook 請求失敗: ${webhookResponse.status}`);
    }

    const webhookResult = await webhookResponse.json();
    console.log('✅ Webhook 接收成功:', webhookResult);
    console.log('');

    // 等待 1 秒確保資料已儲存
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 測試 2: 查詢統計資料
    console.log('📊 測試 2: 查詢統計資料...');
    const statsResponse = await fetch('http://localhost:5000/api/gohighlevel/stats', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 注意：實際環境需要 session cookie
      },
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('✅ 統計資料:', JSON.stringify(stats, null, 2));
    } else {
      console.log('⚠️  統計資料查詢需要登入（預期行為）');
    }
    console.log('');

    // 測試 3: 查詢聯絡人列表
    console.log('📋 測試 3: 查詢聯絡人列表...');
    const contactsResponse = await fetch('http://localhost:5000/api/gohighlevel/contacts?page=1&limit=10', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (contactsResponse.ok) {
      const contacts = await contactsResponse.json();
      console.log('✅ 聯絡人列表:', JSON.stringify(contacts, null, 2));
    } else {
      console.log('⚠️  聯絡人列表查詢需要登入（預期行為）');
    }
    console.log('');

    // 測試 4: 重複發送相同資料（測試更新功能）
    console.log('🔄 測試 4: 重複發送相同資料（測試更新）...');
    const updatePayload = {
      ...testContact,
      name: '測試聯絡人（已更新）',
      phone: '+886987654321',
      tags: ['潛在客戶', '體驗課', '高優先', '已更新'],
    };

    const updateResponse = await fetch('http://localhost:5000/api/webhooks/gohighlevel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!updateResponse.ok) {
      throw new Error(`更新請求失敗: ${updateResponse.status}`);
    }

    const updateResult = await updateResponse.json();
    console.log('✅ 資料更新成功:', updateResult);
    console.log('');

    // 測試 5: 缺少必要欄位（應該失敗）
    console.log('❌ 測試 5: 缺少必要欄位（預期失敗）...');
    const invalidPayload = {
      name: '無效聯絡人',
      email: 'invalid@example.com',
      // 缺少 id/contactId
    };

    const invalidResponse = await fetch('http://localhost:5000/api/webhooks/gohighlevel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidPayload),
    });

    if (!invalidResponse.ok) {
      console.log('✅ 正確拒絕無效資料（預期行為）');
      const errorResult = await invalidResponse.json();
      console.log('   錯誤訊息:', errorResult);
    } else {
      console.log('⚠️  應該拒絕無效資料但沒有');
    }
    console.log('');

    console.log('🎉 所有測試完成！\n');
    console.log('📋 下一步：');
    console.log('   1. 在 Supabase Dashboard 執行 Migration 037');
    console.log('   2. 在 GoHighLevel 設定 webhook URL:');
    console.log('      https://your-domain.com/api/webhooks/gohighlevel');
    console.log('   3. 在前端頁面查看聯絡人資料:');
    console.log('      http://localhost:5000/leads/gohighlevel');
    console.log('');

  } catch (error) {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  }
}

// 執行測試
testWebhook();
