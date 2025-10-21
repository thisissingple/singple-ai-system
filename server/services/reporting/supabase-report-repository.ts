/**
 * Supabase Report Repository
 * Handles data retrieval from Supabase for reporting
 */

import { getSupabaseClient, isSupabaseAvailable, SUPABASE_TABLES } from '../supabase-client';
import { format } from 'date-fns';
import { resolveField, parseDateField } from './field-mapping-v2';

export interface SupabaseDataRow {
  id: string;
  source_spreadsheet_id: string;
  origin_row_index?: number;
  student_name?: string;
  student_email?: string;
  teacher_name?: string;
  class_date?: string;
  purchase_date?: string;
  deal_date?: string;
  course_type?: string;
  plan?: string;
  deal_amount?: number;
  actual_amount?: number | string;
  status?: string;
  intent_score?: number;
  satisfaction?: number;
  attended?: boolean;
  trial_class_count?: number;
  remaining_classes?: number;
  attended_classes?: number;
  raw_data: Record<string, any>;
  synced_at: string;
  created_at: string;
  updated_at: string;
}

export interface DateRange {
  start: string;
  end: string;
}

export class SupabaseReportRepository {
  private _debugCounter = 0;

  /**
   * Check if Supabase is available
   */
  isAvailable(): boolean {
    return isSupabaseAvailable();
  }

