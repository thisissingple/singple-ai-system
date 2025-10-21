/**
 * KPI Rule Engine
 * 自動檢測體驗課報表 KPI 是否正確，並提供修正建議
 */

export interface RawDataForValidation {
  purchases: Array<{
    student_email: string;
    status: string;
    purchase_date?: string;
    data?: any;
  }>;
  attendance: Array<{
    student_email: string;
    class_date?: string;
  }>;
  deals: Array<{
    student_email: string;
    deal_date?: string;
    deal_amount?: number;
  }>;
}

export interface KPIValidationResult {
  name: string;
  label: string;
  isCorrect: boolean;
  currentValue: number;
  suggestedValue: number | null;
  currentFormula: string;
  suggestedFormula: string | null;
  reason: string;
  severity: 'error' | 'warning' | 'info' | 'success';
  autoFixable: boolean;
}

export interface KPIValidationReport {
  timestamp: string;
  totalKPIs: number;
  correctCount: number;
  warningCount: number;
  errorCount: number;
  results: KPIValidationResult[];
}

/**
 * 體驗課報表 KPI 規則引擎
 */
export class TrialClassKPIRuleEngine {

  /**
   * 驗證所有 KPI
   */
  validateAllKPIs(
    currentMetrics: Record<string, number>,
    rawData: RawDataForValidation
  ): KPIValidationReport {
    const results: KPIValidationResult[] = [];

    // 規則 1: 轉換率
    results.push(this.validateConversionRate(currentMetrics.conversionRate, rawData));

    // 規則 2: 體驗完課率
    results.push(this.validateTrialCompletionRate(currentMetrics.trialCompletionRate, rawData));

    // 規則 3: 總成交數
    results.push(this.validateTotalConversions(currentMetrics.totalConversions, rawData));

    // 規則 4: 待追蹤學生數
    results.push(this.validatePendingStudents(currentMetrics.pendingStudents, rawData));

    // 規則 5: 總體驗課數
    results.push(this.validateTotalTrials(currentMetrics.totalTrials, rawData));

    // 規則 6: 總購買數
    results.push(this.validateTotalPurchases(currentMetrics.totalPurchases || 0, rawData));

    // 統計結果
    const errorCount = results.filter(r => r.severity === 'error').length;
    const warningCount = results.filter(r => r.severity === 'warning').length;
    const correctCount = results.filter(r => r.isCorrect).length;

    return {
      timestamp: new Date().toISOString(),
      totalKPIs: results.length,
      correctCount,
      warningCount,
      errorCount,
      results,
    };
  }

  /**
   * 規則 1: 驗證轉換率
   * 正確公式: 已轉高 ÷ (已轉高 + 未轉高)
   */
  private validateConversionRate(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const studentStatusMap = new Map<string, string>();

    rawData.purchases.forEach(p => {
      const email = (p.student_email || '').trim().toLowerCase();
      if (email && p.status) {
        studentStatusMap.set(email, p.status);
      }
    });

    const convertedCount = Array.from(studentStatusMap.values())
      .filter(status => status === '已轉高').length;

    const completedCount = Array.from(studentStatusMap.values())
      .filter(status => status === '已轉高' || status === '未轉高').length;

    const correct = completedCount > 0 ? Number(((convertedCount / completedCount) * 100).toFixed(2)) : 0;
    const isCorrect = Math.abs(current - correct) < 0.1; // 允許 0.1% 誤差

    return {
      name: 'conversionRate',
      label: '轉換率',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: '已轉高 ÷ (已轉高 + 未轉高)',
      suggestedFormula: null,
      reason: isCorrect
        ? `計算正確：${convertedCount} 已轉高 ÷ ${completedCount} 已上完課 = ${correct}%`
        : `計算錯誤：應為 ${convertedCount} ÷ ${completedCount} = ${correct}%`,
      severity: isCorrect ? 'success' : 'error',
      autoFixable: true,
    };
  }

  /**
   * 規則 2: 驗證體驗完課率
   * 正確公式: (已轉高 + 未轉高) ÷ 總購買數
   */
  private validateTrialCompletionRate(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const studentStatusMap = new Map<string, string>();

    rawData.purchases.forEach(p => {
      const email = (p.student_email || '').trim().toLowerCase();
      if (email && p.status) {
        studentStatusMap.set(email, p.status);
      }
    });

    const completedCount = Array.from(studentStatusMap.values())
      .filter(status => status === '已轉高' || status === '未轉高').length;

    const totalPurchases = studentStatusMap.size;

    const correct = totalPurchases > 0 ? Number(((completedCount / totalPurchases) * 100).toFixed(2)) : 0;
    const isCorrect = Math.abs(current - correct) < 0.1;

    return {
      name: 'trialCompletionRate',
      label: '體驗完課率',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: '(已轉高 + 未轉高) ÷ 總購買數',
      suggestedFormula: null,
      reason: isCorrect
        ? `計算正確：${completedCount} 已上完課 ÷ ${totalPurchases} 總購買 = ${correct}%`
        : `計算錯誤：應為 ${completedCount} ÷ ${totalPurchases} = ${correct}%`,
      severity: isCorrect ? 'success' : 'error',
      autoFixable: true,
    };
  }

