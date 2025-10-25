import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkChenAnalysis() {
  const pool = createPool();

  try {
    // 查詢陳冠霖的分析記錄
    const analyses = await queryDatabase(`
      SELECT
        tqa.id,
        tqa.student_name,
        tqa.teacher_name,
        tqa.class_date,
        tqa.overall_score,
        tqa.conversion_status,
        tqa.conversion_suggestions IS NOT NULL as has_suggestions,
        tqa.created_at
      FROM teaching_quality_analysis tqa
      WHERE tqa.student_name LIKE '%陳冠霖%'
      ORDER BY tqa.created_at DESC
    `);

    console.log('\n📊 陳冠霖的分析記錄:');
    console.log('總共找到', analyses.rows.length, '筆記錄\n');

    if (analyses.rows.length === 0) {
      console.log('❌ 沒有找到陳冠霖的分析記錄');
    } else {
      analyses.rows.forEach((row, index) => {
        console.log(`\n[${index + 1}] 分析記錄:`);
        console.log('  - ID:', row.id);
        console.log('  - 學員:', row.student_name);
        console.log('  - 教師:', row.teacher_name);
        console.log('  - 課程日期:', row.class_date);
        console.log('  - 評分:', row.overall_score);
        console.log('  - 轉換狀態:', row.conversion_status);
        console.log('  - 有建議:', row.has_suggestions ? '是' : '否');
        console.log('  - 建立時間:', row.created_at);
      });

      // 檢查第一筆記錄的詳細資料
      if (analyses.rows.length > 0) {
        const firstId = analyses.rows[0].id;
        console.log(`\n\n🔍 檢查第一筆記錄 (ID: ${firstId}) 的詳細內容...\n`);

        const detail = await queryDatabase(`
          SELECT
            conversion_suggestions,
            transcript_text
          FROM teaching_quality_analysis
          WHERE id = $1
        `, [firstId]);

        if (detail.rows[0]) {
          const suggestions = detail.rows[0].conversion_suggestions;
          const transcript = detail.rows[0].transcript_text;

          console.log('conversion_suggestions 型別:', typeof suggestions);
          console.log('conversion_suggestions 是否為 null:', suggestions === null);

          if (suggestions && typeof suggestions === 'object') {
            console.log('\nconversion_suggestions 欄位:');
            console.log('  - markdownOutput 存在:', 'markdownOutput' in suggestions);
            console.log('  - 所有 keys:', Object.keys(suggestions));
            console.log('  - 完整內容:', JSON.stringify(suggestions, null, 2).substring(0, 500));
            if ('markdownOutput' in suggestions) {
              console.log('  - markdownOutput 長度:', suggestions.markdownOutput?.length || 0);
              console.log('  - markdownOutput 前 200 字元:', suggestions.markdownOutput?.substring(0, 200));
            }
          } else {
            console.log('\nconversion_suggestions 內容:', suggestions);
          }

          console.log('\ntranscript_text:', transcript ? `${transcript.length} 字元` : 'null');
        }
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkChenAnalysis();
