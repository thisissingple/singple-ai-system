import { createPool, queryDatabase } from '../server/services/pg-client';

async function main() {
  const pool = createPool();

  // 查詢陳冠霖的所有分析記錄
  const analyses = await queryDatabase(pool, `
    SELECT
      id,
      student_name,
      overall_score,
      teaching_score,
      sales_score,
      conversion_probability,
      created_at::text
    FROM teaching_quality_analysis
    WHERE student_name LIKE '%陳冠霖%'
    ORDER BY created_at DESC
  `);

  console.log('\n=== 陳冠霖的所有分析記錄 ===\n');
  analyses.rows.forEach((row: any, idx: number) => {
    console.log(`記錄 ${idx + 1}:`);
    console.log(`  ID: ${row.id}`);
    console.log(`  Overall Score: ${row.overall_score}`);
    console.log(`  Teaching Score: ${row.teaching_score}`);
    console.log(`  Sales Score: ${row.sales_score}`);
    console.log(`  Conversion Probability: ${row.conversion_probability}`);
    console.log(`  Created: ${row.created_at}`);
    console.log('');
  });

  // 查詢列表頁面會顯示的數據
  const listData = await queryDatabase(pool, `
    SELECT
      tqa.id,
      tqa.student_name,
      tqa.overall_score,
      tqa.teaching_score,
      tqa.sales_score,
      tqa.conversion_probability
    FROM teaching_quality_analysis tqa
    WHERE tqa.student_name LIKE '%陳冠霖%'
    ORDER BY tqa.created_at DESC
    LIMIT 1
  `);

  console.log('\n=== 列表頁面應該顯示的數據（最新一筆） ===\n');
  if (listData.rows.length > 0) {
    const row = listData.rows[0];
    console.log(`Student: ${row.student_name}`);
    console.log(`Overall Score: ${row.overall_score}`);
    console.log(`Teaching Score: ${row.teaching_score}`);
    console.log(`Sales Score: ${row.sales_score}`);
    console.log(`Conversion Probability: ${row.conversion_probability}`);
  }

  await pool.end();
}

main().catch(console.error);
