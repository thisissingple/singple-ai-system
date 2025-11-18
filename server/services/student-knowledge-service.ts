/**
 * Student Knowledge Base Service
 * Manages accumulated student profiles from all data sources
 */

import { queryDatabase } from './pg-client';

// ============================================================================
// Types
// ============================================================================

export interface StudentProfileSummary {
  basicInfo: {
    age?: string;
    occupation?: string;
    decisionMaker?: boolean;
    priceSensitivity?: string;
    discoveredAt?: string;
    lastUpdatedAt?: string;
  };
  painPoints: Array<{
    point: string;
    occurrences: number;
    firstMentioned: string;
    lastMentioned: string;
  }>;
  goals: {
    desiredOutcome?: string;
    intendedUsage?: string;
    motivation?: string;
    lastUpdatedAt?: string;
  };
  psychologicalState: {
    confidence?: string;
    barriers?: string[];
    emotionalState?: string;
  };
  purchaseHistory: Array<{
    packageName: string;
    purchaseDate: string;
    amount: number;
  }>;
  conversionBarriers: string[];
}

export interface StudentDataSources {
  trial_classes: string[]; // attendance_ids
  eods_records: string[]; // eods_ids
  ai_analyses: string[]; // analysis_ids
  purchases: string[]; // purchase_ids
}

