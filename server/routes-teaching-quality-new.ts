/**
 * New Teaching Quality API Endpoints
 * Auto-analysis from trial_class_attendance.class_transcript
 */

import { createPool, queryDatabase, insertAndReturn } from './services/pg-client';
import { getSupabaseClient } from './services/supabase-client';
import * as teachingQualityGPT from './services/teaching-quality-gpt-service';

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
            const records = allAttendanceByEmail.get(a.student_email) || [];
            records.push(a);
            allAttendanceByEmail.set(a.student_email, records);
          });
        }
      }

      if (studentEmails.length > 0) {
        const { data: purchaseData, error: purchaseError } = await supabase
          .from('trial_class_purchases')
          .select('student_email, package_name, remaining_classes')
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

            purchaseMap.set(p.student_email, {
              ...p,
              total_lessons: totalLessons
            });
          });
        }
      }

      // Format records
      const records = attendanceRecords?.map((row: any) => {
        const analysis = analysisMap.get(row.ai_analysis_id);
        const purchase = purchaseMap.get(row.student_email);

        const strengths = analysis?.strengths ? (typeof analysis.strengths === 'string' ? JSON.parse(analysis.strengths) : analysis.strengths) : [];
        const weaknesses = analysis?.weaknesses ? (typeof analysis.weaknesses === 'string' ? JSON.parse(analysis.weaknesses) : analysis.weaknesses) : [];
        const suggestions = analysis?.suggestions ? (typeof analysis.suggestions === 'string' ? JSON.parse(analysis.suggestions) : analysis.suggestions) : [];

        // Determine purchase status
        let purchaseStatus = 'pending';
        if (purchase) {
          purchaseStatus = 'converted';
        } else if (row.no_conversion_reason && row.no_conversion_reason.trim() !== '') {
          purchaseStatus = 'not_converted';
        }

        // Calculate remaining classes AT THIS CLASS DATE
        let calculatedRemaining = null;
        if (purchase) {
          const studentAttendance = allAttendanceByEmail.get(row.student_email) || [];
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
          conversion_status: analysis?.conversion_status || purchaseStatus
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

  // 0.1. Analyze single attendance record
  app.post('/api/teaching-quality/analyze-single/:attendanceId', isAuthenticated, async (req: any, res) => {
    try {
      const { attendanceId } = req.params;
      const pool = createPool('session'); // Use session mode to avoid "Tenant not found" error

      // Get attendance record
      const attendanceResult = await pool.query(`
        SELECT tca.*
        FROM trial_class_attendance tca
        WHERE tca.id = $1
      `, [attendanceId]);

      if (attendanceResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      const attendance = attendanceResult.rows[0];

      // Check if already analyzed
      if (attendance.ai_analysis_id) {
        await pool.end();
        return res.status(400).json({ error: 'This record has already been analyzed' });
      }

      // Check if has transcript
      if (!attendance.class_transcript || attendance.class_transcript.trim().length === 0) {
        await pool.end();
        return res.status(400).json({ error: 'No transcript available for this record' });
      }

      // Check permissions: teachers can only analyze their own classes
      if (req.user && req.user.role === 'teacher') {
        const userResult = await pool.query(`SELECT first_name, last_name FROM users WHERE id = $1`, [req.user.id]);
        if (userResult.rows.length > 0) {
          const teacherName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`.trim();
          if (teacherName !== attendance.teacher_name) {
            await pool.end();
            return res.status(403).json({ error: 'Permission denied' });
          }
        }
      }

      // Run AI analysis
      const analysis = await teachingQualityGPT.analyzeTeachingQuality(
        attendance.class_transcript,
        attendance.student_name,
        attendance.teacher_name || 'Unknown',
        null // No specific class topic
      );

      // Save to database
      const result = await insertAndReturn('teaching_quality_analysis', {
        attendance_id: attendanceId,
        teacher_id: null,
        teacher_name: attendance.teacher_name,
        student_name: attendance.student_name,
        class_date: attendance.class_date,
        class_topic: null,
        transcript_text: attendance.class_transcript,
        transcript_file_url: null,
        overall_score: analysis.overallScore,
        strengths: JSON.stringify(analysis.strengths),
        weaknesses: JSON.stringify(analysis.weaknesses),
        class_summary: analysis.summary,
        suggestions: JSON.stringify(analysis.suggestions),
        // Check if student has purchased by joining with trial_class_purchases
        conversion_status: attendance.no_conversion_reason ? 'not_converted' : 'pending',
        analyzed_by: req.user?.id || null
      });

      // Update attendance record with analysis reference
      await pool.query(`
        UPDATE trial_class_attendance
        SET ai_analysis_id = $1
        WHERE id = $2
      `, [result.id, attendanceId]);

      // Create suggestion execution log entries
      for (let i = 0; i < analysis.suggestions.length; i++) {
        await insertAndReturn('suggestion_execution_log', {
          analysis_id: result.id,
          suggestion_index: i,
          suggestion_text: analysis.suggestions[i].suggestion,
          is_executed: false
        });
      }

      await pool.end();

      res.json({
        success: true,
        data: {
          ...result,
          strengths: analysis.strengths,
          weaknesses: analysis.weaknesses,
          suggestions: analysis.suggestions
        }
      });
    } catch (error: any) {
      console.error('Single analysis failed:', error);
      res.status(500).json({ error: error.message });
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
}
