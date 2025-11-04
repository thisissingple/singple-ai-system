import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function checkEodsDeal() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    const email = 'jitw331@gmail.com';
    const studentName = '鄭吉宏';

    console.log('\n=== 檢查 eods_for_closers 成交記錄 ===\n');

    // Check deal records
    const query = `
      SELECT
        id,
        student_name,
        student_email,
        actual_amount,
        plan,
        package_price,
        deal_date,
        consultation_date,
        created_at
      FROM eods_for_closers
      WHERE student_email = $1 OR student_name ILIKE $2
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [email, `%${studentName}%`]);

    if (result.rows.length > 0) {
      console.log(`✅ 找到 ${result.rows.length} 筆成交記錄:\n`);
      result.rows.forEach((row, idx) => {
        console.log(`${idx + 1}. ID: ${row.id}`);
        console.log(`   姓名: ${row.student_name}`);
        console.log(`   Email: ${row.student_email}`);
        console.log(`   實收金額 (actual_amount): ${row.actual_amount}`);
        console.log(`   套餐價格 (package_price): ${row.package_price}`);
        console.log(`   方案 (plan): ${row.plan}`);
        console.log(`   成交日期: ${row.deal_date}`);
        console.log(`   諮詢日期: ${row.consultation_date}`);
        console.log(`   建立時間: ${row.created_at}`);
        console.log('');
      });

      console.log('🔍 根據 total-report-service 邏輯:');
      console.log(`   hasHighLevelDeal = dealAmount > 0`);
      const actualAmount = parseFloat(result.rows[0].actual_amount || '0');
      const packagePrice = parseFloat(result.rows[0].package_price || '0');
      const dealAmount = actualAmount || packagePrice;
      console.log(`   dealAmount = ${dealAmount} (actual_amount: ${actualAmount} or package_price: ${packagePrice})`);
      console.log(`   ➡️  如果 dealAmount > 0, 則 currentStatus = "已轉高"`);

    } else {
      console.log('❌ 無成交記錄');
      console.log('\n💡 這說明為什麼 total-report 計算出來的狀態是「體驗中」而不是「已轉高」');
      console.log('   因為沒有成交記錄,所以 dealAmount = 0');
      console.log('   根據計算邏輯:');
      console.log('     - hasHighLevelDeal = false (沒有成交)');
      console.log('     - hasAttendance = true (有出席記錄)');
      console.log('     - 所以 currentStatus = "體驗中"');
    }

    // Also show all students with deal records for comparison
    console.log('\n\n📊 所有有成交記錄的學生 (前 10 筆):\n');
    const allDealsQuery = `
      SELECT
        student_name,
        student_email,
        actual_amount,
        package_price,
        plan
      FROM eods_for_closers
      WHERE actual_amount IS NOT NULL AND actual_amount != ''
      ORDER BY created_at DESC
      LIMIT 10
    `;
    const allDealsResult = await pool.query(allDealsQuery);

    allDealsResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. ${row.student_name} (${row.student_email})`);
      console.log(`   實收金額: ${row.actual_amount}, 套餐價格: ${row.package_price}`);
      console.log(`   方案: ${row.plan}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
    console.log('\n✅ 檢查完成\n');
  }
}

checkEodsDeal();