  /**
   * 規則 3: 驗證總成交數
   * 正確公式: 購買記錄中「已轉高」的唯一學生數
   */
  private validateTotalConversions(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const convertedEmails = new Set<string>();

    rawData.purchases.forEach(p => {
      const email = (p.student_email || '').trim().toLowerCase();
      if (email && p.status === '已轉高') {
        convertedEmails.add(email);
      }
    });

    const correct = convertedEmails.size;
    const isCorrect = current === correct;

    return {
      name: 'totalConversions',
      label: '總成交數（已轉高學生）',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: isCorrect ? '購買記錄中「已轉高」學生數' : '未知來源',
      suggestedFormula: isCorrect ? null : '購買記錄中「已轉高」學生數',
      reason: isCorrect
        ? `計算正確：${correct} 位已轉高學生`
        : `計算錯誤：應為 ${correct} 位已轉高學生，而非 ${current}`,
      severity: isCorrect ? 'success' : 'error',
      autoFixable: true,
    };
  }

  /**
   * 規則 4: 驗證待追蹤學生數
   * 正確公式: 「體驗中」+「未開始」的唯一學生數
   */
  private validatePendingStudents(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const pendingEmails = new Set<string>();

    rawData.purchases.forEach(p => {
      const email = (p.student_email || '').trim().toLowerCase();
      const status = p.status || '';
      if (email && (status === '體驗中' || status === '未開始')) {
        pendingEmails.add(email);
      }
    });

    const correct = pendingEmails.size;
    const isCorrect = current === correct;

    return {
      name: 'pendingStudents',
      label: '待追蹤學生數',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: isCorrect ? '「體驗中」+「未開始」學生數' : '未知來源',
      suggestedFormula: isCorrect ? null : '「體驗中」+「未開始」學生數',
      reason: isCorrect
        ? `計算正確：${correct} 位待追蹤學生`
        : `計算錯誤：應為 ${correct} 位待追蹤學生（體驗中+未開始）`,
      severity: isCorrect ? 'success' : 'warning',
      autoFixable: true,
    };
  }

  /**
   * 規則 5: 驗證總體驗課數
   * 正確公式: 上課記錄總數
   */
  private validateTotalTrials(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const correct = rawData.attendance.length;
    const isCorrect = current === correct;

    return {
      name: 'totalTrials',
      label: '總體驗課堂數',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: '上課記錄總數',
      suggestedFormula: null,
      reason: isCorrect
        ? `計算正確：${correct} 堂體驗課`
        : `計算錯誤：應為 ${correct} 堂，而非 ${current}`,
      severity: isCorrect ? 'success' : 'error',
      autoFixable: true,
    };
  }

  /**
   * 規則 6: 驗證總購買數
   * 正確公式: 購買記錄中的唯一學生數
   */
  private validateTotalPurchases(
    current: number,
    rawData: RawDataForValidation
  ): KPIValidationResult {
    const uniqueEmails = new Set<string>();

    rawData.purchases.forEach(p => {
      const email = (p.student_email || '').trim().toLowerCase();
      if (email) {
        uniqueEmails.add(email);
      }
    });

    const correct = uniqueEmails.size;
    const isCorrect = current === correct;

    return {
      name: 'totalPurchases',
      label: '總購買學生數',
      isCorrect,
      currentValue: current,
      suggestedValue: isCorrect ? null : correct,
      currentFormula: '購買記錄中唯一學生數',
      suggestedFormula: null,
      reason: isCorrect
        ? `計算正確：${correct} 位購買學生`
        : `計算錯誤：應為 ${correct} 位購買學生`,
      severity: isCorrect ? 'success' : 'info',
      autoFixable: true,
    };
  }

  /**
   * 自動修正 KPI 數值
   */
  autoFixKPIs(
    currentMetrics: Record<string, number>,
    validationReport: KPIValidationReport
  ): Record<string, number> {
    const fixed = { ...currentMetrics };

    validationReport.results.forEach(result => {
      if (!result.isCorrect && result.autoFixable && result.suggestedValue !== null) {
        fixed[result.name] = result.suggestedValue;
      }
    });

    return fixed;
  }
}

// Export singleton
export const trialClassKPIRuleEngine = new TrialClassKPIRuleEngine();
