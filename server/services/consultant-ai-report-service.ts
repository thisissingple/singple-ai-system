/**
 * Consultant AI Report Service
 * Generates AI-powered analysis reports for consultant performance
 */

import OpenAI from 'openai';
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
