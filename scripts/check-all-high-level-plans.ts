import { createPool } from '../server/services/pg-client';

async function checkAllHighLevelPlans() {
  const pool = createPool();

  try {
    const query = `
      SELECT DISTINCT plan, COUNT(*) as count
      FROM eods_for_closers
      WHERE (plan LIKE '%高階一對一%' OR plan LIKE '%高音%')
        AND actual_amount IS NOT NULL
        AND actual_amount != 'NT$0.00'
      GROUP BY plan
      ORDER BY plan;
    `;

    const result = await pool.query(query);
    console.log('\n📋 所有包含「高階一對一」或「高音」的方案：\n');

    result.rows.forEach((row: any, idx: number) => {
      console.log(`${idx + 1}. ${row.plan} (${row.count} 筆)`);
    });

    console.log(`\n✅ 總共: ${result.rows.length} 種方案\n`);

    await pool.end();
  } catch (error: any) {
    console.error('查詢錯誤:', error.message);
    process.exit(1);
  }
}

checkAllHighLevelPlans();
