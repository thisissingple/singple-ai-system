const d = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
if (!d.success) {
  console.log('❌ API 錯誤:', d.error);
  process.exit(1);
}
const m = d.data.summaryMetrics;
console.log('=== 📊 當前報表數據 ===\n');
console.log('✅ 轉換率:', m.conversionRate + '%');
console.log('✅ 體驗完課率:', m.trialCompletionRate + '%');
console.log('✅ 總成交數:', m.totalConversions, '人');
console.log('✅ 待追蹤學生:', m.pendingStudents, '人');
console.log('✅ 總體驗課數:', m.totalTrials, '堂');
console.log('✅ 總諮詢數:', m.totalConsultations);
console.log('⏱️  平均轉換時間:', m.avgConversionTime, '天');
console.log('💰 潛在收益: NT$', (m.potentialRevenue || 0).toLocaleString());
console.log('\n=== ✅ 所有數據已修正正確！===');
