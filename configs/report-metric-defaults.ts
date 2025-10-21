/**
 * Default Report Metric Configurations
 * Defines default formulas and settings for each metric
 */

export interface ReportMetricConfig {
  metricId: string;
  label: string;
  description: string;
  defaultFormula: string;
  sourceFields: string[];
  aiSuggestedFormula?: string;
  manualFormula?: string;
  updatedAt?: Date;
  metadata?: {
    parsedDefinition?: any;
    parameters?: Record<string, any>;
    updatedAt?: string;
    [key: string]: any;
  };
}

export const DEFAULT_METRIC_CONFIGS: Record<string, ReportMetricConfig> = {
  conversionRate: {
    metricId: 'conversionRate',
    label: '轉換率',
    description: '已轉高學生數 / 已上完課學生數 * 100（從體驗課購買記錄表）',
    defaultFormula: '(convertedStudents / completedStudents) * 100',
    sourceFields: ['convertedStudents', 'completedStudents'],
  },
  trialCompletionRate: {
    metricId: 'trialCompletionRate',
    label: '體驗課完成率',
    description: '購買數 / 體驗課總數 * 100',
    defaultFormula: '(purchases / trials) * 100',
    sourceFields: ['purchases', 'trials'],
  },
  potentialRevenue: {
    metricId: 'potentialRevenue',
    label: '潛在收益',
    description: '待聯繫學生數 * 平均客單價',
    defaultFormula: 'pending * avgDealAmount',
    sourceFields: ['pending', 'avgDealAmount'],
  },
  avgConversionTime: {
    metricId: 'avgConversionTime',
    label: '平均轉換時間（天）',
    description: '從體驗課到成交的平均天數',
    defaultFormula: 'avgConversionDays',
    sourceFields: ['avgConversionDays'],
  },
  totalRevenue: {
    metricId: 'totalRevenue',
    label: '總收益',
    description: '所有成交金額的總和',
    defaultFormula: 'totalDealAmount',
    sourceFields: ['totalDealAmount'],
  },
  avgDealAmount: {
    metricId: 'avgDealAmount',
    label: '平均客單價',
    description: '總收益 / 成交數',
    defaultFormula: 'totalRevenue / conversions',
    sourceFields: ['totalRevenue', 'conversions'],
  },
};

/**
 * Get available variables for formulas
 */
export function getAvailableFormulaVariables(): Record<string, string> {
  return {
    trials: '體驗課總數',
    conversions: '成交數（從 EODs 表）',
    convertedStudents: '已轉高學生數（從購買記錄表，狀態="已轉高"）',
    completedStudents: '已上完課學生數（從購買記錄表，狀態="已轉高"或"未轉高"）',
    attendedStudents: '已上課學生數（別名：completedStudents）',
    purchases: '購買數',
    pending: '待聯繫學生數',
    revenue: '總收益',
    totalRevenue: '總收益',
    totalDealAmount: '總成交金額',
    avgDealAmount: '平均客單價',
    avgConversionDays: '平均轉換天數',
  };
}
