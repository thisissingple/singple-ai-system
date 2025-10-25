import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function checkAvailableAnalyses() {
  console.log('\n🔍 檢查可用的分析記錄...\n');

  try {
    const result = await queryDatabase(`
      SELECT
        tqa.id,
        tqa.student_name,
        tqa.class_date,
        tqa.conversion_status,
        tca.student_email,
        CASE
          WHEN tqa.conversion_suggestions IS NOT NULL
          AND tqa.conversion_suggestions::text != '[]'
          AND tqa.conversion_suggestions::text != 'null'
          THEN true
          ELSE false
        END as has_valid_analysis
      FROM teaching_quality_analysis tqa
      LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
      ORDER BY tqa.analyzed_at DESC
      LIMIT 10
    `);

    console.log('📊 最近 10 筆分析記錄:\n');

    result.rows.forEach((row: any, index: number) => {
      const status = row.has_valid_analysis ? '✅ 有完整分析' : '❌ 分析不完整';
      console.log(`${index + 1}. ${row.student_name}`);
      console.log(`   - ID: ${row.id}`);
      console.log(`   - Email: ${row.student_email || '未知'}`);
      console.log(`   - 日期: ${row.class_date}`);
      console.log(`   - 狀態: ${status}`);
      console.log(`   - URL: http://localhost:5001/teaching-quality/${row.id}`);
      console.log('');
    });

    // 找出第一個有完整分析的記錄
    const firstValid = result.rows.find((row: any) => row.has_valid_analysis);

    if (firstValid) {
      console.log('✨ 推薦測試這個學員:');
      console.log(`   姓名: ${firstValid.student_name}`);
      console.log(`   Email: ${firstValid.student_email || '未知'}`);
      console.log(`   URL: http://localhost:5001/teaching-quality/${firstValid.id}`);
    } else {
      console.log('⚠️  沒有找到完整的分析記錄');
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }
}

checkAvailableAnalyses();
