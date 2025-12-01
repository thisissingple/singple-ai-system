/**
 * Consultant AI Report Service
 * Generates AI-powered analysis reports for consultant performance
 *
 * 快取機制：同一天同期間只生成一次報告，避免重複呼叫 AI API
 */

import OpenAI from 'openai';
import pkg from 'pg';
const { Pool } = pkg;
import type { KPIData, ConsultantRanking, SetterRanking, LeadSourceTableRow, ChartData } from './consultant-report-service';

// ============================================================================
// Types
// ============================================================================

export interface AIReportInput {
  kpiData: KPIData;
  ranking: ConsultantRanking[];
  setterRanking: SetterRanking[];
  leadSourceTable: LeadSourceTableRow[];
  charts: ChartData;
  period: string;
  dateRange: { start: string; end: string };
  consultationList?: any[];
}

export interface AIReportSection {
  title: string;
  content: string;
}

export interface AIReport {
  summary: string;
  sections: AIReportSection[];
  generatedAt: string;
  period: string;
  dateRange: { start: string; end: string };
  fromCache?: boolean;  // 是否來自快取
}

// ============================================================================
// OpenAI Configuration
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Report Template
// ============================================================================

const REPORT_TEMPLATE = `
你是一位專業的業務分析師，負責為教育機構的諮詢團隊生成週期性業績報告。

請根據提供的數據，生成一份結構化的分析報告。報告必須包含以下固定區塊：

## 報告格式要求

1. **本期總覽** - 用 2-3 句話總結本期整體表現
2. **關鍵指標分析** - 分析 KPI 數據，特別關注：
   - 諮詢數與成交數
   - 成交率表現
   - 實收金額與平均單價
   - 上線率表現
3. **團隊表現** - 分析諮詢師和電訪人員的表現：
   - 表現最佳的成員
   - 需要關注的成員
   - 團隊合作亮點
4. **來源分析** - 分析各名單來源的表現
5. **改善建議** - 具體可執行的改善建議（3-5 條）

## 輸出格式

請以 JSON 格式輸出，結構如下：
{
  "summary": "一段話的總覽",
  "sections": [
    { "title": "本期總覽", "content": "..." },
    { "title": "關鍵指標分析", "content": "..." },
    { "title": "團隊表現", "content": "..." },
    { "title": "來源分析", "content": "..." },
    { "title": "改善建議", "content": "..." }
  ]
}

## 注意事項
- 使用繁體中文
- 數據要具體，不要籠統
- 建議要可執行，不要空泛
- 語氣專業但易讀
- 金額使用 NT$ 格式
- 百分比保留一位小數
`;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate AI report for consultant performance
 */
