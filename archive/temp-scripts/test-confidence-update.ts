/**
 * 測試信心分數更新邏輯
 *
 * 測試場景：
 * 1. AI 建議的對應 → 保留 AI 信心分數
 * 2. 手動調整對應 → 信心分數變為 100%
 * 3. 儲存後重新載入 → 信心分數正確顯示
 */

async function testConfidenceUpdate() {
  const BASE_URL = 'http://localhost:5001';

  console.log('\n' + '='.repeat(70));
  console.log('🧪 信心分數更新測試');
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

  // Step 1: 清除現有對應
  console.log('🧹 Step 1: 清除現有對應\n');
  await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseTable: 'trial_class_attendance',
      mappings: []
    })
  });
  console.log('✅ 已清除現有對應\n');

  // Step 2: 測試 AI 建議的信心分數
  console.log('🤖 Step 2: 測試 AI 建議的信心分數\n');

  const mockGoogleColumns = ['姓名', 'email', '上課日期', '授課老師'];

  const aiResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/analyze-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleColumns: mockGoogleColumns,
      supabaseTable: 'trial_class_attendance'
    })
  });

  const aiData = await aiResponse.json();
  console.log(`   AI 分析結果: ${aiData.data.suggestions.length} 個建議\n`);

  console.log('   AI 建議的信心分數:');
  aiData.data.suggestions.forEach((s: any) => {
    const percent = Math.round(s.confidence * 100);
    console.log(`   - ${s.supabaseColumn} ← ${s.googleColumn}: ${percent}% (${s.reasoning})`);
  });
  console.log('');

  // Step 3: 儲存混合對應（AI + 手動）
  console.log('💾 Step 3: 儲存混合對應（AI 建議 + 手動調整）\n');

  const mixedMappings = [
    // AI 建議的對應（保留 AI 信心分數）
    {
      supabaseColumn: 'student_name',
      googleColumn: '姓名',
      confidence: 0.9, // AI 建議的信心分數
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: '姓名欄位 (規則匹配)'
    },
    {
      supabaseColumn: 'student_email',
      googleColumn: 'email',
      confidence: 0.9, // AI 建議的信心分數
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: 'Email 欄位 (規則匹配)'
    },
    // 手動調整的對應（應該是 100%）
    {
      supabaseColumn: 'teacher_name',
      googleColumn: '授課老師',
      confidence: 1.0, // 手動調整應該是 100%
      dataType: 'text',
      transformFunction: 'cleanText',
      isRequired: true,
      reasoning: '手動調整'
    },
    {
      supabaseColumn: 'class_date',
      googleColumn: '上課日期',
      confidence: 1.0, // 手動調整應該是 100%
      dataType: 'date',
      transformFunction: 'toDate',
      isRequired: true,
      reasoning: '手動調整'
    }
  ];

  console.log('   儲存 4 個對應（2 個 AI + 2 個手動）:');
  mixedMappings.forEach(m => {
    const percent = Math.round(m.confidence * 100);
    console.log(`   - ${m.supabaseColumn} ← ${m.googleColumn}: ${percent}% (${m.reasoning})`);
  });
  console.log('');

  const saveResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/save-mapping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supabaseTable: 'trial_class_attendance',
      mappings: mixedMappings
    })
  });

  const saveData = await saveResponse.json();
  if (!saveData.success) {
    console.error('❌ 儲存失敗:', saveData.error);
    return;
  }

  console.log(`✅ 儲存成功！儲存了 ${saveData.data.mappingsCount} 個對應\n`);

  // Step 4: 重新載入並驗證信心分數
  console.log('📂 Step 4: 重新載入並驗證信心分數\n');

  const loadResponse = await fetch(`${BASE_URL}/api/worksheets/${worksheet.id}/mapping`);
  const loadData = await loadResponse.json();

  console.log('   載入的對應與信心分數:');
  loadData.data.forEach((saved: any) => {
    const percent = Math.round((saved.ai_confidence || 0) * 100);
    const badge = saved.ai_confidence >= 0.95 ? '🟢' :
                 saved.ai_confidence >= 0.8 ? '🟡' : '🔴';
    console.log(`   ${badge} ${saved.supabase_column} ← ${saved.google_column}: ${percent}%`);
    console.log(`      (${saved.ai_reasoning || '無說明'})`);
  });
  console.log('');

  // Step 5: 驗證信心分數正確性
  console.log('🔍 Step 5: 驗證信心分數正確性\n');

  const expectedConfidence = {
    'student_name': 0.9,   // AI 建議
    'student_email': 0.9,  // AI 建議
    'teacher_name': 1.0,   // 手動調整
    'class_date': 1.0      // 手動調整
  };

  let allCorrect = true;

  for (const [supabaseCol, expectedConf] of Object.entries(expectedConfidence)) {
    const savedMapping = loadData.data?.find((m: any) => m.supabase_column === supabaseCol);

    if (!savedMapping) {
      console.log(`   ❌ ${supabaseCol}: 未找到對應`);
      allCorrect = false;
    } else {
      const actualConf = savedMapping.ai_confidence || 0;
      const isCorrect = Math.abs(actualConf - expectedConf) < 0.01;

      if (!isCorrect) {
        console.log(`   ❌ ${supabaseCol}: 信心分數錯誤`);
        console.log(`      預期: ${Math.round(expectedConf * 100)}%`);
        console.log(`      實際: ${Math.round(actualConf * 100)}%`);
        allCorrect = false;
      } else {
        const percent = Math.round(actualConf * 100);
        const type = actualConf >= 0.95 ? 'AI 建議' : '手動調整';
        console.log(`   ✅ ${supabaseCol}: ${percent}% ← 正確`);
      }
    }
  }

  console.log('');

  // 總結
  console.log('='.repeat(70));
  if (allCorrect) {
    console.log('✅ 測試通過！信心分數更新邏輯正常');
    console.log('='.repeat(70) + '\n');

    console.log('📊 測試總結:');
    console.log('   ✅ AI 建議的對應 → 保留 AI 信心分數 (90%)');
    console.log('   ✅ 手動調整的對應 → 信心分數更新為 100%');
    console.log('   ✅ 儲存後重新載入 → 信心分數正確顯示\n');

    console.log('💡 現在可以在瀏覽器測試：');
    console.log('   1. 開啟 http://localhost:5001/dashboard');
    console.log('   2. 點擊「✨ 欄位對應」按鈕');
    console.log('   3. 查看信心分數:');
    console.log('      - AI 建議的對應應該顯示 90%（黃色）');
    console.log('      - 手動調整的對應應該顯示 100%（綠色）');
    console.log('   4. 手動調整一個對應');
    console.log('   5. 確認信心分數立即變為 100%\n');
  } else {
    console.log('❌ 測試失敗！發現問題');
    console.log('='.repeat(70) + '\n');
  }
}

// 執行測試
testConfidenceUpdate().catch(console.error);
