/**
 * 收支紀錄服務
 * 對應 Google Sheets 收支表結構
 * Migration: 071_rebuild_income_expense_clean.sql
 *
 * 注意：此表資料來源為 Google Sheets 同步，不使用軟刪除
 */

import { queryDatabase } from './pg-client';

// ============================================
// 類型定義（對應實際資料表結構 - Migration 071）
// ============================================

export interface IncomeExpenseRecord {
  id: string;

  // 基本交易資訊
  transaction_date: string;                 // Date
  payment_method?: string;                  // 付款方式
  income_item?: string;                     // 收入項目
  expense_item?: string;                    // 支出項目
  quantity?: number;                        // 數量
  transaction_category?: string;            // 收支類別
  customer_type?: string;                   // 商家類別

  // 金額資訊
  amount_twd?: number;                      // 金額（台幣）

  // 客戶資訊
  customer_name?: string;                   // 商家姓名/顧客姓名
  customer_email?: string;                  // 顧客Email

  // 人員資訊（字串，非 UUID 關聯）
  teacher_name?: string;                    // 授課教練
  closer?: string;                          // 業績歸屬人 1（諮詢師）
  setter?: string;                          // 業績歸屬人 2（電訪）
  form_filler?: string;                     // 填表人

  // 業務資訊
  deal_method?: string;                     // 成交方式
  consultation_source?: string;             // 諮詢來源
  notes?: string;                           // 備註
  submitted_at?: string;                    // 表單提交時間

  // 系統欄位
  data_source?: string;                     // 資料來源
  created_at: string;
  updated_at: string;
}

export interface CreateIncomeExpenseInput {
  transaction_date: string;                 // 必填
  amount_twd?: number;
  payment_method?: string;
  income_item?: string;
  expense_item?: string;
  quantity?: number;
  transaction_category?: string;
  customer_type?: string;
  customer_name?: string;
  customer_email?: string;
  teacher_name?: string;
  closer?: string;
  setter?: string;
  form_filler?: string;
  deal_method?: string;
  consultation_source?: string;
  notes?: string;
}

export interface UpdateIncomeExpenseInput extends Partial<CreateIncomeExpenseInput> {}

export interface QueryParams {
  month?: string;                          // YYYY-MM
  transaction_category?: string;
  teacher_name?: string;
  closer?: string;
  setter?: string;
  customer_email?: string;
  search?: string;
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
        transaction_date, payment_method, income_item, expense_item, quantity,
        transaction_category, customer_type,
        amount_twd, customer_name, customer_email,
        teacher_name, closer, setter, form_filler,
        deal_method, consultation_source, notes,
        data_source
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'manual'
      )
      RETURNING *
    `;

    const values = [
      input.transaction_date,
      input.payment_method || null,
      input.income_item || null,
      input.expense_item || null,
      input.quantity || 1,
      input.transaction_category || null,
      input.customer_type || null,
      input.amount_twd || null,
      input.customer_name || null,
      input.customer_email || null,
      input.teacher_name || null,
      input.closer || null,
      input.setter || null,
      input.form_filler || null,
      input.deal_method || null,
      input.consultation_source || null,
      input.notes || null,
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
      'expense_item',
      'quantity',
      'transaction_category',
      'customer_type',
      'amount_twd',
      'customer_name',
      'customer_email',
      'teacher_name',
      'closer',
      'setter',
      'form_filler',
      'deal_method',
      'consultation_source',
      'notes',
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
   * 刪除收支記錄（硬刪除，因為資料來源是 Google Sheets）
   */
  async deleteRecord(id: string): Promise<void> {
    const query = 'DELETE FROM income_expense_records WHERE id = $1';
    await queryDatabase(query, [id], 'session');
  }

  /**
   * 根據 ID 獲取單筆記錄
   */
  async getRecordById(id: string): Promise<IncomeExpenseRecord> {
    const query = `
      SELECT * FROM income_expense_records WHERE id = $1
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
    const conditions: string[] = ['1=1'];
    const values: any[] = [];
    let paramIndex = 1;

    // 月份篩選
    if (params.month) {
      conditions.push(`DATE_TRUNC('month', transaction_date) = $${paramIndex++}::date`);
      values.push(`${params.month}-01`);
    }

    // 日期範圍
    if (params.start_date) {
      conditions.push(`transaction_date >= $${paramIndex++}`);
      values.push(params.start_date);
    }
    if (params.end_date) {
      conditions.push(`transaction_date <= $${paramIndex++}`);
      values.push(params.end_date);
    }

    // 類別篩選
    if (params.transaction_category) {
      conditions.push(`transaction_category = $${paramIndex++}`);
      values.push(params.transaction_category);
    }

    // 人員篩選
    if (params.teacher_name) {
      conditions.push(`teacher_name = $${paramIndex++}`);
      values.push(params.teacher_name);
    }
    if (params.closer) {
      conditions.push(`closer = $${paramIndex++}`);
      values.push(params.closer);
    }
    if (params.setter) {
      conditions.push(`setter = $${paramIndex++}`);
      values.push(params.setter);
    }
    if (params.customer_email) {
      conditions.push(`customer_email = $${paramIndex++}`);
      values.push(params.customer_email);
    }

    // 關鍵字搜尋
    if (params.search) {
      conditions.push(`(
        income_item ILIKE $${paramIndex} OR
        expense_item ILIKE $${paramIndex} OR
        customer_name ILIKE $${paramIndex} OR
        customer_email ILIKE $${paramIndex} OR
        notes ILIKE $${paramIndex}
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
      FROM income_expense_records
      WHERE ${conditions.join(' AND ')}
    `;
    const countResult = await queryDatabase(countQuery, values, 'transaction');
    const total = parseInt(countResult.rows[0].total);

    // 查詢記錄
    const query = `
      SELECT *
      FROM income_expense_records
      WHERE ${conditions.join(' AND ')}
      ORDER BY transaction_date DESC, created_at DESC
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
      ),
      category_summary AS (
        SELECT
          transaction_category as category,
          SUM(COALESCE(amount_twd, 0)) as amount,
          COUNT(*) as count
        FROM monthly_data
        WHERE transaction_category IS NOT NULL
        GROUP BY transaction_category
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
        )), '[]'::json) FROM category_summary) as by_category
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
            transaction_date, payment_method, income_item, expense_item, quantity,
            transaction_category, customer_type,
            amount_twd, customer_name, customer_email,
            teacher_name, closer, setter, form_filler,
            deal_method, consultation_source, notes,
            data_source
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          )
        `;

        const values = [
          records[i].transaction_date,
          records[i].payment_method || null,
          records[i].income_item || null,
          records[i].expense_item || null,
          records[i].quantity || 1,
          records[i].transaction_category || null,
          records[i].customer_type || null,
          records[i].amount_twd || null,
          records[i].customer_name || null,
          records[i].customer_email || null,
          records[i].teacher_name || null,
          records[i].closer || null,
          records[i].setter || null,
          records[i].form_filler || null,
          records[i].deal_method || null,
          records[i].consultation_source || null,
          records[i].notes || null,
          source,
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
