/**
 * AI Usage Service
 * Aggregates AI usage and costs from all tables in the system
 */

import { createPool } from './pg-client';
import type { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface AIUsageBySource {
  source: string;
  sourceName: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  avgTokensPerCall: number;
  avgCostPerCall: number;
  avgResponseTimeMs: number;
}

export interface AIUsageByDate {
  date: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AIUsageByModel {
  model: string;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface AIUsageSummary {
  period: {
    start: string;
    end: string;
  };
  totals: {
    totalCalls: number;
    totalTokens: number;
    totalCostUsd: number;
    totalCostTwd: number;
    avgTokensPerCall: number;
    avgCostPerCall: number;
  };
  bySource: AIUsageBySource[];
  byDate: AIUsageByDate[];
  byModel: AIUsageByModel[];
  topConsumers: {
    type: string;
    name: string;
    totalCalls: number;
    totalCostUsd: number;
  }[];
}

// ============================================================================
// Constants
// ============================================================================

// USD to TWD exchange rate (approximate)
const USD_TO_TWD = 32;

// AI source definitions with table info
const AI_SOURCES = [
  {
    source: 'teaching_quality_analysis',
    sourceName: '體驗課品質分析',
    table: 'teaching_quality_analysis',
    dateColumn: 'analyzed_at',
    modelColumn: null as string | null,
    defaultModel: 'gpt-4o',
    userColumn: 'teacher_email',
  },
  {
    source: 'consultation_quality_analysis',
    sourceName: '諮詢品質分析',
    table: 'consultation_quality_analysis',
    dateColumn: 'created_at',
    modelColumn: null as string | null,
    defaultModel: 'gpt-4o',
    userColumn: 'consultant_email',
  },
  {
    source: 'teacher_ai_conversations',
    sourceName: '老師 AI 對話',
    table: 'teacher_ai_conversations',
    dateColumn: 'created_at',
    modelColumn: 'model',
    defaultModel: 'gpt-4o',
    userColumn: 'teacher_id',
  },
  {
    source: 'consultant_ai_conversations',
    sourceName: '諮詢師 AI 對話',
    table: 'consultant_ai_conversations',
    dateColumn: 'created_at',
    modelColumn: 'model',
    defaultModel: 'gpt-4o',
    userColumn: 'consultant_id',
  },
];

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Get AI usage summary for a date range
 */
export async function getAIUsageSummary(
  startDate: string,
  endDate: string
): Promise<AIUsageSummary> {
  const pool = createPool();

  try {
    // 1. Get usage by source
    const bySource = await getUsageBySource(pool, startDate, endDate);

    // 2. Get usage by date
    const byDate = await getUsageByDate(pool, startDate, endDate);

    // 3. Get usage by model
    const byModel = await getUsageByModel(pool, startDate, endDate);

    // 4. Get top consumers
    const topConsumers = await getTopConsumers(pool, startDate, endDate);

    // 5. Calculate totals
    const totalCalls = bySource.reduce((sum, s) => sum + s.totalCalls, 0);
    const totalTokens = bySource.reduce((sum, s) => sum + s.totalTokens, 0);
    const totalCostUsd = bySource.reduce((sum, s) => sum + s.totalCostUsd, 0);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      totals: {
        totalCalls,
        totalTokens,
        totalCostUsd: Math.round(totalCostUsd * 1000000) / 1000000,
        totalCostTwd: Math.round(totalCostUsd * USD_TO_TWD * 100) / 100,
        avgTokensPerCall: totalCalls > 0 ? Math.round(totalTokens / totalCalls) : 0,
        avgCostPerCall: totalCalls > 0 ? Math.round((totalCostUsd / totalCalls) * 1000000) / 1000000 : 0,
      },
      bySource,
      byDate,
      byModel,
      topConsumers,
    };
  } finally {
    await pool.end();
  }
}

/**
 * Get usage breakdown by source (table)
 */
async function getUsageBySource(
  pool: Pool,
  startDate: string,
  endDate: string
): Promise<AIUsageBySource[]> {
  const results: AIUsageBySource[] = [];

  for (const sourceConfig of AI_SOURCES) {
    try {
      const query = `
        SELECT
          COUNT(*) as total_calls,
          COALESCE(SUM(tokens_used), 0) as total_tokens,
          COALESCE(SUM(api_cost_usd), 0) as total_cost_usd,
          COALESCE(AVG(tokens_used), 0) as avg_tokens,
          COALESCE(AVG(api_cost_usd), 0) as avg_cost,
          COALESCE(AVG(response_time_ms), 0) as avg_response_time
        FROM ${sourceConfig.table}
        WHERE ${sourceConfig.dateColumn} >= $1
          AND ${sourceConfig.dateColumn} < $2::date + interval '1 day'
          AND api_cost_usd IS NOT NULL
      `;

      const result = await pool.query(query, [startDate, endDate]);
      const row = result.rows[0];

      if (row && parseInt(row.total_calls) > 0) {
        results.push({
          source: sourceConfig.source,
          sourceName: sourceConfig.sourceName,
          totalCalls: parseInt(row.total_calls),
          totalTokens: parseInt(row.total_tokens),
          totalCostUsd: parseFloat(row.total_cost_usd),
          avgTokensPerCall: Math.round(parseFloat(row.avg_tokens)),
          avgCostPerCall: Math.round(parseFloat(row.avg_cost) * 1000000) / 1000000,
          avgResponseTimeMs: Math.round(parseFloat(row.avg_response_time)),
        });
      }
    } catch (error) {
      // Table might not exist or have different schema, skip
      console.warn(`[AI Usage] Skipping source ${sourceConfig.source}:`, error);
    }
  }

  // Sort by cost descending
  return results.sort((a, b) => b.totalCostUsd - a.totalCostUsd);
}

/**
 * Get usage breakdown by date
 */
async function getUsageByDate(
  pool: Pool,
  startDate: string,
  endDate: string
): Promise<AIUsageByDate[]> {
  // Build UNION ALL query for all sources
  const unionParts = AI_SOURCES.map(
    (s) => `
    SELECT
      DATE(${s.dateColumn}) as date,
      tokens_used,
      api_cost_usd
    FROM ${s.table}
    WHERE ${s.dateColumn} >= '${startDate}'
      AND ${s.dateColumn} < '${endDate}'::date + interval '1 day'
      AND api_cost_usd IS NOT NULL
  `
  );

  const query = `
    WITH all_usage AS (
      ${unionParts.join(' UNION ALL ')}
    )
    SELECT
      date,
      COUNT(*) as total_calls,
      COALESCE(SUM(tokens_used), 0) as total_tokens,
      COALESCE(SUM(api_cost_usd), 0) as total_cost_usd
    FROM all_usage
    GROUP BY date
    ORDER BY date
  `;

  try {
    const result = await pool.query(query);
    return result.rows.map((row: any) => ({
      date: row.date.toISOString().split('T')[0],
      totalCalls: parseInt(row.total_calls),
      totalTokens: parseInt(row.total_tokens),
      totalCostUsd: parseFloat(row.total_cost_usd),
    }));
  } catch (error) {
    console.error('[AI Usage] Error getting usage by date:', error);
    return [];
  }
}

/**
 * Get usage breakdown by model
 */
async function getUsageByModel(
  pool: Pool,
  startDate: string,
  endDate: string
): Promise<AIUsageByModel[]> {
  // Only some tables have model column
  const sourcesWithModel = AI_SOURCES.filter((s) => s.modelColumn);

  const unionParts: string[] = [];

  // Sources with model column
  for (const s of sourcesWithModel) {
    unionParts.push(`
      SELECT
        COALESCE(${s.modelColumn}, '${s.defaultModel}') as model,
        tokens_used,
        api_cost_usd
      FROM ${s.table}
      WHERE ${s.dateColumn} >= '${startDate}'
        AND ${s.dateColumn} < '${endDate}'::date + interval '1 day'
        AND api_cost_usd IS NOT NULL
    `);
  }

  // Sources without model column - use default model
  const sourcesWithoutModel = AI_SOURCES.filter((s) => !s.modelColumn);
  for (const s of sourcesWithoutModel) {
    unionParts.push(`
      SELECT
        '${s.defaultModel}' as model,
        tokens_used,
        api_cost_usd
      FROM ${s.table}
      WHERE ${s.dateColumn} >= '${startDate}'
        AND ${s.dateColumn} < '${endDate}'::date + interval '1 day'
        AND api_cost_usd IS NOT NULL
    `);
  }

  if (unionParts.length === 0) {
    return [];
  }

  const query = `
    WITH all_usage AS (
      ${unionParts.join(' UNION ALL ')}
    )
    SELECT
      model,
      COUNT(*) as total_calls,
      COALESCE(SUM(tokens_used), 0) as total_tokens,
      COALESCE(SUM(api_cost_usd), 0) as total_cost_usd
    FROM all_usage
    GROUP BY model
    ORDER BY total_cost_usd DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows.map((row: any) => ({
      model: row.model || 'unknown',
      totalCalls: parseInt(row.total_calls),
      totalTokens: parseInt(row.total_tokens),
      totalCostUsd: parseFloat(row.total_cost_usd),
    }));
  } catch (error) {
    console.error('[AI Usage] Error getting usage by model:', error);
    return [];
  }
}

/**
 * Get top consumers (users with highest usage)
 */
async function getTopConsumers(
  pool: Pool,
  startDate: string,
  endDate: string
): Promise<{ type: string; name: string; totalCalls: number; totalCostUsd: number }[]> {
  const results: { type: string; name: string; totalCalls: number; totalCostUsd: number }[] = [];

  for (const sourceConfig of AI_SOURCES) {
    if (!sourceConfig.userColumn) continue;

    try {
      const query = `
        SELECT
          ${sourceConfig.userColumn} as user_id,
          COUNT(*) as total_calls,
          COALESCE(SUM(api_cost_usd), 0) as total_cost_usd
        FROM ${sourceConfig.table}
        WHERE ${sourceConfig.dateColumn} >= $1
          AND ${sourceConfig.dateColumn} < $2::date + interval '1 day'
          AND api_cost_usd IS NOT NULL
        GROUP BY ${sourceConfig.userColumn}
        ORDER BY total_cost_usd DESC
        LIMIT 5
      `;

      const result = await pool.query(query, [startDate, endDate]);

      for (const row of result.rows) {
        results.push({
          type: sourceConfig.sourceName,
          name: row.user_id || 'Unknown',
          totalCalls: parseInt(row.total_calls),
          totalCostUsd: parseFloat(row.total_cost_usd),
        });
      }
    } catch (error) {
      console.warn(`[AI Usage] Error getting top consumers for ${sourceConfig.source}:`, error);
    }
  }

  // Sort by cost and return top 10
  return results.sort((a, b) => b.totalCostUsd - a.totalCostUsd).slice(0, 10);
}

/**
 * Get daily usage for the past N days
 */
export async function getDailyUsage(days: number = 30): Promise<AIUsageByDate[]> {
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const pool = createPool();
  try {
    return await getUsageByDate(pool, startDate, endDate);
  } finally {
    await pool.end();
  }
}

/**
 * Get monthly usage summary
 */
export async function getMonthlyUsage(
  year: number,
  month: number
): Promise<AIUsageSummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month

  return getAIUsageSummary(startDate, endDate);
}

// ============================================================================
// Detailed Records
// ============================================================================

export interface AIUsageRecord {
  id: string;
  source: string;
  sourceName: string;
  userId: string | null;
  model: string;
  tokensUsed: number;
  responseTimeMs: number;
  apiCostUsd: number;
  createdAt: string;
  // Additional context
  studentEmail?: string;
  questionType?: string;
}

export interface AIUsageRecordsResult {
  records: AIUsageRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get detailed AI usage records with pagination
 */
export async function getAIUsageRecords(
  startDate: string,
  endDate: string,
  page: number = 1,
  pageSize: number = 50,
  sourceFilter?: string
): Promise<AIUsageRecordsResult> {
  const pool = createPool();
  const offset = (page - 1) * pageSize;

  try {
    // Build queries for each source - query each table individually to avoid column mismatch
    const allRecords: AIUsageRecord[] = [];
    let total = 0;

    for (const sourceConfig of AI_SOURCES) {
      // Skip if source filter is set and doesn't match
      if (sourceFilter && sourceFilter !== 'all' && sourceFilter !== sourceConfig.source) {
        continue;
      }

      try {
        const modelSelect = sourceConfig.modelColumn
          ? `COALESCE(${sourceConfig.modelColumn}, '${sourceConfig.defaultModel}')`
          : `'${sourceConfig.defaultModel}'`;

        // First get count for this source
        const countQuery = `
          SELECT COUNT(*) as cnt
          FROM ${sourceConfig.table}
          WHERE ${sourceConfig.dateColumn} >= $1
            AND ${sourceConfig.dateColumn} < $2::date + interval '1 day'
            AND api_cost_usd IS NOT NULL
        `;

        const countResult = await pool.query(countQuery, [startDate, endDate]);
        const sourceCount = parseInt(countResult.rows[0]?.cnt) || 0;
        total += sourceCount;

        // Then get records
        const recordsQuery = `
          SELECT
            id::text as id,
            '${sourceConfig.source}' as source,
            '${sourceConfig.sourceName}' as source_name,
            ${sourceConfig.userColumn}::text as user_id,
            ${modelSelect} as model,
            COALESCE(tokens_used, 0) as tokens_used,
            COALESCE(response_time_ms, 0) as response_time_ms,
            COALESCE(api_cost_usd, 0) as api_cost_usd,
            ${sourceConfig.dateColumn} as created_at
          FROM ${sourceConfig.table}
          WHERE ${sourceConfig.dateColumn} >= $1
            AND ${sourceConfig.dateColumn} < $2::date + interval '1 day'
            AND api_cost_usd IS NOT NULL
          ORDER BY ${sourceConfig.dateColumn} DESC
        `;

        const recordsResult = await pool.query(recordsQuery, [startDate, endDate]);

        for (const row of recordsResult.rows) {
          allRecords.push({
            id: row.id,
            source: row.source,
            sourceName: row.source_name,
            userId: row.user_id,
            model: row.model,
            tokensUsed: parseInt(row.tokens_used),
            responseTimeMs: parseInt(row.response_time_ms),
            apiCostUsd: parseFloat(row.api_cost_usd),
            createdAt: row.created_at?.toISOString() || '',
          });
        }
      } catch (sourceError) {
        console.warn(`[AI Usage] Error querying ${sourceConfig.source}:`, sourceError);
        // Continue with other sources
      }
    }

    // Sort all records by date descending
    allRecords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedRecords = allRecords.slice(offset, offset + pageSize);

    return {
      records: paginatedRecords,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error) {
    console.error('[AI Usage] Error getting records:', error);
    return {
      records: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  } finally {
    await pool.end();
  }
}
