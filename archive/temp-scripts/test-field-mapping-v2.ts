/**
 * 測試欄位對應功能 V2
 *
 * 測試項目：
 * 1. API 端點正常運作
 * 2. Supabase schema 正確返回
 * 3. 欄位對應分析正確（反轉方向）
 * 4. 必填欄位偵測
 */

async function testFieldMappingV2() {
  const BASE_URL = 'http://localhost:5001';

  console.log('\n='.repeat(60));
  console.log('🧪 欄位對應功能 V2 測試');
  console.log('='.repeat(60) + '\n');

  // Test 1: 取得所有 schemas
  console.log('📋 Test 1: 取得所有可用的 Supabase 表\n');
  try {
    const response = await fetch(`${BASE_URL}/api/field-mapping/schemas`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ 成功取得 schemas');
      console.log(`   可用表: ${data.data.join(', ')}\n`);
    } else {
      console.error('❌ 失敗:', data.error);
      return;
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
    return;
  }

  // Test 2: 取得特定表的 schema（含必填欄位資訊）
  console.log('📋 Test 2: 取得 trial_class_attendance 的 schema\n');
  try {
    const response = await fetch(`${BASE_URL}/api/field-mapping/schemas/trial_class_attendance`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ 成功取得 schema');
      console.log(`   表名: ${data.data.tableName}`);
      console.log(`   欄位數量: ${data.data.columns.length}\n`);

      console.log('   必填欄位:');
      data.data.columns
        .filter((col: any) => col.required)
        .forEach((col: any) => {
          console.log(`   - ${col.name} (${col.type})${col.description ? ` - ${col.description}` : ''}`);
        });

      console.log('\n   選填欄位:');
      data.data.columns
        .filter((col: any) => !col.required)
        .forEach((col: any) => {
          console.log(`   - ${col.name} (${col.type})${col.description ? ` - ${col.description}` : ''}`);
        });

      console.log('');
    } else {
      console.error('❌ 失敗:', data.error);
      return;
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
    return;
  }

  // Test 3: 測試欄位對應分析（模擬場景）
  console.log('📋 Test 3: 測試欄位對應分析 (trial_class_attendance)\n');

  // 模擬 Google Sheets 欄位
  const mockGoogleColumns = [
    '姓名',
    'email',
    '上課日期',
    '授課老師',
    '是否已評價',
    '備註',
    '其他未知欄位'
  ];

  console.log('   模擬 Google Sheets 欄位:');
  mockGoogleColumns.forEach((col, i) => console.log(`   ${i + 1}. "${col}"`));
  console.log('');

  try {
    // 取得 worksheets 列表
    const wsResponse = await fetch(`${BASE_URL}/api/worksheets`);
    const wsData = await wsResponse.json();

    if (!wsData.success || wsData.data.length === 0) {
      console.log('⚠️  無可用的 worksheet，跳過此測試\n');
      return;
    }

    const worksheet = wsData.data[0];
    console.log(`   使用 worksheet: ${worksheet.worksheetName} (${worksheet.id})\n`);

    // 分析欄位對應
    const response = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/analyze-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleColumns: mockGoogleColumns,
        supabaseTable: 'trial_class_attendance'
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ 成功分析欄位對應');
      console.log(`   整體信心分數: ${Math.round(data.data.overallConfidence * 100)}%`);
      console.log(`   建議對應數量: ${data.data.suggestions.length}\n`);

      console.log('   建議對應 (Supabase ← Google):');
      data.data.suggestions.forEach((suggestion: any) => {
        const confidencePercent = Math.round(suggestion.confidence * 100);
        const badge = suggestion.confidence >= 0.8 ? '🟢' :
                     suggestion.confidence >= 0.5 ? '🟡' : '🔴';
        console.log(`   ${badge} ${suggestion.supabaseColumn} ← "${suggestion.googleColumn}" (${confidencePercent}%)`);
        console.log(`      ${suggestion.reasoning}`);
      });

      if (data.data.unmappedRequiredColumns && data.data.unmappedRequiredColumns.length > 0) {
        console.log('\n   ⚠️  未對應的必填欄位:');
        data.data.unmappedRequiredColumns.forEach((col: string) => {
          console.log(`   - ${col}`);
        });
      }

      if (data.data.unmappedSupabaseColumns && data.data.unmappedSupabaseColumns.length > 0) {
        console.log('\n   未使用的 Supabase 欄位:');
        data.data.unmappedSupabaseColumns.forEach((col: string) => {
          console.log(`   - ${col}`);
        });
      }

      console.log('');
    } else {
      console.error('❌ 失敗:', data.error);
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }

  // Test 4: 測試儲存對應
  console.log('📋 Test 4: 測試儲存對應功能\n');
  try {
    const wsResponse = await fetch(`${BASE_URL}/api/worksheets`);
    const wsData = await wsResponse.json();

    if (!wsData.success || wsData.data.length === 0) {
      console.log('⚠️  無可用的 worksheet，跳過此測試\n');
      return;
    }

    const worksheet = wsData.data[0];

    const testMappings = [
      {
        supabaseColumn: 'student_name',
        googleColumn: '姓名',
        confidence: 0.9,
        dataType: 'text',
        transformFunction: 'cleanText',
        isRequired: true,
        reasoning: '測試對應'
      },
      {
        supabaseColumn: 'student_email',
        googleColumn: 'email',
        confidence: 0.9,
        dataType: 'text',
        transformFunction: 'cleanText',
        isRequired: true,
        reasoning: '測試對應'
      },
      {
        supabaseColumn: 'class_date',
        googleColumn: '上課日期',
        confidence: 0.8,
        dataType: 'date',
        transformFunction: 'toDate',
        isRequired: true,
        reasoning: '測試對應'
      }
    ];

    console.log('   測試儲存 3 個欄位對應...');
    console.log(`   Worksheet: ${worksheet.worksheetName}\n`);

    const response = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/save-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseTable: 'trial_class_attendance',
        mappings: testMappings
      })
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ 儲存成功!');
      console.log(`   Worksheet ID: ${data.data.worksheetId}`);
      console.log(`   Supabase Table: ${data.data.supabaseTable}`);
      console.log(`   對應數量: ${data.data.mappingsCount}\n`);

      // 驗證讀取
      console.log('   驗證讀取...');
      const readResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/mapping`);
      const readData = await readResponse.json();

      if (readData.success && readData.data.length > 0) {
        console.log(`✅ 成功讀取 ${readData.data.length} 筆對應設定`);
        readData.data.forEach((mapping: any) => {
          console.log(`   - ${mapping.supabase_column} ← ${mapping.google_column}`);
        });
        console.log('');
      } else {
        console.log('⚠️  讀取失敗或無資料\n');
      }
    } else {
      console.error('❌ 儲存失敗:', data.error);
    }
  } catch (error) {
    console.error('❌ 錯誤:', error);
  }

  console.log('='.repeat(60));
  console.log('✅ 所有測試完成！');
  console.log('='.repeat(60) + '\n');

  console.log('💡 下一步:');
  console.log('   1. 開啟瀏覽器前往 http://localhost:5001/dashboard');
  console.log('   2. 點擊工作表的「✨ 欄位對應」按鈕');
  console.log('   3. 查看新的 UI（Supabase → Google 方向）');
  console.log('   4. 測試手動調整對應');
  console.log('   5. 點擊「儲存對應」觀察成功提示\n');
}

// 執行測試
testFieldMappingV2().catch(console.error);
