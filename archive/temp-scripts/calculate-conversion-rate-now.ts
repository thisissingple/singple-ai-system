import { getSupabaseClient } from './server/services/supabase-client.js';

async function calculateConversionRate() {
  const client = getSupabaseClient();

  console.log('📊 從 Supabase 計算轉換率...\n');

  // 1. 拉取所有購買記錄
  const { data: purchases, error: pError } = await client
    .from('trial_class_purchase')
    .select('*');

  console.log('=== 體驗課購買記錄 ===');
  console.log('總記錄數:', purchases?.length || 0);

  if (!purchases || purchases.length === 0) {
    console.log('❌ 沒有購買記錄資料，無法計算轉換率');
    console.log('\n讓我檢查其他表格...\n');

    // 檢查上課記錄
    const { data: attendance } = await client
      .from('trial_class_attendance')
      .select('*');

    console.log('=== 體驗課上課記錄 ===');
    console.log('總記錄數:', attendance?.length || 0);
    if (attendance && attendance.length > 0) {
      console.log('欄位:', Object.keys(attendance[0]));
      console.log('前 3 筆:', attendance.slice(0, 3).map(r => ({
        姓名: r['姓名'],
        email: r['email'],
        上課日期: r['上課日期']
      })));
    }

    // 檢查 EODs
    const { data: eods } = await client
      .from('eods_for_closers')
      .select('*');

    console.log('\n=== EODs 成交記錄 ===');
    console.log('總記錄數:', eods?.length || 0);
    if (eods && eods.length > 0) {
      console.log('欄位:', Object.keys(eods[0]));
    }

    return;
  }

  // 如果有購買記錄，分析狀態
  const statusField = purchases[0]['目前狀態'] || purchases[0]['current_status'] || purchases[0]['status'];
  console.log('狀態欄位名稱:', statusField ? '找到' : '未找到');

  // 去重：用 email 作為唯一識別
  const studentMap = new Map<string, any>();
  purchases.forEach(p => {
    const email = (p['email'] || p['student_email'] || '').trim().toLowerCase();
    const status = p['目前狀態'] || p['current_status'] || p['status'] || '';

    if (email) {
      studentMap.set(email, { email, status, raw: p });
    }
  });

  console.log('唯一學生數:', studentMap.size);

  // 計算轉換率
  const students = Array.from(studentMap.values());
  const convertedStudents = students.filter(s => s.status === '已轉高');
  const completedStudents = students.filter(s => s.status === '已轉高' || s.status === '未轉高');

  console.log('\n=== 轉換率計算 ===');
  console.log('已轉高學生數:', convertedStudents.length);
  console.log('已上完課學生數 (已轉高+未轉高):', completedStudents.length);

  if (completedStudents.length > 0) {
    const conversionRate = (convertedStudents.length / completedStudents.length) * 100;
    console.log('✅ 轉換率:', conversionRate.toFixed(2) + '%');
  } else {
    console.log('❌ 無法計算（沒有已上完課的學生）');
  }

  // 狀態分布
  const statusCount: Record<string, number> = {};
  students.forEach(s => {
    const status = s.status || '未知';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  console.log('\n=== 狀態分布 ===');
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`${status}: ${count} 人`);
  });
}

calculateConversionRate().catch(console.error);