  /**
   * Get trial class attendance data within date range
   */
  async getAttendance(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      // For 'all' period, fetch all records
      const isAllPeriod = dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31';

      if (isAllPeriod) {
        const { data, error } = await client
          .from(SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE)
          .select('*')
          .order('上課日期', { ascending: true, nullsFirst: false });

        if (error) {
          console.error('Supabase getAttendance error:', error);
          throw new Error(`Failed to fetch attendance data: ${error.message}`);
        }

        // 轉換中文欄位到標準格式
        return (data || []).map(row => this.normalizeAttendanceRow(row));
      }

      // Normal date range query
      const { data, error } = await client
        .from(SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE)
        .select('*')
        .or(`and(上課日期.gte.${dateRange.start},上課日期.lte.${dateRange.end}),上課日期.is.null`)
        .order('上課日期', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Supabase getAttendance error:', error);
        throw new Error(`Failed to fetch attendance data: ${error.message}`);
      }

      return (data || []).map(row => this.normalizeAttendanceRow(row));
    } catch (error) {
      console.error('Error in getAttendance:', error);
      throw error;
    }
  }

  /**
   * 將中文欄位轉換成標準英文欄位（保持相容性）
   */
  private normalizeAttendanceRow(row: any): SupabaseDataRow {
    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: row['姓名'] || row.student_name,
      student_email: row['email'] || row.student_email,
      teacher_name: row['授課老師'] || row.teacher_name,
      class_date: row['上課日期'] || row.class_date,
      status: row['是否已評價'] || row.status,
      raw_data: row.raw_data || {},
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Get trial class purchase data within date range
   */
  async getPurchases(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const isAllPeriod = dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31';

      if (isAllPeriod) {
        const { data, error } = await client
          .from(SUPABASE_TABLES.TRIAL_CLASS_PURCHASE)
          .select('*')
          .order('purchase_date', { ascending: true, nullsFirst: false });

        if (error) {
          console.error('Supabase getPurchases error:', error);
          throw new Error(`Failed to fetch purchase data: ${error.message}`);
        }

        return (data || []).map(row => this.normalizePurchaseRow(row));
      }

      const { data, error } = await client
        .from(SUPABASE_TABLES.TRIAL_CLASS_PURCHASE)
        .select('*')
        .or(`and(purchase_date.gte.${dateRange.start},purchase_date.lte.${dateRange.end}),purchase_date.is.null`)
        .order('purchase_date', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Supabase getPurchases error:', error);
        throw new Error(`Failed to fetch purchase data: ${error.message}`);
      }

      return (data || []).map(row => this.normalizePurchaseRow(row));
    } catch (error) {
      console.error('Error in getPurchases:', error);
      throw error;
    }
  }

  private normalizePurchaseRow(row: any): SupabaseDataRow {
    const status = row['目前狀態（自動計算）'] || row.current_status || row['目前狀態'] || row.status;

    // Debug: Log first few rows
    if (!this._debugCounter) this._debugCounter = 0;
    if (this._debugCounter < 2) {
      console.log(`[normalizePurchaseRow ${this._debugCounter}] 目前狀態（自動計算）: "${row['目前狀態（自動計算）']}"`);
      console.log(`[normalizePurchaseRow ${this._debugCounter}] final status: "${status}"`);
      this._debugCounter++;
    }

    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: row.student_name || row['姓名'],
      student_email: row.student_email || row['email'],
      purchase_date: row.purchase_date || row['體驗課購買日期'],
      course_type: row.package_name || row.course_type || row['方案名稱'],
      plan: row.package_name || row.plan || row['方案名稱'],
      status: status,
      raw_data: {
        ...row.raw_data || {},
        currentStatus: status,
        current_status: status,
        '目前狀態（自動計算）': status,
      },
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Get deals (EODs) data within date range
   * Note: This includes BOTH closed deals (with deal_date) AND pending consultations (without deal_date)
   */
  async getDeals(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const isAllPeriod = dateRange.start === '1970-01-01' && dateRange.end === '2099-12-31';

      if (isAllPeriod) {
        const { data, error } = await client
          .from(SUPABASE_TABLES.EODS_FOR_CLOSERS)
          .select('*')
          .order('成交日期', { ascending: true, nullsFirst: false });

        if (error) {
          console.error('Supabase getDeals error:', error);
          throw new Error(`Failed to fetch deals data: ${error.message}`);
        }

        return (data || []).map(row => this.normalizeEODsRow(row));
      }

      const { data, error } = await client
        .from(SUPABASE_TABLES.EODS_FOR_CLOSERS)
        .select('*')
        .or(`and(成交日期.gte.${dateRange.start},成交日期.lte.${dateRange.end}),成交日期.is.null`)
        .order('成交日期', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Supabase getDeals error:', error);
        throw new Error(`Failed to fetch deals data: ${error.message}`);
      }

      return (data || []).map(row => this.normalizeEODsRow(row));
    } catch (error: any) {
      console.error('Error in getDeals:', error);
      throw error;
    }
  }

  private normalizeEODsRow(row: any): SupabaseDataRow {
    return {
      id: row.id,
      source_spreadsheet_id: row.source_spreadsheet_id || '',
      origin_row_index: row.origin_row_index,
      student_name: row['Name'] || row.student_name,
      student_email: row['Email'] || row.student_email,
      teacher_name: row['諮詢人員'] || row.teacher_name,
      deal_date: row['成交日期'] || row.deal_date,
      plan: row['成交方案'] || row.plan,
      deal_amount: row['實收金額'] || row.deal_amount,
      status: row['諮詢結果'] || row.status,
      raw_data: row.raw_data || {},
      synced_at: row.synced_at || row.created_at,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Fallback for getDeals when deal_date column doesn't exist
   * Fetches all data and infers deal_date from raw_data
   */
  private async getDealsFallback(dateRange: DateRange): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    // Fetch all records without filtering by deal_date
    const { data, error } = await client
      .from(SUPABASE_TABLES.EODS_FOR_CLOSERS)
      .select('*')
      .limit(10000);

    if (error) {
      console.error('Supabase getDealsFallback error:', error);
      throw new Error(`Failed to fetch deals data (fallback): ${error.message}`);
    }

    const rows = (data || []) as SupabaseDataRow[];

    // Filter and sort by inferred deal_date from raw_data
    const filtered = rows
      .map(row => {
        // Try to resolve deal_date from raw_data using field aliases
        const dealDateValue = resolveField(row.raw_data || {}, 'dealDate');
        const dealDate = parseDateField(dealDateValue);

        return {
          ...row,
          inferredDealDate: dealDate ? dealDate.toISOString().split('T')[0] : null,
        };
      })
      .filter(row => {
        // Keep records with no date (null) OR within date range
        if (!row.inferredDealDate) return true;
        return row.inferredDealDate >= dateRange.start && row.inferredDealDate <= dateRange.end;
      })
      .sort((a, b) => {
        // Sort by date, null values last
        if (!a.inferredDealDate && !b.inferredDealDate) return 0;
        if (!a.inferredDealDate) return 1;
        if (!b.inferredDealDate) return -1;
        return a.inferredDealDate.localeCompare(b.inferredDealDate);
      });

    return filtered as SupabaseDataRow[];
  }

  /**
   * Get all attendance data (no date filter)
   */
  async getAllAttendance(): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await client
        .from(SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE)
        .select('*')
        .order('class_date', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Supabase getAllAttendance error:', error);
        throw new Error(`Failed to fetch all attendance data: ${error.message}`);
      }

      return (data || []) as SupabaseDataRow[];
    } catch (error) {
      console.error('Error in getAllAttendance:', error);
      throw error;
    }
  }

  /**
   * Get all purchase data (no date filter)
   */
  async getAllPurchases(): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await client
        .from(SUPABASE_TABLES.TRIAL_CLASS_PURCHASE)
        .select('*')
        .order('purchase_date', { ascending: false })
        .limit(10000);

      if (error) {
        console.error('Supabase getAllPurchases error:', error);
        throw new Error(`Failed to fetch all purchase data: ${error.message}`);
      }

      return (data || []) as SupabaseDataRow[];
    } catch (error) {
      console.error('Error in getAllPurchases:', error);
      throw error;
    }
  }

  /**
   * Get all deals data (no date filter)
   */
  async getAllDeals(): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const { data, error } = await client
        .from(SUPABASE_TABLES.EODS_FOR_CLOSERS)
        .select('*')
        .order('deal_date', { ascending: false })
        .limit(10000);

      if (error) {
        // Check if error is due to missing deal_date column
        if (error.code === '42703' && error.message.includes('deal_date')) {
          console.warn('⚠️  Column deal_date does not exist in getAllDeals, fetching without order');
          return this.getAllDealsFallback();
        }

        console.error('Supabase getAllDeals error:', error);
        throw new Error(`Failed to fetch all deals data: ${error.message}`);
      }

      return (data || []) as SupabaseDataRow[];
    } catch (error: any) {
      if (error?.code === '42703' || error?.message?.includes('deal_date does not exist')) {
        console.warn('⚠️  Column deal_date does not exist in getAllDeals, fetching without order');
        return this.getAllDealsFallback();
      }

      console.error('Error in getAllDeals:', error);
      throw error;
    }
  }

  /**
   * Fallback for getAllDeals when deal_date column doesn't exist
   */
  private async getAllDealsFallback(): Promise<SupabaseDataRow[]> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    const { data, error } = await client
      .from(SUPABASE_TABLES.EODS_FOR_CLOSERS)
      .select('*')
      .limit(10000);

    if (error) {
      console.error('Supabase getAllDealsFallback error:', error);
      throw new Error(`Failed to fetch all deals data (fallback): ${error.message}`);
    }

    const rows = (data || []) as SupabaseDataRow[];

    // Sort by inferred deal_date
    return rows
      .map(row => {
        const dealDateValue = resolveField(row.raw_data || {}, 'dealDate');
        const dealDate = parseDateField(dealDateValue);
        return {
          ...row,
          inferredDealDate: dealDate ? dealDate.toISOString().split('T')[0] : null,
        };
      })
      .sort((a, b) => {
        if (!a.inferredDealDate && !b.inferredDealDate) return 0;
        if (!a.inferredDealDate) return 1;
        if (!b.inferredDealDate) return -1;
        return b.inferredDealDate.localeCompare(a.inferredDealDate); // Descending
      }) as SupabaseDataRow[];
  }

  /**
   * Get row counts for each table
   */
  async getTableCounts(): Promise<{
    attendance: number;
    purchases: number;
    deals: number;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      const [attendanceResult, purchaseResult, dealsResult] = await Promise.all([
        client.from(SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE).select('id', { count: 'exact', head: true }),
        client.from(SUPABASE_TABLES.TRIAL_CLASS_PURCHASE).select('id', { count: 'exact', head: true }),
        client.from(SUPABASE_TABLES.EODS_FOR_CLOSERS).select('id', { count: 'exact', head: true }),
      ]);

      return {
        attendance: attendanceResult.count || 0,
        purchases: purchaseResult.count || 0,
        deals: dealsResult.count || 0,
      };
    } catch (error) {
      console.error('Error in getTableCounts:', error);
      return { attendance: 0, purchases: 0, deals: 0 };
    }
  }

  /**
   * Get aggregate metrics for AI/reporting
   * TODO: Enhance this for AI integration
   */
  async getAggregateMetrics(): Promise<{
    totalStudents: number;
    totalTeachers: number;
    totalTrials: number;
    totalPurchases: number;
    totalDeals: number;
    totalRevenue: number;
    avgDealAmount: number;
    conversionRate: number;
  }> {
    const client = getSupabaseClient();
    if (!client) {
      throw new Error('Supabase client not available');
    }

    try {
      // Get counts
      const counts = await this.getTableCounts();

      // Get unique students and teachers
      const [attendanceData, dealsData] = await Promise.all([
        this.getAllAttendance(),
        this.getAllDeals(),
      ]);

      const uniqueStudents = new Set(
        attendanceData.map((row) => row.student_email).filter(Boolean)
      ).size;

      const uniqueTeachers = new Set(
        attendanceData.map((row) => row.teacher_name).filter(Boolean)
      ).size;

      // Calculate revenue
      const totalRevenue = dealsData.reduce((sum, row) => sum + (row.deal_amount || 0), 0);
      const avgDealAmount = dealsData.length > 0 ? totalRevenue / dealsData.length : 0;

      // Calculate conversion rate
      const conversionRate = counts.attendance > 0 ? (counts.deals / counts.attendance) * 100 : 0;

      return {
        totalStudents: uniqueStudents,
        totalTeachers: uniqueTeachers,
        totalTrials: counts.attendance,
        totalPurchases: counts.purchases,
        totalDeals: counts.deals,
        totalRevenue: Math.round(totalRevenue),
        avgDealAmount: Math.round(avgDealAmount),
        conversionRate: Math.round(conversionRate * 100) / 100,
      };
    } catch (error) {
      console.error('Error in getAggregateMetrics:', error);
      throw error;
    }
  }

  /**
   * Get metrics for AI queries
   * TODO: Implement AI-specific data formatting
   */
  async getMetricsForAI(): Promise<Record<string, any>> {
    // TODO: Implement AI-specific metrics retrieval
    // This should return data in a format optimized for AI analysis
    console.warn('getMetricsForAI not yet implemented');
    return {};
  }
}

export const supabaseReportRepository = new SupabaseReportRepository();
