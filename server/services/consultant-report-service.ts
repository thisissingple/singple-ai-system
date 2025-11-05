/**
 * 諮詢師報表服務
 * 提供諮詢師業績、成交分析、AI 洞見等功能
 */

import { queryDatabase } from './pg-client';
import { parseNumberField } from './reporting/field-mapping-v2';

export type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom';
export type DealStatus = 'all' | 'closed' | 'in_progress' | 'lost';
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
  // 對比資料
  consultationCountChange?: number;
  dealCountChange?: number;
  closingRateChange?: number;
  totalActualAmountChange?: number;
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
      COUNT(DISTINCT CASE WHEN deal_date IS NULL AND consultation_date IS NOT NULL THEN student_email END) as pending_count
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

  return {
    consultationCount,
    dealCount,
    closingRate: Math.round(closingRate * 10) / 10,
    totalPackagePrice: parseNumberField(row.total_package_price) || 0,
    totalActualAmount,
    avgDealAmount: Math.round(avgDealAmount),
    pendingCount,
    potentialRevenue: Math.round(potentialRevenue),
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
async function getTrendData(params: ConsultantReportParams, dateRange: { start: string; end: string }) {
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
      dateGroup = `DATE_TRUNC('week', consultation_date)::date`;
      break;
    case 'month':
      dateGroup = `DATE_TRUNC('month', consultation_date)::date`;
      break;
    case 'quarter':
      dateGroup = `DATE_TRUNC('quarter', consultation_date)::date`;
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
      COUNT(DISTINCT CASE WHEN deal_date IS NOT NULL THEN student_email END) as deals
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
 * 計算 KPI 變化百分比
 */
function calculateKPIChanges(current: KPIData, comparison: KPIData): Partial<KPIData> {
  return {
    consultationCountChange: calculateChange(current.consultationCount, comparison.consultationCount),
    dealCountChange: calculateChange(current.dealCount, comparison.dealCount),
    closingRateChange: calculateChange(current.closingRate, comparison.closingRate),
    totalActualAmountChange: calculateChange(current.totalActualAmount, comparison.totalActualAmount),
  };
}

/**
 * 查詢諮詢名單（用於點擊 KPI 後顯示詳細名單）
 */
export async function getConsultationList(params: ConsultantReportParams & { setterName?: string }): Promise<any[]> {
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

  const whereClause = conditions.join(' AND ');

  const query = `
    SELECT
      student_name,
      student_email,
      consultation_date,
      closer_name as consultant_name,
      setter_name,
      deal_date,
      package_price,
      actual_amount,
      CASE
        WHEN deal_date IS NOT NULL THEN '已成交'
        WHEN deal_date IS NULL THEN '跟進中'
        ELSE '未知'
      END as status
    FROM eods_for_closers
    WHERE ${whereClause}
    ORDER BY consultation_date DESC
  `;

  const result = await queryDatabase(query, values, 'session');

  return result.rows.map(row => ({
    studentName: row.student_name,
    studentEmail: row.student_email,
    consultationDate: row.consultation_date,
    consultantName: row.consultant_name,
    setterName: row.setter_name,
    dealDate: row.deal_date,
    packagePrice: row.package_price,
    actualAmount: row.actual_amount,
    status: row.status,
  }));
}

/**
 * 主要報表生成函數
 */
export async function generateConsultantReport(params: ConsultantReportParams): Promise<ConsultantReport> {
  // 計算日期範圍
  const dateRange = calculateDateRange(params.period, params.startDate, params.endDate);

  // 並行查詢所有資料
  const [kpiData, leadSourcePie, planPie, trendLine, setterCloserMatrix, funnel, ranking, setterRanking] = await Promise.all([
    queryKPIs(params, dateRange),
    getLeadSourceDistribution(params, dateRange),
    getPlanDistribution(params, dateRange),
    getTrendData(params, dateRange),
    getSetterCloserMatrix(params, dateRange),
    getFunnelData(params, dateRange),
    getConsultantRanking(params, dateRange),
    getSetterRanking(params, dateRange), // 新增：查詢電訪人員排行榜
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
    setterRanking, // 新增：電訪人員排行榜
    aiInsights,
    metadata: {
      period: params.period,
      dateRange,
      filters: params,
    },
  };
}
