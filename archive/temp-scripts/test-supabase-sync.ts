/**
 * 測試實際寫入 Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { transformData, getValidRecords, standardizeRecords } from './server/services/etl/transform';
import type { Worksheet } from './shared/schema';
import { readFileSync } from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testSupabaseSync() {
  console.log('=== 測試 Supabase 實際寫入 ===\n');

  // 準備測試資料
  const mockExtractedData = {
    worksheet: {
      id: null, // 先不設定 worksheet ID，讓它為 null
      worksheetName: '體驗課上課記錄表',
      supabaseTable: 'trial_class_attendance',
      isEnabled: true
    } as any,
    headers: ['姓名', 'email', '上課日期', '授課老師', '是否已確認', '未聯繫原因', '體驗課文字檔'],
    rows: [
      {
        '姓名': '測試學生A',
        'email': 'test-a@example.com',
        '上課日期': '2025-01-20',
        '授課老師': '測試老師',
        '是否已確認': 'true',
        '未聯繫原因': '',
        '體驗課文字檔': '這是測試資料，請稍後刪除'
      }
    ]
  };

  console.log('🔄 步驟 1: 轉換資料');
  const transformResult = transformData(mockExtractedData, {
    requireStudentEmail: true,
    addTrackingFields: true,
    addSystemFields: true
  });

  const validRecords = getValidRecords(transformResult);
  const standardizedRecords = standardizeRecords(validRecords);

  console.log(`  轉換成功: ${validRecords.length} 筆資料`);
  console.log('');

  console.log('📤 步驟 2: 寫入 Supabase');
  console.log(`  目標表格: ${transformResult.tableName}`);

  // 先檢查表是否存在
  const { data: existingData, error: checkError } = await supabase
    .from(transformResult.tableName)
    .select('id')
    .limit(1);

  if (checkError) {
    console.error('❌ 無法連接到 Supabase 表:', checkError.message);
    return;
  }

  console.log('  ✓ Supabase 表連接成功');
  console.log('');

  // 清理測試資料（如果存在）
  console.log('🧹 步驟 3: 清理舊的測試資料');
  const { error: deleteError } = await supabase
    .from(transformResult.tableName)
    .delete()
    .eq('student_email', 'test-a@example.com');

  if (deleteError) {
    console.warn('  ⚠️  清理失敗（可能沒有舊資料）:', deleteError.message);
  } else {
    console.log('  ✓ 清理完成');
  }
  console.log('');

  // 寫入測試資料
  console.log('💾 步驟 4: 插入測試資料');
  const { data: insertedData, error: insertError } = await supabase
    .from(transformResult.tableName)
    .insert(standardizedRecords)
    .select();

  if (insertError) {
    console.error('❌ 插入失敗:', insertError);
    console.error('   詳細訊息:', insertError.message);
    console.error('   錯誤代碼:', insertError.code);
    console.error('   提示:', insertError.hint);
    console.error('');
    console.error('📋 嘗試插入的資料:');
    console.log(JSON.stringify(standardizedRecords[0], null, 2));
    return;
  }

  console.log(`  ✓ 成功插入 ${insertedData?.length || 0} 筆資料`);
  console.log('');

  // 驗證資料
  console.log('🔍 步驟 5: 驗證寫入的資料');
  const { data: verifyData, error: verifyError } = await supabase
    .from(transformResult.tableName)
    .select('*')
    .eq('student_email', 'test-a@example.com');

  if (verifyError) {
    console.error('❌ 驗證失敗:', verifyError.message);
    return;
  }

  if (!verifyData || verifyData.length === 0) {
    console.error('❌ 找不到剛插入的資料');
    return;
  }

  console.log('  ✓ 資料驗證成功！');
  console.log('');
  console.log('📊 寫入的資料:');
  const record = verifyData[0];
  console.log('  ID:', record.id);
  console.log('  學生姓名:', record.student_name);
  console.log('  學生 Email:', record.student_email);
  console.log('  上課日期:', record.class_date);
  console.log('  授課老師:', record.teacher_name);
  console.log('  是否已確認:', record.is_reviewed);
  console.log('  未聯繫原因:', record.no_conversion_reason || '(null)');
  console.log('  體驗課文字檔:', record.class_transcript);
  console.log('  原始資料 (raw_data):', Object.keys(record.raw_data || {}).length, '個欄位');
  console.log('  同步時間:', record.synced_at);
  console.log('  建立時間:', record.created_at);
  console.log('');

  // 清理測試資料
  console.log('🧹 步驟 6: 清理測試資料');
  const { error: cleanupError } = await supabase
    .from(transformResult.tableName)
    .delete()
    .eq('student_email', 'test-a@example.com');

  if (cleanupError) {
    console.error('❌ 清理失敗:', cleanupError.message);
  } else {
    console.log('  ✓ 測試資料已清理');
  }

  console.log('');
  console.log('✅ 測試完成！欄位對應正確，Supabase 寫入成功。');
}

testSupabaseSync().catch(console.error);