export interface StudentKnowledgeBase {
  id: string;
  student_email: string;
  student_name: string;
  profile_summary: StudentProfileSummary;
  data_sources: StudentDataSources;
  ai_pregenerated_insights: any;
  total_classes: number;
  total_consultations: number;
  total_interactions: number;
  first_contact_date: string | null;
  last_interaction_date: string | null;
  conversion_status: 'not_converted' | 'converted' | 'in_progress' | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get or create student knowledge base
 * Automatically syncs stats from actual records
 */
export async function getOrCreateStudentKB(
  studentEmail: string,
  studentName: string
): Promise<StudentKnowledgeBase> {
  // Try to get existing KB
  const result = await queryDatabase(`
    SELECT * FROM student_knowledge_base
    WHERE student_email = $1
  `, [studentEmail]);

  if (result.rows.length > 0) {
    // Sync stats every time we fetch (ensures always up-to-date)
    await syncStudentStats(studentEmail);
    const updatedResult = await queryDatabase(`
      SELECT * FROM student_knowledge_base WHERE student_email = $1
    `, [studentEmail]);
    return updatedResult.rows[0];
  }

  // Create new KB with synced stats
  const insertResult = await queryDatabase(`
    INSERT INTO student_knowledge_base (
      student_email,
      student_name,
      first_contact_date,
      total_classes,
      total_consultations
    )
    SELECT
      $1,
      $2,
      CURRENT_DATE,
      (SELECT COUNT(*) FROM trial_class_attendance WHERE student_email = $1),
      (SELECT COUNT(*) FROM eods_for_closers WHERE student_email = $1)
    RETURNING *
  `, [studentEmail, studentName]);

  return insertResult.rows[0];
}

/**
 * Sync student stats from actual database records
 * Also tracks if student records have been deleted
 */
export async function syncStudentStats(studentEmail: string): Promise<void> {
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET
      total_classes = (SELECT COUNT(*) FROM trial_class_attendance WHERE student_email = $1),
      total_consultations = (SELECT COUNT(*) FROM eods_for_closers WHERE student_email = $1),
      total_interactions = (
        (SELECT COUNT(*) FROM trial_class_attendance WHERE student_email = $1) +
        (SELECT COUNT(*) FROM eods_for_closers WHERE student_email = $1)
      ),
      student_name = COALESCE(
        (SELECT student_name FROM trial_class_attendance WHERE student_email = $1 LIMIT 1),
        student_name
      ),
      -- Mark as deleted if no records exist in any table
      is_deleted = (
        (SELECT COUNT(*) FROM trial_class_attendance WHERE student_email = $1) = 0 AND
        (SELECT COUNT(*) FROM eods_for_closers WHERE student_email = $1) = 0 AND
        (SELECT COUNT(*) FROM trial_class_purchases WHERE student_email = $1) = 0
      ),
      deleted_at = CASE
        WHEN (
          (SELECT COUNT(*) FROM trial_class_attendance WHERE student_email = $1) = 0 AND
          (SELECT COUNT(*) FROM eods_for_closers WHERE student_email = $1) = 0 AND
          (SELECT COUNT(*) FROM trial_class_purchases WHERE student_email = $1) = 0
        ) THEN NOW()
        ELSE deleted_at
      END,
      updated_at = NOW()
    WHERE student_email = $1
  `, [studentEmail]);
}

/**
 * Update student KB profile summary
 */
export async function updateStudentProfile(
  studentEmail: string,
  updates: {
    profileSummary?: Partial<StudentProfileSummary>;
    dataSources?: Partial<StudentDataSources>;
    stats?: {
      totalClasses?: number;
      totalConsultations?: number;
      lastInteractionDate?: string;
    };
    conversionStatus?: 'not_converted' | 'converted' | 'in_progress';
    aiInsights?: any;
  }
): Promise<void> {
  const setParts: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic UPDATE query
  if (updates.profileSummary) {
    setParts.push(`profile_summary = profile_summary || $${paramIndex}::jsonb`);
    values.push(JSON.stringify(updates.profileSummary));
    paramIndex++;
  }

  if (updates.dataSources) {
    setParts.push(`data_sources = data_sources || $${paramIndex}::jsonb`);
    values.push(JSON.stringify(updates.dataSources));
    paramIndex++;
  }

  if (updates.stats) {
    if (updates.stats.totalClasses !== undefined) {
      setParts.push(`total_classes = $${paramIndex}`);
      values.push(updates.stats.totalClasses);
      paramIndex++;
    }
    if (updates.stats.totalConsultations !== undefined) {
      setParts.push(`total_consultations = $${paramIndex}`);
      values.push(updates.stats.totalConsultations);
      paramIndex++;
    }
    if (updates.stats.lastInteractionDate) {
      setParts.push(`last_interaction_date = $${paramIndex}`);
      values.push(updates.stats.lastInteractionDate);
      paramIndex++;
    }
  }

  if (updates.conversionStatus) {
    setParts.push(`conversion_status = $${paramIndex}`);
    values.push(updates.conversionStatus);
    paramIndex++;
  }

  if (updates.aiInsights) {
    setParts.push(`ai_pregenerated_insights = $${paramIndex}::jsonb`);
    values.push(JSON.stringify(updates.aiInsights));
    paramIndex++;
  }

  // Always update updated_at
  setParts.push('updated_at = NOW()');
  setParts.push(`total_interactions = total_classes + total_consultations`);

  // Add WHERE clause
  values.push(studentEmail);

  const query = `
    UPDATE student_knowledge_base
    SET ${setParts.join(', ')}
    WHERE student_email = $${paramIndex}
  `;

  await queryDatabase(query, values);
}

/**
 * Get student's full context (all data sources)
 */
export async function getStudentFullContext(studentEmail: string): Promise<{
  kb: StudentKnowledgeBase;
  trialClasses: any[];
  eodsRecords: any[];
  aiAnalyses: any[];
  consultationAnalyses: any[];
  aiConversations: any[];
  purchases: any[];
  totalAiCost: number;
}> {
  // Get KB
  const kb = await getOrCreateStudentKB(studentEmail, 'Unknown');

  // Get trial classes
  const classesResult = await queryDatabase(`
    SELECT * FROM trial_class_attendance
    WHERE student_email = $1
    ORDER BY class_date ASC
  `, [studentEmail]);

  // Get EODS records
  const eodsResult = await queryDatabase(`
    SELECT * FROM eods_for_closers
    WHERE student_email = $1
    ORDER BY created_at ASC
  `, [studentEmail]);

  // Get AI analyses
  const analysesResult = await queryDatabase(`
    SELECT * FROM teaching_quality_analysis
    WHERE student_name = $1 OR attendance_id IN (
      SELECT id FROM trial_class_attendance WHERE student_email = $2
    )
    ORDER BY analyzed_at ASC
  `, [kb.student_name, studentEmail]);

  // Get AI conversations
  const conversationsResult = await queryDatabase(`
    SELECT * FROM teacher_ai_conversations
    WHERE student_email = $1
    ORDER BY created_at ASC
  `, [studentEmail]);

  // Get purchases
  const purchasesResult = await queryDatabase(`
    SELECT * FROM trial_class_purchases
    WHERE student_email = $1
    ORDER BY purchase_date ASC
  `, [studentEmail]);

  // Get consultation AI analyses
  const consultationAnalysesResult = await queryDatabase(`
    SELECT * FROM consultation_quality_analysis
    WHERE student_name = $1
    ORDER BY analyzed_at ASC
  `, [kb.student_name]);

  // Calculate total AI cost from ALL sources
  const costResult = await queryDatabase(`
    SELECT
      COALESCE(SUM(conv_cost), 0) + COALESCE(SUM(analysis_cost), 0) + COALESCE(SUM(consultation_cost), 0) as total_cost
    FROM (
      -- AI Conversations
      SELECT COALESCE(SUM(api_cost_usd), 0) as conv_cost, 0 as analysis_cost, 0 as consultation_cost
      FROM teacher_ai_conversations
      WHERE student_email = $1

      UNION ALL

      -- Teaching Quality Analyses (trial class transcript analyses)
      SELECT 0 as conv_cost, COALESCE(SUM(api_cost_usd), 0) as analysis_cost, 0 as consultation_cost
      FROM teaching_quality_analysis
      WHERE student_name = (SELECT student_name FROM student_knowledge_base WHERE student_email = $1 LIMIT 1)

      UNION ALL

      -- Consultation Quality Analyses (consultation transcript analyses)
      SELECT 0 as conv_cost, 0 as analysis_cost, COALESCE(SUM(api_cost_usd), 0) as consultation_cost
      FROM consultation_quality_analysis
      WHERE student_name = (SELECT student_name FROM student_knowledge_base WHERE student_email = $1 LIMIT 1)
    ) all_costs
  `, [studentEmail]);

  const totalAiCost = parseFloat(costResult.rows[0]?.total_cost || 0);

  return {
    kb,
    trialClasses: classesResult.rows,
    eodsRecords: eodsResult.rows,
    aiAnalyses: analysesResult.rows,
    consultationAnalyses: consultationAnalysesResult.rows,
    aiConversations: conversationsResult.rows,
    purchases: purchasesResult.rows,
    totalAiCost
  };
}

/**
 * Add data source reference to student KB
 */
export async function addDataSourceRef(
  studentEmail: string,
  sourceType: 'trial_classes' | 'eods_records' | 'ai_analyses' | 'purchases',
  sourceId: string
): Promise<void> {
  // Fix: Use template literal correctly - ${sourceType} must be outside quotes
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET data_sources = jsonb_set(
      COALESCE(data_sources, '{}'::jsonb),
      '{${sourceType}}',
      COALESCE(data_sources->'${sourceType}', '[]'::jsonb) || $1::jsonb,
      true
    ),
    updated_at = NOW()
    WHERE student_email = $2
  `, [JSON.stringify([sourceId]), studentEmail]);
}

