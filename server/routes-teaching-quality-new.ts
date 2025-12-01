/**
 * New Teaching Quality API Endpoints
 * Auto-analysis from trial_class_attendance.class_transcript
 */

import { getSharedPool, queryDatabase, insertAndReturn } from './services/pg-client';

// 使用共享連線池（不再每次調用 pool.end()）
const createPool = (mode: 'transaction' | 'session' = 'transaction') => getSharedPool(mode);
import { getSupabaseClient } from './services/supabase-client';
import * as teachingQualityGPT from './services/teaching-quality-gpt-service';
import { parseScoresFromMarkdown } from './services/parse-teaching-scores';
import { getOrCreateStudentKB, addDataSourceRef } from './services/student-knowledge-service';
import { parseNumberField } from './services/reporting/field-mapping-v2';

/**
 * course_plans 快取 - 從資料庫載入方案堂數對照表
 * 格式: { "初學專案": 4, "高音pro": 2, ... }
 */
let coursePlansCache: Map<string, number> | null = null;
let coursePlansCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分鐘快取

/**
 * 載入或取得 course_plans 快取
 */
async function getCoursePlansCache(): Promise<Map<string, number>> {
  const now = Date.now();

  // 如果快取存在且未過期，直接返回
  if (coursePlansCache && (now - coursePlansCacheTime) < CACHE_TTL) {
    return coursePlansCache;
  }

  // 從資料庫載入
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('course_plans')
      .select('plan_name, total_classes')
      .eq('is_active', true);

    if (error) {
      console.error('❌ 載入 course_plans 失敗:', error);
      // 如果有舊快取，繼續使用
      if (coursePlansCache) return coursePlansCache;
      // 否則返回空 Map
      return new Map();
    }

    // 建立新快取
    coursePlansCache = new Map();
    data?.forEach(plan => {
      if (plan.plan_name && plan.total_classes) {
        coursePlansCache!.set(plan.plan_name, plan.total_classes);
      }
    });
    coursePlansCacheTime = now;

    console.log(`✅ course_plans 快取已載入 (${coursePlansCache.size} 個方案)`);
    return coursePlansCache;
  } catch (err) {
    console.error('❌ 載入 course_plans 異常:', err);
    return coursePlansCache || new Map();
  }
}

/**
 * 根據方案名稱取得總堂數
 * 優先從 course_plans 表查詢，找不到時使用推斷邏輯
 *
 * @param packageName 方案名稱
 * @param plansCache 已載入的 course_plans 快取
 */
function getTotalLessons(packageName: string, plansCache: Map<string, number>): number {
  if (!packageName) return 4; // 預設值

  // 1. 先從 course_plans 快取中查找（完全匹配）
  if (plansCache.has(packageName)) {
    return plansCache.get(packageName)!;
  }

  // 2. 模糊匹配：檢查 packageName 是否包含任何已知方案名稱
  for (const [planName, totalClasses] of plansCache) {
    if (packageName.includes(planName) || planName.includes(packageName)) {
      return totalClasses;
    }
  }

  // 3. 從方案名稱中提取數字堂數（例如：「不指定一對一 - 1堂」）
  const match = packageName.match(/(\d+)\s*堂/);
  if (match) {
    return parseInt(match[1], 10);
  }

  // 4. 特殊方案名稱關鍵字
  if (packageName.toLowerCase().includes('pro')) return 2;
  if (packageName.includes('終極')) return 1;

  // 5. 預設為初學專案 4 堂
  console.warn(`⚠️ 未知方案「${packageName}」，使用預設值 4 堂`);
  return 4;
}

/**
 * 處理學員的多筆購買記錄
 * 支援：
 * 1. 相同方案合併（例如兩個初學專案 = 8 堂）
 * 2. 按購買日期排序
 * 3. 按時間順序分配打卡記錄
 *
 * @param purchaseData 購買記錄
 * @param attendanceData 上課記錄
 * @param plansCache course_plans 快取（方案名稱 → 總堂數）
 */