export async function generateConsultantAIReport(input: AIReportInput): Promise<AIReport> {
  const { kpiData, ranking, setterRanking, leadSourceTable, charts, period, dateRange, consultationList } = input;

  // Prepare data context for AI
  const dataContext = buildDataContext(input);

  const startTime = Date.now();

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: REPORT_TEMPLATE,
        },
        {
          role: 'user',
          content: `請根據以下數據生成報告：

## 報告期間
- 期間類型: ${translatePeriod(period)}
- 日期範圍: ${dateRange.start} 至 ${dateRange.end}

## KPI 數據
${dataContext.kpiSummary}

## 諮詢師排行（前5名）
${dataContext.consultantSummary}

## 電訪人員排行（前5名）
${dataContext.setterSummary}

## 名單來源分析
${dataContext.leadSourceSummary}

## 趨勢數據
${dataContext.trendSummary}

請生成分析報告。`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const responseTime = Date.now() - startTime;
    const content = completion.choices[0]?.message?.content || '{}';

    let parsed: { summary: string; sections: AIReportSection[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback if JSON parsing fails
      parsed = {
        summary: '報告生成失敗，請稍後再試。',
        sections: [
          { title: '錯誤', content: '無法解析 AI 回應。' }
        ]
      };
    }

    return {
      summary: parsed.summary || '',
      sections: parsed.sections || [],
      generatedAt: new Date().toISOString(),
      period,
      dateRange,
    };
  } catch (error: any) {
    console.error('[AI Report] Error generating report:', error);
    throw new Error(`AI 報告生成失敗: ${error.message}`);
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

function translatePeriod(period: string): string {
  const periodMap: Record<string, string> = {
    today: '今日',
    week: '本週',
    month: '本月',
    quarter: '本季',
    year: '本年',
    all: '全部',
    custom: '自訂期間',
  };
  return periodMap[period] || period;
}

function buildDataContext(input: AIReportInput) {
  const { kpiData, ranking, setterRanking, leadSourceTable, charts } = input;

  // KPI Summary
  const kpiSummary = `
- 諮詢數: ${kpiData.consultationCount} 人
- 成交數: ${kpiData.dealCount} 人
- 成交率: ${kpiData.closingRate.toFixed(1)}%
- 實收金額: NT$ ${formatNumber(kpiData.totalActualAmount)}
- 平均成交金額: NT$ ${formatNumber(kpiData.avgDealAmount)}
- 待追蹤: ${kpiData.pendingCount} 人
- 潛在收入: NT$ ${formatNumber(kpiData.potentialRevenue)}
- 上線數: ${kpiData.showCount} 人
- 未上線數: ${kpiData.notShowCount} 人
${kpiData.consultationCountChange !== undefined ? `- 諮詢數變化: ${kpiData.consultationCountChange > 0 ? '+' : ''}${kpiData.consultationCountChange.toFixed(1)}%` : ''}
${kpiData.dealCountChange !== undefined ? `- 成交數變化: ${kpiData.dealCountChange > 0 ? '+' : ''}${kpiData.dealCountChange.toFixed(1)}%` : ''}
${kpiData.closingRateChange !== undefined ? `- 成交率變化: ${kpiData.closingRateChange > 0 ? '+' : ''}${kpiData.closingRateChange.toFixed(1)}%` : ''}
  `.trim();

  // Consultant Summary (top 5)
  const topConsultants = ranking.slice(0, 5);
  const consultantSummary = topConsultants.length > 0
    ? topConsultants.map((c, i) =>
        `${i + 1}. ${c.consultantName}: 諮詢 ${c.consultationCount} 人, 成交 ${c.dealCount} 人, 成交率 ${c.closingRate.toFixed(1)}%, 實收 NT$ ${formatNumber(c.actualAmount)}`
      ).join('\n')
    : '無數據';

  // Setter Summary (top 5)
  const topSetters = setterRanking.slice(0, 5);
  const setterSummary = topSetters.length > 0
    ? topSetters.map((s, i) =>
        `${i + 1}. ${s.setterName}: 轉介 ${s.consultationCount} 人, 成交 ${s.dealCount} 人, 成交率 ${s.closingRate.toFixed(1)}%, 實收 NT$ ${formatNumber(s.actualAmount)}`
      ).join('\n')
    : '無數據';

  // Lead Source Summary
  const leadSourceSummary = leadSourceTable.length > 0
    ? leadSourceTable.map(ls =>
        `- ${ls.leadSource || '未知'}: 諮詢 ${ls.consultationCount} 人, 上線 ${ls.showCount} 人, 成交 ${ls.dealCount} 人, 成交率 ${ls.closingRate.toFixed(1)}%, 實收 NT$ ${formatNumber(ls.actualAmount)}`
      ).join('\n')
    : '無數據';

  // Trend Summary
  const trendSummary = charts.trendLine.length > 0
    ? `最近 ${charts.trendLine.length} 個時間點的趨勢：\n` +
      charts.trendLine.slice(-7).map(t =>
        `- ${t.date}: 諮詢 ${t.consultations} 人, 成交 ${t.deals} 人`
      ).join('\n')
    : '無趨勢數據';

  return {
    kpiSummary,
    consultantSummary,
    setterSummary,
    leadSourceSummary,
    trendSummary,
  };
}

function formatNumber(num: number): string {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toLocaleString('zh-TW');
}

// ============================================================================
// Database Cache Functions
// ============================================================================

import { getSharedPool } from './pg-client';

/**
 * 獲取共享資料庫連線池（不再每次創建新的）
 */
function createDbPool() {
  return getSharedPool();
}

/**
 * 檢查是否有同期間的快取報告（永久保存，不限當天）
 */
export async function getCachedReport(
  period: string,
  startDate: string,
  endDate: string
): Promise<AIReport | null> {
  const pool = createDbPool();

  try {
    const result = await pool.query(
      `SELECT summary, sections, generated_at, period, start_date, end_date
       FROM consultant_ai_reports
       WHERE period = $1
         AND start_date = $2
         AND end_date = $3
       ORDER BY generated_at DESC
       LIMIT 1`,
      [period, startDate, endDate]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      console.log(`[AI Report Cache] ✅ Cache hit for ${period} (${startDate} ~ ${endDate})`);
      return {
        summary: row.summary,
        sections: row.sections,
        generatedAt: row.generated_at,
        period: row.period,
        dateRange: {
          start: row.start_date,
          end: row.end_date,
        },
        fromCache: true,
      };
    }

    console.log(`[AI Report Cache] ❌ Cache miss for ${period} (${startDate} ~ ${endDate})`);
    return null;
  } catch (error: any) {
    console.error('[AI Report Cache] Error checking cache:', error.message);
    return null;
  } finally {
    // pool.end() removed - using shared pool
  }
}

/**
 * 將報告儲存到快取（同期間會覆蓋舊報告）
 */
export async function saveReportToCache(report: AIReport): Promise<void> {
  const pool = createDbPool();

  try {
    // 先刪除同期間的舊報告，再插入新報告
    await pool.query(
      `DELETE FROM consultant_ai_reports
       WHERE period = $1 AND start_date = $2 AND end_date = $3`,
      [report.period, report.dateRange.start, report.dateRange.end]
    );

    await pool.query(
      `INSERT INTO consultant_ai_reports (period, start_date, end_date, summary, sections, generated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        report.period,
        report.dateRange.start,
        report.dateRange.end,
        report.summary,
        JSON.stringify(report.sections),
        report.generatedAt,
      ]
    );
    console.log(`[AI Report Cache] 💾 Saved report to cache: ${report.period} (${report.dateRange.start} ~ ${report.dateRange.end})`);
  } catch (error: any) {
    console.error('[AI Report Cache] Error saving to cache:', error.message);
    // Don't throw - cache save failure shouldn't break the main flow
  } finally {
    // pool.end() removed - using shared pool
  }
}

/**
 * 生成或從快取獲取 AI 報告
 * @param input - AI 報告輸入資料
 * @param forceRefresh - 是否強制重新生成（跳過快取）
 */
export async function getOrGenerateConsultantAIReport(
  input: AIReportInput,
  forceRefresh: boolean = false
): Promise<AIReport> {
  const { period, dateRange } = input;

  // 如果不是強制刷新，先檢查快取
  if (!forceRefresh) {
    const cachedReport = await getCachedReport(period, dateRange.start, dateRange.end);
    if (cachedReport) {
      return cachedReport;
    }
  } else {
    console.log(`[AI Report] 🔄 Force refresh requested, skipping cache`);
  }

  // 生成新報告
  const report = await generateConsultantAIReport(input);

  // 儲存到快取
  await saveReportToCache(report);

  return {
    ...report,
    fromCache: false,
  };
}
