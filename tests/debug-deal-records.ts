/**
 * Debug script to check deal records in worksheets
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function debugDealRecords() {
  const pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL
  });

  try {
    const email = 'jitw331@gmail.com';
    const studentName = '鄭吉宏';

    console.log('\n=== 檢查 worksheets 中的成交記錄 ===\n');

    // Check all worksheets that might contain deal records
    const worksheetsQuery = `
      SELECT
        id,
        name,
        spreadsheet_id
      FROM worksheets
      WHERE name ILIKE '%成交%' OR name ILIKE '%高階%' OR name ILIKE '%deal%'
      ORDER BY name
    `;
    const worksheetsResult = await pool.query(worksheetsQuery);

    console.log(`📊 可能包含成交記錄的工作表 (${worksheetsResult.rows.length} 個):\n`);
    worksheetsResult.rows.forEach((w, idx) => {
      console.log(`  ${idx + 1}. ${w.name} (ID: ${w.id})`);
    });

    // Check data in worksheet_data for this student
    console.log(`\n\n🔍 查詢 "${studentName}" 的 worksheet_data 記錄:\n`);

    const dataQuery = `
      SELECT
        w.name as worksheet_name,
        wd.raw_data,
        wd.created_at
      FROM worksheet_data wd
      JOIN worksheets w ON wd.worksheet_id = w.id
      WHERE wd.raw_data::text ILIKE $1 OR wd.raw_data::text ILIKE $2
      ORDER BY wd.created_at DESC
      LIMIT 20
    `;
    const dataResult = await pool.query(dataQuery, [`%${studentName}%`, `%${email}%`]);

    console.log(`找到 ${dataResult.rows.length} 筆記錄:\n`);

    dataResult.rows.forEach((row, idx) => {
      console.log(`${idx + 1}. 工作表: ${row.worksheet_name}`);
      console.log(`   建立時間: ${row.created_at}`);

      // Try to extract relevant fields from raw_data
      const rawData = row.raw_data;
      const studentNameInData = rawData['學員姓名'] || rawData['studentName'] || rawData['name'];
      const dealAmount = rawData['成交金額'] || rawData['實收金額'] || rawData['dealAmount'] || rawData['actual_amount'];
      const packageName = rawData['方案名稱'] || rawData['packageName'] || rawData['package'];
      const dealDate = rawData['成交日期'] || rawData['dealDate'];

      console.log(`   學員: ${studentNameInData}`);
      if (dealAmount) console.log(`   成交金額: ${dealAmount}`);
      if (packageName) console.log(`   方案: ${packageName}`);
      if (dealDate) console.log(`   成交日期: ${dealDate}`);

      // Show all keys to understand the data structure
      const keys = Object.keys(rawData).filter(k =>
        k.includes('金額') || k.includes('成交') || k.includes('方案') ||
        k.includes('deal') || k.includes('amount') || k.includes('package')
      );
      if (keys.length > 0) {
        console.log(`   相關欄位: ${keys.join(', ')}`);
      }
      console.log('');
    });

    // Also check eods_for_closers table (if exists)
    console.log('\n🔍 檢查 eods_for_closers 表:\n');

    try {
      const eodsQuery = `
        SELECT
          student_name,
          student_email,
          deal_amount,
          actual_amount,
          package_name,
          deal_date,
          created_at
        FROM eods_for_closers
        WHERE student_email = $1 OR student_name = $2
        ORDER BY created_at DESC
      `;
      const eodsResult = await pool.query(eodsQuery, [email, studentName]);

      if (eodsResult.rows.length > 0) {
        console.log(`找到 ${eodsResult.rows.length} 筆成交記錄:\n`);
        eodsResult.rows.forEach((row, idx) => {
          console.log(`  ${idx + 1}. ${row.student_name}`);
          console.log(`     Email: ${row.student_email}`);
          console.log(`     成交金額: ${row.deal_amount}`);
          console.log(`     實收金額: ${row.actual_amount}`);
          console.log(`     方案: ${row.package_name}`);
          console.log(`     成交日期: ${row.deal_date}`);
          console.log('');
        });
      } else {
        console.log('  ❌ 無成交記錄');
      }
    } catch (err: any) {
      if (err.code === '42P01') {
        console.log('  ℹ️  eods_for_closers 表不存在');
      } else {
        throw err;
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
    console.log('\n✅ 除錯完成\n');
  }
}

debugDealRecords();
