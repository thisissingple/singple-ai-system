import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkChenTranscript() {
  const pool = createPool();

  try {
    // 查詢陳冠霖的上課記錄
    const attendance = await queryDatabase(`
      SELECT
        id,
        student_name,
        teacher_name,
        class_date,
        class_transcript,
        created_at
      FROM trial_class_attendance
      WHERE student_name LIKE '%陳冠霖%'
      ORDER BY class_date DESC
    `);

    console.log('\n📊 陳冠霖的上課記錄:');
    console.log('總共找到', attendance.rows.length, '筆記錄\n');

    if (attendance.rows.length === 0) {
      console.log('❌ 沒有找到陳冠霖的上課記錄');
    } else {
      attendance.rows.forEach((row, index) => {
        console.log(`\n[${index + 1}] 上課記錄:`);
        console.log('  - ID:', row.id);
        console.log('  - 學員:', row.student_name);
        console.log('  - 教師:', row.teacher_name);
        console.log('  - 課程日期:', row.class_date);
        console.log('  - 有逐字稿:', row.class_transcript ? '是' : '否');
        if (row.class_transcript) {
          console.log('  - 逐字稿長度:', row.class_transcript.length, '字元');
          console.log('  - 逐字稿前 200 字元:', row.class_transcript.substring(0, 200));
        }
        console.log('  - 建立時間:', row.created_at);
      });

      // 檢查分析記錄使用的 transcript
      console.log('\n\n🔍 檢查教學品質分析記錄中的逐字稿...\n');

      const analysis = await queryDatabase(`
        SELECT
          id,
          attendance_id,
          student_name,
          transcript_text,
          conversion_suggestions,
          created_at
        FROM teaching_quality_analysis
        WHERE student_name LIKE '%陳冠霖%'
        ORDER BY created_at DESC
        LIMIT 1
      `);

      if (analysis.rows.length > 0) {
        const record = analysis.rows[0];
        console.log('分析記錄:');
        console.log('  - ID:', record.id);
        console.log('  - 關聯的 attendance_id:', record.attendance_id);
        console.log('  - 學員:', record.student_name);
        console.log('  - transcript_text 長度:', record.transcript_text?.length || 0);
        if (record.transcript_text) {
          console.log('  - transcript_text 前 200 字元:', record.transcript_text.substring(0, 200));
        }
        console.log('  - conversion_suggestions 型別:', typeof record.conversion_suggestions);
        console.log('  - conversion_suggestions 是否為空陣列:', Array.isArray(record.conversion_suggestions) && record.conversion_suggestions.length === 0);

        if (record.conversion_suggestions && typeof record.conversion_suggestions === 'object') {
          console.log('  - conversion_suggestions 內容:', JSON.stringify(record.conversion_suggestions).substring(0, 200));
        }

        // 檢查 attendance_id 是否匹配
        if (record.attendance_id) {
          const matchingAttendance = attendance.rows.find(a => a.id === record.attendance_id);
          if (matchingAttendance) {
            console.log('\n✅ 找到對應的上課記錄');
            console.log('  - attendance.class_transcript 長度:', matchingAttendance.class_transcript?.length || 0);
            console.log('  - analysis.transcript_text 長度:', record.transcript_text?.length || 0);

            if (matchingAttendance.class_transcript && record.transcript_text) {
              console.log('  - 兩者是否相同:', matchingAttendance.class_transcript === record.transcript_text);
            }
          } else {
            console.log('\n❌ 沒有找到對應的上課記錄（attendance_id 不匹配）');
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkChenTranscript();
