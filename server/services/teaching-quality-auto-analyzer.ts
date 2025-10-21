/**
 * Teaching Quality Auto Analyzer
 * Automatically detects new trial_class_attendance records and analyzes them
 * Runs as a background service
 */

import { createPool, queryDatabase, insertAndReturn } from './pg-client';
import * as teachingQualityGPT from './teaching-quality-gpt-service';

const POLLING_INTERVAL = 60000; // 60 seconds
let isRunning = false;
let pollInterval: NodeJS.Timeout | null = null;

export function startAutoAnalyzer() {
  if (isRunning) {
    console.log('⚠️  Auto-analyzer already running');
    return;
  }

  isRunning = true;
  console.log('🤖 Starting Teaching Quality Auto-Analyzer...');
  console.log(`📊 Polling interval: ${POLLING_INTERVAL / 1000}s`);

  // Run immediately on start
  analyzeNewRecords();

  // Then run periodically
  pollInterval = setInterval(() => {
    analyzeNewRecords();
  }, POLLING_INTERVAL);
}

export function stopAutoAnalyzer() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isRunning = false;
  console.log('🛑 Teaching Quality Auto-Analyzer stopped');
}

async function analyzeNewRecords() {
  try {
    // Find all unanalyzed records with transcripts
    const result = await queryDatabase(`
      SELECT
        tca.id,
        tca.student_name,
        tca.teacher_name,
        tca.class_date,
        tca.class_transcript,
        tca.no_conversion_reason
      FROM trial_class_attendance tca
      WHERE tca.ai_analysis_id IS NULL
        AND tca.class_transcript IS NOT NULL
        AND tca.class_transcript != ''
      ORDER BY tca.created_at DESC
      LIMIT 10
    `);

    const records = result.rows;

    if (records.length === 0) {
      console.log('✅ No new records to analyze');
      return;
    }

    console.log(`🔍 Found ${records.length} new record(s) to analyze`);

    for (const record of records) {
      try {
        await analyzeRecord(record);
        console.log(`✅ Analyzed: ${record.student_name} (${record.teacher_name})`);
      } catch (error: any) {
        console.error(`❌ Failed to analyze ${record.student_name}:`, error.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Auto-analyzer error:', error);
  }
}

async function analyzeRecord(record: any) {
  try {
    console.log(`🤖 Analyzing: ${record.student_name} (${record.teacher_name})`);

    // Run AI analysis
    const analysis = await teachingQualityGPT.analyzeTeachingQuality(
      record.class_transcript,
      record.student_name,
      record.teacher_name || 'Unknown',
      undefined // No specific class topic
    );

    console.log(`📝 AI Analysis complete. Score: ${analysis.overallScore}/10`);

    // Save to database (insertAndReturn manages its own connection)
    const analysisResult = await insertAndReturn('teaching_quality_analysis', {
      attendance_id: record.id,
      teacher_id: null, // Nullable - no user lookup needed
      teacher_name: record.teacher_name,
      student_name: record.student_name,
      class_date: record.class_date,
      class_topic: null,
      transcript_text: record.class_transcript,
      transcript_file_url: null,
      overall_score: analysis.overallScore,
      strengths: JSON.stringify(analysis.strengths),
      weaknesses: JSON.stringify(analysis.weaknesses),
      class_summary: analysis.summary,
      suggestions: JSON.stringify(analysis.suggestions),
      conversion_suggestions: analysis.conversionSuggestions ? JSON.stringify(analysis.conversionSuggestions) : null,
      conversion_status: record.no_conversion_reason ? 'not_converted' : 'pending',
      analyzed_by: null // Auto-analyzed, no user
    });

    // Update attendance record with analysis reference (queryDatabase manages its own connection)
    await queryDatabase(`
      UPDATE trial_class_attendance
      SET ai_analysis_id = $1
      WHERE id = $2
    `, [analysisResult.id, record.id]);

    // Create suggestion execution log entries
    for (let i = 0; i < analysis.suggestions.length; i++) {
      await insertAndReturn('suggestion_execution_log', {
        analysis_id: analysisResult.id,
        suggestion_index: i,
        suggestion_text: analysis.suggestions[i].suggestion,
        is_executed: false
      });
    }

    console.log(`💾 Saved analysis result: ${analysisResult.id}`);

  } catch (error: any) {
    throw error;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, stopping auto-analyzer...');
  stopAutoAnalyzer();
});

process.on('SIGINT', () => {
  console.log('🔄 Received SIGINT, stopping auto-analyzer...');
  stopAutoAnalyzer();
});
