/**
 * 收支紀錄服務
 * 對應 Google Sheets 收支表結構
 * Migration: 064_recreate_income_expense_table.sql
 */

import { queryDatabase } from './pg-client';

// ============================================
// 類型定義（對應新的資料表結構）
// ============================================

export interface IncomeExpenseRecord {
  id: string;

  // 基本交易資訊
  transaction_date: string;                 // Date
  payment_method?: string;                  // 付款方式
  income_item?: string;                     // 收入項目
  quantity?: number;                        // 數量
  transaction_category?: string;            // 收支類別
  course_category?: string;                 // 課程類別

  // 金額資訊
  amount_twd: number;                       // 金額（台幣）
  amount_converted?: number;                // 金額（換算台幣）
  currency?: string;                        // 幣別

  // 客戶資訊
  customer_name?: string;                   // 商家姓名/顧客姓名
  customer_email?: string;                  // 顧客Email
  customer_type?: string;                   // 姓名類別

  // 人員資訊（使用專案統一命名）
  teacher_id?: string;                      // 授課教練
  closer_id?: string;                       // 諮詢師
  setter_id?: string;                       // 電訪人員
  form_filler_id?: string;                  // 填表人員

  // 業務資訊
  deal_method?: string;                     // 成交方式
  consultation_source?: string;             // 諮詢來源

  // 輔助資訊
  notes?: string;                           // 備註
  source: 'manual' | 'google_sheets' | 'system';

  // 狀態與審核
  is_confirmed: boolean;
  confirmed_by?: string;
  confirmed_at?: string;

  // 軟刪除
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;

  // 時間戳
  created_at: string;
  updated_at: string;
  created_by?: string;

  // JOIN 查詢獲得的顯示名稱
  teacher_name?: string;
  closer_name?: string;
  setter_name?: string;
  form_filler_name?: string;
  created_by_name?: string;
}

