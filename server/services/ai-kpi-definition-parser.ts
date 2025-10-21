/**
 * AI KPI Definition Parser
 * Uses OpenAI GPT-4 to parse natural language KPI definitions
 * Dynamically fetches real table schema and data values from Supabase
 */

import OpenAI from 'openai';
import { getSupabaseClient } from './supabase-client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Get actual field values from a table by sampling data
 */
async function getFieldPossibleValues(
  tableName: string,
  fieldName: string,
  limit: number = 100
): Promise<string[]> {
  const supabase = getSupabaseClient();

  try {
    // Check if field is in raw_data (jsonb)
    if (fieldName.startsWith('raw_data')) {
      // Extract key from raw_data->>'key' format
      const keyMatch = fieldName.match(/raw_data->>'([^']+)'/);
      const key = keyMatch ? keyMatch[1] : null;

      if (!key) return [];

      const { data, error } = await supabase
        .from(tableName)
        .select('raw_data')
        .not('raw_data', 'is', null)
        .limit(limit);

      if (error || !data) return [];

      const values = new Set<string>();
      data.forEach((row: any) => {
        if (row.raw_data && row.raw_data[key]) {
          values.add(String(row.raw_data[key]));
        }
      });

      return Array.from(values).slice(0, 10);
    }

    // Regular column
    const { data, error } = await supabase
      .from(tableName)
      .select(fieldName)
      .not(fieldName, 'is', null)
      .limit(limit);

    if (error || !data) return [];

    const values = new Set<string>();
    data.forEach((row: any) => {
      if (row[fieldName]) {
        values.add(String(row[fieldName]));
      }
    });

    return Array.from(values).slice(0, 10);
  } catch (error) {
    console.error(`Error getting field values for ${tableName}.${fieldName}:`, error);
    return [];
  }
}

/**
 * Get available fields from raw_data by sampling actual data
 */
async function getRawDataFields(tableName: string): Promise<string[]> {
  const supabase = getSupabaseClient();

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('raw_data')
      .not('raw_data', 'is', null)
      .limit(50);

    if (error || !data) return [];

    const allKeys = new Set<string>();
    data.forEach((row: any) => {
      if (row.raw_data && typeof row.raw_data === 'object') {
        Object.keys(row.raw_data).forEach(key => allKeys.add(key));
      }
    });

    return Array.from(allKeys);
  } catch (error) {
    console.error(`Error getting raw_data fields for ${tableName}:`, error);
    return [];
  }
}

/**
 * Build dynamic table schema for AI prompt
 */
async function buildTableSchema(tableName: string): Promise<{
  tableName: string;
  fields: Array<{
    fieldPath: string;
    label: string;
    possibleValues: string;
    type: 'column' | 'raw_data';
  }>;
}> {
  const fields: any[] = [];

  // Get raw_data fields (from Google Sheets)
  const rawDataFields = await getRawDataFields(tableName);
  for (const key of rawDataFields) {
    const fieldPath = `raw_data->>'${key}'`;
    const possibleValues = await getFieldPossibleValues(tableName, fieldPath, 50);

    fields.push({
      fieldPath,
      label: key,
      possibleValues: possibleValues.slice(0, 5).join(' / ') || '(無資料)',
      type: 'raw_data'
    });
  }

  // Add common direct columns
  const commonColumns: Record<string, string[]> = {
    'trial_class_attendance': ['student_name', 'student_email', 'teacher_name', 'class_date'],
    'eods_for_closers': ['student_name', 'student_email', 'closer_name', 'deal_date', 'actual_amount', 'deal_package'],
    'trial_class_purchase': ['student_name', 'student_email', 'purchase_date', 'course_type', 'amount']
  };

  const columns = commonColumns[tableName] || [];
  for (const col of columns) {
    const possibleValues = await getFieldPossibleValues(tableName, col, 50);

    fields.push({
      fieldPath: col,
      label: col,
      possibleValues: possibleValues.slice(0, 5).join(' / ') || '(無資料)',
      type: 'column'
    });
  }

  return { tableName, fields };
}

export interface ParsedCondition {
  table?: string;  // Table name for multi-table queries
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'exists';
  value?: any;
  description: string;
}

