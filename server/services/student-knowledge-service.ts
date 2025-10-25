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
  purchases: any[];
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

  // Get purchases
  const purchasesResult = await queryDatabase(`
    SELECT * FROM trial_class_purchases
    WHERE student_email = $1
    ORDER BY purchase_date ASC
  `, [studentEmail]);

  return {
    kb,
    trialClasses: classesResult.rows,
    eodsRecords: eodsResult.rows,
    aiAnalyses: analysesResult.rows,
    purchases: purchasesResult.rows
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
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET data_sources = jsonb_set(
      data_sources,
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
