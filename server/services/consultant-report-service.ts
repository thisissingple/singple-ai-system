/**
 * 諮詢師報表服務
 * 提供諮詢師業績、成交分析、AI 洞見等功能
 */

import { queryDatabase } from './pg-client';
import { parseNumberField } from './reporting/field-mapping-v2';

export type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
export type DealStatus = 'all' | 'closed' | 'not_closed' | 'pending';
export type TrendGrouping = 'day' | 'week' | 'month' | 'quarter';

export interface ConsultantReportParams {
  period: PeriodType;
  startDate?: string;
  endDate?: string;
  consultantName?: string;
  leadSource?: string[];
  planType?: string[];
  dealStatus?: DealStatus;
  compareWithPrevious?: boolean; // 是否與上期比較
  compareWithLastYear?: boolean; // 是否與去年同期比較
  trendGrouping?: TrendGrouping; // 趨勢圖分組方式（日/週/月/季）
}

export interface KPIData {
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalPackagePrice: number;
  totalActualAmount: number;
  avgDealAmount: number;
  pendingCount: number;
  potentialRevenue: number;
  // 新增：上線數/未上線數
  showCount: number;
  notShowCount: number;
  // 對比資料 - 變化百分比
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  totalActualAmountChange?: number;
  showCountChange?: number;
  notShowCountChange?: number;
  // 對比資料 - 前期實際值
  prevConsultationCount?: number;
  prevDealCount?: number;
  prevTotalActualAmount?: number;
  prevShowCount?: number;
  prevNotShowCount?: number;
}

export interface LeadSourceTableRow {
  leadSource: string;
  consultationCount: number;
  showCount: number;  // 新增：上線數
  dealCount: number;
  closingRate: number;
  actualAmount: number;
  // 對比數據 - 與歷史平均值對比
  avgConsultationCount?: number;  // 歷史平均諮詢數
  avgClosingRate?: number;  // 歷史平均成交率
  avgActualAmount?: number;  // 歷史平均實收金額
  consultationCountChange?: number;  // 與平均值的變化百分比
  showCountChange?: number;  // 新增：上線數變化
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;  // 與平均值的變化百分比
}

export interface ChartData {
  leadSourcePie: Array<{ name: string; value: number; dealCount: number }>;
  planPie: Array<{ name: string; value: number; revenue: number }>;
  trendLine: Array<{ date: string; consultations: number; deals: number }>;
  setterCloserMatrix: Array<{ setter: string; closer: string; dealCount: number; closingRate: number }>;
  funnel: Array<{ stage: string; count: number; percentage: number }>;
}

export interface ConsultantRanking {
  consultantName: string;
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalRevenue: number;
  actualAmount: number;
  avgDealAmount: number;
  lastDealDate: string | null;
  topSetters: string[]; // TOP 3 合作的 Setter
  // 對比數據（可選）
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;
}

export interface SetterRanking {
  setterName: string;
  consultationCount: number;
  dealCount: number;
  closingRate: number;
  totalRevenue: number;
  actualAmount: number;
  avgDealAmount: number;
  lastDealDate: string | null;
  topClosers: string[]; // TOP 3 合作的 Closer
  // 對比數據（可選）
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  actualAmountChange?: number;
}

export interface AIInsight {
  type: 'trend' | 'anomaly' | 'collaboration' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  actionItems?: string[];
  severity?: 'info' | 'warning' | 'critical';
}

export interface ConsultantReport {
  kpiData: KPIData;
  charts: ChartData;
  ranking: ConsultantRanking[];
  setterRanking: SetterRanking[]; // 電訪人員排行榜
  leadSourceTable: LeadSourceTableRow[]; // 來源分析表格
  aiInsights: AIInsight[];
  metadata: {
    period: PeriodType;
    dateRange: { start: string; end: string };
    filters: Partial<ConsultantReportParams>;
  };
}

/**
 * 計算日期範圍
 */
function calculateDateRange(period: PeriodType, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date = now;

  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      end = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // 週日開始
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom period requires startDate and endDate');
      }
      return { start: customStart, end: customEnd };
    case 'all':
    default:
      start = new Date('1970-01-01');
      end = new Date('2099-12-31');
      break;
  }

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * 計算對比期間的日期範圍
 */
function calculateComparisonDateRange(
  currentRange: { start: string; end: string },
  period: PeriodType,
  comparisonType: 'previous' | 'lastYear'
): { start: string; end: string } {
  const startDate = new Date(currentRange.start);
  const endDate = new Date(currentRange.end);

  // 計算期間長度（天數）
  const durationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  if (comparisonType === 'previous') {
    // 前期：往前推相同天數
    const prevEnd = new Date(startDate);
    prevEnd.setDate(prevEnd.getDate() - 1); // 前一天作為結束

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - durationDays + 1);

    return {
      start: prevStart.toISOString().split('T')[0],
      end: prevEnd.toISOString().split('T')[0],
    };
  } else {
    // 去年同期：減一年
    const prevYearStart = new Date(startDate);
    prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);

    const prevYearEnd = new Date(endDate);
    prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);

    return {
      start: prevYearStart.toISOString().split('T')[0],
      end: prevYearEnd.toISOString().split('T')[0],
    };
  }
}

