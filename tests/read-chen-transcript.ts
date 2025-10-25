import { queryDatabase } from '../server/services/pg-client';

async function readChenTranscript() {
  try {
    console.log('🔍 查詢陳冠霖的課堂記錄...\n');

    // Query Chen Guanlin's class record
    const result = await queryDatabase(`
      SELECT
        id,
        student_name,
        student_email,
        class_date,
        teacher_name,
        class_transcript,
        no_conversion_reason
      FROM trial_class_attendance
      WHERE student_name LIKE '%陳冠霖%' OR student_email = 'ssaa.42407@gmail.com'
      ORDER BY class_date DESC
      LIMIT 1
    `, []);

    if (result.rows.length === 0) {
      console.log('❌ 找不到陳冠霖的記錄');
      return;
    }

    const record = result.rows[0];

    console.log('✅ 找到記錄：');
    console.log('學員姓名：', record.student_name);
    console.log('學員 Email：', record.student_email);
    console.log('上課日期：', record.class_date);
    console.log('授課老師：', record.teacher_name);
    console.log('未轉換原因：', record.no_conversion_reason || '(無)');
    console.log('\n' + '='.repeat(80));
    console.log('📝 課堂對話逐字稿：');
    console.log('='.repeat(80) + '\n');
    console.log(record.class_transcript || '(無逐字稿)');

  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    process.exit(0);
  }
}

readChenTranscript();
