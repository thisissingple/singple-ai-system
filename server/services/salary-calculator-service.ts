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
  has_performance_bonus: boolean;  // 是否有績效獎金資格
}

/**
 * 績效獎金計算結果
 */
export interface PerformanceBonusResult {
  performance_score: number;           // 當月績效分數 (1-10)
  base_performance_bonus: number;      // 基本績效獎金 (0/1000/2000)
  consecutive_full_score_count: number; // 連續滿分次數
  consecutive_bonus: number;           // 連續滿分加成 (0/500/1000/2000)
  total_performance_bonus: number;     // 總績效獎金
  commission_deduction_rate: number;   // 抽成扣減百分比 (0/1/2)
  requires_interview: boolean;         // 是否需要約談
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

  // 績效獎金系統 (自動計算)
  has_performance_bonus?: boolean;        // 是否有績效獎金資格
  performance_score?: number;             // 當月績效分數 (1-10)
  base_performance_bonus?: number;        // 基本績效獎金 (0/1000/2000)
  consecutive_full_score_count?: number;  // 連續滿分次數
  consecutive_bonus?: number;             // 連續滿分加成
  total_performance_bonus?: number;       // 總績效獎金
  commission_deduction_rate?: number;     // 抽成扣減百分比
  requires_interview?: boolean;           // 是否需要約談

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
   * 獲取員工上一次的績效記錄（用於計算連續滿分）
   */
  async getLastPerformanceRecord(employeeName: string): Promise<{
    performance_score: number;
    consecutive_full_score_count: number;
  } | null> {
    const result = await queryDatabase(`
      SELECT performance_score, consecutive_full_score_count
      FROM salary_calculations
      WHERE employee_name = $1
        AND status IN ('confirmed', 'paid')
        AND performance_score IS NOT NULL
      ORDER BY period_end DESC
      LIMIT 1
    `, [employeeName]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      performance_score: result.rows[0].performance_score || 10,
      consecutive_full_score_count: result.rows[0].consecutive_full_score_count || 0,
    };
  }

