import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false }
});

export interface CostProfitRecord {
  id: string;
  category_name: string;
  item_name: string;
  amount: number | null;
  notes: string | null;
  month: string;
  year: number;
  is_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  month: string;
  revenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
  categories: Record<string, number>;
}

export const costProfitService = {
  /**
   * 獲取所有成本獲利數據
   */
  async getAllRecords(): Promise<CostProfitRecord[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM cost_profit ORDER BY year DESC, month DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  },

  /**
   * 根據年份和月份篩選數據
   */
  async getRecordsByPeriod(year?: number, month?: string): Promise<CostProfitRecord[]> {
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM cost_profit WHERE 1=1';
      const params: any[] = [];
      let paramCount = 1;

      if (year) {
        query += ` AND year = $${paramCount}`;
        params.push(year);
        paramCount++;
      }

      if (month) {
        query += ` AND month = $${paramCount}`;
        params.push(month);
        paramCount++;
      }

      query += ' ORDER BY year DESC, month DESC';

      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  },

  /**
   * 計算摘要數據
   */
  async getSummary(year?: number, month?: string) {
    const records = await this.getRecordsByPeriod(year, month);

    const summary = {
      revenue: 0,
      totalCost: 0,
      profit: 0,
      profitMargin: 0,
      categoryCosts: {} as Record<string, number>,
    };

    records.forEach((record) => {
      // 確保轉換為數字
      const amount = parseFloat(record.amount as any) || 0;

      if (record.category_name === '收入金額') {
        summary.revenue += amount;
      } else {
        summary.totalCost += amount;
        summary.categoryCosts[record.category_name] =
          (summary.categoryCosts[record.category_name] || 0) + amount;
      }
    });

    summary.profit = summary.revenue - summary.totalCost;
    summary.profitMargin = summary.revenue > 0
      ? (summary.profit / summary.revenue) * 100
      : 0;

    return summary;
  },

  /**
   * 獲取月度對比數據
   */
  async getMonthlyComparison(year?: number): Promise<MonthlySummary[]> {
    const records = await this.getRecordsByPeriod(year);

    const monthlyData = new Map<string, {
      revenue: number;
      cost: number;
      categories: Record<string, number>;
    }>();

    records.forEach((record) => {
      const key = `${record.year}-${record.month}`;
      if (!monthlyData.has(key)) {
        monthlyData.set(key, { revenue: 0, cost: 0, categories: {} });
      }

      const monthData = monthlyData.get(key)!;
      const amount = parseFloat(record.amount as any) || 0;

      if (record.category_name === '收入金額') {
        monthData.revenue += amount;
      } else {
        monthData.cost += amount;
        monthData.categories[record.category_name] =
          (monthData.categories[record.category_name] || 0) + amount;
      }
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        totalCost: data.cost,
        profit: data.revenue - data.cost,
        profitMargin: data.revenue > 0
          ? ((data.revenue - data.cost) / data.revenue) * 100
          : 0,
        categories: data.categories,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  },

  /**
   * 獲取分類統計
   */
  async getCategoryStats(year?: number, month?: string) {
    const records = await this.getRecordsByPeriod(year, month);

    const categoryTotals = new Map<string, number>();
    let totalCost = 0;

    records.forEach((record) => {
      if (record.category_name !== '收入金額') {
        const amount = parseFloat(record.amount as any) || 0;
        categoryTotals.set(
          record.category_name,
          (categoryTotals.get(record.category_name) || 0) + amount
        );
        totalCost += amount;
      }
    });

    return Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalCost > 0 ? (amount / totalCost) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  },

  /**
   * 儲存指定月份的成本獲利資料（會先清空該月份再寫入）
   */
  async saveMonthlyRecords(params: {
    year: number;
    month: string;
    records: Array<{
      category_name: string;
      item_name: string;
      amount: number | null;
      currency?: string;
      exchange_rate_used?: number | null;
      amount_in_twd?: number | null;
      notes?: string | null;
      is_confirmed?: boolean;
    }>;
  }): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 先刪除同月份資料
      await client.query(
        'DELETE FROM cost_profit WHERE year = $1 AND month = $2',
        [params.year, params.month]
      );

      if (params.records.length > 0) {
        const insertText = `
          INSERT INTO cost_profit
            (category_name, item_name, amount, currency, exchange_rate_used, amount_in_twd, notes, month, year, is_confirmed)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        for (const record of params.records) {
          await client.query(insertText, [
            record.category_name,
            record.item_name,
            record.amount,
            record.currency ?? 'TWD',
            record.exchange_rate_used ?? null,
            record.amount_in_twd ?? null,
            record.notes ?? null,
            params.month,
            params.year,
            record.is_confirmed ?? false,
          ]);
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * 取得最近數個月的資料（依年份/月份倒序）
   */
  async getRecentMonths(limit = 6): Promise<CostProfitRecord[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT *
         FROM cost_profit
         ORDER BY year DESC, month DESC
         LIMIT $1`,
        [limit * 20] // 預估每月約 20 筆，確保資料量足夠
      );
      return result.rows;
    } finally {
      client.release();
    }
  },
};
