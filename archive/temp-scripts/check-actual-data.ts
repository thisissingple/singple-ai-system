import { getSupabaseClient } from './server/services/supabase-client.js';

async function checkActualData() {
  const client = getSupabaseClient();

  console.log('📊 檢查實際資料結構...\n');

  // 檢查購買記錄
  const { data: purchases, error: pError } = await client
    .from('trial_class_purchase')
    .select('*')
    .limit(2);

  console.log('=== 體驗課購買記錄表 ===');
  console.log('記錄數:', purchases?.length || 0);
  if (purchases && purchases.length > 0) {
    console.log('第一筆資料的欄位:', Object.keys(purchases[0]));
    console.log('第一筆完整資料:', JSON.stringify(purchases[0], null, 2));
  }
  if (pError) console.log('錯誤:', pError);

  // 檢查上課記錄
  const { data: attendance, error: aError } = await client
    .from('trial_class_attendance')
    .select('*')
    .limit(2);

  console.log('\n=== 體驗課上課記錄表 ===');
  console.log('記錄數:', attendance?.length || 0);
  if (attendance && attendance.length > 0) {
    console.log('第一筆資料的欄位:', Object.keys(attendance[0]));
    console.log('第一筆完整資料:', JSON.stringify(attendance[0], null, 2));
  }
  if (aError) console.log('錯誤:', aError);

  // 檢查 EODs
  const { data: eods, error: eError } = await client
    .from('eods_for_closers')
    .select('*')
    .limit(2);

  console.log('\n=== EODs for Closers ===');
  console.log('記錄數:', eods?.length || 0);
  if (eods && eods.length > 0) {
    console.log('第一筆資料的欄位:', Object.keys(eods[0]));
    console.log('第一筆完整資料:', JSON.stringify(eods[0], null, 2));
  }
  if (eError) console.log('錯誤:', eError);
}

checkActualData().catch(console.error);
