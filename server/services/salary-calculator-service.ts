/**
 * 薪資計算服務
 * 核心功能：根據員工設定自動計算薪資
 */

import { queryDatabase } from './pg-client';

export interface EmployeeSalarySetting {
  id: string;
  employee_name: string;
  role_type: 'teacher' | 'closer' | 'setter';
  employment_type: 'full_time' | 'part_time';
  base_salary: number;
  hourly_rate: number;
  commission_rate: number;
  point_commission_rate: number;
  performance_bonus: number;
  phone_bonus_rate: number;
  original_bonus: number;
  online_course_rate: number;
  labor_insurance: number;
  health_insurance: number;
  retirement_fund: number;
  service_fee: number;
}

export interface SalaryCalculationResult {
  employee_name: string;
  period_start: string;
  period_end: string;

  // 員工類型
  role_type: 'teacher' | 'closer' | 'setter';
  employment_type: 'full_time' | 'part_time';

  // 基本（正職）
  base_salary: number;
  original_bonus: number;

  // 兼職
  hourly_rate?: number;
  monthly_hours?: number;
  hourly_wage_subtotal?: number;

  // 自動計算
  total_revenue: number;           // 個人總業績
  commission_amount: number;        // 總應獲抽成
  point_contribution: number;       // 總應點貢
  online_course_revenue: number;    // 線上課程分潤
  other_income: number;             // 其他

  // 績效相關 (手動輸入)
  performance_type?: string;
  performance_combo?: string;
  performance_percentage?: number;
  total_commission_adjusted?: number;
  phone_performance_bonus?: number;
  performance_bonus?: number;
  leave_deduction?: number;

  // 小計
  subtotal_before_deductions: number;

  // 扣除項
  labor_insurance: number;
  health_insurance: number;
  retirement_fund: number;
  service_fee: number;

  // 最終薪資
  total_salary: number;

  // 明細
  details: {
    revenueByCategory: { [category: string]: number };
    recordCount: number;
  };
}

export class SalaryCalculatorService {
  /**
   * 獲取所有員工設定
   */
  async getAllEmployeeSettings(): Promise<EmployeeSalarySetting[]> {
    const result = await queryDatabase(`
      SELECT *
      FROM employee_salary_settings
      WHERE is_active = true
      ORDER BY employee_name
    `);
    return result.rows;
  }

  /**
   * 獲取單一員工設定
   */
  async getEmployeeSetting(employeeName: string): Promise<EmployeeSalarySetting | null> {
    const result = await queryDatabase(`
      SELECT *
      FROM employee_salary_settings
      WHERE employee_name = $1 AND is_active = true
    `, [employeeName]);

    return result.rows[0] || null;
  }

