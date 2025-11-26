/**
 * 檢查「未知方案」的購買記錄
 */
import { createPool } from '../server/services/pg-client';

async function checkUnknownPackage() {
  const pool = createPool();

  try {
    console.log('🔍 檢查「李振維」的購買記錄...\n');

    const result = await pool.query(`
      SELECT
        package_name,
        purchase_date,
        created_at
      FROM trial_class_purchases
      WHERE student_name = '李振維'
      ORDER BY purchase_date
    `);

    console.log('📦 購買記錄:');
    console.table(result.rows);

    if (result.rows.length === 0) {
      console.log('\n❌ 找不到購買記錄');
    } else {
      console.log(`\n✅ 找到 ${result.rows.length} 筆記錄`);
      result.rows.forEach((row, index) => {
        console.log(`\n記錄 ${index + 1}:`);
        console.log(`  方案名稱: "${row.package_name}"`);
        console.log(`  購買日期: ${row.purchase_date}`);
      });
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await pool.end();
  }
}

checkUnknownPackage();
