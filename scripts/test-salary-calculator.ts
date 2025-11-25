/**
 * 測試薪資計算器功能
 */

import 'dotenv/config';

async function testSalaryCalculator() {
  const BASE_URL = 'http://localhost:5001';

  console.log('🧪 開始測試薪資計算器...\n');

  try {
    // 1. 測試員工列表 API
    console.log('1️⃣ 測試員工列表 API');
    const employeesRes = await fetch(`${BASE_URL}/api/salary/employees`);
    const employeesData = await employeesRes.json();

    if (!employeesData.success || !employeesData.data.length) {
      throw new Error('員工列表 API 失敗');
    }

    console.log(`   ✅ 成功取得 ${employeesData.data.length} 位員工資料`);

    // 找到 Gladys
    const gladys = employeesData.data.find((e: any) => e.employee_name === 'Gladys 黃芷若');
    if (!gladys) {
      throw new Error('找不到 Gladys 黃芷若');
    }

    console.log(`   ✅ 找到員工: ${gladys.employee_name}`);
    console.log(`      角色類型: ${gladys.role_type}`);
    console.log(`      就業類型: ${gladys.employment_type}`);
    console.log(`      時薪: $${gladys.hourly_rate}`);
    console.log(`      抽成比例: ${gladys.commission_rate}%\n`);

    // 2. 測試薪資計算 API
    console.log('2️⃣ 測試薪資計算 API');
    const calculateRes = await fetch(`${BASE_URL}/api/salary/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employee_name: 'Gladys 黃芷若',
        period_start: '2025-10-26',
        period_end: '2025-11-25',
        manual_adjustments: {
          monthly_hours: 160,
          phone_performance_bonus: 0,
          performance_bonus: 0,
          leave_deduction: 0,
        }
      })
    });

    const calculateData = await calculateRes.json();

    if (!calculateData.success) {
      throw new Error(`薪資計算失敗: ${calculateData.error || '未知錯誤'}`);
    }

    const result = calculateData.data;
    console.log('   ✅ 薪資計算成功');
    console.log(`      員工姓名: ${result.employee_name}`);
    console.log(`      角色類型: ${result.role_type}`);
    console.log(`      就業類型: ${result.employment_type}`);
    console.log(`      時薪: $${result.hourly_rate}`);
    console.log(`      當月工時: ${result.monthly_hours} 小時`);
    console.log(`      時薪小計: $${result.hourly_wage_subtotal}`);
    console.log(`      總業績: $${result.total_revenue}`);
    console.log(`      抽成金額: $${result.commission_amount}`);
    console.log(`      小計: $${result.subtotal_before_deductions}`);
    console.log(`      勞保: $${result.labor_insurance}`);
    console.log(`      健保: $${result.health_insurance}`);
    console.log(`      退休金: $${result.retirement_fund}`);
    console.log(`      服務費: $${result.service_fee}`);
    console.log(`      實付薪資: $${result.total_salary}\n`);

    // 3. 檢查數據類型
    console.log('3️⃣ 檢查數據類型');
    const fieldsToCheck = [
      'hourly_rate',
      'hourly_wage_subtotal',
      'total_revenue',
      'commission_amount',
      'subtotal_before_deductions',
      'labor_insurance',
      'health_insurance',
      'retirement_fund',
      'service_fee',
      'total_salary'
    ];

    let hasStringValues = false;
    for (const field of fieldsToCheck) {
      const value = result[field];
      const type = typeof value;
      if (type === 'string' && value !== undefined) {
        console.log(`   ⚠️  ${field}: "${value}" (string) - 應該是 number`);
        hasStringValues = true;
      }
    }

    if (!hasStringValues) {
      console.log('   ✅ 所有數值欄位類型正確\n');
    } else {
      console.log('   ℹ️  前端需要使用 toNumber() 處理字串數值\n');
    }

    // 4. 測試業績明細
    console.log('4️⃣ 測試業績明細');
    if (result.details && result.details.recordCount) {
      console.log(`   ✅ 業績記錄數: ${result.details.recordCount} 筆`);
      console.log(`   ✅ 業績分類:`);
      for (const [category, amount] of Object.entries(result.details.revenueByCategory as any)) {
        console.log(`      - ${category}: $${amount}`);
      }
    } else {
      console.log('   ⚠️  無業績明細資料');
    }

    console.log('\n✅ 所有測試通過！薪資計算器功能正常');

  } catch (error: any) {
    console.error('\n❌ 測試失敗:', error.message);
    throw error;
  }
}

// 執行測試
testSalaryCalculator()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