  /**
   * 計算績效獎金
   * 規則：
   * - 8-10分：$2,000
   * - 7分：$1,000
   * - 6分：$0 + 約談
   * - 3-5分：$0 + 抽成扣1%
   * - 1-2分：$0 + 抽成扣2%
   *
   * 連續滿分加成（上限 $2,000）：
   * - 連續1次：+$500
   * - 連續2次：+$1,000
   * - 連續3次以上：+$2,000
   */
  calculatePerformanceBonus(
    performanceScore: number,
    lastPerformance: { performance_score: number; consecutive_full_score_count: number } | null
  ): PerformanceBonusResult {
    // 基本績效獎金
    let basePerformanceBonus = 0;
    let commissionDeductionRate = 0;
    let requiresInterview = false;

    if (performanceScore >= 8) {
      basePerformanceBonus = 2000;
    } else if (performanceScore === 7) {
      basePerformanceBonus = 1000;
    } else if (performanceScore === 6) {
      basePerformanceBonus = 0;
      requiresInterview = true;
    } else if (performanceScore >= 3) {
      basePerformanceBonus = 0;
      commissionDeductionRate = 1;
    } else {
      basePerformanceBonus = 0;
      commissionDeductionRate = 2;
    }

    // 計算連續滿分次數
    let consecutiveCount = 0;
    if (performanceScore === 10) {
      // 本次滿分
      if (lastPerformance && lastPerformance.performance_score === 10) {
        // 上次也是滿分，延續連續次數
        consecutiveCount = (lastPerformance.consecutive_full_score_count || 0) + 1;
      } else {
        // 上次不是滿分，重新開始計算
        consecutiveCount = 1;
      }
    } else {
      // 本次不是滿分，連續次數歸零
      consecutiveCount = 0;
    }

    // 連續滿分加成（上限 $2,000）
    let consecutiveBonus = 0;
    if (consecutiveCount >= 3) {
      consecutiveBonus = 2000;
    } else if (consecutiveCount === 2) {
      consecutiveBonus = 1000;
    } else if (consecutiveCount === 1) {
      consecutiveBonus = 500;
    }

    return {
      performance_score: performanceScore,
      base_performance_bonus: basePerformanceBonus,
      consecutive_full_score_count: consecutiveCount,
      consecutive_bonus: consecutiveBonus,
      total_performance_bonus: basePerformanceBonus + consecutiveBonus,
      commission_deduction_rate: commissionDeductionRate,
      requires_interview: requiresInterview,
    };
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
      performance_score?: number;  // 績效分數 (1-10)
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

    // 3. 計算基本抽成 (確保 commission_rate 是數字)
    let commissionRate = parseFloat(String(setting.commission_rate)) / 100;
    const baseCommissionAmount = revenueData.total_revenue * commissionRate;

    // 4. 計算績效獎金（如果員工有績效獎金資格）
    let performanceBonusResult: PerformanceBonusResult | null = null;
    let commissionDeductionAmount = 0;

    if (setting.has_performance_bonus && manualAdjustments?.performance_score !== undefined) {
      // 獲取上一次績效記錄
      const lastPerformance = await this.getLastPerformanceRecord(employeeName);

      // 計算績效獎金
      performanceBonusResult = this.calculatePerformanceBonus(
        manualAdjustments.performance_score,
        lastPerformance
      );

      // 如果有抽成扣減（績效分數 < 6 分）
      if (performanceBonusResult.commission_deduction_rate > 0) {
        commissionDeductionAmount = revenueData.total_revenue * (performanceBonusResult.commission_deduction_rate / 100);
      }
    }

    // 5. 計算最終抽成（扣除績效扣減）
    const commissionAmount = baseCommissionAmount - commissionDeductionAmount;

    // 6. 計算點貢 (假設固定金額)
    const pointContribution = parseFloat(String(setting.point_commission_rate));

    // 7. 計算績效調整後的抽成（舊版百分比調整，保留相容性）
    let totalCommissionAdjusted = commissionAmount;
    if (manualAdjustments?.performance_percentage) {
      totalCommissionAdjusted = commissionAmount * (manualAdjustments.performance_percentage / 100);
    }

    // 8. 計算時薪小計 (兼職員工)
    const isPartTime = setting.employment_type === 'part_time';
    const monthlyHours = manualAdjustments?.monthly_hours || 0;
    const hourlyWageSubtotal = isPartTime ? (parseFloat(String(setting.hourly_rate)) * monthlyHours) : 0;

    // 9. 計算小計 (確保所有值都轉換為數字)
    let baseAmount = 0;
    if (isPartTime) {
      // 兼職：時薪小計
      baseAmount = hourlyWageSubtotal;
    } else {
      // 正職：底薪 + 原獎金
      baseAmount = parseFloat(String(setting.base_salary)) + parseFloat(String(setting.original_bonus));
    }

    // 績效獎金（新系統）
    const totalPerformanceBonus = performanceBonusResult?.total_performance_bonus || 0;

    // 舊版績效獎金（手動輸入，如果新系統沒啟用則使用這個）
    const legacyPerformanceBonus = !performanceBonusResult ? (manualAdjustments?.performance_bonus || 0) : 0;

    const subtotal =
      baseAmount +
      totalCommissionAdjusted +
      parseFloat(String(pointContribution)) +
      (manualAdjustments?.phone_performance_bonus || 0) +
      totalPerformanceBonus +  // 新系統績效獎金
      legacyPerformanceBonus - // 舊版手動績效獎金（二者只會有一個生效）
      (manualAdjustments?.leave_deduction || 0);

    // 10. 計算扣除項後的最終薪資
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
      performance_bonus: legacyPerformanceBonus,  // 舊版手動績效獎金
      leave_deduction: manualAdjustments?.leave_deduction || 0,

      // 績效獎金系統（新）
      has_performance_bonus: setting.has_performance_bonus,
      performance_score: performanceBonusResult?.performance_score,
      base_performance_bonus: performanceBonusResult?.base_performance_bonus,
      consecutive_full_score_count: performanceBonusResult?.consecutive_full_score_count,
      consecutive_bonus: performanceBonusResult?.consecutive_bonus,
      total_performance_bonus: performanceBonusResult?.total_performance_bonus,
      commission_deduction_rate: performanceBonusResult?.commission_deduction_rate,
      requires_interview: performanceBonusResult?.requires_interview,

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
        performance_score, consecutive_full_score_count, consecutive_bonus, commission_deduction_rate,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, 'draft'
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
      // 新增績效獎金欄位
      calculation.performance_score || null,
      calculation.consecutive_full_score_count || 0,
      calculation.consecutive_bonus || 0,
      calculation.commission_deduction_rate || 0,
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
