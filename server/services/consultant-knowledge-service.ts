/**
 * Consultant Knowledge Base Service
 * Manages consultant performance tracking and insights
 */

import { queryDatabase } from './pg-client';

// ============================================================================
// Types
// ============================================================================

export interface ConsultantDataSources {
  consultation_analyses: string[]; // analysis_ids
}

export interface ConsultantKnowledgeBase {
  id: string;
  consultant_email: string;
  consultant_name: string;
  data_sources: ConsultantDataSources;
  total_consultations: number;
  total_analyzed: number;
  average_rating: number;
  strengths_summary: any[];
  weaknesses_summary: any[];
  first_consultation_date: string | null;
  last_consultation_date: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get or create consultant knowledge base
 */
export async function getOrCreateConsultantKB(
  consultantEmail: string,
  consultantName: string
): Promise<ConsultantKnowledgeBase> {
  // Try to get existing KB
  const result = await queryDatabase(`
    SELECT * FROM consultant_knowledge_base
    WHERE consultant_email = $1
  `, [consultantEmail]);

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create new KB
  const insertResult = await queryDatabase(`
    INSERT INTO consultant_knowledge_base (
      consultant_email,
      consultant_name,
      data_sources,
      total_consultations,
      total_analyzed,
      average_rating,
      strengths_summary,
      weaknesses_summary,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, 0, 0, 0.00, '[]'::jsonb, '[]'::jsonb, NOW(), NOW())
    RETURNING *
  `, [
    consultantEmail,
    consultantName,
    JSON.stringify({ consultation_analyses: [] })
  ]);

  console.log(`✅ Created consultant KB for ${consultantName} (${consultantEmail})`);
  return insertResult.rows[0];
}

/**
 * Add data source reference to consultant KB
 */
export async function addConsultantDataSourceRef(
  consultantEmail: string,
  sourceType: 'consultation_analyses',
  recordId: string
): Promise<void> {
  // First ensure the consultant KB exists
  const kb = await getOrCreateConsultantKB(consultantEmail, 'Unknown'); // Name will be updated later

  // Check if already exists
  const existingData = kb.data_sources as ConsultantDataSources;
  const sourceArray = existingData[sourceType] || [];

  if (sourceArray.includes(recordId)) {
    console.log(`⚠️ Record ${recordId} already exists in consultant KB for ${consultantEmail}`);
    return;
  }

  // Add new reference
  await queryDatabase(`
    UPDATE consultant_knowledge_base
    SET
      data_sources = jsonb_set(
        data_sources,
        '{${sourceType}}',
        (COALESCE(data_sources->'${sourceType}', '[]'::jsonb) || $1::jsonb)
      ),
      updated_at = NOW()
    WHERE consultant_email = $2
  `, [JSON.stringify([recordId]), consultantEmail]);

  console.log(`✅ Added ${sourceType} reference ${recordId} to consultant KB for ${consultantEmail}`);
}

/**
 * Sync consultant statistics from actual records
 */
export async function syncConsultantStats(consultantEmail: string): Promise<void> {
  const result = await queryDatabase(`
    WITH consultant_stats AS (
      SELECT
        COUNT(DISTINCT e.id) as total_consultations,
        COUNT(DISTINCT cqa.id) as total_analyzed,
        COALESCE(AVG(cqa.overall_rating), 0) as avg_rating,
        MIN(e.consultation_date) as first_consultation,
        MAX(e.consultation_date) as last_consultation
      FROM eods_for_closers e
      LEFT JOIN consultation_quality_analysis cqa
        ON e.student_email = cqa.student_email
        AND e.consultation_date = cqa.consultation_date
        AND e.closer_name = cqa.closer_name
      WHERE e.closer_email = $1
    )
    UPDATE consultant_knowledge_base ckb
    SET
      total_consultations = cs.total_consultations,
      total_analyzed = cs.total_analyzed,
      average_rating = cs.avg_rating,
      first_consultation_date = cs.first_consultation,
      last_consultation_date = cs.last_consultation,
      updated_at = NOW()
    FROM consultant_stats cs
    WHERE ckb.consultant_email = $1
    RETURNING *
  `, [consultantEmail]);

  if (result.rows.length > 0) {
    console.log(`✅ Synced consultant stats for ${consultantEmail}`);
  }
}

/**
 * Get consultant knowledge base with full details
 */
export async function getConsultantKB(consultantEmail: string): Promise<ConsultantKnowledgeBase | null> {
  const result = await queryDatabase(`
    SELECT * FROM consultant_knowledge_base
    WHERE consultant_email = $1
  `, [consultantEmail]);

  if (result.rows.length === 0) {
    return null;
  }

  // Sync stats before returning
  await syncConsultantStats(consultantEmail);

  const updated = await queryDatabase(`
    SELECT * FROM consultant_knowledge_base WHERE consultant_email = $1
  `, [consultantEmail]);

  return updated.rows[0];
}

/**
 * Get all consultants with their statistics
 */
export async function getAllConsultants(): Promise<ConsultantKnowledgeBase[]> {
  const result = await queryDatabase(`
    SELECT * FROM consultant_knowledge_base
    ORDER BY total_analyzed DESC, average_rating DESC
  `);

  return result.rows;
}

// ============================================================================
// Export all functions
// ============================================================================

export default {
  getOrCreateConsultantKB,
  addConsultantDataSourceRef,
  syncConsultantStats,
  getConsultantKB,
  getAllConsultants,
};
