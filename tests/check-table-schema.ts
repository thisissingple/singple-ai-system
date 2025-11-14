import { createPool } from '../server/services/pg-client';

async function checkSchema() {
  const pool = createPool();

  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'trial_class_purchases'
      ORDER BY ordinal_position
    `);

    console.log('📋 trial_class_purchases 表結構:');
    result.rows.forEach(r => {
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });

    // 查看前3筆資料
    const sample = await pool.query(`
      SELECT * FROM trial_class_purchases LIMIT 3
    `);

    console.log('\n📝 樣本資料 (前3筆):');
    sample.rows.forEach((row, idx) => {
      console.log(`\n[${idx + 1}]`, JSON.stringify(row, null, 2));
    });

  } finally {
    await pool.end();
  }
}

checkSchema();
