import OpenAI from 'openai';
import { costProfitService, type CostProfitRecord } from './cost-profit-service';

export interface CostProfitPrediction {
  category_name: string;
  item_name: string;
  predicted_amount: number;
  confidence?: number;
  reason?: string;
}

const DEFAULT_MODEL = process.env.COST_PROFIT_AI_MODEL || 'gpt-4o-mini';
const PREDICTION_SCHEMA = {
  type: 'json_schema',
  name: 'CostProfitPredictionList',
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            category_name: { type: 'string' },
            item_name: { type: 'string' },
            predicted_amount: { type: 'number' },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            reason: { type: 'string' },
          },
          required: [
            'category_name',
            'item_name',
            'predicted_amount',
            'confidence',
            'reason',
          ],
        },
      },
    },
    required: ['suggestions'],
  },
} as const;

let cachedClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY 未設定，無法生成 AI 預測');
  }

  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

interface AggregatedHistory {
  category_name: string;
  item_name: string;
  averages: {
    last3?: number;
    last6?: number;
  };
  recent: Array<{
    month: string;
    year: number;
    amount: number;
  }>;
}

function aggregateHistory(records: CostProfitRecord[]): AggregatedHistory[] {
  const grouped = new Map<string, AggregatedHistory>();

  const sorted = [...records].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month.localeCompare(b.month);
  });

  for (const record of sorted) {
    const key = `${record.category_name}||${record.item_name}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        category_name: record.category_name,
        item_name: record.item_name,
        averages: {},
        recent: [],
      });
    }

    const entry = grouped.get(key)!;
    const amount = record.amount ? Number(record.amount) : 0;
    entry.recent.push({
      month: record.month,
      year: record.year,
      amount,
    });
  }

  const result: AggregatedHistory[] = [];
  for (const entry of grouped.values()) {
    const last6 = entry.recent.slice(-6);
    const last3 = entry.recent.slice(-3);

    const avg = (list: typeof entry.recent) => {
      if (!list.length) return undefined;
      const sum = list.reduce((acc, item) => acc + item.amount, 0);
      return Number((sum / list.length).toFixed(2));
    };

    entry.averages.last6 = avg(last6);
    entry.averages.last3 = avg(last3);

    result.push(entry);
  }

  return result;
}

function buildPrompt(
  targetYear: number,
  targetMonth: string,
  history: AggregatedHistory[],
): string {
  const lines: string[] = [];
  lines.push(
    '你是一位分析財務的助手，請根據提供的歷史資料，預測下一個月份可能的收入與支出金額。',
  );
  lines.push(
    `預測目標月份：${targetYear} 年 ${targetMonth}。`,
  );
  lines.push(
    '請根據以下範例輸出資料：',
  );
  lines.push(
    '[{"category_name":"分類","item_name":"項目","predicted_amount":數字,"confidence":0~1,"reason":"簡短原因"}]',
  );
  lines.push(
    '若不確定，predicted_amount 可為 0，confidence 介於 0~1（0=非常不確定，1=非常有把握）。',
  );
  lines.push('');
  lines.push('以下為過去資料（由舊到新）：');

  const maxLines = 80;
  let count = 0;

  for (const entry of history) {
    if (count >= maxLines) break;
    const historyStr = entry.recent
      .map((item) => `${item.year}-${item.month}: ${item.amount}`)
      .join(', ');
    lines.push(
      `- ${entry.category_name} / ${entry.item_name} | 最近: ${historyStr} | 平均(3月): ${entry.averages.last3 ?? 'N/A'} | 平均(6月): ${entry.averages.last6 ?? 'N/A'}`,
    );
    count += 1;
  }

  lines.push('');
  lines.push('請只輸出 JSON，勿添加其他文字。');

  return lines.join('\n');
}

export async function generateCostProfitPrediction(
  params: { year: number; month: string; lookbackMonths?: number },
): Promise<CostProfitPrediction[]> {
  const lookback = Math.max(3, Math.min(params.lookbackMonths ?? 12, 24));
  const rawHistory = await costProfitService.getRecentMonths(lookback);

  if (!rawHistory.length) {
    return [];
  }

  const aggregated = aggregateHistory(rawHistory);
  const prompt = buildPrompt(params.year, params.month, aggregated);

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: PREDICTION_SCHEMA.name,
          schema: PREDICTION_SCHEMA.schema,
          strict: true,
        },
      },
      temperature: 0.7,
      max_tokens: 4000,
    });

    const messageContent = completion.choices[0]?.message?.content;

    // Debug: 查看實際的回應結構
    console.log('📊 OpenAI Response Structure:', {
      finishReason: completion.choices[0]?.finish_reason,
      hasContent: !!messageContent,
      contentLength: messageContent?.length || 0,
      contentPreview: messageContent?.substring(0, 200)
    });

    if (!messageContent) {
      console.warn('❌ OpenAI 回應無內容');
      return [];
    }

    let suggestions: CostProfitPrediction[] = [];

    try {
      const parsed = JSON.parse(messageContent);
      console.log('✅ 成功解析 AI 輸出:', parsed);

      if (Array.isArray(parsed)) {
        suggestions = parsed;
      } else if (parsed?.suggestions && Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions;
      } else {
        console.warn('❌ 解析結果格式不正確:', parsed);
      }
    } catch (error) {
      console.error('❌ JSON 解析失敗:', error);
      console.log('原始輸出:', messageContent);
      return [];
    }

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      console.warn('❌ CostProfit AI 預測解析失敗 - 無有效建議');
      return [];
    }

    console.log(`✅ 成功解析 ${suggestions.length} 筆預測資料`);

    const normalized = Array.isArray(suggestions) ? suggestions : [];

    return normalized
      .filter(
        (item) =>
          item &&
          typeof item.category_name === 'string' &&
          typeof item.item_name === 'string' &&
          typeof item.predicted_amount === 'number',
      )
      .map((item) => ({
        category_name: item.category_name.trim(),
        item_name: item.item_name.trim(),
        predicted_amount: Number(item.predicted_amount.toFixed(2)),
        confidence:
          typeof item.confidence === 'number'
            ? Math.min(Math.max(item.confidence, 0), 1)
            : undefined,
        reason: item.reason,
      }));
  } catch (error) {
    console.error('CostProfit AI 預測失敗：', error);
    return [];
  }
}