/**
 * 查詢 KPI 資料
 */
async function queryKPIs(params: ConsultantReportParams, dateRange: { start: string; end: string }): Promise<KPIData> {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  if (params.leadSource && params.leadSource.length > 0) {
    conditions.push(`lead_source = ANY($${paramIndex++})`);
    values.push(params.leadSource);
  }

  if (params.planType && params.planType.length > 0) {
    conditions.push(`plan = ANY($${paramIndex++})`);
    values.push(params.planType);
  }

  // 成交狀態篩選
  if (params.dealStatus === 'closed') {
    conditions.push(`deal_date IS NOT NULL`);
  } else if (params.dealStatus === 'not_closed') {
    conditions.push(`deal_date IS NULL`);
  } else if (params.dealStatus === 'pending') {
    conditions.push(`deal_date IS NULL AND consultation_date IS NOT NULL`);
  }
  // 'all' 狀態不需要額外條件

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      COUNT(DISTINCT student_email) as consultation_count,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count,
      COALESCE(SUM(CASE
        WHEN deal_date IS NOT NULL AND package_price IS NOT NULL
        THEN CAST(REGEXP_REPLACE(package_price, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE NULL
      END), 0) as total_package_price,
      COALESCE(SUM(CASE
        WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
        THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE NULL
      END), 0) as total_actual_amount,
      COUNT(DISTINCT CASE WHEN deal_date IS NULL AND consultation_date IS NOT NULL THEN student_email END) as pending_count,
      COUNT(DISTINCT CASE WHEN is_show = '已上線' THEN student_email END) as show_count,
      COUNT(DISTINCT CASE WHEN is_show = '未上線' OR (is_show IS NOT NULL AND is_show != '已上線') THEN student_email END) as not_show_count
    FROM eods_for_closers
    WHERE ${whereClause}
  `;

  const result = await queryDatabase(query, values, 'session');
  const row = result.rows[0];

  const consultationCount = parseInt(row.consultation_count) || 0;
  const dealCount = parseInt(row.deal_count) || 0;
  const closingRate = consultationCount > 0 ? (dealCount / consultationCount) * 100 : 0;
  const totalActualAmount = parseNumberField(row.total_actual_amount) || 0;
  const avgDealAmount = dealCount > 0 ? totalActualAmount / dealCount : 0;
  const pendingCount = parseInt(row.pending_count) || 0;
  const potentialRevenue = pendingCount * avgDealAmount;
  const showCount = parseInt(row.show_count) || 0;
  const notShowCount = parseInt(row.not_show_count) || 0;

  return {
    consultationCount,
    dealCount,
    closingRate: Math.round(closingRate * 10) / 10,
    totalPackagePrice: parseNumberField(row.total_package_price) || 0,
    totalActualAmount,
    avgDealAmount: Math.round(avgDealAmount),
    pendingCount,
    potentialRevenue: Math.round(potentialRevenue),
    showCount,
    notShowCount,
  };
}

/**
 * 查詢名單來源分佈
 */
async function getLeadSourceDistribution(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
    `lead_source IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  // 成交狀態篩選
  if (params.dealStatus === 'closed') {
    conditions.push(`deal_date IS NOT NULL`);
  } else if (params.dealStatus === 'not_closed') {
    conditions.push(`deal_date IS NULL`);
  } else if (params.dealStatus === 'pending') {
    conditions.push(`deal_date IS NULL AND consultation_date IS NOT NULL`);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      lead_source as name,
      COUNT(DISTINCT student_email) as value,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY lead_source
    ORDER BY value DESC
  `;

  const result = await queryDatabase(query, values, 'session');
  return result.rows.map(row => ({
    name: row.name || '未知',
    value: parseInt(row.value),
    dealCount: parseInt(row.deal_count),
  }));
}

/**
 * 查詢來源分析表格（含完整統計數據）
 */
async function getLeadSourceTable(params: ConsultantReportParams, dateRange: { start: string; end: string }): Promise<LeadSourceTableRow[]> {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
    `lead_source IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  // 成交狀態篩選
  if (params.dealStatus === 'closed') {
    conditions.push(`deal_date IS NOT NULL`);
  } else if (params.dealStatus === 'not_closed') {
    conditions.push(`deal_date IS NULL`);
  } else if (params.dealStatus === 'pending') {
    conditions.push(`deal_date IS NULL AND consultation_date IS NOT NULL`);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      lead_source,
      COUNT(DISTINCT student_email) as consultation_count,
      COUNT(DISTINCT CASE WHEN is_show = '已上線' THEN student_email END) as show_count,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count,
      COALESCE(SUM(CASE
        WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
        THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE NULL
      END), 0) as actual_amount
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY lead_source
    ORDER BY deal_count DESC, consultation_count DESC
  `;

  const result = await queryDatabase(query, values, 'session');

  return result.rows.map(row => {
    const consultationCount = parseInt(row.consultation_count) || 0;
    const showCount = parseInt(row.show_count) || 0;
    const dealCount = parseInt(row.deal_count) || 0;
    const closingRate = consultationCount > 0 ? (dealCount / consultationCount) * 100 : 0;
    const actualAmount = parseNumberField(row.actual_amount) || 0;

    return {
      leadSource: row.lead_source || '未知來源',
      consultationCount,
      showCount,
      dealCount,
      closingRate: Math.round(closingRate * 10) / 10,
      actualAmount,
    };
  });
}

/**
 * 計算名單來源的歷史平均值
 * 根據當前期間類型,計算每個來源的歷史平均諮詢數、成交率和實收金額
 */
async function getLeadSourceAverages(params: ConsultantReportParams, period: string): Promise<Map<string, { avgConsultationCount: number; avgClosingRate: number; avgActualAmount: number }>> {
  // 根據期間類型決定分組方式
  let groupByClause = '';
  let periodDays = 1;

  switch (period) {
    case 'today':
    case 'custom':
      groupByClause = `DATE_TRUNC('day', consultation_date)`;
      periodDays = 1;
      break;
    case 'week':
      groupByClause = `DATE_TRUNC('week', consultation_date)`;
      periodDays = 7;
      break;
    case 'month':
      groupByClause = `DATE_TRUNC('month', consultation_date)`;
      periodDays = 30;
      break;
    case 'quarter':
      groupByClause = `DATE_TRUNC('quarter', consultation_date)`;
      periodDays = 90;
      break;
    case 'year':
      groupByClause = `DATE_TRUNC('year', consultation_date)`;
      periodDays = 365;
      break;
    default:
      groupByClause = `DATE_TRUNC('day', consultation_date)`;
      periodDays = 1;
  }

  const conditions: string[] = [
    `lead_source IS NOT NULL`,
    `consultation_date IS NOT NULL`,
  ];

  if (params.consultantName) {
    conditions.push(`closer_name = $1`);
  }

  const whereClause = conditions.join(' AND ');
  const values: any[] = params.consultantName ? [params.consultantName] : [];

  // 計算所有歷史成交記錄的簡單平均：總實收金額 / 不重複成交學生數
  const query = `
    SELECT
      lead_source,
      COUNT(DISTINCT student_email) as total_consultation_count,
      COUNT(CASE WHEN deal_date IS NOT NULL THEN 1 END) as total_deal_count,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as unique_deal_student_count,
      COALESCE(SUM(CASE
        WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
        THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE 0
      END), 0) as total_actual_amount,
      CASE
        WHEN COUNT(DISTINCT student_email) > 0
        THEN (COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END)::NUMERIC / COUNT(DISTINCT student_email)::NUMERIC) * 100
        ELSE 0
      END as avg_closing_rate,
      CASE
        WHEN COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) > 0
        THEN COALESCE(SUM(CASE
          WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
          THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
          ELSE 0
        END), 0) / COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END)::NUMERIC
        ELSE 0
      END as avg_actual_amount
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY lead_source
  `;

  const result = await queryDatabase(query, values, 'session');

  const averages = new Map<string, { avgConsultationCount: number; avgClosingRate: number; avgActualAmount: number }>();

  result.rows.forEach(row => {
    averages.set(row.lead_source, {
      avgConsultationCount: parseFloat(row.total_consultation_count) || 0,
      avgClosingRate: parseFloat(row.avg_closing_rate) || 0,
      avgActualAmount: parseFloat(row.avg_actual_amount) || 0,
    });
  });

  return averages;
}

/**
 * 查詢特定來源的歷史成交記錄詳細資料(用於查看平均值是如何計算的)
 */
export async function getLeadSourceAverageDetails(
  leadSource: string,
  params: ConsultantReportParams
): Promise<{ records: any[]; summary: { totalRecords: number; uniqueStudents: number; totalStudents: number; totalAmount: number; avgAmount: number; closingRate: number } }> {
  // 根據期間類型決定分組方式
  let groupByClause = '';

  switch (params.period) {
    case 'today':
    case 'custom':
      groupByClause = `DATE_TRUNC('day', consultation_date)`;
      break;
    case 'week':
      groupByClause = `DATE_TRUNC('week', consultation_date)`;
      break;
    case 'month':
      groupByClause = `DATE_TRUNC('month', consultation_date)`;
      break;
    case 'quarter':
      groupByClause = `DATE_TRUNC('quarter', consultation_date)`;
      break;
    case 'year':
      groupByClause = `DATE_TRUNC('year', consultation_date)`;
      break;
    default:
      groupByClause = `DATE_TRUNC('day', consultation_date)`;
  }

  // 查詢成交記錄
  const dealConditions: string[] = [
    `lead_source = $1`,
    `consultation_date IS NOT NULL`,
    `deal_date IS NOT NULL`,
  ];

  const values: any[] = [leadSource];
  let paramIndex = 2;

  if (params.consultantName) {
    dealConditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  const dealWhereClause = dealConditions.join(' AND ');

  const dealQuery = `
    SELECT
      student_name,
      student_email,
      consultation_date,
      deal_date,
      closer_name as consultant_name,
      setter_name,
      lead_source,
      plan,
      actual_amount,
      ${groupByClause} as period
    FROM eods_for_closers
    WHERE ${dealWhereClause}
    ORDER BY consultation_date DESC
  `;

  const dealResult = await queryDatabase(dealQuery, values, 'session');

  const records = dealResult.rows.map(row => ({
    studentName: row.student_name,
    studentEmail: row.student_email,
    consultationDate: row.consultation_date,
    dealDate: row.deal_date,
    consultantName: row.consultant_name,
    setterName: row.setter_name,
    leadSource: row.lead_source,
    plan: row.plan,
    actualAmount: row.actual_amount,
    period: row.period,
  }));

  // 查詢該來源的所有學生數（包含成交和未成交）
  const totalConditions: string[] = [
    `lead_source = $1`,
    `consultation_date IS NOT NULL`,
  ];

  const totalValues: any[] = [leadSource];
  let totalParamIndex = 2;

  if (params.consultantName) {
    totalConditions.push(`closer_name = $${totalParamIndex++}`);
    totalValues.push(params.consultantName);
  }

  const totalWhereClause = totalConditions.join(' AND ');

  const totalQuery = `
    SELECT COUNT(DISTINCT student_email) as total_students
    FROM eods_for_closers
    WHERE ${totalWhereClause}
  `;

  const totalResult = await queryDatabase(totalQuery, totalValues, 'session');
  const totalStudents = parseInt(totalResult.rows[0]?.total_students) || 0;

  // 計算統計資訊
  const uniqueStudents = new Set(dealResult.rows.map(row => row.student_email)).size;
  const totalRecords = dealResult.rows.length;
  let totalAmount = 0;

  dealResult.rows.forEach(row => {
    if (row.actual_amount) {
      const cleaned = String(row.actual_amount).replace(/[^0-9.-]/g, '');
      const amount = parseFloat(cleaned);
      if (!isNaN(amount)) {
        totalAmount += amount;
      }
    }
  });

  const avgAmount = uniqueStudents > 0 ? totalAmount / uniqueStudents : 0;
  const closingRate = totalStudents > 0 ? (uniqueStudents / totalStudents) * 100 : 0;

  return {
    records,
    summary: {
      totalRecords,
      uniqueStudents,
      totalStudents,
      totalAmount,
      avgAmount,
      closingRate,
    },
  };
}

/**
 * 查詢方案分佈
 */
async function getPlanDistribution(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
  const conditions: string[] = [
    `deal_date >= $1`,
    `deal_date <= $2`,
    `deal_date IS NOT NULL`,
    `plan IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      plan as name,
      COUNT(*) as value,
      COALESCE(SUM(CASE
        WHEN actual_amount IS NOT NULL
        THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE NULL
      END), 0) as revenue
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY plan
    ORDER BY revenue DESC
  `;

  const result = await queryDatabase(query, values, 'session');
  return result.rows.map(row => ({
    name: row.name || '未知方案',
    value: parseInt(row.value),
    revenue: parseNumberField(row.revenue) || 0,
  }));
}

/**
 * 查詢趨勢資料（時序）
 */
export async function getTrendData(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
  // 趨勢圖顯示全部歷史數據,不受日期範圍限制
  const conditions: string[] = [
    `consultation_date IS NOT NULL`,
  ];
  const values: any[] = [];
  let paramIndex = 1;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  // 成交狀態篩選
  if (params.dealStatus === 'closed') {
    conditions.push(`deal_date IS NOT NULL`);
  } else if (params.dealStatus === 'not_closed') {
    conditions.push(`deal_date IS NULL`);
  } else if (params.dealStatus === 'pending') {
    conditions.push(`deal_date IS NULL AND consultation_date IS NOT NULL`);
  }

  const whereClause = conditions.join(' AND ');

  // 根據使用者選擇或時間範圍決定分組粒度
  let dateGroup = `DATE(consultation_date)`;
  let grouping = params.trendGrouping || 'day'; // 預設為日線

  // 如果沒有指定分組方式，則根據期間自動選擇
  if (!params.trendGrouping) {
    if (params.period === 'year' || params.period === 'all') {
      grouping = 'month';
    } else if (params.period === 'quarter') {
      grouping = 'week';
    }
  }

  // 根據分組方式設定 SQL
  switch (grouping) {
    case 'week':
      // 週次從週四開始到下週三結束
      // PostgreSQL 的 DATE_TRUNC('week') 預設從週一開始
      // 我們需要調整為從週四開始：減去 4 天後再 TRUNC，然後加回 4 天
      dateGroup = `(DATE_TRUNC('week', consultation_date - INTERVAL '4 days') + INTERVAL '4 days')::date`;
      break;
    case 'month':
      dateGroup = `DATE_TRUNC('month', consultation_date)::date`;
      break;
    case 'quarter':
      dateGroup = `DATE_TRUNC('quarter', consultation_date)::date`;
      break;
    case 'year':
      dateGroup = `DATE_TRUNC('year', consultation_date)::date`;
      break;
    case 'day':
    default:
      dateGroup = `DATE(consultation_date)`;
      break;
  }

  const query = `
    SELECT
      ${dateGroup} as date,
      COUNT(DISTINCT student_email) as consultations,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deals,
      COALESCE(SUM(CASE
        WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
        THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
        ELSE 0
      END), 0) as revenue
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY ${dateGroup}
    ORDER BY date ASC
  `;

  const result = await queryDatabase(query, values, 'session');
  return result.rows.map(row => ({
    date: row.date,
    consultations: parseInt(row.consultations),
    deals: parseInt(row.deals),
    revenue: parseNumberField(row.revenue) || 0,
  }));
}

/**
 * 查詢 Setter-Closer 協作矩陣
 */
async function getSetterCloserMatrix(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
    `setter_name IS NOT NULL`,
    `closer_name IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      setter_name as setter,
      closer_name as closer,
      COUNT(DISTINCT student_email) as total_count,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count
    FROM eods_for_closers
    WHERE ${whereClause}
    GROUP BY setter_name, closer_name
    HAVING COUNT(DISTINCT student_email) >= 3
    ORDER BY deal_count DESC
  `;

  const result = await queryDatabase(query, values, 'session');
  return result.rows.map(row => {
    const totalCount = parseInt(row.total_count);
    const dealCount = parseInt(row.deal_count);
    const closingRate = totalCount > 0 ? (dealCount / totalCount) * 100 : 0;

    return {
      setter: row.setter,
      closer: row.closer,
      dealCount,
      closingRate: Math.round(closingRate * 10) / 10,
    };
  });
}

/**
 * 查詢漏斗資料
 */
async function getFunnelData(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      COUNT(DISTINCT student_email) as total_consultations,
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as closed_deals,
      COUNT(DISTINCT CASE WHEN deal_date IS NULL AND consultation_date IS NOT NULL THEN student_email END) as in_progress
    FROM eods_for_closers
    WHERE ${whereClause}
  `;

  const result = await queryDatabase(query, values, 'session');
  const row = result.rows[0];

  const totalConsultations = parseInt(row.total_consultations) || 0;
  const closedDeals = parseInt(row.closed_deals) || 0;
  const inProgress = parseInt(row.in_progress) || 0;
  const lost = totalConsultations - closedDeals - inProgress;

  return [
    {
      stage: '諮詢總數',
      count: totalConsultations,
      percentage: 100,
    },
    {
      stage: '諮詢中',
      count: inProgress,
      percentage: totalConsultations > 0 ? (inProgress / totalConsultations) * 100 : 0,
    },
    {
      stage: '已成交',
      count: closedDeals,
      percentage: totalConsultations > 0 ? (closedDeals / totalConsultations) * 100 : 0,
    },
    {
      stage: '未成交',
      count: lost,
      percentage: totalConsultations > 0 ? (lost / totalConsultations) * 100 : 0,
    },
  ];
}

/**
 * 查詢諮詢師排行榜
 */
async function getConsultantRanking(params: ConsultantReportParams, dateRange: { start: string; end: string }): Promise<ConsultantRanking[]> {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
    `closer_name IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];

  const whereClause = conditions.join(' AND ');

  const query = `
    WITH consultant_stats AS (
      SELECT
        closer_name,
        COUNT(DISTINCT student_email) as consultation_count,
        COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count,
        COALESCE(SUM(CASE
          WHEN deal_date IS NOT NULL AND package_price IS NOT NULL
          THEN CAST(REGEXP_REPLACE(package_price, '[^0-9.]', '', 'g') AS NUMERIC)
          ELSE NULL
        END), 0) as total_revenue,
        COALESCE(SUM(CASE
          WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
          THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
          ELSE NULL
        END), 0) as actual_amount,
        MAX(deal_date) as last_deal_date,
        ARRAY_AGG(DISTINCT setter_name) FILTER (WHERE setter_name IS NOT NULL) as all_setters
      FROM eods_for_closers
      WHERE ${whereClause}
      GROUP BY closer_name
    )
    SELECT *
    FROM consultant_stats
    ORDER BY deal_count DESC, actual_amount DESC
  `;

  const result = await queryDatabase(query, values, 'session');

  return result.rows.map(row => {
    const consultationCount = parseInt(row.consultation_count) || 0;
    const dealCount = parseInt(row.deal_count) || 0;
    const closingRate = consultationCount > 0 ? (dealCount / consultationCount) * 100 : 0;
    const actualAmount = parseNumberField(row.actual_amount) || 0;
    const avgDealAmount = dealCount > 0 ? actualAmount / dealCount : 0;

    return {
      consultantName: row.closer_name,
      consultationCount,
      dealCount,
      closingRate: Math.round(closingRate * 10) / 10,
      totalRevenue: parseNumberField(row.total_revenue) || 0,
      actualAmount,
      avgDealAmount: Math.round(avgDealAmount),
      lastDealDate: row.last_deal_date,
      topSetters: (row.all_setters || []).slice(0, 3),
    };
  });
}

/**
 * 查詢電訪人員（Setter）排行榜
 */
async function getSetterRanking(params: ConsultantReportParams, dateRange: { start: string; end: string }): Promise<SetterRanking[]> {
  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
    `setter_name IS NOT NULL`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];

  const whereClause = conditions.join(' AND ');

  const query = `
    WITH setter_stats AS (
      SELECT
        setter_name,
        COUNT(DISTINCT student_email) as consultation_count,
        COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deal_count,
        COALESCE(SUM(CASE
          WHEN deal_date IS NOT NULL AND package_price IS NOT NULL
          THEN CAST(REGEXP_REPLACE(package_price, '[^0-9.]', '', 'g') AS NUMERIC)
          ELSE NULL
        END), 0) as total_revenue,
        COALESCE(SUM(CASE
          WHEN deal_date IS NOT NULL AND actual_amount IS NOT NULL
          THEN CAST(REGEXP_REPLACE(actual_amount, '[^0-9.]', '', 'g') AS NUMERIC)
          ELSE NULL
        END), 0) as actual_amount,
        MAX(deal_date) as last_deal_date,
        ARRAY_AGG(DISTINCT closer_name) FILTER (WHERE closer_name IS NOT NULL AND deal_date IS NOT NULL) as all_closers
      FROM eods_for_closers
      WHERE ${whereClause}
      GROUP BY setter_name
    )
    SELECT *
    FROM setter_stats
    ORDER BY deal_count DESC, actual_amount DESC
  `;

  const result = await queryDatabase(query, values, 'session');

  return result.rows.map(row => {
    const consultationCount = parseInt(row.consultation_count) || 0;
    const dealCount = parseInt(row.deal_count) || 0;
    const closingRate = consultationCount > 0 ? (dealCount / consultationCount) * 100 : 0;
    const actualAmount = parseNumberField(row.actual_amount) || 0;
    const avgDealAmount = dealCount > 0 ? actualAmount / dealCount : 0;

    return {
      setterName: row.setter_name,
      consultationCount,
      dealCount,
      closingRate: Math.round(closingRate * 10) / 10,
      totalRevenue: parseNumberField(row.total_revenue) || 0,
      actualAmount,
      avgDealAmount: Math.round(avgDealAmount),
      lastDealDate: row.last_deal_date,
      topClosers: (row.all_closers || []).slice(0, 3),
    };
  });
}

/**
 * 生成 AI 洞見（待整合 OpenAI）
 */
function generateAIInsights(kpiData: KPIData, charts: ChartData, ranking: ConsultantRanking[]): AIInsight[] {
  const insights: AIInsight[] = [];

  // 基礎洞見（不依賴 OpenAI）

  // 1. 成交率分析
  if (kpiData.closingRate < 20) {
    insights.push({
      type: 'anomaly',
      title: '成交率偏低',
      description: `當前成交率僅 ${kpiData.closingRate}%，低於業界平均水準（25-35%）。`,
      actionItems: [
        '檢視諮詢師話術是否需要優化',
        '分析高成交率諮詢師的成功經驗',
        '評估名單品質是否下降',
      ],
      severity: 'warning',
    });
  } else if (kpiData.closingRate > 40) {
    insights.push({
      type: 'trend',
      title: '成交率表現優異',
      description: `當前成交率達 ${kpiData.closingRate}%，表現優秀！`,
      severity: 'info',
    });
  }

  // 2. 潛在營收分析
  if (kpiData.pendingCount > 0) {
    insights.push({
      type: 'prediction',
      title: '潛在營收機會',
      description: `目前有 ${kpiData.pendingCount} 位學生正在諮詢中，預估可帶來 NT$${kpiData.potentialRevenue.toLocaleString()} 營收。`,
      actionItems: [
        '優先跟進高意願學生',
        '提供限時優惠促成交',
      ],
      severity: 'info',
    });
  }

  // 3. 名單來源分析
  if (charts.leadSourcePie.length > 0) {
    const topSource = charts.leadSourcePie[0];
    const topSourceClosingRate = topSource.value > 0 ? (topSource.dealCount / topSource.value) * 100 : 0;

    insights.push({
      type: 'recommendation',
      title: '最佳名單來源',
      description: `${topSource.name} 是最大名單來源，成交率 ${Math.round(topSourceClosingRate)}%。`,
      actionItems: [
        '增加該管道的廣告預算',
        '分析該管道的受眾特徵',
      ],
      severity: 'info',
    });
  }

  // 4. 協作分析
  if (charts.setterCloserMatrix.length > 0) {
    const topCombo = charts.setterCloserMatrix[0];
    if (topCombo.closingRate > 50) {
      insights.push({
        type: 'collaboration',
        title: '黃金團隊組合',
        description: `${topCombo.setter} + ${topCombo.closer} 組合成交率高達 ${topCombo.closingRate}%！`,
        actionItems: [
          '增加此組合的名單分配',
          '請該組合分享成功經驗',
        ],
        severity: 'info',
      });
    }
  }

  return insights;
}

/**
 * 計算單一指標變化百分比
 */
function calculateChange(currentVal: number, comparisonVal: number): number {
  if (comparisonVal === 0) return currentVal > 0 ? 100 : 0;
  return Math.round(((currentVal - comparisonVal) / comparisonVal) * 100 * 10) / 10;
}

/**
 * 計算 KPI 變化百分比和前期實際值
 */
function calculateKPIChanges(current: KPIData, comparison: KPIData): Partial<KPIData> {
  return {
    // 變化百分比
    consultationCountChange: calculateChange(current.consultationCount, comparison.consultationCount),
    dealCountChange: calculateChange(current.dealCount, comparison.dealCount),
    closingRateChange: calculateChange(current.closingRate, comparison.closingRate),
    totalActualAmountChange: calculateChange(current.totalActualAmount, comparison.totalActualAmount),
    showCountChange: calculateChange(current.showCount, comparison.showCount),
    notShowCountChange: calculateChange(current.notShowCount, comparison.notShowCount),
    // 前期實際值
    prevConsultationCount: comparison.consultationCount,
    prevDealCount: comparison.dealCount,
    prevTotalActualAmount: comparison.totalActualAmount,
    prevShowCount: comparison.showCount,
    prevNotShowCount: comparison.notShowCount,
  };
}

/**
 * 查詢諮詢名單（用於點擊 KPI 後顯示詳細名單）
 * 新增：支援來源篩選、狀態篩選、排序
 */
export async function getConsultationList(
  params: ConsultantReportParams & {
    setterName?: string;
    leadSourceFilter?: string;  // 新增：按來源篩選
    statusFilter?: string;       // 新增：按狀態篩選
    sortBy?: string;             // 新增：排序欄位
    sortOrder?: 'ASC' | 'DESC';  // 新增：排序順序
  }
): Promise<any[]> {
  const dateRange = calculateDateRange(params.period, params.startDate, params.endDate);

  const conditions: string[] = [
    `consultation_date >= $1`,
    `consultation_date <= $2`,
  ];
  const values: any[] = [dateRange.start, dateRange.end];
  let paramIndex = 3;

  if (params.consultantName) {
    conditions.push(`closer_name = $${paramIndex++}`);
    values.push(params.consultantName);
  }

  if (params.setterName) {
    conditions.push(`setter_name = $${paramIndex++}`);
    values.push(params.setterName);
  }

  // 新增：按來源篩選
  if (params.leadSourceFilter) {
    conditions.push(`lead_source = $${paramIndex++}`);
    values.push(params.leadSourceFilter);
  }

  // 新增：按狀態篩選
  if (params.statusFilter) {
    if (params.statusFilter === '已成交') {
      conditions.push(`deal_date IS NOT NULL`);
    } else if (params.statusFilter === '未成交' || params.statusFilter === '跟進中') {
      conditions.push(`deal_date IS NULL`);
    }
  }

  // 成交狀態篩選（使用 dealStatus 參數）
  if (params.dealStatus === 'closed') {
    conditions.push(`deal_date IS NOT NULL`);
  } else if (params.dealStatus === 'not_closed') {
    conditions.push(`deal_date IS NULL`);
  } else if (params.dealStatus === 'pending') {
    conditions.push(`deal_date IS NULL AND consultation_date IS NOT NULL`);
  }

  const whereClause = conditions.join(' AND ');

  // 新增：動態排序
  const sortBy = params.sortBy || 'consultation_date';
  const sortOrder = params.sortOrder || 'DESC';

  // 安全的排序欄位白名單
  const allowedSortFields = ['consultation_date', 'deal_date', 'student_name', 'closer_name', 'setter_name', 'lead_source', 'deal_type', 'actual_amount', 'plan', 'is_show'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'consultation_date';
  const safeSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

  const query = `
    SELECT
      student_name,
      student_email,
      consultation_date,
      closer_name as consultant_name,
      setter_name,
      lead_source,
      deal_date,
      package_price,
      actual_amount,
      is_show,
      plan,
      consultation_result,
      deal_type
    FROM eods_for_closers
    WHERE ${whereClause}
    ORDER BY ${safeSortBy} ${safeSortOrder}
  `;

  const result = await queryDatabase(query, values, 'session');

  return result.rows.map(row => ({
    studentName: row.student_name,
    studentEmail: row.student_email,
    consultationDate: row.consultation_date,
    consultantName: row.consultant_name,
    setterName: row.setter_name,
    leadSource: row.lead_source,
    dealDate: row.deal_date,
    packagePrice: row.package_price,
    actualAmount: row.actual_amount,
    isShow: row.is_show,
    plan: row.plan,
    consultationResult: row.consultation_result,
    dealType: row.deal_type,
  }));
}

/**
 * 主要報表生成函數
 */
export async function generateConsultantReport(params: ConsultantReportParams): Promise<ConsultantReport> {
  // 計算日期範圍
  const dateRange = calculateDateRange(params.period, params.startDate, params.endDate);

  // 並行查詢所有資料
  const [kpiData, leadSourcePie, planPie, trendLine, setterCloserMatrix, funnel, ranking, setterRanking, leadSourceTable] = await Promise.all([
    queryKPIs(params, dateRange),
    getLeadSourceDistribution(params, dateRange),
    getPlanDistribution(params, dateRange),
    getTrendData(params, dateRange),
    getSetterCloserMatrix(params, dateRange),
    getFunnelData(params, dateRange),
    getConsultantRanking(params, dateRange),
    getSetterRanking(params, dateRange), // 查詢電訪人員排行榜
    getLeadSourceTable(params, dateRange), // 新增：查詢來源分析表格
  ]);

  // 如果需要對比，計算對比期間的 KPI 和排行榜
  if (params.compareWithPrevious || params.compareWithLastYear) {
    const comparisonType = params.compareWithPrevious ? 'previous' : 'lastYear';
    const comparisonRange = calculateComparisonDateRange(dateRange, params.period, comparisonType);

    // 並行查詢對比期間的數據
    const [comparisonKPI, comparisonRanking, comparisonSetterRanking] = await Promise.all([
      queryKPIs(params, comparisonRange),
      getConsultantRanking(params, comparisonRange),
      getSetterRanking(params, comparisonRange),
    ]);

    const changes = calculateKPIChanges(kpiData, comparisonKPI);

    // 合併變化數據到當前 KPI
    Object.assign(kpiData, changes);

    // 計算諮詢師排行榜變化
    ranking.forEach(consultant => {
      const comparisonConsultant = comparisonRanking.find(c => c.consultantName === consultant.consultantName);
      if (comparisonConsultant) {
        consultant.consultationCountChange = calculateChange(consultant.consultationCount, comparisonConsultant.consultationCount);
        consultant.dealCountChange = calculateChange(consultant.dealCount, comparisonConsultant.dealCount);
        consultant.closingRateChange = calculateChange(consultant.closingRate, comparisonConsultant.closingRate);
        consultant.actualAmountChange = calculateChange(consultant.actualAmount, comparisonConsultant.actualAmount);
      }
    });

    // 計算 Setter 排行榜變化
    setterRanking.forEach(setter => {
      const comparisonSetter = comparisonSetterRanking.find(s => s.setterName === setter.setterName);
      if (comparisonSetter) {
        setter.consultationCountChange = calculateChange(setter.consultationCount, comparisonSetter.consultationCount);
        setter.dealCountChange = calculateChange(setter.dealCount, comparisonSetter.dealCount);
        setter.closingRateChange = calculateChange(setter.closingRate, comparisonSetter.closingRate);
        setter.actualAmountChange = calculateChange(setter.actualAmount, comparisonSetter.actualAmount);
      }
    });
  }

  // 計算來源分析表格的歷史平均值對比 (獨立於前期/去年同期對比)
  const leadSourceAverages = await getLeadSourceAverages(params, params.period);
  leadSourceTable.forEach(source => {
    const averages = leadSourceAverages.get(source.leadSource);
    if (averages) {
      source.avgConsultationCount = Math.round(averages.avgConsultationCount);
      source.avgClosingRate = Math.round(averages.avgClosingRate * 10) / 10;
      source.avgActualAmount = Math.round(averages.avgActualAmount);
      source.consultationCountChange = calculateChange(source.consultationCount, averages.avgConsultationCount);
      source.actualAmountChange = calculateChange(source.actualAmount, averages.avgActualAmount);
    }
  });

  const charts: ChartData = {
    leadSourcePie,
    planPie,
    trendLine,
    setterCloserMatrix,
    funnel,
  };

  // 生成 AI 洞見
  const aiInsights = generateAIInsights(kpiData, charts, ranking);

  return {
    kpiData,
    charts,
    ranking,
    setterRanking, // 電訪人員排行榜
    leadSourceTable, // 新增：來源分析表格
    aiInsights,
    metadata: {
      period: params.period,
      dateRange,
      filters: params,
    },
  };
}