export interface ParsedDefinition {
  numerator: {
    label: string;
    conditions: string[];
    sqlConditions?: ParsedCondition[];
  };
  denominator: {
    label: string;
    conditions: string[];
    sqlConditions?: ParsedCondition[];
  };
  needsConfirmation?: Array<{
    question: string;
    defaultValue: string | number;
    key: string;
  }>;
}

export interface ParseResult {
  success: boolean;
  parsed?: ParsedDefinition;
  error?: string;
}

/**
 * Parse natural language KPI definition using OpenAI GPT-4
 */
export async function parseKPIDefinition(
  kpiName: string,
  naturalLanguageDefinition: string
): Promise<ParseResult> {
  try {
    // Build dynamic table schemas from actual Supabase data
    console.log('🔍 正在掃描 Supabase 表結構...');
    const schemas = await Promise.all([
      buildTableSchema('trial_class_attendance'),
      buildTableSchema('eods_for_closers'),
      buildTableSchema('trial_class_purchase')
    ]);

    // Generate table descriptions for AI prompt
    const tableDescriptions = schemas.map(schema => {
      if (schema.fields.length === 0) {
        return `${schema.tableName}: (無可用資料)`;
      }

      const fieldsDesc = schema.fields.map(f =>
        `   - ${f.fieldPath}: ${f.label} (範例值: ${f.possibleValues})`
      ).join('\n');

      return `${schema.tableName}:\n${fieldsDesc}`;
    }).join('\n\n');

    console.log('✅ 表結構掃描完成');
    console.log('📊 可用欄位:', schemas.map(s => `${s.tableName}: ${s.fields.length}個欄位`).join(', '));

    const systemPrompt = `你是一個教育機構的數據分析專家，專門將自然語言的 KPI 定義轉換為結構化的查詢條件。

可用的數據表和欄位（從實際 Supabase 資料庫動態獲取）：

${tableDescriptions}

IMPORTANT NOTES:
1. 欄位格式為 raw_data->>'xxx' 的是從 Google Sheets 同步的原始資料
2. 請使用「範例值」中實際存在的值，不要憑空想像
3. student_email 用於關聯不同表的學生資料
4. 如果欄位沒有範例值顯示「(無資料)」，表示該欄位目前無資料
5. **如果使用者提到的詞彙不在範例值中，必須加入 needsConfirmation 讓使用者選擇**

請將使用者的定義轉換為 JSON 格式，包含：
{
  "numerator": {
    "label": "分子描述（簡短）",
    "conditions": ["條件1的中文描述", "條件2的中文描述"],
    "sqlConditions": [
      {
        "field": "欄位名稱",
        "operator": "eq|neq|gt|gte|lt|lte|in|contains|exists",
        "value": "值（如果需要）",
        "description": "這個條件的用途"
      }
    ]
  },
  "denominator": {
    "label": "分母描述（簡短）",
    "conditions": ["條件1的中文描述"],
    "sqlConditions": [...]
  },
  "needsConfirmation": [
    {
      "question": "需要使用者確認的問題",
      "field": "欄位名稱（如 package_name）",
      "options": ["選項1", "選項2"],  // 從上面範例值中取得
      "userInput": "使用者輸入的詞彙",
      "key": "參數鍵名"
    }
  ]
}

重要規則：
1. **必須使用上面列出的實際欄位名稱**（例如 raw_data->>'出席狀態' 而不是 attendance_status）
2. **必須使用範例值中實際存在的值**（不要憑空想像）
3. **如果使用者的詞彙不在範例值中，必須使用 needsConfirmation 讓使用者選擇**
4. 分子的條件必須是分母的子集（分子 ⊆ 分母）
5. student_email 用於關聯不同表的學生
6. 日期欄位如果沒有明確指定範圍，不要加條件
7. 回傳純 JSON，不要包含任何額外文字

特別注意 needsConfirmation 的使用時機：
- 使用者說「高階課程」，但範例值只有「基礎課程包」、「進階課程包」→ 需要確認
- 使用者說「A老師」，但範例值只有「李老師」、「王老師」→ 需要確認
- 使用者說的詞彙在範例值中找不到時 → 一律加入 needsConfirmation

範例（假設上面的表結構顯示有 raw_data->>'出席狀態' 欄位）：
輸入："已上過體驗課且購買課程的學生 / 已上完體驗課的學生"
輸出：
{
  "numerator": {
    "label": "已上體驗課且購買課程的學生",
    "conditions": [
      "在 trial_class_attendance 有出席記錄",
      "在 trial_class_purchase 有購買記錄"
    ],
    "sqlConditions": [
      {
        "table": "trial_class_attendance",
        "field": "student_email",
        "operator": "exists",
        "description": "確保學生有體驗課記錄"
      },
      {
        "table": "trial_class_purchase",
        "field": "student_email",
        "operator": "exists",
        "description": "確保學生有購買記錄"
      }
    ]
  },
  "denominator": {
    "label": "已上完體驗課的學生",
    "conditions": [
      "在 trial_class_attendance 有出席記錄"
    ],
    "sqlConditions": [
      {
        "table": "trial_class_attendance",
        "field": "student_email",
        "operator": "exists",
        "description": "計算所有有體驗課記錄的學生"
      }
    ]
  }
}

範例 2（使用者詞彙不在範例值中，需要確認）：
假設 package_name 的範例值為「基礎課程包 / 進階課程包」
輸入："高階課程轉換率"
輸出：
{
  "numerator": {
    "label": "購買高階課程的學生",
    "conditions": ["在 trial_class_purchase 有購買特定課程記錄"],
    "sqlConditions": [
      {
        "table": "trial_class_purchase",
        "field": "package_name",
        "operator": "eq",
        "value": "{{course_type}}",
        "description": "篩選特定課程類型"
      }
    ]
  },
  "denominator": {
    "label": "所有上過體驗課的學生",
    "conditions": ["在 trial_class_attendance 有記錄"],
    "sqlConditions": [
      {
        "table": "trial_class_attendance",
        "field": "student_email",
        "operator": "exists",
        "description": "所有有體驗課記錄的學生"
      }
    ]
  },
  "needsConfirmation": [
    {
      "question": "你說的「高階課程」是指哪個課程？",
      "field": "package_name",
      "options": ["基礎課程包", "進階課程包"],
      "userInput": "高階課程",
      "key": "course_type"
    }
  ]
}`;

    const userPrompt = `KPI 名稱：${kpiName}
使用者的定義：${naturalLanguageDefinition}

請解析這個定義，回傳 JSON 格式的結構化條件。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const responseText = completion.choices[0].message.content;
    if (!responseText) {
      return {
        success: false,
        error: 'AI 回應為空',
      };
    }

    const parsed = JSON.parse(responseText) as ParsedDefinition;

    // Validate parsed structure
    if (!parsed.numerator || !parsed.denominator) {
      return {
        success: false,
        error: 'AI 解析結果缺少必要欄位',
      };
    }

    return {
      success: true,
      parsed,
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI 解析失敗',
    };
  }
}

/**
 * Calculate preview based on parsed definition (Dynamic multi-table support)
 */
export async function calculatePreview(
  kpiName: string,
  definition: ParsedDefinition,
  parameters: Record<string, any>,
  supabaseClient: any
): Promise<{
  numeratorCount: number;
  denominatorCount: number;
  value: number;
  isValid: boolean;
  details?: any;
}> {
  try {
    console.log('🧮 開始計算預覽...');
    const { numerator, denominator } = definition;

    // Helper: Get student emails from table with conditions
    const getStudentEmails = async (
      conditions: ParsedCondition[] | undefined,
      label: string
    ): Promise<Set<string>> => {
      if (!conditions || conditions.length === 0) {
        console.log(`⚠️  ${label}: 無條件，回傳空集合`);
        return new Set();
      }

      // Group conditions by table
      const tableConditions: Record<string, ParsedCondition[]> = {};
      conditions.forEach(cond => {
        const table = cond.table || 'trial_class_attendance';
        if (!tableConditions[table]) {
          tableConditions[table] = [];
        }
        tableConditions[table].push(cond);
      });

      console.log(`📊 ${label}: 查詢 ${Object.keys(tableConditions).length} 個表`);

      // Query each table and collect student emails
      const emailSets: Set<string>[] = [];

      for (const [tableName, conds] of Object.entries(tableConditions)) {
        let query = supabaseClient
          .from(tableName)
          .select('student_email')
          .not('student_email', 'is', null);

        // Apply conditions
        for (const cond of conds) {
          query = applyCondition(query, cond, parameters);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`❌ 查詢 ${tableName} 失敗:`, error);
          throw new Error(`查詢 ${tableName} 失敗: ${error.message}`);
        }

        const emails = new Set(
          data?.map((r: any) => r.student_email).filter((e: any) => e) || []
        );

        console.log(`   - ${tableName}: ${emails.size} 個學生`);
        emailSets.push(emails);
      }

      // If multiple tables, find intersection (students in ALL tables)
      if (emailSets.length === 0) {
        return new Set();
      }

      let result = emailSets[0];
      for (let i = 1; i < emailSets.length; i++) {
        result = new Set([...result].filter(email => emailSets[i].has(email)));
      }

      console.log(`✅ ${label} 總計: ${result.size} 個學生`);
      return result;
    };

    // Calculate denominator and numerator
    const [denominatorEmails, numeratorEmails] = await Promise.all([
      getStudentEmails(denominator.sqlConditions, '分母'),
      getStudentEmails(numerator.sqlConditions, '分子')
    ]);

    const denominatorCount = denominatorEmails.size;
    const numeratorCount = numeratorEmails.size;

    const value =
      denominatorCount > 0
        ? (numeratorCount / denominatorCount) * 100
        : 0;

    const isValid = value <= 100 && value >= 0;

    console.log(`📈 結果: ${numeratorCount}/${denominatorCount} = ${value.toFixed(2)}%`);

    return {
      numeratorCount,
      denominatorCount,
      value,
      isValid,
      details: {
        denominatorEmails: Array.from(denominatorEmails).slice(0, 5),
        numeratorEmails: Array.from(numeratorEmails).slice(0, 5),
      },
    };
  } catch (error) {
    console.error('❌ 預覽計算錯誤:', error);
    throw error;
  }
}

/**
 * Apply a single condition to a Supabase query (supports jsonb fields)
 */
function applyCondition(query: any, condition: ParsedCondition, params: Record<string, any>) {
  const { field, operator, value } = condition;

  // Substitute parameter if value is a key
  const actualValue = typeof value === 'string' && value.startsWith('$')
    ? params[value.substring(1)]
    : value;

  // Special handling for 'exists' operator (just check field is not null)
  if (operator === 'exists') {
    return query.not(field, 'is', null);
  }

  // Detect if field is jsonb path (raw_data->>'key' format)
  const isJsonbField = field.includes('raw_data->>');

  if (isJsonbField) {
    // Extract the key from raw_data->>'key'
    const keyMatch = field.match(/raw_data->>'([^']+)'/);
    const key = keyMatch ? keyMatch[1] : null;

    if (!key) {
      console.warn(`⚠️  無法解析 jsonb 欄位: ${field}`);
      return query;
    }

    // Use Supabase PostgREST jsonb query syntax
    // Reference: https://postgrest.org/en/stable/api.html#json-columns
    switch (operator) {
      case 'eq':
        // Use ->>'key' syntax for text comparison
        return query.eq(`raw_data->>${key}`, actualValue);
      case 'neq':
        return query.neq(`raw_data->>${key}`, actualValue);
      case 'gt':
        return query.gt(`raw_data->>${key}`, actualValue);
      case 'gte':
        return query.gte(`raw_data->>${key}`, actualValue);
      case 'lt':
        return query.lt(`raw_data->>${key}`, actualValue);
      case 'lte':
        return query.lte(`raw_data->>${key}`, actualValue);
      case 'contains':
        return query.ilike(`raw_data->>${key}`, `%${actualValue}%`);
      case 'in':
        // For jsonb, need to check each value
        if (Array.isArray(actualValue)) {
          return query.in(`raw_data->>${key}`, actualValue);
        }
        return query;
      default:
        console.warn(`⚠️  不支援的 jsonb 操作符: ${operator}`);
        return query;
    }
  }

  // Regular column operations
  switch (operator) {
    case 'eq':
      return query.eq(field, actualValue);
    case 'neq':
      return query.neq(field, actualValue);
    case 'gt':
      return query.gt(field, actualValue);
    case 'gte':
      return query.gte(field, actualValue);
    case 'lt':
      return query.lt(field, actualValue);
    case 'lte':
      return query.lte(field, actualValue);
    case 'in':
      return query.in(field, actualValue);
    case 'contains':
      return query.ilike(field, `%${actualValue}%`);
    default:
      console.warn(`⚠️  不支援的操作符: ${operator}`);
      return query;
  }
}
