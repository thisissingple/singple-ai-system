import { getSupabaseClient } from './server/services/supabase-client.js';

async function verifyAndCalculate() {
  const client = getSupabaseClient();

  console.log('📊 驗證資料並計算轉換率\n');
  console.log('='.repeat(60));

  // 1. 檢查購買記錄資料
  const { data: purchases } = await client
    .from('trial_class_purchases')
    .select('email, "目前狀態（自動計算）"');

  console.log('\n✓ 體驗課購買記錄: ' + purchases?.length + ' 筆');

  // 2. 去重並統計狀態
  const studentMap = new Map<string, string>();
  purchases?.forEach(p => {
    const email = (p.email || '').trim().toLowerCase();
    const status = p['目前狀態（自動計算）'] || '';
    if (email) {
      studentMap.set(email, status);
    }
  });

  console.log('  唯一學生數: ' + studentMap.size + ' 人');

  // 3. 計算轉換率
  const students = Array.from(studentMap.values());
  const convertedStudents = students.filter(s => s === '已轉高').length;
  const completedStudents = students.filter(s => s === '已轉高' || s === '未轉高').length;

  console.log('\n📈 轉換率計算:');
  console.log('  已轉高學生數: ' + convertedStudents + ' 人');
  console.log('  已上完課學生數 (已轉高+未轉高): ' + completedStudents + ' 人');

  if (completedStudents > 0) {
    const conversionRate = (convertedStudents / completedStudents) * 100;
    console.log('  ✅ 轉換率: ' + conversionRate.toFixed(2) + '%');
  } else {
    console.log('  ❌ 無法計算（沒有已上完課的學生）');
  }

  // 4. 狀態分布
  const statusCount: Record<string, number> = {};
  Array.from(studentMap.values()).forEach(status => {
    const s = status || '未知';
    statusCount[s] = (statusCount[s] || 0) + 1;
  });

  console.log('\n📊 學生狀態分布:');
  Object.entries(statusCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([status, count]) => {
      console.log(`  ${status}: ${count} 人`);
    });

  // 5. 檢查其他表
  const { count: attendanceCount } = await client
    .from('trial_class_attendance')
    .select('*', { count: 'exact', head: true });

  const { count: eodsCount } = await client
    .from('eods_for_closers')
    .select('*', { count: 'exact', head: true });

  console.log('\n✓ 體驗課上課記錄: ' + attendanceCount + ' 筆');
  console.log('✓ EODs 成交記錄: ' + eodsCount + ' 筆');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 資料驗證完成！可以開始使用報表功能');
}

verifyAndCalculate().catch(console.error);