  /**
   * 核心功能：自動計算員工薪資
   */
  async calculateSalary(
    employeeName: string,
    periodStart: string,
    periodEnd: string,
    manualAdjustments?: {
      performance_type?: string;
      performance_combo?: string;
      performance_percentage?: number;
      phone_performance_bonus?: number;
      performance_bonus?: number;
      leave_deduction?: number;
      monthly_hours?: number;  // 兼職員工的當月工時
    }
  ): Promise<SalaryCalculationResult> {
    // 1. 獲取員工設定
    const setting = await this.getEmployeeSetting(employeeName);
    if (!setting) {
      throw new Error(`找不到員工 ${employeeName} 的薪資設定`);
    }

    // 2. 計算業績 (根據角色類型)
    const revenueData = await this.calculateRevenue(
      employeeName,
      setting.role_type,
      periodStart,
      periodEnd
    );

    // 3. 計算抽成 (確保 commission_rate 是數字)
    const commissionAmount = revenueData.total_revenue * (parseFloat(String(setting.commission_rate)) / 100);

    // 4. 計算點貢 (假設固定金額)
    const pointContribution = parseFloat(String(setting.point_commission_rate));

    // 5. 計算績效調整後的抽成
    let totalCommissionAdjusted = commissionAmount;
    if (manualAdjustments?.performance_percentage) {
      totalCommissionAdjusted = commissionAmount * (manualAdjustments.performance_percentage / 100);
    }

    // 6. 計算時薪小計 (兼職員工)
    const isPartTime = setting.employment_type === 'part_time';
    const monthlyHours = manualAdjustments?.monthly_hours || 0;
    const hourlyWageSubtotal = isPartTime ? (parseFloat(String(setting.hourly_rate)) * monthlyHours) : 0;

    // 7. 計算小計 (確保所有值都轉換為數字)
    let baseAmount = 0;
    if (isPartTime) {
      // 兼職：時薪小計
      baseAmount = hourlyWageSubtotal;
    } else {
      // 正職：底薪 + 原獎金
      baseAmount = parseFloat(String(setting.base_salary)) + parseFloat(String(setting.original_bonus));
    }

    const subtotal =
      baseAmount +
      totalCommissionAdjusted +
      parseFloat(String(pointContribution)) +
      (manualAdjustments?.phone_performance_bonus || 0) +
      (manualAdjustments?.performance_bonus || 0) -
      (manualAdjustments?.leave_deduction || 0);

    // 7. 計算扣除項後的最終薪資
    const totalDeductions =
      parseFloat(String(setting.labor_insurance)) +
      parseFloat(String(setting.health_insurance)) +
      parseFloat(String(setting.retirement_fund)) +
      parseFloat(String(setting.service_fee));

    const totalSalary = subtotal - totalDeductions;

    return {
      employee_name: employeeName,
      period_start: periodStart,
      period_end: periodEnd,

      role_type: setting.role_type,
      employment_type: setting.employment_type,

      base_salary: setting.base_salary,
      original_bonus: setting.original_bonus,

      // 兼職相關
      hourly_rate: isPartTime ? parseFloat(String(setting.hourly_rate)) : undefined,
      monthly_hours: isPartTime ? monthlyHours : undefined,
      hourly_wage_subtotal: isPartTime ? hourlyWageSubtotal : undefined,

      total_revenue: revenueData.total_revenue,
      commission_amount: commissionAmount,
      point_contribution: pointContribution,
      online_course_revenue: 0, // TODO: 實作線上課程分潤
      other_income: 0,

      performance_type: manualAdjustments?.performance_type,
      performance_combo: manualAdjustments?.performance_combo,
      performance_percentage: manualAdjustments?.performance_percentage,
      total_commission_adjusted: totalCommissionAdjusted,
      phone_performance_bonus: manualAdjustments?.phone_performance_bonus || 0,
      performance_bonus: manualAdjustments?.performance_bonus || 0,
      leave_deduction: manualAdjustments?.leave_deduction || 0,

      subtotal_before_deductions: subtotal,

      labor_insurance: setting.labor_insurance,
      health_insurance: setting.health_insurance,
      retirement_fund: setting.retirement_fund,
      service_fee: setting.service_fee,

      total_salary: totalSalary,

      details: {
        revenueByCategory: revenueData.byCategory,
        recordCount: revenueData.recordCount,
        records: revenueData.records,
      },
    };
  }

