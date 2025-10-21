/**
 * Test Field Mapping API Endpoints
 * 測試欄位對應 API 端點
 *
 * 執行方式:
 * 1. 啟動開發伺服器: npm run dev
 * 2. 執行測試: npx tsx tests/test-field-mapping-api.ts
 */

const BASE_URL = 'http://localhost:5000';

async function testAPI() {
  console.log('🧪 測試 Field Mapping API 端點\n');

  // ============================================
  // Test 1: GET /api/field-mapping/schemas
  // ============================================
  console.log('📋 Test 1: 取得所有可用的 schemas');
  console.log('─'.repeat(60));

  try {
    const response = await fetch(`${BASE_URL}/api/field-mapping/schemas`);
    const data = await response.json();

    if (data.success) {
      console.log('✅ 成功取得 schemas');
      console.log('可用的表:', data.data);
      console.log();
    } else {
      console.error('❌ 失敗:', data.error);
    }
  } catch (error) {
    console.error('❌ 請求失敗:', error);
    console.log('⚠️  請確保開發伺服器已啟動 (npm run dev)');
  }

  // ============================================
  // Test 2: GET /api/field-mapping/schemas/:tableName
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test 2: 取得特定表的 schema');
  console.log('─'.repeat(60));

  const testTables = ['trial_class_attendance', 'trial_class_purchase', 'eods_for_closers'];

  for (const tableName of testTables) {
    try {
      const response = await fetch(`${BASE_URL}/api/field-mapping/schemas/${tableName}`);
      const data = await response.json();

      if (data.success) {
        console.log(`\n✅ ${tableName}:`);
        console.log(`   欄位數: ${data.data.columns.length}`);
        console.log('   欄位:');
        data.data.columns.slice(0, 5).forEach((col: any) => {
          console.log(`     - ${col.name} (${col.type}${col.required ? ', required' : ''})`);
        });
        if (data.data.columns.length > 5) {
          console.log(`     ... 共 ${data.data.columns.length} 個欄位`);
        }
      } else {
        console.error(`❌ ${tableName} 失敗:`, data.error);
      }
    } catch (error) {
      console.error(`❌ ${tableName} 請求失敗:`, error);
    }
  }

  // ============================================
  // Test 3: POST /api/worksheets/:id/analyze-fields
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test 3: 分析欄位並建議對應');
  console.log('─'.repeat(60));

  // 測試資料
  const testCases = [
    {
      worksheetId: 'test-worksheet-1',
      supabaseTable: 'trial_class_attendance',
      googleColumns: [
        '學員姓名',
        'Email',
        '體驗課日期',
        '老師',
        '是否已審核',
        '未成交原因',
        '課程內容記錄'
      ]
    },
    {
      worksheetId: 'test-worksheet-2',
      supabaseTable: 'trial_class_purchase',
      googleColumns: [
        '學員姓名',
        'Email',
        '購買方案',
        '購買日期',
        '方案價格',
        '年齡'
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n🔍 測試表: ${testCase.supabaseTable}`);
    try {
      const response = await fetch(
        `${BASE_URL}/api/worksheets/${testCase.worksheetId}/analyze-fields`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            googleColumns: testCase.googleColumns,
            supabaseTable: testCase.supabaseTable
          })
        }
      );

      const data = await response.json();

      if (data.success) {
        console.log(`✅ 分析成功 (整體信心: ${(data.data.overallConfidence * 100).toFixed(1)}%)`);
        console.log('\n📊 對應建議:');
        data.data.suggestions.forEach((s: any, i: number) => {
          console.log(`${i + 1}. "${s.googleColumn}" → ${s.supabaseColumn}`);
          console.log(`   信心: ${(s.confidence * 100).toFixed(0)}% | 型別: ${s.dataType}`);
        });

        if (data.data.unmappedGoogleColumns.length > 0) {
          console.log('\n⚠️  未對應的欄位:');
          data.data.unmappedGoogleColumns.forEach((col: string) => {
            console.log(`   - ${col}`);
          });
        }
      } else {
        console.error('❌ 分析失敗:', data.error);
      }
    } catch (error) {
      console.error('❌ 請求失敗:', error);
    }
  }

  // ============================================
  // Test 4: 錯誤處理測試
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 Test 4: 錯誤處理測試');
  console.log('─'.repeat(60));

  // Test 4.1: 無效的 table name
  console.log('\n🔍 Test 4.1: 無效的 table name');
  try {
    const response = await fetch(`${BASE_URL}/api/field-mapping/schemas/invalid_table`);
    const data = await response.json();

    if (!data.success) {
      console.log('✅ 正確回傳錯誤:', data.error);
    } else {
      console.error('❌ 應該回傳錯誤但卻成功');
    }
  } catch (error) {
    console.error('❌ 請求失敗:', error);
  }

  // Test 4.2: 缺少必填參數
  console.log('\n🔍 Test 4.2: 缺少必填參數');
  try {
    const response = await fetch(
      `${BASE_URL}/api/worksheets/test/analyze-fields`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // 缺少 googleColumns 和 supabaseTable
        })
      }
    );

    const data = await response.json();

    if (!data.success) {
      console.log('✅ 正確回傳錯誤:', data.error);
    } else {
      console.error('❌ 應該回傳錯誤但卻成功');
    }
  } catch (error) {
    console.error('❌ 請求失敗:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 測試完成');
  console.log('='.repeat(60));
}

// 執行測試
testAPI().catch(error => {
  console.error('💥 測試執行失敗:', error);
  process.exit(1);
});
