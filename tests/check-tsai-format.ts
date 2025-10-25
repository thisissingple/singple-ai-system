import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';

async function checkTsaiFormat() {
  const pool = createPool();

  console.log('\n🔍 檢查蔡宇翔的推課分析格式...\n');

  try {
    // 查詢蔡宇翔的分析記錄
    const result = await queryDatabase(`
      SELECT
        id,
        student_name,
        teacher_name,
        class_date,
        overall_score,
        conversion_status,
        conversion_suggestions
      FROM teaching_quality_analysis
      WHERE student_name = '蔡宇翔'
      ORDER BY class_date DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ 找不到蔡宇翔的記錄');
      return;
    }

    const analysis = result.rows[0];
    console.log('✅ 找到蔡宇翔的記錄');
    console.log('  - ID:', analysis.id);
    console.log('  - 學員:', analysis.student_name);
    console.log('  - 教師:', analysis.teacher_name);
    console.log('  - 課程日期:', analysis.class_date);
    console.log('  - 評分:', analysis.overall_score);
    console.log('  - 轉換狀態:', analysis.conversion_status);

    console.log('\n📝 conversion_suggestions 結構:');
    console.log(JSON.stringify(analysis.conversion_suggestions, null, 2));

    if (analysis.conversion_suggestions) {
      const cs = analysis.conversion_suggestions;
      console.log('\n📊 欄位檢查:');
      console.log('  - 有 studentAnalysis:', !!cs.studentAnalysis);
      console.log('  - 有 salesStrategy:', !!cs.salesStrategy);
      console.log('  - 有 finalClosingScript:', !!cs.finalClosingScript);
      console.log('  - 有 conversionProbability:', !!cs.conversionProbability);
      console.log('  - 有 markdownOutput:', !!cs.markdownOutput);

      if (cs.studentAnalysis) {
        console.log('\n【studentAnalysis 內容】:');
        console.log('  - technicalIssues:', cs.studentAnalysis.technicalIssues);
        console.log('  - psychologicalIssues:', cs.studentAnalysis.psychologicalIssues);
        console.log('  - motivationSource:', cs.studentAnalysis.motivationSource);
        console.log('  - studentProfile:', cs.studentAnalysis.studentProfile);
      }

      if (cs.salesStrategy) {
        console.log('\n【salesStrategy 內容】:');
        console.log('  - painPointAmplification:', cs.salesStrategy.painPointAmplification?.substring(0, 80) + '...');
        console.log('  - dreamVision:', cs.salesStrategy.dreamVision?.substring(0, 80) + '...');
        console.log('  - productMatch:', cs.salesStrategy.productMatch);
        console.log('  - scriptDesign 數量:', cs.salesStrategy.scriptDesign?.length);
        console.log('  - closingScript:', cs.salesStrategy.closingScript?.substring(0, 80) + '...');
      }

      if (cs.conversionProbability) {
        console.log('\n【轉換機率】:', cs.conversionProbability, '%');
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

checkTsaiFormat();
