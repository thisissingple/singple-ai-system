/**
 * 收支紀錄服務
 * 提供收支記錄的 CRUD 操作、查詢、統計等功能
 */

import { Pool } from 'pg';
import { createPool, queryDatabase, insertAndReturn } from './pg-client';

// ============================================
// 類型定義
// ============================================

export interface IncomeExpenseRecord {
  id: string;
  transaction_date: string;
  transaction_type: 'income' | 'expense' | 'refund';
  category: string;
  item_name: string;
  amount: number;
  currency: 'TWD' | 'USD' | 'RMB';
  exchange_rate_used?: number;
  amount_in_twd?: number;
  student_id?: string;
  student_name?: string;         // Migration 030 新增
  student_email?: string;        // Migration 030 新增
  teacher_id?: string;
  teacher_name?: string;         // JOIN 查詢獲得
  setter_id?: string;
  setter_name?: string;    // JOIN 查詢獲得
  consultant_id?: string;
  consultant_name?: string;      // JOIN 查詢獲得
  course_code?: string;
  course_type?: string;
  payment_method?: string;
  deal_type?: 'self_deal' | 'assisted_deal';
  cost_profit_record_id?: string;
  trial_purchase_id?: string;
  notes?: string;
  source: 'manual' | 'ai' | 'system_sync' | 'imported';
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  created_by_name?: string;      // JOIN 查詢獲得
}

export interface CreateIncomeExpenseInput {
  transaction_date: string;
  transaction_type: 'income' | 'expense' | 'refund';
  category: string;
  item_name: string;
  amount: number;
  currency?: 'TWD' | 'USD' | 'RMB';
  student_id?: string;
  student_name?: string;   // Migration 030 新增
  student_email?: string;  // Migration 030 新增
  teacher_id?: string;
  setter_id?: string;
  consultant_id?: string;
  course_code?: string;
  course_type?: string;
  payment_method?: string;
  deal_type?: 'self_deal' | 'assisted_deal';
  notes?: string;
  created_by?: string;
}

export interface UpdateIncomeExpenseInput extends Partial<CreateIncomeExpenseInput> {
  is_confirmed?: boolean;
}

export interface QueryParams {
  month?: string;          // YYYY-MM
  transaction_type?: string;
  category?: string;
  teacher_id?: string;
  customer_id?: string;
  consultant_id?: string;
  setter_id?: string;
  search?: string;
  is_confirmed?: boolean;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface MonthlySummary {
  month: string;
  total_income: number;
  total_expense: number;
  net_profit: number;
  record_count: number;
  by_category: { category: string; amount: number; count: number }[];
  by_currency: { currency: string; amount: number; count: number }[];
}

// ============================================
// 收支紀錄服務類
// ============================================

class IncomeExpenseService {
  private pool: Pool;

  constructor() {
    this.pool = createPool();
  }

  /**
   * 獲取當前匯率（從外部 API 或固定值）
   */
  private async getExchangeRate(currency: string): Promise<number> {
    if (currency === 'TWD') return 1;

    // TODO: 從 exchangerate-api.com 獲取即時匯率
    // 暫時使用固定值
    const rates: Record<string, number> = {
      USD: 30.58,
      RMB: 4.29,
    };

    return rates[currency] || 1;
  }

  /**
   * 計算 TWD 金額
   */
  private async calculateAmountInTWD(
    amount: number,
    currency: string
  ): Promise<{ amount_in_twd: number; exchange_rate_used: number }> {
    const rate = await this.getExchangeRate(currency);
    return {
      amount_in_twd: amount * rate,
      exchange_rate_used: rate,
    };
  }