interface PurchasePackage {
  name: string;
  totalLessons: number;
  purchaseDate: Date;
  usedLessons: number; // 已使用堂數
}

function processPurchases(
  purchaseData: any[],
  attendanceData: any[],
  plansCache: Map<string, number>
): {
  packages: PurchasePackage[];
  displayText: string;
  totalRemaining: number;
} {
  // 1. 過濾掉無效的購買記錄（package_name 為 null），然後按購買日期排序
  const sortedPurchases = purchaseData
    .filter(p => p.package_name) // 🆕 過濾掉 package_name 為 null 的記錄
    .map(p => ({
      name: p.package_name,
      totalLessons: getTotalLessons(p.package_name, plansCache), // 🆕 使用 course_plans 快取
      purchaseDate: p.purchase_date ? new Date(p.purchase_date) : new Date(0),
    }))
    .sort((a, b) => a.purchaseDate.getTime() - b.purchaseDate.getTime());

  // 2. 合併相同方案
  const mergedPackages: PurchasePackage[] = [];
  sortedPurchases.forEach(p => {
    const existing = mergedPackages.find(pkg => pkg.name === p.name);
    if (existing) {
      existing.totalLessons += p.totalLessons;
    } else {
      mergedPackages.push({
        ...p,
        usedLessons: 0
      });
    }
  });

  // 3. 按時間順序分配打卡記錄
  const sortedAttendance = attendanceData
    .slice()
    .sort((a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime());

  let packageIndex = 0;
  sortedAttendance.forEach(attendance => {
    // 找到還有剩餘堂數的方案
    while (packageIndex < mergedPackages.length) {
      const pkg = mergedPackages[packageIndex];
      if (pkg.usedLessons < pkg.totalLessons) {
        pkg.usedLessons++;
        break;
      } else {
        packageIndex++;
      }
    }
  });

  // 4. 計算總剩餘堂數
  const totalRemaining = mergedPackages.reduce((sum, pkg) => {
    return sum + (pkg.totalLessons - pkg.usedLessons);
  }, 0);

  // 5. 生成顯示文字（只顯示方案名稱，不顯示剩餘次數）
  const displayText = mergedPackages
    .map(pkg => pkg.name)
    .join(', ');

  return {
    packages: mergedPackages,
    displayText,
    totalRemaining
  };
}

export function registerTeachingQualityRoutes(app: any, isAuthenticated: any) {
  // 0. Get student records with analysis status (for main list page)
  app.get('/api/teaching-quality/student-records', isAuthenticated, async (req: any, res) => {
    try {
      const supabase = getSupabaseClient();
      const teacherFilter = req.query.teacher as string;
      const searchQuery = req.query.search as string; // 新增：搜尋關鍵字
      const startDate = req.query.startDate as string; // 🆕 日期過濾
      const endDate = req.query.endDate as string;     // 🆕 日期過濾

      // 🆕 載入 course_plans 快取
      const plansCache = await getCoursePlansCache();

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
          ai_analysis_id,
          is_showed
        `)
        .order('class_date', { ascending: false })
        .limit(200);

      // 🆕 日期範圍過濾
      if (startDate) {
        attendanceQuery = attendanceQuery.gte('class_date', startDate);
      }
      if (endDate) {
        attendanceQuery = attendanceQuery.lte('class_date', endDate);
      }

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

      // 🆕 儲存每個學員的「所有」購買記錄（支援多筆）
      let purchasesByEmail = new Map<string, any[]>();

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
          .select('student_email, package_name, purchase_date')
          .in('student_email', studentEmails)
          .order('purchase_date', { ascending: true });

        if (!purchaseError && purchaseData) {
          // 🆕 收集所有購買記錄（不覆蓋）
          purchaseData.forEach((p: any) => {
            const normalizedEmail = p.student_email?.toLowerCase();
            const records = purchasesByEmail.get(normalizedEmail) || [];
            records.push(p);
            purchasesByEmail.set(normalizedEmail, records);
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

        const strengths = analysis?.strengths ? (typeof analysis.strengths === 'string' ? JSON.parse(analysis.strengths) : analysis.strengths) : [];
        const weaknesses = analysis?.weaknesses ? (typeof analysis.weaknesses === 'string' ? JSON.parse(analysis.weaknesses) : analysis.weaknesses) : [];
        const suggestions = analysis?.suggestions ? (typeof analysis.suggestions === 'string' ? JSON.parse(analysis.suggestions) : analysis.suggestions) : [];

        // 🆕 處理多筆購買記錄
        const studentPurchases = purchasesByEmail.get(normalizedEmail) || [];
        const studentAttendance = allAttendanceByEmail.get(normalizedEmail) || [];

        // 使用 processPurchases 函數計算剩餘堂數和方案名稱
        let packageDisplay = null;
        let remainingDisplay = null;
        let totalRemaining = 0;

        if (studentPurchases.length > 0) {
          // 取得「在該上課日期當下」的出席記錄
          const attendanceBeforeOrOn = studentAttendance.filter((a: any) => {
            const aDate = new Date(a.class_date);
            const rowDate = new Date(row.class_date);
            return aDate <= rowDate;
          });

          const purchaseInfo = processPurchases(studentPurchases, attendanceBeforeOrOn, plansCache);

          // 🆕 只有在有有效方案時才設定顯示值
          if (purchaseInfo.displayText) {
            packageDisplay = purchaseInfo.displayText;
            remainingDisplay = `${purchaseInfo.totalRemaining} 堂`;
            totalRemaining = purchaseInfo.totalRemaining;
          }
        }

        // 🆕 Calculate conversion status using the same logic as total-report-service
        // Priority: 已轉高 > 未轉高 > 體驗中 > 未開始
        let conversionStatus = null;
        const hasAttendance = true; // We're already looking at an attendance record
        const hasHighLevelDeal = (dealAmountMap.get(normalizedEmail) || 0) > 0;

        if (hasHighLevelDeal) {
          // 1. 優先級最高：有高階一對一或高音的成交記錄 → 已轉高
          conversionStatus = '已轉高';
        } else if (totalRemaining === 0 && hasAttendance) {
          // 2. 剩餘堂數 = 0 且沒有高階成交 → 未轉高
          conversionStatus = '未轉高';
        } else if (hasAttendance && totalRemaining > 0) {
          // 3. 有打卡記錄且還有剩餘堂數 → 體驗中
          conversionStatus = '體驗中';
        } else {
          // 4. 沒有打卡記錄 → 未開始 (此分支在此 API 不會執行)
          conversionStatus = '未開始';
        }

        return {
          attendance_id: row.id,
          student_name: row.student_name,
          teacher_name: row.teacher_name,
          class_date: row.class_date,
          has_transcript: !!row.class_transcript && row.class_transcript.trim().length > 0,
          is_showed: row.is_showed,
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

          // 🆕 Purchase info (支援多筆購買記錄)
          package_name: packageDisplay,
          remaining_classes: remainingDisplay,
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

      // 🆕 資料品質檢查
      const dataQualityWarnings: any[] = [];

      if (studentEmails.length > 0) {
        // 1. 檢查是否有 package_name 為 null 的購買記錄
        const { data: invalidPurchases, error: invalidError } = await supabase
          .from('trial_class_purchases')
          .select('student_name, student_email')
          .in('student_email', studentEmails)
          .is('package_name', null);

        if (!invalidError && invalidPurchases && invalidPurchases.length > 0) {
          const uniqueStudents = Array.from(new Set(invalidPurchases.map(p => p.student_email)))
            .map(email => {
              const record = invalidPurchases.find(p => p.student_email === email);
              return {
                email,
                name: record?.student_name || '未知'
              };
            });

          dataQualityWarnings.push({
            type: 'missing_package_name',
            severity: 'warning',
            message: `${uniqueStudents.length} 位學員的購買記錄缺少方案名稱`,
            affectedStudents: uniqueStudents,
            actionUrl: '/settings/data-quality' // 假設有這個頁面
          });
        }

        // 2. 檢查是否有學員有出席記錄但沒有購買記錄
        const { data: allPurchases, error: purchaseError } = await supabase
          .from('trial_class_purchases')
          .select('student_email')
          .in('student_email', studentEmails);

        if (!purchaseError) {
          const studentsWithPurchase = new Set(
            allPurchases?.map(p => p.student_email.toLowerCase()) || []
          );

          const studentsWithoutPurchase = attendanceRecords
            ?.filter(r => !studentsWithPurchase.has(r.student_email?.toLowerCase()))
            .map(r => ({
              email: r.student_email,
              name: r.student_name
            })) || [];

          // 去重
          const uniqueNoPurchase = Array.from(
            new Map(studentsWithoutPurchase.map(s => [s.email, s])).values()
          );

          if (uniqueNoPurchase.length > 0) {
            dataQualityWarnings.push({
              type: 'missing_purchase_record',
              severity: 'warning',
              message: `${uniqueNoPurchase.length} 位學員有出席記錄但缺少購買記錄`,
              affectedStudents: uniqueNoPurchase,
              actionUrl: '/settings/data-quality'
            });
          }
        }
      }

      res.json({
        success: true,
        data: {
          records,
          teachers,
          dataQualityWarnings
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
        // pool.end() removed - using shared pool
        if (wantsSSE) {
          res.write(`data: ${JSON.stringify({ error: 'Attendance record not found' })}\n\n`);
          return res.end();
        }
        return res.status(404).json({ error: 'Attendance record not found' });
      }

      const attendance = attendanceResult.rows[0];

      // Check if already analyzed
      if (attendance.ai_analysis_id) {
        // pool.end() removed - using shared pool
        if (wantsSSE) {
          res.write(`data: ${JSON.stringify({ error: 'This record has already been analyzed' })}\n\n`);
          return res.end();
        }
        return res.status(400).json({ error: 'This record has already been analyzed' });
      }

      // Check if has transcript
      if (!attendance.class_transcript || attendance.class_transcript.trim().length === 0) {
        // pool.end() removed - using shared pool
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
            // pool.end() removed - using shared pool
            if (wantsSSE) {
              res.write(`data: ${JSON.stringify({ error: 'Permission denied' })}\n\n`);
              return res.end();
            }
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


      // Parse scores from Markdown (Phase 32-33: Dual score system)
      // Fix: Use markdownOutput if available, otherwise fall back to summary
      const markdownSource = analysis.conversionSuggestions?.markdownOutput || analysis.summary;
      const parsedScores = parseScoresFromMarkdown(markdownSource);


      // Save to database
      // Fix: Validate analyzed_by is a valid UUID before saving
      const analyzedBy = req.user?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.user.id)
        ? req.user.id
        : null;

      // Get teacher_id from teacher_name
      let teacherId = null;
      if (attendance.teacher_name) {
        const teacherResult = await pool.query(`
          SELECT id FROM users
          WHERE CONCAT(first_name, ' ', last_name) = $1
          AND 'teacher' = ANY(roles)
          LIMIT 1
        `, [attendance.teacher_name]);

        if (teacherResult.rows.length > 0) {
          teacherId = teacherResult.rows[0].id;
        }
      }

      const result = await insertAndReturn('teaching_quality_analysis', {
        attendance_id: attendanceId,
        teacher_id: teacherId,
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

      // pool.end() removed - using shared pool

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

      // pool.end() removed - using shared pool

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
        // pool.end() removed - using shared pool
        return res.status(404).json({ error: 'Analysis record not found' });
      }

      const existingAnalysis = analysisResult.rows[0];

      // Check if has transcript
      if (!existingAnalysis.transcript_text && !existingAnalysis.class_transcript) {
        // pool.end() removed - using shared pool
        return res.status(400).json({ error: 'No transcript available for re-analysis' });
      }

      // pool.end() removed - using shared pool

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
