import { queryDatabase } from '../server/services/pg-client.js';

async function checkIsShowData() {

  // 查看 is_show 欄位的值分佈
  const query = `
    SELECT
      is_show,
      COUNT(*) as count
    FROM eods_for_closers
    WHERE consultation_date IS NOT NULL
    GROUP BY is_show
    ORDER BY count DESC
    LIMIT 10
  `;

  const result = await queryDatabase(query, [], 'session');
  console.log('is_show 欄位值分佈:');
  console.table(result.rows);

  // 查看最近幾筆資料
  const sampleQuery = `
    SELECT
      student_name,
      consultation_date,
      is_show,
      deal_date
    FROM eods_for_closers
    WHERE consultation_date >= NOW() - INTERVAL '30 days'
    ORDER BY consultation_date DESC
    LIMIT 10
  `;

  const samples = await queryDatabase(sampleQuery, [], 'session');
  console.log('\n最近 10 筆資料範例:');
  console.table(samples.rows);

  process.exit(0);
}

checkIsShowData();