  /**
   * 計算員工業績 (根據角色類型從 income_expense_records 計算)
   */
  private async calculateRevenue(
    employeeName: string,
    roleType: 'teacher' | 'closer' | 'setter',
    periodStart: string,
    periodEnd: string
  ): Promise<{
    total_revenue: number;
    byCategory: { [category: string]: number };
    recordCount: number;
    records: Array<{
      date: string;
      item: string;
      amount: number;
      student_name?: string;
      payment_method?: string;
      teacher_name?: string;
      closer?: string;
      setter?: string;
    }>;
  }> {
    let query = '';
    let params: any[] = [];

      // 根據角色類型決定查詢欄位
      // 支援部分匹配：先嘗試完全匹配，如果沒結果則使用模糊匹配
      const firstNameOnly = employeeName.split(' ')[0]; // 取得名字部分（如 "Gladys"）

      switch (roleType) {
        case 'teacher':
          // 教練：查詢 teacher_name（支援完全匹配或名字匹配）
          query = `
            SELECT
              transaction_date,
              income_item,
              amount_twd,
              customer_name,
              payment_method,
              teacher_name,
              closer,
              setter
            FROM income_expense_records
            WHERE (teacher_name = $1 OR teacher_name ILIKE $4)
              AND transaction_date >= $2
              AND transaction_date <= $3
              AND transaction_category = '收入'
              AND amount_twd IS NOT NULL
            ORDER BY transaction_date DESC
          `;
          params = [employeeName, periodStart, periodEnd, `%${firstNameOnly}%`];
          break;

        case 'closer':
          // 業績人員：查詢 closer（支援完全匹配或名字匹配）
          query = `
            SELECT
              transaction_date,
              income_item,
              amount_twd,
              customer_name,
              payment_method,
              teacher_name,
              closer,
              setter
            FROM income_expense_records
            WHERE (closer = $1 OR closer ILIKE $4)
              AND transaction_date >= $2
              AND transaction_date <= $3
              AND transaction_category = '收入'
              AND amount_twd IS NOT NULL
            ORDER BY transaction_date DESC
          `;
          params = [employeeName, periodStart, periodEnd, `%${firstNameOnly}%`];
          break;

        case 'setter':
          // 電訪人員：查詢 setter（支援完全匹配或名字匹配）
          query = `
            SELECT
              transaction_date,
              income_item,
              amount_twd,
              customer_name,
              payment_method,
              teacher_name,
              closer,
              setter
            FROM income_expense_records
            WHERE (setter = $1 OR setter ILIKE $4)
              AND transaction_date >= $2
              AND transaction_date <= $3
              AND transaction_category = '收入'
              AND amount_twd IS NOT NULL
            ORDER BY transaction_date DESC
          `;
          params = [employeeName, periodStart, periodEnd, `%${firstNameOnly}%`];
          break;
      }

      const result = await queryDatabase(query, params);

      // 計算總業績、分類業績、以及詳細記錄
      let totalRevenue = 0;
      const byCategory: { [category: string]: number } = {};
      const records: Array<{
        date: string;
        item: string;
        amount: number;
        student_name?: string;
        payment_method?: string;
        teacher_name?: string;
        closer?: string;
        setter?: string;
      }> = [];

      result.rows.forEach(row => {
        const amount = parseFloat(row.amount_twd || 0);
        totalRevenue += amount;

        // 彙總分類業績
        const category = row.income_item || '未分類';
        byCategory[category] = (byCategory[category] || 0) + amount;

        // 記錄每筆詳細資訊
        records.push({
          date: row.transaction_date,
          item: row.income_item || '未分類',
          amount: amount,
          student_name: row.customer_name,
          payment_method: row.payment_method,
          teacher_name: row.teacher_name,
          closer: row.closer,
          setter: row.setter,
        });
      });

      return {
        total_revenue: totalRevenue,
        byCategory,
        recordCount: records.length,
        records,
      };
  }

  /**
   * 儲存薪資計算結果
   */
  async saveSalaryCalculation(calculation: SalaryCalculationResult): Promise<string> {
    const query = `
      INSERT INTO salary_calculations (
        employee_name, period_start, period_end,
        base_salary, original_bonus,
        total_revenue, commission_amount, point_contribution,
        online_course_revenue, other_income,
        performance_type, performance_combo, performance_percentage,
        total_commission_adjusted, phone_performance_bonus,
        performance_bonus, leave_deduction,
        subtotal_before_deductions,
        labor_insurance, health_insurance, retirement_fund, service_fee,
        total_salary,
        calculation_details,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24, 'draft'
      )
      RETURNING id
    `;

    const values = [
      calculation.employee_name,
      calculation.period_start,
      calculation.period_end,
      calculation.base_salary,
      calculation.original_bonus,
      calculation.total_revenue,
      calculation.commission_amount,
      calculation.point_contribution,
      calculation.online_course_revenue,
      calculation.other_income,
      calculation.performance_type,
      calculation.performance_combo,
      calculation.performance_percentage,
      calculation.total_commission_adjusted,
      calculation.phone_performance_bonus,
      calculation.performance_bonus,
      calculation.leave_deduction,
      calculation.subtotal_before_deductions,
      calculation.labor_insurance,
      calculation.health_insurance,
      calculation.retirement_fund,
      calculation.service_fee,
      calculation.total_salary,
      JSON.stringify(calculation.details),
    ];

    const result = await queryDatabase(query, values, 'session');
    return result.rows[0].id;
  }

  /**
   * 更新員工薪資設定
   */
  async updateEmployeeSetting(
    employeeName: string,
    updates: Partial<EmployeeSalarySetting>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 動態建立 UPDATE 語句
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'employee_name' && key !== 'created_at' && key !== 'updated_at') {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      return;
    }

    values.push(employeeName);
    const query = `
      UPDATE employee_salary_settings
      SET ${fields.join(', ')}
      WHERE employee_name = $${paramIndex}
    `;

    await queryDatabase(query, values, 'session');
  }
}

export const salaryCalculatorService = new SalaryCalculatorService();
