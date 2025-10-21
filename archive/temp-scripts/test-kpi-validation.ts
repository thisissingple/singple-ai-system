/**
 * Test KPI Validation API
 */

async function testKPIValidation() {
  // 1. Get current report data
  const reportResponse = await fetch('http://localhost:5001/api/reports/trial-class?period=all', {
    credentials: 'include',
  });
  const reportData = await reportResponse.json();
  const metrics = reportData.data.summaryMetrics;

  console.log('=== 目前報表數據 ===');
  console.log('轉換率:', metrics.conversionRate + '%');
  console.log('體驗完課率:', metrics.trialCompletionRate + '%');
  console.log('總成交數:', metrics.totalConversions);
  console.log('待追蹤學生:', metrics.pendingStudents);
  console.log('總體驗課數:', metrics.totalTrials);
  console.log('');

  // 2. Validate KPIs
  const validateResponse = await fetch('http://localhost:5001/api/reports/trial-class/validate-kpis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentMetrics: metrics }),
  });

  const validationResult = await validateResponse.json();

  console.log('=== KPI 驗證結果 ===\n');
  validationResult.data.results.forEach((r: any) => {
    const icon = r.severity === 'success' ? '✅' : r.severity === 'error' ? '❌' : '⚠️';
    console.log(`${icon} ${r.label}:`);
    console.log('   目前值:', r.currentValue);
    if (!r.isCorrect && r.suggestedValue !== null) {
      console.log('   建議值:', r.suggestedValue);
    }
    console.log('   原因:', r.reason);
    console.log('');
  });

  console.log('📊 統計:');
  console.log('  ✅ 正確:', validationResult.data.correctCount);
  console.log('  ❌ 錯誤:', validationResult.data.errorCount);
  console.log('  ⚠️  警告:', validationResult.data.warningCount);
}

testKPIValidation().catch(console.error);