/**
 * Increment class or consultation count
 */
export async function incrementInteractionCount(
  studentEmail: string,
  type: 'class' | 'consultation',
  interactionDate: string
): Promise<void> {
  const field = type === 'class' ? 'total_classes' : 'total_consultations';

  await queryDatabase(`
    UPDATE student_knowledge_base
    SET ${field} = ${field} + 1,
        total_interactions = total_classes + total_consultations + 1,
        last_interaction_date = $1,
        updated_at = NOW()
    WHERE student_email = $2
  `, [interactionDate, studentEmail]);
}

/**
 * Get student KB by email
 */
export async function getStudentKB(studentEmail: string): Promise<StudentKnowledgeBase | null> {
  const result = await queryDatabase(`
    SELECT * FROM student_knowledge_base
    WHERE student_email = $1
  `, [studentEmail]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Search students by name or email
 */
export async function searchStudents(query: string): Promise<StudentKnowledgeBase[]> {
  const result = await queryDatabase(`
    SELECT * FROM student_knowledge_base
    WHERE student_name ILIKE $1
       OR student_email ILIKE $1
    ORDER BY last_interaction_date DESC NULLS LAST
    LIMIT 50
  `, [`%${query}%`]);

  return result.rows;
}

/**
 * Save conversation insight to knowledge base
 * This appends the Q&A to a saved_insights array in profile_summary
 */
export async function saveInsightToKnowledgeBase(
  studentEmail: string,
  conversationId: string,
  question: string,
  answer: string
): Promise<void> {
  // Get current KB
  const kb = await getOrCreateStudentKB(studentEmail, 'Unknown');

  // Get current profile_summary
  let profileSummary = kb.profile_summary as any;
  if (!profileSummary) {
    profileSummary = {
      basicInfo: {},
      painPoints: [],
      goals: {},
      psychologicalState: {},
      purchaseHistory: [],
      conversionBarriers: [],
      savedInsights: []
    };
  }

  // Initialize savedInsights array if not exists
  if (!profileSummary.savedInsights) {
    profileSummary.savedInsights = [];
  }

  // Add new insight
  profileSummary.savedInsights.push({
    conversationId,
    question,
    answer,
    savedAt: new Date().toISOString()
  });

  // Update KB
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET profile_summary = $1,
        updated_at = NOW()
    WHERE student_email = $2
  `, [JSON.stringify(profileSummary), studentEmail]);
}

/**
 * Sync all students from source tables to student_knowledge_base
 * This is used after Google Sheets sync to ensure all students are in the KB
 *
 * Optimized version using batch UPSERT to avoid connection pool exhaustion
 */
export async function syncAllStudentsToKB(): Promise<{
  totalFound: number;
  newStudents: number;
  existingStudents: number;
}> {
  console.log('📊 Step 1: Getting count of existing KB records...');

  // Get count of existing records before sync
  const beforeCountResult = await queryDatabase(`
    SELECT COUNT(*) as count FROM student_knowledge_base
  `);
  const beforeCount = parseInt(beforeCountResult.rows[0].count);

  console.log(`📊 Step 2: Performing batch UPSERT of all students...`);

  // Use a single query to UPSERT all students at once
  // This avoids the N+1 query problem and prevents connection pool exhaustion
  const result = await queryDatabase(`
    -- Insert or update all students in one go
    INSERT INTO student_knowledge_base (
      student_email,
      student_name,
      first_contact_date,
      last_interaction_date,
      total_classes,
      total_consultations,
      total_interactions,
      is_deleted,
      deleted_at
    )
    SELECT
      all_students.student_email,
      all_students.student_name,
      COALESCE(interaction_dates.first_date, CURRENT_DATE) as first_contact_date,
      interaction_dates.last_date as last_interaction_date,
      COALESCE(class_counts.class_count, 0) as total_classes,
      COALESCE(consult_counts.consult_count, 0) as total_consultations,
      COALESCE(class_counts.class_count, 0) + COALESCE(consult_counts.consult_count, 0) as total_interactions,
      false as is_deleted,
      NULL as deleted_at
    FROM (
      SELECT
        student_email,
        MAX(student_name) as student_name
      FROM (
        SELECT student_email, student_name FROM trial_class_attendance
        UNION ALL
        SELECT student_email, student_name FROM eods_for_closers
        UNION ALL
        SELECT student_email, student_name FROM trial_class_purchases
      ) AS combined
      WHERE student_email IS NOT NULL AND student_email != ''
      GROUP BY student_email
    ) AS all_students
    LEFT JOIN (
      SELECT student_email, COUNT(*) as class_count
      FROM trial_class_attendance
      GROUP BY student_email
    ) AS class_counts ON all_students.student_email = class_counts.student_email
    LEFT JOIN (
      SELECT student_email, COUNT(*) as consult_count
      FROM eods_for_closers
      GROUP BY student_email
    ) AS consult_counts ON all_students.student_email = consult_counts.student_email
    LEFT JOIN (
      SELECT
        student_email,
        MIN(interaction_date) as first_date,
        MAX(interaction_date) as last_date
      FROM (
        SELECT student_email, class_date as interaction_date
        FROM trial_class_attendance
        UNION ALL
        SELECT student_email, consultation_date as interaction_date
        FROM eods_for_closers
        WHERE consultation_date IS NOT NULL
        UNION ALL
        SELECT student_email, purchase_date as interaction_date
        FROM trial_class_purchases
        WHERE purchase_date IS NOT NULL
      ) AS all_interactions
      GROUP BY student_email
    ) AS interaction_dates ON all_students.student_email = interaction_dates.student_email
    ON CONFLICT (student_email)
    DO UPDATE SET
      student_name = EXCLUDED.student_name,
      first_contact_date = EXCLUDED.first_contact_date,
      last_interaction_date = EXCLUDED.last_interaction_date,
      total_classes = EXCLUDED.total_classes,
      total_consultations = EXCLUDED.total_consultations,
      total_interactions = EXCLUDED.total_interactions,
      is_deleted = false,
      deleted_at = NULL,
      updated_at = NOW()
    RETURNING student_email
  `);

  console.log(`📊 Step 3: Marking deleted students...`);

  // Mark students as deleted if they have no source records
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET
      is_deleted = true,
      deleted_at = NOW(),
      updated_at = NOW()
    WHERE student_email NOT IN (
      SELECT DISTINCT student_email FROM (
        SELECT student_email FROM trial_class_attendance
        UNION
        SELECT student_email FROM eods_for_closers
        UNION
        SELECT student_email FROM trial_class_purchases
      ) AS active_students
      WHERE student_email IS NOT NULL
    )
    AND (is_deleted = false OR is_deleted IS NULL)
  `);

  console.log(`📊 Step 4: Getting final count...`);

  // Get count after sync
  const afterCountResult = await queryDatabase(`
    SELECT COUNT(*) as count FROM student_knowledge_base
  `);
  const afterCount = parseInt(afterCountResult.rows[0].count);

  const totalSynced = result.rows.length;
  const newStudents = afterCount - beforeCount;
  const existingStudents = totalSynced - newStudents;

  return {
    totalFound: totalSynced,
    newStudents: Math.max(0, newStudents), // Ensure non-negative
    existingStudents: Math.max(0, existingStudents)
  };
}
