import { queryDatabase } from '../server/services/pg-client';
import { analyzeTeachingQuality } from '../server/services/teaching-quality-gpt-service';

async function regenerateChenAnalysis() {
  try {
    console.log('🔄 重新生成陳冠霖的教學品質分析...\n');

    // Find Chen Guanlin's attendance record
    const attendanceResult = await queryDatabase(`
      SELECT id, student_name, student_email, class_date, teacher_name, class_transcript
      FROM trial_class_attendance
      WHERE student_email = 'ssaa.42407@gmail.com'
      ORDER BY class_date DESC
      LIMIT 1
    `, []);

    if (attendanceResult.rows.length === 0) {
      console.log('❌ 找不到陳冠霖的上課記錄');
      return;
    }

    const attendance = attendanceResult.rows[0];
    console.log('✅ 找到上課記錄：');
    console.log(`   學員：${attendance.student_name}`);
    console.log(`   日期：${attendance.class_date}`);
    console.log(`   老師：${attendance.teacher_name}\n`);

    // Find existing analysis
    const analysisResult = await queryDatabase(`
      SELECT id FROM teaching_quality_analysis
      WHERE attendance_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `, [attendance.id]);

    if (analysisResult.rows.length === 0) {
      console.log('❌ 找不到現有的分析記錄');
      return;
    }

    const analysisId = analysisResult.rows[0].id;
    console.log(`✅ 找到分析記錄 ID: ${analysisId}\n`);

    // Prepare data for analysis
    const classData = {
      studentName: attendance.student_name,
      teacherName: attendance.teacher_name,
      classDate: attendance.class_date,
      classTranscript: attendance.class_transcript,
      studentEmail: attendance.student_email
    };

    console.log('🤖 開始使用新 Prompt 生成分析...');
    console.log('   （這可能需要 30-60 秒）\n');

    // Generate new analysis using the updated prompt
    const result = await analyzeTeachingQuality(
      classData.classTranscript,
      classData.studentName,
      classData.teacherName,
      classData.classDate.toISOString().split('T')[0],
      null // previousAnalysisId - not needed for first analysis
    );

    console.log('✅ AI 分析完成！\n');

    // Extract the markdown output from conversionSuggestions
    const markdownOutput = result.conversionSuggestions?.markdownOutput || result.summary;

    // Update the existing analysis record with new fields
    // Store the complete markdown report in class_summary
    await queryDatabase(`
      UPDATE teaching_quality_analysis
      SET
        class_summary = $1,
        conversion_suggestions = $2,
        overall_score = $3,
        strengths = $4,
        weaknesses = $5,
        suggestions = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      markdownOutput, // Full markdown report
      JSON.stringify(result.conversionSuggestions || {}),
      result.overallScore,
      JSON.stringify(result.strengths),
      JSON.stringify(result.weaknesses),
      JSON.stringify(result.suggestions),
      analysisId
    ]);

    console.log('✅ 分析報告已更新到數據庫\n');
    console.log('='.repeat(80));
    console.log('📊 新的分析報告預覽（前 2000 字）：');
    console.log('='.repeat(80));
    console.log(markdownOutput.substring(0, 2000));
    console.log('\n...(內容太長，已截斷)');
    console.log('='.repeat(80));

    console.log('\n✅ 完成！你現在可以到這裡查看：');
    console.log(`   http://localhost:5001/teaching-quality/${analysisId}`);

  } catch (error) {
    console.error('❌ 錯誤：', error);
  } finally {
    process.exit(0);
  }
}

regenerateChenAnalysis();
