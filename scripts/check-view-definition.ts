import { createPool } from '../server/services/pg-client';

async function checkView() {
  const pool = createPool();

  try {
    // 查詢 view 定義
    const result = await pool.query(`
      SELECT definition
      FROM pg_views
      WHERE viewname = 'student_class_summary'
    `);

    console.log('📋 student_class_summary view definition:');
    console.log(result.rows[0]?.definition || 'View not found');

  } finally {
    await pool.end();
  }
}

checkView();
