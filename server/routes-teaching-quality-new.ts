/**
 * New Teaching Quality API Endpoints
 * Auto-analysis from trial_class_attendance.class_transcript
 */

import { createPool, queryDatabase, insertAndReturn } from './services/pg-client';
import { getSupabaseClient } from './services/supabase-client';
import * as teachingQualityGPT from './services/teaching-quality-gpt-service';
import { parseScoresFromMarkdown } from './services/parse-teaching-scores';
import { getOrCreateStudentKB, addDataSourceRef } from './services/student-knowledge-service';
import { parseNumberField } from './services/reporting/field-mapping-v2';

export function registerTeachingQualityRoutes(app: any, isAuthenticated: any) {
  // 0. Get student records with analysis status (for main list page)
  app.get('/api/teaching-quality/student-records', isAuthenticated, async (req: any, res) => {
    try {
      const supabase = getSupabaseClient();
      const teacherFilter = req.query.teacher as string;
      const searchQuery = req.query.search as string; // 新增：搜尋關鍵字

      // Build query using Supabase Client
      let attendanceQuery = supabase
        .from('trial_class_attendance')
        .select(`
          id,
          student_name,
          student_email,
          teacher_name,
          class_date,
          class_transcript,
          no_conversion_reason,
          ai_analysis_id
        `)
        .order('class_date', { ascending: false })
        .limit(200);

      // 新增：搜尋功能（學員名稱或 email）
      if (searchQuery && searchQuery.trim() !== '') {
        attendanceQuery = attendanceQuery.or(`student_name.ilike.%${searchQuery}%,student_email.ilike.%${searchQuery}%`);
      }

      // Permission check: teachers can only see their own classes
      if (req.user && req.user.role === 'teacher') {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', req.user.id)
          .single();

        if (!userError && userData) {
          const teacherName = `${userData.first_name} ${userData.last_name}`.trim();
          attendanceQuery = attendanceQuery.eq('teacher_name', teacherName);
        }
      } else if (teacherFilter && teacherFilter !== 'all') {
        // Filter by teacher if specified (non-teacher users)
        attendanceQuery = attendanceQuery.eq('teacher_name', teacherFilter);
      }

      const { data: attendanceRecords, error: attendanceError } = await attendanceQuery;

      if (attendanceError) throw attendanceError;

      // Get analysis data for records that have ai_analysis_id
      const analysisIds = attendanceRecords
        ?.filter(r => r.ai_analysis_id)
        .map(r => r.ai_analysis_id) || [];

      let analysisMap = new Map();
      if (analysisIds.length > 0) {
        const { data: analysisData, error: analysisError } = await supabase
          .from('teaching_quality_analysis')
          .select('id, overall_score, strengths, weaknesses, suggestions, class_summary, conversion_status')
          .in('id', analysisIds);

        if (!analysisError && analysisData) {
          analysisData.forEach(a => analysisMap.set(a.id, a));
        }
      }

      // Get purchase data for students and calculate remaining classes dynamically
      // Keep original emails for database queries
      const studentEmails = attendanceRecords?.map(r => r.student_email).filter(Boolean) || [];
      let purchaseMap = new Map();

      // Get ALL attendance records for calculating "remaining classes at that time"
      let allAttendanceByEmail = new Map<string, any[]>();
      if (studentEmails.length > 0) {
        const { data: allAttendance, error: allAttendanceError } = await supabase
          .from('trial_class_attendance')
          .select('student_email, class_date')
          .in('student_email', studentEmails)
          .order('class_date', { ascending: true });

        if (!allAttendanceError && allAttendance) {
          allAttendance.forEach((a: any) => {
            // Use lowercase email as Map key for case-insensitive matching
            const normalizedEmail = a.student_email?.toLowerCase();
            const records = allAttendanceByEmail.get(normalizedEmail) || [];
            records.push(a);
            allAttendanceByEmail.set(normalizedEmail, records);
          });
        }
      }

      if (studentEmails.length > 0) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('trial_class_purchases')
          .select('student_email, package_name, remaining_classes, current_status')
          .in('student_email', studentEmails);

        if (!purchaseError && purchaseData) {
          purchaseData.forEach((p: any) => {
            // 假設「初學專案」是 4 堂，「高音pro」是 2 堂，「高音終極方程式」是 1 堂
            let totalLessons = 4; // 預設
            if (p.package_name?.includes('pro')) {
              totalLessons = 2;
            } else if (p.package_name?.includes('終極')) {
              totalLessons = 1;
            } else if (p.package_name?.includes('12堂')) {
              totalLessons = 12;
            }

            // Normalize email to lowercase for consistent matching
            const normalizedEmail = p.student_email?.toLowerCase();
            purchaseMap.set(normalizedEmail, {
              ...p,
              total_lessons: totalLessons
            });
          });
        }
      }

      // 🆕 Query eods_for_closers to calculate conversion status (same logic as total-report)
      // This ensures consistency between "體驗課分析" and "學生跟進" pages
      let dealAmountMap = new Map<string, number>();
      if (studentEmails.length > 0) {
        const { data: dealData, error: dealError } = await supabase
          .from('eods_for_closers')
          .select('student_email, actual_amount, package_price, plan')
          .in('student_email', studentEmails);

        if (!dealError && dealData) {
          dealData.forEach((d: any) => {
            const normalizedEmail = d.student_email?.toLowerCase();
            if (!normalizedEmail) return;

            // Parse amounts using parseNumberField to handle "NT$3,000.00" format
            const actualAmount = parseNumberField(d.actual_amount) || 0;
            const packagePrice = parseNumberField(d.package_price) || 0;
            const dealAmount = actualAmount || packagePrice;

            // Check if it's a high-level plan (高階一對一 or 高音)
            const isHighLevelPlan = d.plan?.includes('高階一對一') || d.plan?.includes('高音');

            // Only count high-level deals
            if (isHighLevelPlan && dealAmount > 0) {
              const currentTotal = dealAmountMap.get(normalizedEmail) || 0;
              dealAmountMap.set(normalizedEmail, currentTotal + dealAmount);
            }
          });
        }
      }

      // Format records
      const records = attendanceRecords?.map((row: any) => {
        const analysis = analysisMap.get(row.ai_analysis_id);
        // Normalize email for lookup
        const normalizedEmail = row.student_email?.toLowerCase();
        const purchase = purchaseMap.get(normalizedEmail);

        const strengths = analysis?.strengths ? (typeof analysis.strengths === 'string' ? JSON.parse(analysis.strengths) : analysis.strengths) : [];
        const weaknesses = analysis?.weaknesses ? (typeof analysis.weaknesses === 'string' ? JSON.parse(analysis.weaknesses) : analysis.weaknesses) : [];
        const suggestions = analysis?.suggestions ? (typeof analysis.suggestions === 'string' ? JSON.parse(analysis.suggestions) : analysis.suggestions) : [];

        // 🆕 Calculate conversion status using the same logic as total-report-service
        // Priority: 已轉高 > 未轉高 > 體驗中 > 未開始
        let conversionStatus = null;
        const hasAttendance = true; // We're already looking at an attendance record
        const hasHighLevelDeal = (dealAmountMap.get(normalizedEmail) || 0) > 0;

        // Use normalized email for Map lookup
        const studentAttendance = allAttendanceByEmail.get(normalizedEmail) || [];
        const noRemainingClasses = purchase?.total_lessons && studentAttendance.length >= purchase.total_lessons;

        if (hasHighLevelDeal) {
          // 1. 優先級最高：有成交記錄 → 已轉高
          conversionStatus = '已轉高';
        } else if (noRemainingClasses && hasAttendance) {
          // 2. 剩餘堂數 = 0 且沒有成交 → 未轉高
          conversionStatus = '未轉高';
        } else if (hasAttendance) {
          // 3. 有打卡記錄 → 體驗中
          conversionStatus = '體驗中';
        } else {
          // 4. 沒有打卡記錄 → 未開始 (此分支在此 API 不會執行,因為我們只查詢有出席記錄的學生)
          conversionStatus = '未開始';
        }

        // Calculate remaining classes AT THIS CLASS DATE
        let calculatedRemaining = null;
        if (purchase) {
          // Use normalized email for Map lookup
          const studentAttendance = allAttendanceByEmail.get(normalizedEmail) || [];
          // Count classes BEFORE or ON this class date
          const classesBeforeOrOn = studentAttendance.filter((a: any) => {
            const aDate = new Date(a.class_date);
            const rowDate = new Date(row.class_date);
            return aDate <= rowDate;
          }).length;

          // Remaining = Total - Classes completed (including this one)
          calculatedRemaining = Math.max(0, purchase.total_lessons - classesBeforeOrOn);
        }

        return {
          attendance_id: row.id,
          student_name: row.student_name,
          teacher_name: row.teacher_name,
          class_date: row.class_date,
          has_transcript: !!row.class_transcript && row.class_transcript.trim().length > 0,
          id: analysis?.id || null,
          overall_score: analysis?.overall_score || null,

          // Brief summaries for list view
          strengths_summary: strengths.length > 0 ? strengths[0].point : null,
          weaknesses_summary: weaknesses.length > 0 ? weaknesses[0].point : null,
          suggestions_summary: suggestions.length > 0 ? suggestions[0].suggestion : null,

          // Full data for detail view
          strengths: strengths,
          weaknesses: weaknesses,
          suggestions: suggestions,
          class_summary: analysis?.class_summary || null,

          // Purchase info (使用動態計算的剩餘堂數 - 基於該上課日期)
          package_name: purchase?.package_name || null,
          remaining_classes: calculatedRemaining !== null ? `${calculatedRemaining} 堂` : null,
          conversion_status: conversionStatus
        };
      }) || [];

      // Get teacher list with count
      let teacherQuery = supabase
        .from('trial_class_attendance')
        .select('teacher_name', { count: 'exact' })
        .not('teacher_name', 'is', null);

      if (req.user && req.user.role === 'teacher') {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('first_name, last_name')
          .eq('id', req.user.id)
          .single();

        if (!userError && userData) {
          const teacherName = `${userData.first_name} ${userData.last_name}`.trim();
          teacherQuery = teacherQuery.eq('teacher_name', teacherName);
        }
      }

      const { data: teacherData, error: teacherError } = await teacherQuery;

      if (teacherError) throw teacherError;

      // Aggregate teacher counts manually
      const teacherCounts = new Map();
      teacherData?.forEach((t: any) => {
        const count = teacherCounts.get(t.teacher_name) || 0;
        teacherCounts.set(t.teacher_name, count + 1);
      });

      const teachers = Array.from(teacherCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => a.name.localeCompare(b.name));

      res.json({
        success: true,
        data: {
          records,
          teachers
        }
      });
    } catch (error: any) {
      console.error('Failed to fetch student records:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 0.1. Analyze single attendance record with SSE progress
  app.post('/api/teaching-quality/analyze-single/:attendanceId', isAuthenticated, async (req: any, res) => {
    // Check if client wants SSE progress updates
    const wantsSSE = req.headers.accept?.includes('text/event-stream');

    // If SSE requested, set up streaming headers
    if (wantsSSE) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
    }

    // Helper to send SSE progress
    const sendProgress = (percentage: number, message: string, estimatedSecondsRemaining?: number) => {
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ percentage, message, estimatedSecondsRemaining })}\n\n`);
      }
    };

    const startTime = Date.now();
    const estimateTimeRemaining = (currentPercentage: number) => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      if (currentPercentage <= 0) return null;
      const totalEstimated = (elapsed / currentPercentage) * 100;
      return Math.round(totalEstimated - elapsed);
    };

    try {
      const { attendanceId } = req.params;
      const pool = createPool('session'); // Use session mode to avoid "Tenant not found" error

      sendProgress(5, '正在載入課堂記錄...');

      // Get attendance record
      const attendanceResult = await pool.query(`
        SELECT tca.*
        FROM trial_class_attendance tca
        WHERE tca.id = $1
      `, [attendanceId]);

      if (attendanceResult.rows.length === 0) {
        await pool.end();
        if (wantsSSE) {
          res.write(`data: ${JSON.stringify({ error: 'Attendance record not found' })}\n\n`);
          return res.end();
        }
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      const attendance = attendanceResult.rows[0];

      // Check if already analyzed
      if (attendance.ai_analysis_id) {
        await pool.end();
        if (wantsSSE) {
          res.write(`data: ${JSON.stringify({ error: 'This record has already been analyzed' })}\n\n`);
          return res.end();
        }
        return res.status(400).json({ error: 'This record has already been analyzed' });
      }

      // Check if has transcript
      if (!attendance.class_transcript || attendance.class_transcript.trim().length === 0) {
        await pool.end();
        if (wantsSSE) {
          res.write(`data: ${JSON.stringify({ error: 'No transcript available for this record' })}\n\n`);
          return res.end();
        }
        return res.status(400).json({ error: 'No transcript available for this record' });
      }

      // Check permissions: teachers can only analyze their own classes
      if (req.user && req.user.role === 'teacher') {
        const userResult = await pool.query(`SELECT first_name, last_name FROM users WHERE id = $1`, [req.user.id]);
        if (userResult.rows.length > 0) {
          const teacherName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim();
          if (teacherName !== attendance.teacher_name) {
            await pool.end();
            if (wantsSSE) {
              res.write(`data: ${JSON.stringify({ error: 'Permission denied' })}\n\n`);
              return res.end();
            }
            return res.status(403).json({ error: 'Permission denied' });
          }
        }
      }

      sendProgress(15, '正在解析課堂逐字稿...', estimateTimeRemaining(15));

      // Run AI analysis
      sendProgress(25, '正在進行 AI 教學品質分析...', estimateTimeRemaining(25));

      const analysis = await teachingQualityGPT.analyzeTeachingQuality(
        attendance.class_transcript,
        attendance.student_name,
        attendance.teacher_name || 'Unknown',
        null // No specific class topic
      );

      sendProgress(80, '正在處理分析結果...', estimateTimeRemaining(80));

      // Parse scores from Markdown (Phase 32-33: Dual score system)
      // Fix: Use markdownOutput if available, otherwise fall back to summary
      const markdownSource = analysis.conversionSuggestions?.markdownOutput || analysis.summary;
      const parsedScores = parseScoresFromMarkdown(markdownSource);

      sendProgress(85, '正在儲存分析結果到資料庫...', estimateTimeRemaining(85));

      // Save to database
      // Fix: Validate analyzed_by is a valid UUID before saving
      const analyzedBy = req.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user.id)
        ? req.user.id
        : null;

      const result = await insertAndReturn('teaching_quality_analysis', {
        attendance_id: attendanceId,
        teacher_id: null,
        teacher_name: attendance.teacher_name,
        student_name: attendance.student_name,
        class_date: attendance.class_date,
        class_topic: null,
        transcript_text: attendance.class_transcript,
        transcript_file_url: null,
        overall_score: parsedScores.overallScore,        // 0-100 calculated score
        teaching_score: parsedScores.teachingScore,      // 0-25
        sales_score: parsedScores.salesScore,            // 0-25
        conversion_probability: parsedScores.conversionProbability, // 0-100
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        class_summary: analysis.summary,
        suggestions: JSON.stringify(analysis.suggestions),
        conversion_suggestions: analysis.conversionSuggestions ? JSON.stringify(analysis.conversionSuggestions) : null,  // 儲存完整的推課建議內容
        // Check if student has purchased by joining with trial_class_purchases
        conversion_status: attendance.no_conversion_reason ? 'not_converted' : 'pending',
        analyzed_by: analyzedBy
      });

      sendProgress(90, '正在更新課堂記錄...', estimateTimeRemaining(90));

      // Update attendance record with analysis reference
      await pool.query(`
        UPDATE trial_class_attendance
        SET ai_analysis_id = $1
        WHERE id = $2
      `, [result.id, attendanceId]);

      sendProgress(95, '正在建立建議執行記錄...', estimateTimeRemaining(95));

      // Create suggestion execution log entries
      for (let i = 0; i < analysis.suggestions.length; i++) {
        await insertAndReturn('suggestion_execution_log', {
          analysis_id: result.id,
          suggestion_index: i,
          suggestion_text: analysis.suggestions[i].suggestion,
          is_executed: false
        });
      }

      sendProgress(98, '正在儲存到學生知識庫...', estimateTimeRemaining(98));

      // Auto-save analysis to student knowledge base
      try {
        if (attendance.student_email) {
          // Ensure student KB exists
          await getOrCreateStudentKB(attendance.student_email, attendance.student_name);

          // Add this analysis to data_sources.ai_analyses
          await addDataSourceRef(attendance.student_email, 'ai_analyses', result.id);

          console.log(`✅ Auto-saved analysis ${result.id} to knowledge base for ${attendance.student_name}`);
        }
      } catch (kbError) {
        // Don't fail the whole request if KB save fails
        console.error('⚠️ Failed to save to knowledge base:', kbError);
      }

      await pool.end();

      sendProgress(100, '分析完成！', 0);

      const responseData = {
        success: true,
        data: {
          ...result,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          suggestions: analysis.suggestions
        }
      };

      // Send final result and close connection
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ ...responseData, complete: true })}\n\n`);
        res.end();
      } else {
        res.json(responseData);
      }
    } catch (error: any) {
      console.error('Single analysis failed:', error);
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ error: error.message, complete: true })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // 0.2. Batch analyze all unanalyzed records
  app.post('/api/teaching-quality/analyze-batch', isAuthenticated, async (req: any, res) => {
    try {
      const teacherFilter = req.query.teacher as string;
      const pool = createPool('session'); // Use session mode to avoid "Tenant not found" error

      // Get all unanalyzed attendance records with transcripts
      let query = `
        SELECT tca.id, tca.student_name, tca.teacher_name, tca.class_date,
               tca.class_transcript, tca.no_conversion_reason
        FROM trial_class_attendance tca
        WHERE tca.ai_analysis_id IS NULL
          AND tca.class_transcript IS NOT NULL
          AND tca.class_transcript != ''
      `;

      const params: any[] = [];
      let paramIndex = 1;

      if (teacherFilter && teacherFilter !== 'all') {
        query += ` AND tca.teacher_name = $${paramIndex}`;
        params.push(teacherFilter);
        paramIndex++;
      }

      // Permission check: teachers can only analyze their own classes
      if (req.user && req.user.role === 'teacher') {
        const userResult = await pool.query(`
          SELECT first_name, last_name FROM users WHERE id = $1
        `, [req.user.id]);

        if (userResult.rows.length > 0) {
          query += ` AND tca.teacher_name = $${paramIndex}`;
          params.push(`${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim());
          paramIndex++;
        }
      }

      query += ` LIMIT 50`; // Limit batch size

      const result = await pool.query(query, params);
      const records = result.rows;

      console.log(`📊 Batch analysis: Found ${records.length} records to analyze`);

      let analyzed = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          // Run AI analysis
          const analysis = await teachingQualityGPT.analyzeTeachingQuality(
            record.class_transcript,
            record.student_name,
            record.teacher_name || 'Unknown',
            null
          );

          // Save to database
          const analysisResult = await insertAndReturn('teaching_quality_analysis', {
            attendance_id: record.id,
            teacher_id: null, // Simplified - no user lookup
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
            conversion_status: record.no_conversion_reason ? 'not_converted' : 'pending',
            analyzed_by: req.user?.id || null
          });

          // Update attendance record
          await pool.query(`
            UPDATE trial_class_attendance
            SET ai_analysis_id = $1
            WHERE id = $2
          `, [analysisResult.id, record.id]);

          // Create suggestion logs
          for (let i = 0; i < analysis.suggestions.length; i++) {
            await insertAndReturn('suggestion_execution_log', {
              analysis_id: analysisResult.id,
              suggestion_index: i,
              suggestion_text: analysis.suggestions[i].suggestion,
              is_executed: false
            });
          }

          analyzed++;
          console.log(`✅ Analyzed ${analyzed}/${records.length}: ${record.student_name}`);

        } catch (error: any) {
          console.error(`❌ Failed to analyze ${record.student_name}:`, error.message);
          errors.push(`${record.student_name}: ${error.message}`);
        }
      }

      await pool.end();

      res.json({
        success: true,
        data: {
          total: records.length,
          analyzed,
          failed: errors.length,
          errors
        }
      });
    } catch (error: any) {
      console.error('Batch analysis failed:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 0.3. Re-analyze existing analysis record (Background execution)
  app.post('/api/teaching-quality/reanalyze/:analysisId', isAuthenticated, async (req: any, res) => {
    try {
      const { analysisId } = req.params;
      const pool = createPool('session');

      // Verify analysis record exists
      const analysisResult = await pool.query(`
        SELECT tqa.*, tca.class_transcript
        FROM teaching_quality_analysis tqa
        LEFT JOIN trial_class_attendance tca ON tqa.attendance_id = tca.id
        WHERE tqa.id = $1
      `, [analysisId]);

      if (analysisResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Analysis record not found' });
      }

      const existingAnalysis = analysisResult.rows[0];

      // Check if has transcript
      if (!existingAnalysis.transcript_text && !existingAnalysis.class_transcript) {
        await pool.end();
        return res.status(400).json({ error: 'No transcript available for re-analysis' });
      }

      await pool.end();

      // Create analysis job
      const { analysisJobService } = await import('./services/analysis-job-service');
      const { startBackgroundAnalysis } = await import('./services/background-analysis-worker');

      const job = await analysisJobService.createJob({
        analysisId,
        jobType: 'reanalysis',
        createdBy: req.user?.id || null
      });

      // Start background analysis (non-blocking)
      startBackgroundAnalysis({
        jobId: job.id,
        analysisId
      });

      // Return immediately with job ID
      res.json({
        success: true,
        message: 'Re-analysis started in background',
        jobId: job.id,
        status: 'pending'
      });
    } catch (error: any) {
      console.error('Failed to start re-analysis:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // 0.4. Get analysis job status (for polling)
  app.get('/api/teaching-quality/job-status/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const { analysisJobService } = await import('./services/analysis-job-service');

      const job = await analysisJobService.getJob(jobId);

      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          analysisId: job.analysis_id,
          status: job.status,
          progress: job.progress,
          errorMessage: job.error_message,
          result: job.result,
          createdAt: job.created_at,
          startedAt: job.started_at,
          completedAt: job.completed_at
        }
      });
    } catch (error: any) {
      console.error('Failed to get job status:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