  /**
   * 建立收支記錄
   */
  async createRecord(input: CreateIncomeExpenseInput): Promise<IncomeExpenseRecord> {
    const currency = input.currency || 'TWD';
    const { amount_in_twd, exchange_rate_used } = await this.calculateAmountInTWD(
      input.amount,
      currency
    );

    const query = `
      INSERT INTO income_expense_records (
        transaction_date, transaction_type, category, item_name,
        amount, currency, exchange_rate_used, amount_in_twd,
        student_id, student_name, student_email,
        teacher_id, setter_id, consultant_id,
        course_code, course_type, payment_method, deal_type,
        notes, source, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    const values = [
      input.transaction_date,
      input.transaction_type,
      input.category,
      input.item_name,
      input.amount,
      currency,
      exchange_rate_used,
      amount_in_twd,
      input.student_id || null,
      input.student_name || null,    // Migration 030 新增
      input.student_email || null,   // Migration 030 新增
      input.teacher_id || null,
      input.setter_id || null,
      input.consultant_id || null,
      input.course_code || null,
      input.course_type || null,
      input.payment_method || null,
      input.deal_type || null,
      input.notes || null,
      'manual',
      input.created_by || null,
    ];

    const result = await queryDatabase(query, values);
    return result.rows[0];
  }

  /**
   * 更新收支記錄
   */
  async updateRecord(id: string, input: UpdateIncomeExpenseInput): Promise<IncomeExpenseRecord> {
    // 構建動態更新語句
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 如果更新了金額或幣別，重新計算 TWD 金額
    if (input.amount !== undefined || input.currency !== undefined) {
      const currentRecord = await this.getRecordById(id);
      const amount = input.amount ?? currentRecord.amount;
      const currency = input.currency ?? currentRecord.currency;

      const { amount_in_twd, exchange_rate_used } = await this.calculateAmountInTWD(
        amount,
        currency
      );

      if (input.amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(input.amount);
      }
      if (input.currency !== undefined) {
        updates.push(`currency = $${paramIndex++}`);
        values.push(input.currency);
      }
      updates.push(`exchange_rate_used = $${paramIndex++}`, `amount_in_twd = $${paramIndex++}`);
      values.push(exchange_rate_used, amount_in_twd);
    }

    // 其他欄位
    const fields: Array<keyof UpdateIncomeExpenseInput> = [
      'transaction_date',
      'transaction_type',
      'category',
      'item_name',
      'student_id',
      'student_name',    // Migration 030 新增
      'student_email',   // Migration 030 新增
      'teacher_id',
      'setter_id',
      'consultant_id',
      'course_code',
      'course_type',
      'payment_method',
      'deal_type',
      'notes',
      'is_confirmed',
    ];

    fields.forEach((field) => {
      if (input[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(input[field]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    // 添加 updated_at
    updates.push(`updated_at = NOW()`);

    values.push(id);

    const query = `
      UPDATE income_expense_records
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await queryDatabase(query, values);
    return result.rows[0];
  }

  /**
   * 刪除收支記錄
   */
  async deleteRecord(id: string): Promise<void> {
    const query = 'DELETE FROM income_expense_records WHERE id = $1';
    await queryDatabase(query, [id]);
  }

  /**
   * 根據 ID 獲取單筆記錄
   */
  async getRecordById(id: string): Promise<IncomeExpenseRecord> {
    const query = `
      SELECT
        ier.*,
        u1.first_name || ' ' || COALESCE(u1.last_name, '') as teacher_name,
        u2.first_name || ' ' || COALESCE(u2.last_name, '') as setter_name,
        u3.first_name || ' ' || COALESCE(u3.last_name, '') as consultant_name,
        u4.first_name || ' ' || COALESCE(u4.last_name, '') as created_by_name
      FROM income_expense_records ier
      LEFT JOIN users u1 ON ier.teacher_id = u1.id
      LEFT JOIN users u2 ON ier.setter_id = u2.id
      LEFT JOIN users u3 ON ier.consultant_id = u3.id
      LEFT JOIN users u4 ON ier.created_by = u4.id
      WHERE ier.id = $1
    `;

    const result = await queryDatabase(query, [id]);

    if (result.rows.length === 0) {
      throw new Error(`Record not found: ${id}`);
    }

    return result.rows[0];
  }

