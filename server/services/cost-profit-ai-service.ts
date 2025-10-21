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
    const completion = await client.responses.create({
      model: DEFAULT_MODEL,
      input: prompt,
      max_output_tokens: 4000,
      text: {
        format: {
          type: 'json_schema',
          name: PREDICTION_SCHEMA.name,
          schema: PREDICTION_SCHEMA.schema,
        },
      },
    });

    const messageBlock = completion.output?.find(
      (block) => block.type === 'message',
    );
    const rawOutputText = completion.output_text || '';

    // Debug: 查看實際的回應結構
    console.log('📊 OpenAI Response Structure:', {
      outputLength: completion.output?.length,
      messageBlockType: messageBlock?.type,
      contentTypes: messageBlock?.content?.map(c => c.type),
      rawOutputTextLength: rawOutputText.length,
      rawOutputTextPreview: rawOutputText.substring(0, 200)
    });

    const jsonContent = messageBlock?.content?.find(
      (content) => content.type === 'output_json',
    ) as { json?: { suggestions?: CostProfitPrediction[] } } | undefined;

    const textContent = messageBlock?.content?.find(
      (content) => content.type === 'output_text',
    ) as { text?: string } | undefined;

    let suggestions =
      jsonContent?.json?.suggestions ??
      ((jsonContent?.json as unknown as CostProfitPrediction[]) ?? []);

    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      const rawTextCandidates: string[] = [];

      if (textContent?.text) rawTextCandidates.push(textContent.text);
      if (rawOutputText) rawTextCandidates.push(rawOutputText);

      const fallbackBlocks =
        messageBlock?.content
          ?.filter((content) => content.type === 'text' || content.type === 'output_text')
          ?.map((content) => (content as any).text ?? '')
          ?.filter((text) => text && text.trim().length > 0) ?? [];

      rawTextCandidates.push(...fallbackBlocks);

      // 合併所有候選文字，但要去重（避免重複輸出）
      const uniqueTexts = Array.from(new Set(rawTextCandidates));
      const rawText = uniqueTexts.join('\n').trim();

     const arrayMatch = rawText.match(/\[[\s\S]*\]/);
     const objectMatch = rawText.match(/\{[\s\S]*\}/);
     const bracketStart = rawText.indexOf('{');
     const bracketEnd = rawText.lastIndexOf('}');
      const objectPatternStart = rawText.indexOf('{"suggestions"');
      const objectPatternEnd = rawText.indexOf('}]}');

      const sanitizedObject =
        bracketStart !== -1 && bracketEnd !== -1 && bracketEnd > bracketStart
          ? rawText.slice(bracketStart, bracketEnd + 1)
          : null;
      const trimmedObject =
        objectPatternStart !== -1 && objectPatternEnd !== -1 && objectPatternEnd > objectPatternStart
          ? rawText.slice(objectPatternStart, objectPatternEnd + 3)
          : null;

      const tryParse = (text?: string, label?: string) => {
        if (!text) return null;
        try {
          const result = JSON.parse(text);
          if (label) console.log(`✅ ${label} 解析成功`);
          return result;
        } catch (error) {
          if (label) console.log(`❌ ${label} 解析失敗:`, error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      };

      let parsed: any = null;

      console.log('🔍 嘗試解析 AI 輸出...');
      console.log('rawText 長度:', rawText.length);
      console.log('rawText 前 100 字:', rawText.substring(0, 100));
      console.log('rawText 後 100 字:', rawText.substring(rawText.length - 100));

      if (arrayMatch) {
        parsed = tryParse(arrayMatch[0], 'arrayMatch');
      } else if (objectMatch) {
        parsed = tryParse(objectMatch[0], 'objectMatch');
      }

      if (!parsed && trimmedObject) {
        parsed = tryParse(trimmedObject, 'trimmedObject');
      }

      if (!parsed && sanitizedObject) {
        parsed = tryParse(sanitizedObject, 'sanitizedObject');
      }

      // 嘗試直接解析整個 rawText（去除頭尾空白）
      if (!parsed) {
        parsed = tryParse(rawText.trim(), 'rawText.trim()');
      }

      if (parsed) {
        console.log('✅ 成功解析 AI 輸出:', parsed);
        if (Array.isArray(parsed)) {
          suggestions = parsed;
        } else if (Array.isArray(parsed?.suggestions)) {
          suggestions = parsed.suggestions;
        }
      }

      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        console.warn('❌ CostProfit AI 預測解析失敗');
        console.log('原始輸出:', rawText);
        console.log('parsed 結果:', parsed);
      } else {
        console.log(`✅ 成功解析 ${suggestions.length} 筆預測資料`);
      }
    }

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
