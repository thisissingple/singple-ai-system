/**
 * 測試欄位對應持久化功能
 *
 * 測試場景：
 * 1. 第一次開啟對話框 → AI 建議對應
 * 2. 手動調整對應並儲存
 * 3. 第二次開啟對話框 → 應該載入已儲存的對應（不是 AI 建議）
 */

async function testMappingPersistence() {
  const BASE_URL = 'http://localhost:5001';

  console.log('\n' + '='.repeat(70));
  console.log('🧪 欄位對應持久化測試');
  console.log('='.repeat(70) + '\n');

  // 取得 worksheet
  const wsResponse = await fetch(`${BASE_URL}/api/worksheets`);
  const wsData = await wsResponse.json();

  if (!wsData.success || wsData.data.length === 0) {
    console.error('❌ 無可用的 worksheet');
    return;
  }

  const worksheet = wsData.data[0];
  console.log(`📋 使用 Worksheet: ${worksheet.worksheetName}`);
  console.log(`   ID: ${worksheet.id}\n`);

  // Step 1: 清除現有對應（如果有）
  console.log('🧹 Step 1: 清除現有對應\n');
  try {
    await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/save-mapping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabaseTable: 'trial_class_attendance',
        mappings: []
      })
    });
    console.log('✅ 已清除現有對應\n');
  } catch (error) {
    console.warn('⚠️  清除對應失敗（可能沒有對應）\n');
  }

  // Step 2: 第一次開啟 - 應該使用 AI 建議
  console.log('🤖 Step 2: 模擬第一次開啟對話框（應使用 AI 建議）\n');

  const mockGoogleColumns = ['姓名', 'email', '上課日期', '授課老師', '備註'];

  // 取得 schema
  const schemaResponse = await fetch(`${BASE_URL}/api/field-mapping/schemas/trial_class_attendance`);
  const schemaData = await schemaResponse.json();
  console.log(`   載入 Schema: ${schemaData.data.columns.length} 個欄位`);

  // 檢查已儲存的對應
  const savedResponse1 = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/mapping`);
  const savedData1 = await savedResponse1.json();
  console.log(`   已儲存對應數量: ${savedData1.data?.length || 0}`);

  if (savedData1.data?.length === 0) {
    console.log('   → 沒有已儲存的對應，將使用 AI 分析 ✅\n');

    // 呼叫 AI 分析
    const aiResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/analyze-fields`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        googleColumns: mockGoogleColumns,
        supabaseTable: 'trial_class_attendance'
      })
    });

    const aiData = await aiResponse.json();
    console.log(`   AI 分析結果: ${aiData.data.suggestions.length} 個建議對應`);
    aiData.data.suggestions.forEach((s: any) => {
      console.log(`   - ${s.supabaseColumn} ← ${s.googleColumn} (${Math.round(s.confidence * 100)}%)`);
    });
    console.log('');
  } else {
    console.log('   → 已有儲存的對應 ⚠️  (預期應該是空的)\n');
  }

  // Step 3: 手動調整並儲存對應
  console.log('💾 Step 3: 手動調整對應並儲存\n');

  const customMappings = [
    {
      supabaseColumn: 'student_name',
      googleColumn: '姓名',
      confidence: 1.0, // 手動設定
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: '手動設定 - 測試用'
    },
    {
      supabaseColumn: 'student_email',
      googleColumn: 'email',
      confidence: 1.0,
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: '手動設定 - 測試用'
    },
    {
      supabaseColumn: 'class_date',
      googleColumn: '上課日期',
      confidence: 1.0,
      dataType: 'date',
      transformFunction: 'toDate',
      isRequired: true,
      reasoning: '手動設定 - 測試用'
    },
    {
      supabaseColumn: 'teacher_name',
      googleColumn: '授課老師', // 這是手動對應的
      confidence: 1.0,
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: '手動設定 - 測試用'
    }
  ];

  console.log(`   儲存 ${customMappings.length} 個手動對應:`);
  customMappings.forEach(m => {
    console.log(`   - ${m.supabaseColumn} ← ${m.googleColumn}`);
  });
  console.log('');

  const saveResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseTable: 'trial_class_attendance',
      mappings: customMappings
    })
  });

  const saveData = await saveResponse.json();
  if (saveData.success) {
    console.log(`✅ 儲存成功！儲存了 ${saveData.data.mappingsCount} 個對應\n`);
  } else {
    console.error('❌ 儲存失敗:', saveData.error);
    return;
  }

  // Step 4: 第二次開啟 - 應該載入已儲存的對應
  console.log('📂 Step 4: 模擬第二次開啟對話框（應載入已儲存的對應）\n');

  // 檢查已儲存的對應
  const savedResponse2 = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/mapping`);
  const savedData2 = await savedResponse2.json();

  console.log(`   已儲存對應數量: ${savedData2.data?.length || 0}`);

  if (savedData2.data?.length > 0) {
    console.log('   ✅ 找到已儲存的對應，將使用儲存的對應（不會呼叫 AI）\n');

    console.log('   載入的對應:');
    savedData2.data.forEach((saved: any) => {
      console.log(`   - ${saved.supabase_column} ← ${saved.google_column}`);
      console.log(`     (${saved.ai_reasoning || '無說明'})`);
    });
    console.log('');
  } else {
    console.log('   ❌ 沒有找到已儲存的對應（預期應該要有）\n');
  }

  // Step 5: 驗證對應內容正確
  console.log('🔍 Step 5: 驗證對應內容正確性\n');

  const expectedMappings = {
    'student_name': '姓名',
    'student_email': 'email',
    'class_date': '上課日期',
    'teacher_name': '授課老師'
  };

  let allCorrect = true;

  for (const [supabaseCol, expectedGoogleCol] of Object.entries(expectedMappings)) {
    const savedMapping = savedData2.data?.find((m: any) => m.supabase_column === supabaseCol);

    if (!savedMapping) {
      console.log(`   ❌ ${supabaseCol}: 未找到對應`);
      allCorrect = false;
    } else if (savedMapping.google_column !== expectedGoogleCol) {
      console.log(`   ❌ ${supabaseCol}: 對應錯誤`);
      console.log(`      預期: ${expectedGoogleCol}`);
      console.log(`      實際: ${savedMapping.google_column}`);
      allCorrect = false;
    } else {
      console.log(`   ✅ ${supabaseCol} ← ${savedMapping.google_column}`);
    }
  }

  console.log('');

  // 總結
  console.log('='.repeat(70));
  if (allCorrect) {
    console.log('✅ 測試通過！欄位對應持久化功能正常');
    console.log('='.repeat(70) + '\n');

    console.log('💡 現在可以在瀏覽器測試：');
    console.log('   1. 開啟 http://localhost:5001/dashboard');
    console.log('   2. 點擊工作表的「✨ 欄位對應」按鈕');
    console.log('   3. 應該會看到剛才儲存的 4 個對應');
    console.log('   4. 關閉對話框後重新開啟');
    console.log('   5. 確認對應仍然保留（沒有重置為 AI 建議）\n');
  } else {
    console.log('❌ 測試失敗！發現問題');
    console.log('='.repeat(70) + '\n');
  }
}

// 執行測試
testMappingPersistence().catch(console.error);