  /**
   * 查詢收支記錄（支援多種篩選條件）
   */
  async queryRecords(params: QueryParams): Promise<{
    records: IncomeExpenseRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let paramIndex = 1;

    // 月份篩選
    if (params.month) {
      conditions.push(`DATE_TRUNC('month', ier.transaction_date) = $${paramIndex++}::date`);
      values.push(`${params.month}-01`);
    }

    // 日期範圍
    if (params.start_date) {
      conditions.push(`ier.transaction_date >= $${paramIndex++}`);
      values.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push(`ier.transaction_date <= $${paramIndex++}`);
      values.push(params.end_date);
    }

    // 類型篩選
    if (params.transaction_type) {
      conditions.push(`ier.transaction_type = $${paramIndex++}`);
      values.push(params.transaction_type);
    }

    // 分類篩選
    if (params.category) {
      conditions.push(`ier.category = $${paramIndex++}`);
      values.push(params.category);
    }

    // 人員篩選
    if (params.teacher_id) {
      conditions.push(`ier.teacher_id = $${paramIndex++}`);
      values.push(params.teacher_id);
    }
    if (params.customer_id) {
      conditions.push(`ier.customer_id = $${paramIndex++}`);
      values.push(params.customer_id);
    }
    if (params.consultant_id) {
      conditions.push(`ier.consultant_id = $${paramIndex++}`);
      values.push(params.consultant_id);
    }
    if (params.setter_id) {
      conditions.push(`ier.setter_id = $${paramIndex++}`);
      values.push(params.setter_id);
    }

    // 確認狀態篩選
    if (params.is_confirmed !== undefined) {
      conditions.push(`ier.is_confirmed = $${paramIndex++}`);
      values.push(params.is_confirmed);
    }

    // 關鍵字搜尋
    if (params.search) {
      conditions.push(`(
        ier.item_name ILIKE $${paramIndex} OR
        ier.customer_name ILIKE $${paramIndex} OR
        ier.customer_email ILIKE $${paramIndex} OR
        ier.notes ILIKE $${paramIndex} OR
        ier.course_code ILIKE $${paramIndex}
      )`);
      values.push(`%${params.search}%`);
      paramIndex++;
    }

    // 分頁
    const page = params.page || 1;
    const limit = params.limit || 50;
    const offset = (page - 1) * limit;

    // 查詢總數
    const countQuery = `
      SELECT COUNT(*) as total
      FROM income_expense_records ier
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await queryDatabase(countQuery, values);
    const total = parseInt(countResult.rows[0].total);

    // 查詢記錄
    const query = `
      SELECT
        ier.*,
        u1.first_name || ' ' || COALESCE(u1.last_name, '') as teacher_name,
        u2.first_name || ' ' || COALESCE(u2.last_name, '') as setter_name,
        u3.first_name || ' ' || COALESCE(u3.last_name, '') as consultant_name,
        u4.first_name || ' ' || COALESCE(u4.last_name, '') as created_by_name
      FROM income_expense_records ier
      LEFT JOIN users u1 ON ier.teacher_id = u1.id
      LEFT JOIN users u2 ON ier.setter_id = u2.id
      LEFT JOIN users u3 ON ier.consultant_id = u3.id
      LEFT JOIN users u4 ON ier.created_by = u4.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ier.transaction_date DESC, ier.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await queryDatabase(query, values);

    return {
      records: result.rows,
      total,
      page,
      limit,
    };
  }

  /**
   * 獲取月度統計
   */
  async getMonthlySummary(month: string): Promise<MonthlySummary> {
    const query = `
      WITH monthly_data AS (
        SELECT *
        FROM income_expense_records
        WHERE DATE_TRUNC('month', transaction_date) = $1::date
      ),
      category_summary AS (
        SELECT
          category,
          SUM(amount_in_twd) as amount,
          COUNT(*) as count
        FROM monthly_data
        WHERE category IS NOT NULL
        GROUP BY category
      ),
      currency_summary AS (
        SELECT
          currency,
          SUM(amount) as amount,
          COUNT(*) as count
        FROM monthly_data
        GROUP BY currency
      )
      SELECT
        -- 總計
        (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount_in_twd ELSE 0 END), 0) FROM monthly_data) as total_income,
        (SELECT COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount_in_twd ELSE 0 END), 0) FROM monthly_data) as total_expense,
        (SELECT COUNT(*) FROM monthly_data) as record_count,

        -- 按分類統計
        (SELECT COALESCE(json_agg(jsonb_build_object(
          'category', category,
          'amount', amount,
          'count', count
        )), '[]'::json) FROM category_summary) as by_category,

        -- 按幣別統計
        (SELECT COALESCE(json_agg(jsonb_build_object(
          'currency', currency,
          'amount', amount,
          'count', count
        )), '[]'::json) FROM currency_summary) as by_currency
    `;

    const result = await queryDatabase(query, [`${month}-01`]);

    if (result.rows.length === 0) {
      return {
        month,
        total_income: 0,
        total_expense: 0,
        net_profit: 0,
        record_count: 0,
        by_category: [],
        by_currency: [],
      };
    }

    const row = result.rows[0];
    const total_income = parseFloat(row.total_income || 0);
    const total_expense = parseFloat(row.total_expense || 0);

    return {
      month,
      total_income,
      total_expense,
      net_profit: total_income - total_expense,
      record_count: parseInt(row.record_count),
      by_category: row.by_category || [],
      by_currency: row.by_currency || [],
    };
  }

  /**
   * 批次匯入記錄
   */
  async bulkImport(records: CreateIncomeExpenseInput[]): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      try {
        await this.createRecord(records[i]);
        success++;
      } catch (error: any) {
        failed++;
        errors.push({
          index: i,
          error: error.message,
        });
      }
    }

    return { success, failed, errors };
  }

  /**
   * 同步到成本獲利表（月度彙總）
   */
  async syncToCostProfit(month: string): Promise<void> {
    // TODO: 實作同步邏輯
    // 1. 獲取該月的所有收支記錄
    // 2. 按分類彙總
    // 3. 寫入或更新 cost_profit 表
    console.log(`Syncing month ${month} to cost_profit table...`);
  }
}

// 導出單例
export const incomeExpenseService = new IncomeExpenseService();
export default incomeExpenseService;