export interface CreateIncomeExpenseInput {
  transaction_date: string;                 // 必填
  amount_twd: number;                       // 必填
  payment_method?: string;
  income_item?: string;
  quantity?: number;
  transaction_category?: string;
  course_category?: string;
  amount_converted?: number;
  currency?: string;
  customer_name?: string;
  customer_email?: string;
  customer_type?: string;
  teacher_id?: string;
  closer_id?: string;
  setter_id?: string;
  form_filler_id?: string;
  deal_method?: string;
  consultation_source?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdateIncomeExpenseInput extends Partial<CreateIncomeExpenseInput> {
  is_confirmed?: boolean;
}

export interface QueryParams {
  month?: string;                          // YYYY-MM
  transaction_category?: string;
  course_category?: string;
  teacher_id?: string;
  closer_id?: string;
  setter_id?: string;
  customer_email?: string;
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
  by_course_category: { category: string; amount: number; count: number }[];
}

// ============================================
// 收支紀錄服務類
// ============================================

class IncomeExpenseService {
  /**
   * 建立收支記錄
   */
  async createRecord(input: CreateIncomeExpenseInput): Promise<IncomeExpenseRecord> {
    const query = `
      INSERT INTO income_expense_records (
        transaction_date, payment_method, income_item, quantity,
        transaction_category, course_category,
        amount_twd, amount_converted, currency,
        customer_name, customer_email, customer_type,
        teacher_id, closer_id, setter_id, form_filler_id,
        deal_method, consultation_source,
        notes, source, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    const values = [
      input.transaction_date,
      input.payment_method || null,
      input.income_item || null,
      input.quantity || 1,
      input.transaction_category || null,
      input.course_category || null,
      input.amount_twd,
      input.amount_converted || null,
      input.currency || 'TWD',
      input.customer_name || null,
      input.customer_email || null,
      input.customer_type || null,
      input.teacher_id || null,
      input.closer_id || null,
      input.setter_id || null,
      input.form_filler_id || null,
      input.deal_method || null,
      input.consultation_source || null,
      input.notes || null,
      'manual',
      input.created_by || null,
    ];

    const result = await queryDatabase(query, values, 'session');
    return result.rows[0];
  }

  /**
   * 更新收支記錄
   */
  async updateRecord(id: string, input: UpdateIncomeExpenseInput): Promise<IncomeExpenseRecord> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields: Array<keyof UpdateIncomeExpenseInput> = [
      'transaction_date',
      'payment_method',
      'income_item',
      'quantity',
      'transaction_category',
      'course_category',
      'amount_twd',
      'amount_converted',
      'currency',
      'customer_name',
      'customer_email',
      'customer_type',
      'teacher_id',
      'closer_id',
      'setter_id',
      'form_filler_id',
      'deal_method',
      'consultation_source',
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

    const result = await queryDatabase(query, values, 'session');
    if (result.rows.length === 0) {
      throw new Error(`Record not found: ${id}`);
    }
    return result.rows[0];
  }

  /**
   * 軟刪除收支記錄
   */
  async deleteRecord(id: string, deletedBy?: string): Promise<void> {
    const query = `
      UPDATE income_expense_records
      SET is_deleted = true, deleted_at = NOW(), deleted_by = $2
      WHERE id = $1
    `;
    await queryDatabase(query, [id, deletedBy || null], 'session');
  }

  /**
   * 永久刪除收支記錄
   */
  async hardDeleteRecord(id: string): Promise<void> {
    const query = 'DELETE FROM income_expense_records WHERE id = $1';
    await queryDatabase(query, [id], 'session');
  }

  /**
   * 根據 ID 獲取單筆記錄（含人員名稱）
   */
  async getRecordById(id: string): Promise<IncomeExpenseRecord> {
    const query = `
      SELECT
        ier.*,
        u1.first_name || ' ' || COALESCE(u1.last_name, '') as teacher_name,
        u2.first_name || ' ' || COALESCE(u2.last_name, '') as closer_name,
        u3.first_name || ' ' || COALESCE(u3.last_name, '') as setter_name,
        u4.first_name || ' ' || COALESCE(u4.last_name, '') as form_filler_name,
        u5.first_name || ' ' || COALESCE(u5.last_name, '') as created_by_name
      FROM income_expense_records ier
      LEFT JOIN users u1 ON ier.teacher_id = u1.id
      LEFT JOIN users u2 ON ier.closer_id = u2.id
      LEFT JOIN users u3 ON ier.setter_id = u3.id
      LEFT JOIN users u4 ON ier.form_filler_id = u4.id
      LEFT JOIN users u5 ON ier.created_by = u5.id
      WHERE ier.id = $1 AND ier.is_deleted = false
    `;

    const result = await queryDatabase(query, [id], 'transaction');

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
    const conditions: string[] = ['ier.is_deleted = false'];
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

    // 類別篩選
    if (params.transaction_category) {
      conditions.push(`ier.transaction_category = $${paramIndex++}`);
      values.push(params.transaction_category);
    }

    if (params.course_category) {
      conditions.push(`ier.course_category = $${paramIndex++}`);
      values.push(params.course_category);
    }

    // 人員篩選
    if (params.teacher_id) {
      conditions.push(`ier.teacher_id = $${paramIndex++}`);
      values.push(params.teacher_id);
    }
    if (params.closer_id) {
      conditions.push(`ier.closer_id = $${paramIndex++}`);
      values.push(params.closer_id);
    }
    if (params.setter_id) {
      conditions.push(`ier.setter_id = $${paramIndex++}`);
      values.push(params.setter_id);
    }
    if (params.customer_email) {
      conditions.push(`ier.customer_email = $${paramIndex++}`);
      values.push(params.customer_email);
    }

    // 確認狀態篩選
    if (params.is_confirmed !== undefined) {
      conditions.push(`ier.is_confirmed = $${paramIndex++}`);
      values.push(params.is_confirmed);
    }

    // 關鍵字搜尋
    if (params.search) {
      conditions.push(`(
        ier.income_item ILIKE $${paramIndex} OR
        ier.customer_name ILIKE $${paramIndex} OR
        ier.customer_email ILIKE $${paramIndex} OR
        ier.notes ILIKE $${paramIndex}
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
    const countResult = await queryDatabase(countQuery, values, 'transaction');
    const total = parseInt(countResult.rows[0].total);

    // 查詢記錄
    const query = `
      SELECT
        ier.*,
        u1.first_name || ' ' || COALESCE(u1.last_name, '') as teacher_name,
        u2.first_name || ' ' || COALESCE(u2.last_name, '') as closer_name,
        u3.first_name || ' ' || COALESCE(u3.last_name, '') as setter_name,
        u4.first_name || ' ' || COALESCE(u4.last_name, '') as form_filler_name,
        u5.first_name || ' ' || COALESCE(u5.last_name, '') as created_by_name
      FROM income_expense_records ier
      LEFT JOIN users u1 ON ier.teacher_id = u1.id
      LEFT JOIN users u2 ON ier.closer_id = u2.id
      LEFT JOIN users u3 ON ier.setter_id = u3.id
      LEFT JOIN users u4 ON ier.form_filler_id = u4.id
      LEFT JOIN users u5 ON ier.created_by = u5.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ier.transaction_date DESC, ier.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);
    const result = await queryDatabase(query, values, 'transaction');

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
          AND is_deleted = false
      ),
      category_summary AS (
        SELECT
          transaction_category as category,
          SUM(amount_twd) as amount,
          COUNT(*) as count
        FROM monthly_data
        WHERE transaction_category IS NOT NULL
        GROUP BY transaction_category
      ),
      course_summary AS (
        SELECT
          course_category as category,
          SUM(amount_twd) as amount,
          COUNT(*) as count
        FROM monthly_data
        WHERE course_category IS NOT NULL
        GROUP BY course_category
      )
      SELECT
        -- 總計（假設「收入」、「支出」等字眼在 transaction_category 中）
        (SELECT COALESCE(SUM(CASE WHEN transaction_category LIKE '%收入%' THEN amount_twd ELSE 0 END), 0) FROM monthly_data) as total_income,
        (SELECT COALESCE(SUM(CASE WHEN transaction_category LIKE '%支出%' THEN amount_twd ELSE 0 END), 0) FROM monthly_data) as total_expense,
        (SELECT COUNT(*) FROM monthly_data) as record_count,

        -- 按收支類別統計
        (SELECT COALESCE(json_agg(jsonb_build_object(
          'category', category,
          'amount', amount,
          'count', count
        )), '[]'::json) FROM category_summary) as by_category,

        -- 按課程類別統計
        (SELECT COALESCE(json_agg(jsonb_build_object(
          'category', category,
          'amount', amount,
          'count', count
        )), '[]'::json) FROM course_summary) as by_course_category
    `;

    const result = await queryDatabase(query, [`${month}-01`], 'transaction');

    if (result.rows.length === 0) {
      return {
        month,
        total_income: 0,
        total_expense: 0,
        net_profit: 0,
        record_count: 0,
        by_category: [],
        by_course_category: [],
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
      by_course_category: row.by_course_category || [],
    };
  }

  /**
   * 批次匯入記錄（用於 Google Sheets 同步）
   */
  async bulkImport(records: CreateIncomeExpenseInput[], source: 'google_sheets' | 'manual' = 'google_sheets'): Promise<{
    success: number;
    failed: number;
    errors: Array<{ index: number; error: string }>;
  }> {
    let success = 0;
    let failed = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < records.length; i++) {
      try {
        const query = `
          INSERT INTO income_expense_records (
            transaction_date, payment_method, income_item, quantity,
            transaction_category, course_category,
            amount_twd, amount_converted, currency,
            customer_name, customer_email, customer_type,
            teacher_id, closer_id, setter_id, form_filler_id,
            deal_method, consultation_source,
            notes, source, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
          )
        `;

        const values = [
          records[i].transaction_date,
          records[i].payment_method || null,
          records[i].income_item || null,
          records[i].quantity || 1,
          records[i].transaction_category || null,
          records[i].course_category || null,
          records[i].amount_twd,
          records[i].amount_converted || null,
          records[i].currency || 'TWD',
          records[i].customer_name || null,
          records[i].customer_email || null,
          records[i].customer_type || null,
          records[i].teacher_id || null,
          records[i].closer_id || null,
          records[i].setter_id || null,
          records[i].form_filler_id || null,
          records[i].deal_method || null,
          records[i].consultation_source || null,
          records[i].notes || null,
          source,
          records[i].created_by || null,
        ];

        await queryDatabase(query, values, 'session');
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
}

// 導出單例
export const incomeExpenseService = new IncomeExpenseService();
export default incomeExpenseService;
