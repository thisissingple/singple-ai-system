import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';
import { analyzeConversionOptimization } from '../server/services/teaching-quality-gpt-service';

async function fixChenAnalysis() {
  const pool = createPool();
  const analysisId = 'fb1dbdd0-283b-4a04-b8fd-b3e944375660';

  console.log('\n🔧 用正確的格式重新生成陳冠霖的推課分析...\n');

  try {
    // 1. 取得分析記錄
    const analysisResult = await queryDatabase(`
      SELECT
        id,
        student_name,
        teacher_name,
        transcript_text,
        overall_score,
        conversion_status
      FROM teaching_quality_analysis
      WHERE id = $1
    `, [analysisId]);

    if (analysisResult.rows.length === 0) {
      console.error('❌ 找不到分析記錄');
      return;
    }

    const analysis = analysisResult.rows[0];
    console.log('✅ 找到分析記錄');
    console.log('  - 學員:', analysis.student_name);
    console.log('  - 教師:', analysis.teacher_name);
    console.log('  - 評分:', analysis.overall_score);
    console.log('  - 逐字稿長度:', analysis.transcript_text?.length || 0);

    if (!analysis.transcript_text) {
      console.error('❌ 沒有逐字稿');
      return;
    }

    // 2. 呼叫正確的分析函數（使用 teaching-quality-gpt-service）
    console.log('\n📞 呼叫 OpenAI API（使用正確的 prompt）...');

    const conversionSuggestion = await analyzeConversionOptimization(
      analysis.transcript_text,
      analysis.student_name,
      analysis.teacher_name,
      `學員${analysis.student_name}，跟${analysis.teacher_name}老師上課。`
    );

    console.log('\n✅ OpenAI 回應成功');
    console.log('  - studentAnalysis:', Object.keys(conversionSuggestion.studentAnalysis));
    console.log('  - salesStrategy:', Object.keys(conversionSuggestion.salesStrategy));
    console.log('  - finalClosingScript 長度:', conversionSuggestion.finalClosingScript?.length || 0);
    console.log('  - conversionProbability:', conversionSuggestion.conversionProbability);

    // 3. 更新資料庫（注意：這次存的是正確的 ConversionSuggestion 物件，不是 markdownOutput）
    await queryDatabase(`
      UPDATE teaching_quality_analysis
      SET conversion_suggestions = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(conversionSuggestion), analysisId]);

    console.log('\n✅ 推課分析已更新到資料庫！');
    console.log('\n📝 生成的推課分析內容預覽:');
    console.log('\n【學員狀況分析】');
    console.log('技術面問題:', conversionSuggestion.studentAnalysis.technicalIssues);
    console.log('心理面問題:', conversionSuggestion.studentAnalysis.psychologicalIssues);
    console.log('動機來源:', conversionSuggestion.studentAnalysis.motivationSource);
    console.log('\n【成交策略】');
    console.log('痛點放大:', conversionSuggestion.salesStrategy.painPointAmplification?.substring(0, 100) + '...');
    console.log('夢想畫面:', conversionSuggestion.salesStrategy.dreamVision?.substring(0, 100) + '...');
    console.log('推薦產品:', conversionSuggestion.salesStrategy.productMatch);
    console.log('話術數量:', conversionSuggestion.salesStrategy.scriptDesign?.length || 0);
    console.log('\n【成交機率】:', conversionSuggestion.conversionProbability, '%');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

fixChenAnalysis();
