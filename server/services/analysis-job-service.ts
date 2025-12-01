/**
 * Analysis Job Service
 * Manages background analysis jobs for teaching quality re-analysis
 *
 * Features:
 * - Create jobs with 'pending' status
 * - Execute analysis in background
 * - Track progress and status
 * - Store results temporarily before committing
 */

import { getSharedPool, queryDatabase, insertAndReturn } from './pg-client';
import type { Pool } from 'pg';

// 使用共享連線池
const createPool = () => getSharedPool();

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type JobType = 'reanalysis' | 'initial_analysis';

export interface AnalysisJob {
  id: string;
  analysis_id: string;
  job_type: JobType;
  status: JobStatus;
  progress: number;
  error_message?: string;
  result?: any;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
}

export interface CreateJobParams {
  analysisId: string;
  jobType?: JobType;
  createdBy?: string;
}

export interface UpdateJobParams {
  status?: JobStatus;
  progress?: number;
  errorMessage?: string;
  result?: any;
  startedAt?: Date;
  completedAt?: Date;
}

class AnalysisJobService {
  private pool: Pool;

  constructor() {
    this.pool = createPool();
  }

  /**
   * Create a new analysis job
   */
  async createJob(params: CreateJobParams): Promise<AnalysisJob> {
    const { analysisId, jobType = 'reanalysis', createdBy } = params;

    const query = `
      INSERT INTO analysis_jobs (analysis_id, job_type, status, progress, created_by)
      VALUES ($1, $2, 'pending', 0, $3)
      RETURNING *
    `;

    const result = await insertAndReturn<AnalysisJob>(
      this.pool,
      query,
      [analysisId, jobType, createdBy || null]
    );

    console.log(`📋 Created analysis job: ${result.id} for analysis: ${analysisId}`);
    return result;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<AnalysisJob | null> {
    const result = await queryDatabase<AnalysisJob>(
      this.pool,
      'SELECT * FROM analysis_jobs WHERE id = $1',
      [jobId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get latest job for an analysis
   */
  async getLatestJobForAnalysis(analysisId: string): Promise<AnalysisJob | null> {
    const result = await queryDatabase<AnalysisJob>(
      this.pool,
      `SELECT * FROM analysis_jobs
       WHERE analysis_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [analysisId]
    );

    return result.rows[0] || null;
  }

  /**
   * Update job status and progress
   */
  async updateJob(jobId: string, updates: UpdateJobParams): Promise<AnalysisJob> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`);
      values.push(updates.status);
    }

    if (updates.progress !== undefined) {
      fields.push(`progress = $${paramCount++}`);
      values.push(updates.progress);
    }

    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramCount++}`);
      values.push(updates.errorMessage);
    }

    if (updates.result !== undefined) {
      fields.push(`result = $${paramCount++}`);
      values.push(JSON.stringify(updates.result));
    }

    if (updates.startedAt) {
      fields.push(`started_at = $${paramCount++}`);
      values.push(updates.startedAt);
    }

    if (updates.completedAt) {
      fields.push(`completed_at = $${paramCount++}`);
      values.push(updates.completedAt);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE analysis_jobs
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    values.push(jobId);

    const result = await insertAndReturn<AnalysisJob>(this.pool, query, values);
    return result;
  }

  /**
   * Mark job as processing
   */
  async startJob(jobId: string): Promise<AnalysisJob> {
    return this.updateJob(jobId, {
      status: 'processing',
      progress: 10,
      startedAt: new Date(),
    });
  }

  /**
   * Mark job as completed
   */
  async completeJob(jobId: string, result?: any): Promise<AnalysisJob> {
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      result,
      completedAt: new Date(),
    });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, errorMessage: string): Promise<AnalysisJob> {
    return this.updateJob(jobId, {
      status: 'failed',
      errorMessage,
      completedAt: new Date(),
    });
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<AnalysisJob> {
    return this.updateJob(jobId, { progress: Math.min(100, Math.max(0, progress)) });
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(daysOld = 7): Promise<number> {
    const result = await queryDatabase(
      this.pool,
      `DELETE FROM analysis_jobs
       WHERE (status = 'completed' OR status = 'failed')
         AND completed_at < NOW() - INTERVAL '${daysOld} days'
       RETURNING id`
    );

    const count = result.rowCount || 0;
    console.log(`🧹 Cleaned up ${count} old analysis jobs`);
    return count;
  }

  /**
   * Get all pending jobs
   */
  async getPendingJobs(): Promise<AnalysisJob[]> {
    const result = await queryDatabase<AnalysisJob>(
      this.pool,
      `SELECT * FROM analysis_jobs
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    return result.rows;
  }

  /**
   * Close database pool (no-op - using shared pool)
   */
  async close(): Promise<void> {
    // Using shared pool - don't close it
  }
}

// Export singleton instance
export const analysisJobService = new AnalysisJobService();
