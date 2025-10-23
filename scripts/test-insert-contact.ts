/**
 * 測試腳本：手動插入 GoHighLevel 聯絡人到 Supabase
 * 用途：測試資料庫連線與前端顯示功能
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 缺少環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testInsertContact() {
  console.log('🧪 開始測試插入 GoHighLevel 聯絡人\n');

  const testContact = {
    contact_id: 'manual-test-' + Date.now(),
    name: '手動測試聯絡人',
    first_name: '測試',
    last_name: '聯絡人',
    email: 'manual-test@example.com',
    phone: '+886912345678',
    tags: ['手動測試', 'Supabase直接插入'],
    source: '手動測試腳本',
    company_name: '簡單歌唱教室',
    custom_fields: {
      test_time: new Date().toISOString(),
      test_type: 'manual_insert',
    },
    raw_data: {
      inserted_by: 'test-script',
      inserted_at: new Date().toISOString(),
    },
  };

  console.log('📤 插入資料：', testContact.name);
  console.log('   Contact ID:', testContact.contact_id);
  console.log('   Email:', testContact.email);
  console.log('   Phone:', testContact.phone);
  console.log('');

  const { data, error } = await supabase
    .from('gohighlevel_contacts')
    .insert([testContact])
    .select();

  if (error) {
    console.error('❌ 插入失敗:', error.message);
    process.exit(1);
  }

  console.log('✅ 插入成功！');
  console.log('');
  console.log('📊 插入的資料：');
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  // 查詢驗證
  console.log('🔍 驗證查詢...');
  const { data: allContacts, error: queryError } = await supabase
    .from('gohighlevel_contacts')
    .select('contact_id, name, email, phone, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (queryError) {
    console.error('❌ 查詢失敗:', queryError.message);
    process.exit(1);
  }

  console.log('✅ 最新 5 筆聯絡人：');
  console.table(allContacts);
  console.log('');

  console.log('🎉 測試完成！');
  console.log('');
  console.log('📋 下一步：');
  console.log('   1. 前往前端頁面查看：https://singple-ai-system.zeabur.app/leads/gohighlevel');
  console.log('   2. 應該會看到剛才插入的聯絡人');
  console.log('   3. 如果顯示正常，表示前端功能沒問題');
  console.log('   4. 接著再回來修 Zeabur 後端的 webhook 接收功能');
  console.log('');
}

testInsertContact();
