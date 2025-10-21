import 'dotenv/config';
import { analyzeTeachingQuality } from '../server/services/teaching-quality-gpt-service';
import { getSupabaseClient } from '../server/services/supabase-client';

async function main() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('Supabase client 尚未初始化，請確認環境變數 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY');
  }

  const studentName = '蔡宇翔';
  const teacherName = 'Karen';
  const targetDate = '2025-10-03';

  const { data, error } = await supabase
    .from('trial_class_attendance')
    .select('id, class_transcript, class_date, student_name, teacher_name, ai_analysis_id')
    .eq('student_name', studentName)
    .eq('teacher_name', teacherName)
    .gte('class_date', targetDate)
    .lte('class_date', targetDate)
    .limit(1);

  if (error) {
    throw new Error(`Supabase 查詢失敗: ${error.message}`);
  }

  const record = data?.[0];

  if (!record || !record.class_transcript) {
    throw new Error('找不到符合條件的逐字稿記錄 (student/teacher/date)');
  }

  const transcriptText = record.class_transcript.startsWith('WEBVTT')
    ? record.class_transcript
    : `WEBVTT\n\n${record.class_transcript}`;

  const analysis = await analyzeTeachingQuality(
    transcriptText,
    studentName,
    teacherName,
    '體驗課'
  );

  const analysisPayload = {
    overall_score: analysis.overallScore,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    class_summary: analysis.summary,
    suggestions: analysis.suggestions,
    conversion_suggestions: analysis.conversionSuggestions ?? null,
    transcript_text: transcriptText,
    ai_model: 'gpt-4o',
    ai_prompt_version: 'v2-double-bind',
    analyzed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (record.ai_analysis_id) {
    const { error: updateError } = await supabase
      .from('teaching_quality_analysis')
      .update(analysisPayload)
      .eq('id', record.ai_analysis_id);

    if (updateError) {
      throw new Error(`更新 teaching_quality_analysis 失敗: ${updateError.message}`);
    }

    await supabase
      .from('suggestion_execution_log')
      .delete()
      .eq('analysis_id', record.ai_analysis_id);

    const suggestionLogs = analysis.suggestions.map((suggestion, index) => ({
      analysis_id: record.ai_analysis_id,
      suggestion_index: index,
      suggestion_text: suggestion.suggestion,
      is_executed: false
    }));

    if (suggestionLogs.length > 0) {
      const { error: insertLogError } = await supabase
        .from('suggestion_execution_log')
        .insert(suggestionLogs);

      if (insertLogError) {
        throw new Error(`寫入 suggestion_execution_log 失敗: ${insertLogError.message}`);
      }
    }
  } else {
    throw new Error('該學員尚未建立 AI 分析記錄，請先執行自動分析流程');
  }

  console.log(JSON.stringify(analysis, null, 2));
}

main().catch((error) => {
  console.error('分析失敗:', error);
  process.exit(1);
});
