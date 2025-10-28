/**
 * Background Analysis Worker
 * Executes teaching quality analysis in the background
 *
 * This worker can be:
 * 1. Called immediately in a non-blocking way (setImmediate)
 * 2. Extended to a proper job queue (Bull, BullMQ) for production
 */

import { analysisJobService } from './analysis-job-service';
import { createPool } from './pg-client';
import * as teachingQualityGPT from './teaching-quality-gpt-service';
import { parseScoresFromMarkdown } from './parse-teaching-scores';

export interface ExecuteAnalysisParams {
  jobId: string;
  analysisId: string;
}

/**
 * Execute a single analysis job in the background
 */
export async function executeAnalysisJob(params: ExecuteAnalysisParams): Promise<void> {
  const { jobId, analysisId } = params;

  try {
    console.log(`🚀 Starting background analysis job: ${jobId}`);

    // Mark job as processing
    await analysisJobService.startJob(jobId);

    const pool = createPool('session');

    try {
      // Get existing analysis record
      await analysisJobService.updateProgress(jobId, 20);

      const analysisResult = await pool.query(`
        SELECT tqa.*, tca.class_transcript
        FROM teaching_quality_analysis tqa
        LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
        WHERE tqa.id = $1
      `, [analysisId]);

      if (analysisResult.rows.length === 0) {
        throw new Error('Analysis record not found');
      }

      const existingAnalysis = analysisResult.rows[0];

      // Check if has transcript
      if (!existingAnalysis.transcript_text && !existingAnalysis.class_transcript) {
        throw new Error('No transcript available for re-analysis');
      }

      const transcriptText = existingAnalysis.transcript_text || existingAnalysis.class_transcript;

      // Run AI analysis (this is the slow part - 30-60 seconds)
      await analysisJobService.updateProgress(jobId, 30);

      console.log(`🤖 Running AI analysis for ${existingAnalysis.student_name}...`);

      const analysis = await teachingQualityGPT.analyzeTeachingQuality(
        transcriptText,
        existingAnalysis.student_name,
        existingAnalysis.teacher_name || 'Unknown',
        existingAnalysis.class_topic
      );

      await analysisJobService.updateProgress(jobId, 70);

      // Parse scores from Markdown
      const markdownSource = analysis.conversionSuggestions?.markdownOutput || analysis.summary;
      const parsedScores = parseScoresFromMarkdown(markdownSource);

      await analysisJobService.updateProgress(jobId, 80);

      // Update existing analysis record
      await pool.query(`
        UPDATE teaching_quality_analysis
        SET overall_score = $1,
            teaching_score = $2,
            sales_score = $3,
            conversion_probability = $4,
            strengths = $5,
            weaknesses = $6,
            class_summary = $7,
            suggestions = $8,
            conversion_suggestions = $9,
            updated_at = NOW()
        WHERE id = $10
      `, [
        parsedScores.overallScore,
        parsedScores.teachingScore,
        parsedScores.salesScore,
        parsedScores.conversionProbability,
        JSON.stringify(analysis.strengths),
        JSON.stringify(analysis.weaknesses),
        analysis.summary,
        JSON.stringify(analysis.suggestions),
        analysis.conversionSuggestions ? JSON.stringify(analysis.conversionSuggestions) : null,
        analysisId
      ]);

      await analysisJobService.updateProgress(jobId, 90);

      // Delete old suggestion logs
      await pool.query(`
        DELETE FROM suggestion_execution_log
        WHERE analysis_id = $1
      `, [analysisId]);

      // Create new suggestion logs
      for (let i = 0; i < analysis.suggestions.length; i++) {
        await pool.query(`
          INSERT INTO suggestion_execution_log (analysis_id, suggestion_index, suggestion_text, is_executed)
          VALUES ($1, $2, $3, false)
        `, [analysisId, i, analysis.suggestions[i].suggestion]);
      }

      await pool.end();

      // Mark job as completed
      await analysisJobService.completeJob(jobId, {
        analysisId,
        studentName: existingAnalysis.student_name,
        overallScore: parsedScores.overallScore,
        teachingScore: parsedScores.teachingScore,
        salesScore: parsedScores.salesScore,
      });

      console.log(`✅ Background analysis job completed: ${jobId}`);
    } catch (error) {
      await pool.end();
      throw error;
    }
  } catch (error: any) {
    console.error(`❌ Background analysis job failed: ${jobId}`, error);

    // Mark job as failed
    await analysisJobService.failJob(jobId, error.message || 'Unknown error');

    throw error;
  }
}

/**
 * Start background analysis (non-blocking)
 * Returns immediately, analysis runs in background
 */
export function startBackgroundAnalysis(params: ExecuteAnalysisParams): void {
  // Use setImmediate to run in next event loop iteration
  // This allows the HTTP response to be sent immediately
  setImmediate(async () => {
    try {
      await executeAnalysisJob(params);
    } catch (error) {
      console.error('Background analysis error:', error);
      // Error is already logged and stored in job record
    }
  });

  console.log(`📋 Background analysis queued: job ${params.jobId}`);
}
