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

  // 老師專用
  trial_class_fee?: number;           // 體驗課鐘點費
  teacher_commission?: number;        // 老師業績抽成（自己成交 + 別人成交）

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
    records?: Array<{
      date: string;
      item: string;
      amount: number;
      student_name?: string;
      payment_method?: string;
      teacher_name?: string;
      closer?: string;
      setter?: string;
      is_self_closed?: boolean;  // 是否自己成交
      commission_amount?: number; // 該筆抽成金額
    }>;
    // 老師業績分類（自己成交 vs 別人成交）
    self_closed_revenue?: number;      // 自己成交業績總額
    self_closed_commission?: number;   // 自己成交抽成金額
    other_closed_revenue?: number;     // 別人成交業績總額
    other_closed_commission?: number;  // 別人成交抽成金額
    commission_rate_used?: number;     // 使用的抽成比例（22% 或 23.3%）
  };

  // 體驗課明細（老師專用）
  trial_class_details?: {
    records: Array<{
      class_date: string;
      student_name: string;
      student_email?: string;
      course_type?: string;       // 課程類型
      hourly_rate?: number;       // 該堂鐘點費
    }>;
    total_classes: number;        // 總堂數（有打卡就算）
    trial_class_fee: number;      // 體驗課鐘點費總計
    // 按課程類型統計
    by_course_type?: {
      [courseType: string]: {
        count: number;
        rate: number;
        subtotal: number;
      };
    };
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
   * 從 employee_insurance 表讀取員工保險資料
   * 透過 nickname 或 first_name 來匹配
   */
  async getEmployeeInsurance(employeeName: string): Promise<{
    labor_insurance: number;
    health_insurance: number;
    retirement_fund: number;
  } | null> {
    const result = await queryDatabase(`
      SELECT
        ei.labor_insurance_amount as labor_insurance,
        ei.health_insurance_amount as health_insurance,
        ei.pension_employer_amount as retirement_fund
      FROM employee_insurance ei
      JOIN users u ON ei.user_id = u.id
      LEFT JOIN employee_profiles ep ON ei.user_id = ep.user_id
      WHERE ei.is_active = true
        AND (
          ep.nickname = $1
          OR u.first_name = $1
          OR CONCAT(u.first_name, ' ', u.last_name) = $1
          OR TRIM(CONCAT(u.first_name, ' ', COALESCE(u.last_name, ''))) = $1
        )
      LIMIT 1
    `, [employeeName]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      labor_insurance: parseFloat(result.rows[0].labor_insurance || '0'),
      health_insurance: parseFloat(result.rows[0].health_insurance || '0'),
      retirement_fund: parseFloat(result.rows[0].retirement_fund || '0'),
    };
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
   * 根據課程類型決定體驗課鐘點費
   * - 不指定一對一 / 初學專案：600
   * - 高音終極方程式：500
   * - 高音pro：300
   */
  private getTrialClassHourlyRate(courseType: string | null): number {
    if (!courseType) return 300; // 預設

    const lowerCourseType = courseType.toLowerCase();

    // 不指定一對一 / 初學專案：600
    if (lowerCourseType.includes('不指定') ||
        lowerCourseType.includes('一對一') ||
        lowerCourseType.includes('初學') ||
        lowerCourseType.includes('專案')) {
      return 600;
    }

    // 高音終極方程式：500
    if (lowerCourseType.includes('高音終極') ||
        lowerCourseType.includes('終極方程式')) {
      return 500;
    }

    // 高音pro：300
    if (lowerCourseType.includes('高音pro') ||
        lowerCourseType.includes('高音 pro')) {
      return 300;
    }

    return 300; // 預設
  }

  /**
   * 查詢老師的體驗課明細（從 trial_class_attendance 表）
   * 根據學生購買的課程類型計算不同鐘點費
   */
  async getTrialClassDetails(
    employeeName: string,
    periodStart: string,
    periodEnd: string
  ): Promise<{
    records: Array<{
      class_date: string;
      student_name: string;
      student_email?: string;
      course_type?: string;
      hourly_rate?: number;
    }>;
    total_classes: number;
    trial_class_fee: number;
    by_course_type?: {
      [courseType: string]: {
        count: number;
        rate: number;
        subtotal: number;
      };
    };
  }> {
    const firstNameOnly = employeeName.split(' ')[0];

    // 查詢體驗課打卡記錄，並聯結購買記錄取得課程類型
    const result = await queryDatabase(`
      SELECT
        tca.class_date,
        tca.student_name,
        tca.student_email,
        tca.is_showed,
        tcp.package_name as course_type
      FROM trial_class_attendance tca
      LEFT JOIN trial_class_purchases tcp
        ON tca.student_email = tcp.student_email
      WHERE (tca.teacher_name = $1 OR tca.teacher_name ILIKE $4)
        AND tca.class_date >= $2
        AND tca.class_date <= $3
      ORDER BY tca.class_date DESC
    `, [employeeName, periodStart, periodEnd, `%${firstNameOnly}%`]);

    // 按課程類型統計
    const byCourseType: {
      [courseType: string]: {
        count: number;
        rate: number;
        subtotal: number;
      };
    } = {};

    const records = result.rows.map(row => {
      const courseType = row.course_type || '未知';
      const hourlyRate = this.getTrialClassHourlyRate(row.course_type);

      // 有打卡記錄就算鐘點費（不用判斷出席）
      if (!byCourseType[courseType]) {
        byCourseType[courseType] = { count: 0, rate: hourlyRate, subtotal: 0 };
      }
      byCourseType[courseType].count++;
      byCourseType[courseType].subtotal += hourlyRate;

      return {
        class_date: row.class_date,
        student_name: row.student_name || '',
        student_email: row.student_email,
        course_type: courseType,
        hourly_rate: hourlyRate,
      };
    });

    const totalClasses = records.length;

    // 計算總鐘點費（按課程類型加總）
    let trialClassFee = 0;
    Object.values(byCourseType).forEach(item => {
      trialClassFee += item.subtotal;
    });

    return {
      records,
      total_classes: totalClasses,
      trial_class_fee: trialClassFee,
      by_course_type: byCourseType,
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
    // 邏輯：必須「連續」多個月都是滿分才算
    // - 第一次滿分：consecutive = 0（還沒有「連續」）
    // - 第二次連續滿分：consecutive = 1（連續 1 次）
    // - 第三次連續滿分：consecutive = 2（連續 2 次）
    // - 以此類推
    let consecutiveCount = 0;
    if (performanceScore === 10) {
      // 本次滿分
      if (lastPerformance && lastPerformance.performance_score === 10) {
        // 上次也是滿分，延續連續次數 +1
        consecutiveCount = (lastPerformance.consecutive_full_score_count || 0) + 1;
      } else {
        // 上次不是滿分或沒有記錄，這是「第一次」滿分，還不算「連續」
        consecutiveCount = 0;
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

    // 1.5 從 employee_insurance 表獲取勞健保資料（覆蓋 setting 中的值）
    const insuranceData = await this.getEmployeeInsurance(employeeName);
    const laborInsurance = insuranceData?.labor_insurance ?? parseFloat(String(setting.labor_insurance)) ?? 0;
    const healthInsurance = insuranceData?.health_insurance ?? parseFloat(String(setting.health_insurance)) ?? 0;
    const retirementFund = insuranceData?.retirement_fund ?? parseFloat(String(setting.retirement_fund)) ?? 0;
    const serviceFee = parseFloat(String(setting.service_fee)) ?? 0;

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

    // 9.5 如果是老師，查詢體驗課明細（根據課程類型計算不同鐘點費）
    let trialClassDetails = undefined;
    let trialClassFee = 0;
    if (setting.role_type === 'teacher') {
      trialClassDetails = await this.getTrialClassDetails(
        employeeName,
        periodStart,
        periodEnd
      );
      trialClassFee = trialClassDetails.trial_class_fee;
    }

    // 9.6 老師業績抽成（自己成交 + 別人成交，取代舊的統一抽成計算）
    let teacherCommission = 0;
    if (setting.role_type === 'teacher') {
      teacherCommission = (revenueData.self_closed_commission || 0) + (revenueData.other_closed_commission || 0);
    }

    // 計算小計（老師使用新的業績抽成和體驗課鐘點費）
    let subtotal = 0;
    if (setting.role_type === 'teacher') {
      // 老師：底薪 + 業績抽成（自己+別人成交）+ 體驗課鐘點費 + 績效獎金 - 請假扣款
      subtotal =
        baseAmount +
        teacherCommission +  // 使用新的業績抽成（自己成交 + 別人成交）
        trialClassFee +      // 體驗課鐘點費
        parseFloat(String(pointContribution)) +
        (manualAdjustments?.phone_performance_bonus || 0) +
        totalPerformanceBonus +
        legacyPerformanceBonus -
        (manualAdjustments?.leave_deduction || 0);
    } else {
      // 其他角色：使用舊的抽成計算
      subtotal =
        baseAmount +
        totalCommissionAdjusted +
        parseFloat(String(pointContribution)) +
        (manualAdjustments?.phone_performance_bonus || 0) +
        totalPerformanceBonus +
        legacyPerformanceBonus -
        (manualAdjustments?.leave_deduction || 0);
    }

    // 10. 計算扣除項後的最終薪資（使用從 employee_insurance 表讀取的資料）
    const totalDeductions = laborInsurance + healthInsurance + retirementFund + serviceFee;

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

      // 老師專用
      trial_class_fee: setting.role_type === 'teacher' ? trialClassFee : undefined,
      teacher_commission: setting.role_type === 'teacher' ? teacherCommission : undefined,

      subtotal_before_deductions: subtotal,

      // 使用從 employee_insurance 表讀取的保險資料
      labor_insurance: laborInsurance,
      health_insurance: healthInsurance,
      retirement_fund: retirementFund,
      service_fee: serviceFee,

      total_salary: totalSalary,

      details: {
        revenueByCategory: revenueData.byCategory,
        recordCount: revenueData.recordCount,
        records: revenueData.records,
        // 老師業績分類
        self_closed_revenue: revenueData.self_closed_revenue,
        self_closed_commission: revenueData.self_closed_commission,
        other_closed_revenue: revenueData.other_closed_revenue,
        other_closed_commission: revenueData.other_closed_commission,
        commission_rate_used: revenueData.commission_rate_used,
      },

      // 體驗課明細（老師專用）
      trial_class_details: trialClassDetails,
    };
  }

  /**
   * 計算員工業績 (根據角色類型從 income_expense_records 計算)
   * 老師業績分為：自己成交 vs 別人成交，抽成比例不同
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
      is_self_closed?: boolean;
      commission_amount?: number;
    }>;
    // 老師業績分類
    self_closed_revenue?: number;
    self_closed_commission?: number;
    other_closed_revenue?: number;
    other_closed_commission?: number;
    commission_rate_used?: number;
  }> {
    let query = '';
    let params: any[] = [];

      // 根據角色類型決定查詢欄位
      // 支援部分匹配：先嘗試完全匹配，如果沒結果則使用模糊匹配
      const firstNameOnly = employeeName.split(' ')[0]; // 取得名字部分（如 "Gladys"）

      switch (roleType) {
        case 'teacher':
          // 教練：查詢 teacher_name 或 income_item 包含名字（支援完全匹配或名字匹配）
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
            WHERE (
              teacher_name = $1
              OR teacher_name ILIKE $4
              OR income_item ILIKE $4
            )
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
        is_self_closed?: boolean;
        commission_amount?: number;
      }> = [];

      // 老師業績分類（自己成交 vs 別人成交）
      let selfClosedRevenue = 0;
      let otherClosedRevenue = 0;

      result.rows.forEach(row => {
        const amount = parseFloat(row.amount_twd || 0);
        totalRevenue += amount;

        // 彙總分類業績
        const category = row.income_item || '未分類';
        byCategory[category] = (byCategory[category] || 0) + amount;

        // 判斷是否自己成交（老師專用）
        // closer 欄位如果是老師本人的名字或代號，則為自己成交
        let isSelfClosed = false;
        if (roleType === 'teacher') {
          const closer = (row.closer || '').toLowerCase().trim();
          const teacherNameLower = employeeName.toLowerCase().trim();
          const firstNameLower = firstNameOnly.toLowerCase().trim();

          // 判斷 closer 是否為老師本人
          isSelfClosed = closer === teacherNameLower ||
                         closer === firstNameLower ||
                         closer.includes(firstNameLower) ||
                         firstNameLower.includes(closer);

          if (isSelfClosed) {
            selfClosedRevenue += amount;
          } else {
            otherClosedRevenue += amount;
          }
        }

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
          is_self_closed: roleType === 'teacher' ? isSelfClosed : undefined,
        });
      });

      // 計算老師抽成（只有老師角色才計算）
      let selfClosedCommission = 0;
      let otherClosedCommission = 0;
      let commissionRateUsed = 0;

      if (roleType === 'teacher') {
        // 自己成交：22% 或 23.3%（月業績 > 70萬）
        commissionRateUsed = selfClosedRevenue > 700000 ? 0.233 : 0.22;
        selfClosedCommission = Math.round(selfClosedRevenue * commissionRateUsed);

        // 別人成交：固定比例抽成（約 16.13%，即 150000 -> 24200）
        const otherClosedRate = 24200 / 150000; // ≈ 0.1613
        otherClosedCommission = Math.round(otherClosedRevenue * otherClosedRate);

        // 更新每筆記錄的抽成金額
        records.forEach(record => {
          if (record.is_self_closed === true) {
            record.commission_amount = Math.round(record.amount * commissionRateUsed);
          } else if (record.is_self_closed === false) {
            record.commission_amount = Math.round(record.amount * otherClosedRate);
          }
        });
      }

      return {
        total_revenue: totalRevenue,
        byCategory,
        recordCount: records.length,
        records,
        // 老師業績分類
        self_closed_revenue: roleType === 'teacher' ? selfClosedRevenue : undefined,
        self_closed_commission: roleType === 'teacher' ? selfClosedCommission : undefined,
        other_closed_revenue: roleType === 'teacher' ? otherClosedRevenue : undefined,
        other_closed_commission: roleType === 'teacher' ? otherClosedCommission : undefined,
        commission_rate_used: roleType === 'teacher' ? commissionRateUsed : undefined,
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
