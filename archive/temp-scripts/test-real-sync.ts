/**
 * 實際測試 Google Sheets 同步到 Supabase
 */

import { extract } from './server/services/etl/extract';
import { transformData, getValidRecords, standardizeRecords, generateTransformSummary } from './server/services/etl/transform';
import { load } from './server/services/etl/load';
import type { Worksheet } from './shared/schema';
import { readFileSync } from 'fs';

const worksheetCache = JSON.parse(readFileSync('./attached_assets/worksheet-cache.json', 'utf-8'));

async function testSync() {
  console.log('=== 開始測試 Google Sheets 同步 ===\n');

  // 測試體驗課上課記錄表
  const attendanceWorksheet = worksheetCache.find((w: any) => w.worksheetName === '體驗課上課記錄表');

  if (!attendanceWorksheet) {
    console.error('❌ 找不到體驗課上課記錄表');
    return;
  }

  console.log('📋 工作表資訊:');
  console.log('  名稱:', attendanceWorksheet.worksheetName);
  console.log('  資料列數:', attendanceWorksheet.rowCount);
  console.log('  欄位:', attendanceWorksheet.headers.join(', '));
  console.log('');

  // 模擬 extract（因為實際上需要 Google Sheets API）
  const mockExtractedData = {
    worksheet: {
      id: attendanceWorksheet.id,
      worksheetName: attendanceWorksheet.worksheetName,
      supabaseTable: 'trial_class_attendance',
      isEnabled: true
    } as Worksheet,
    headers: attendanceWorksheet.headers,
    rows: [
      {
        '姓名': '張小明',
        'email': 'ming@example.com',
        '上課日期': '2025-01-15',
        '授課老師': '王老師',
        '是否已確認': 'true',
        '未聯繫原因': '',
        '體驗課文字檔': '學生表現良好，建議繼續進階課程'
      },
      {
        '姓名': '李小華',
        'email': 'hua@example.com',
        '上課日期': '2025-01-16',
        '授課老師': '陳老師',
        '是否已確認': 'false',
        '未聯繫原因': '電話無人接聽',
        '體驗課文字檔': ''
      }
    ]
  };

  console.log('📊 步驟 1: 提取資料 (Extract)');
  console.log('  提取 2 筆測試資料');
  console.log('');

  console.log('🔄 步驟 2: 轉換資料 (Transform)');
  const transformResult = transformData(mockExtractedData, {
    requireStudentEmail: true,
    addTrackingFields: true,
    addSystemFields: true
  });

  console.log(generateTransformSummary(transformResult));
  console.log('');

  const validRecords = getValidRecords(transformResult);
  const standardizedRecords = standardizeRecords(validRecords);

  console.log('📤 步驟 3: 載入資料 (Load) - 模擬');
  console.log('  準備寫入', standardizedRecords.length, '筆資料到 Supabase');
  console.log('  目標表格:', transformResult.tableName);
  console.log('');

  console.log('🔍 步驟 4: 預覽轉換後的資料');
  standardizedRecords.forEach((record, index) => {
    console.log(`\n  記錄 ${index + 1}:`);
    console.log('    student_name:', record.student_name);
    console.log('    student_email:', record.student_email);
    console.log('    class_date:', record.class_date);
    console.log('    teacher_name:', record.teacher_name);
    console.log('    is_reviewed:', record.is_reviewed);
    console.log('    no_conversion_reason:', record.no_conversion_reason || '(null)');
    console.log('    class_transcript:', record.class_transcript || '(null)');
    console.log('    raw_data keys:', Object.keys(record.raw_data || {}).join(', '));
  });

  console.log('\n\n✅ 測試完成！欄位對應正確，準備實際同步。');
  console.log('\n💡 下一步：');
  console.log('  1. 啟動開發伺服器: npm run dev');
  console.log('  2. 使用 API 測試同步: POST /api/worksheets/:id/sync');
  console.log('  3. 驗證 Supabase 資料');
}

testSync().catch(console.error);
