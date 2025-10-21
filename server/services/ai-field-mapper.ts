/**
 * AI Field Mapper Service
 *
 * 使用 Claude API 自動分析 Google Sheets 欄位並建議對應到 Supabase 欄位
 *
 * 核心功能：
 * 1. 分析 Google Sheets 欄位名稱
 * 2. 比對 Supabase 可用欄位
 * 3. 計算信心分數
 * 4. 提供對應建議與原因
 * 5. 支援批次對應與單一欄位對應
 * 6. Fallback 到規則式對應（當 AI 不可用時）
 */

import Anthropic from '@anthropic-ai/sdk';

// ============================================
// 型別定義
// ============================================

export interface MappingSuggestion {
  googleColumn: string;
  supabaseColumn: string;
  confidence: number;              // 0-1
  dataType: 'text' | 'number' | 'date' | 'boolean' | 'decimal' | 'integer' | 'timestamp';
  transformFunction?: string;      // cleanText, toDate, toInteger, etc.
  isRequired: boolean;
  reasoning: string;               // AI 選擇原因
}

export interface FieldMappingAnalysis {
  worksheetName: string;
  supabaseTable: string;
  suggestions: MappingSuggestion[];
  unmappedGoogleColumns: string[]; // 無法對應的欄位
  unmappedSupabaseColumns: string[]; // 未使用的 Supabase 欄位
  unmappedRequiredColumns?: string[]; // 未對應的必填欄位（新增）
  overallConfidence: number;       // 整體信心分數
}

// ============================================
// AI Field Mapper
// ============================================

export class AIFieldMapper {
  private client: Anthropic | null = null;
  private initialized: boolean = false;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY;
    if (key) {
      this.client = new Anthropic({ apiKey: key });
      this.initialized = true;
      console.log('✓ AI Field Mapper 初始化成功（使用 Claude API）');
    } else {
      console.warn('⚠️  ANTHROPIC_API_KEY 未設定，將使用規則式對應');
    }
  }

  /**
   * 分析 Google Sheets 欄位並建議對應
   *
   * 新邏輯 (2025-10-06):
   * - 以 Supabase 欄位為主（固定的資料庫欄位）
   * - 為每個 Supabase 欄位尋找最佳的 Google Sheets 欄位
   * - 優先處理必填欄位
   */
  async analyzeAndSuggest(
    googleColumns: string[],
    supabaseColumns: string[],
    supabaseTable: string,
    worksheetName: string
  ): Promise<FieldMappingAnalysis> {
    console.log(`🤖 AI 分析欄位對應: ${worksheetName} → ${supabaseTable}`);

    // 取得 Supabase schema 定義
    const schema = SUPABASE_SCHEMAS[supabaseTable];
    if (!schema) {
      throw new Error(`Unknown table: ${supabaseTable}`);
    }

    const suggestions: MappingSuggestion[] = [];

    // 批次處理所有欄位（更高效）
    const batchSuggestions = await this.batchGuessMapping(
      googleColumns,
      supabaseColumns,
      supabaseTable
    );

    suggestions.push(...batchSuggestions);

    // 找出無法對應的欄位
    const mappedGoogleColumns = new Set(suggestions.map(s => s.googleColumn));
    const mappedSupabaseColumns = new Set(suggestions.map(s => s.supabaseColumn));

    const unmappedGoogleColumns = googleColumns.filter(col => !mappedGoogleColumns.has(col));
    const unmappedSupabaseColumns = supabaseColumns.filter(col => !mappedSupabaseColumns.has(col));

    // 找出未對應的必填欄位（警告用）
    const unmappedRequiredColumns = schema.columns
      .filter(col => col.required && !mappedSupabaseColumns.has(col.name))
      .map(col => col.name);

    // 計算整體信心分數
    const overallConfidence = suggestions.length > 0
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      : 0;

    return {
      worksheetName,
      supabaseTable,
      suggestions,
      unmappedGoogleColumns,
      unmappedSupabaseColumns,
      overallConfidence,
      unmappedRequiredColumns, // 新增：未對應的必填欄位
    };
  }

  /**
   * 批次猜測欄位對應
   */
  private async batchGuessMapping(
    googleColumns: string[],
    supabaseColumns: string[],
    supabaseTable: string
  ): Promise<MappingSuggestion[]> {
    // 如果 AI 未初始化，直接使用 fallback
    if (!this.initialized || !this.client) {
      console.log('🔧 AI 未初始化，使用規則式對應');
      return this.fallbackMapping(googleColumns, supabaseColumns);
    }

    const prompt = this.buildBatchMappingPrompt(googleColumns, supabaseColumns, supabaseTable);

    try {
      console.log('🤖 呼叫 Claude API 進行欄位分析...');
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // 解析 AI 回應
      const suggestions = this.parseAIResponse(content.text);
      console.log(`✅ AI 成功分析 ${suggestions.length} 個欄位對應`);
      return suggestions;

    } catch (error) {
      console.error('❌ AI 對應失敗:', error);
      console.log('🔧 Fallback 到規則式對應');
      // Fallback: 使用簡單規則對應
      return this.fallbackMapping(googleColumns, supabaseColumns);
    }
  }

  /**
   * 建立批次對應的 Prompt
   */
  private buildBatchMappingPrompt(
    googleColumns: string[],
    supabaseColumns: string[],
    supabaseTable: string
  ): string {
    return `你是資料庫欄位對應專家。請分析以下 Google Sheets 欄位，並建議對應到 Supabase 欄位。

**任務**：
- 將 Google Sheets 欄位對應到最適合的 Supabase 欄位
- 評估每個對應的信心分數 (0-1)
- 建議資料型別和轉換函數
- 說明選擇原因

**Google Sheets 欄位**：
${googleColumns.map((col, i) => `${i + 1}. "${col}"`).join('\n')}

**可用的 Supabase 欄位** (${supabaseTable} 表)：
${supabaseColumns.map((col, i) => `${i + 1}. ${col}`).join('\n')}

**可用的轉換函數**：
- cleanText: 清理文字（去空白）
- toDate: 轉換為日期 (YYYY-MM-DD)
- toTimestamp: 轉換為時間戳
- toInteger: 轉換為整數
- toDecimal: 轉換為小數
- toBoolean: 轉換為布林值

**回應格式**（必須是有效的 JSON 陣列）：
\`\`\`json
[
  {
    "googleColumn": "Google Sheets 欄位名稱",
    "supabaseColumn": "supabase_column_name",
    "confidence": 0.95,
    "dataType": "text|number|date|boolean|decimal|integer|timestamp",
    "transformFunction": "cleanText|toDate|toInteger|null",
    "isRequired": true,
    "reasoning": "選擇原因說明"
  }
]
\`\`\`

**重要提示**：
1. 只對應有把握的欄位（confidence >= 0.5）
2. 注意中文欄位名稱的語意
3. email 欄位非常重要（用於跨表 JOIN）
4. 如果 Google 欄位包含 "（諮詢）" 等前綴，要識別核心語意
5. 回傳純 JSON，不要有其他文字

請開始分析並回傳 JSON：`;
  }

  /**
   * 解析 AI 回應
   */
  private parseAIResponse(responseText: string): MappingSuggestion[] {
    try {
      // 提取 JSON（可能被 markdown 包裹）
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/\[([\s\S]*?)\]/);

      if (!jsonMatch) {
        console.warn('⚠️ 無法從 AI 回應中提取 JSON');
        return [];
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const parsed = JSON.parse(jsonText);

      // 驗證格式
      if (!Array.isArray(parsed)) {
        console.warn('⚠️ AI 回應格式錯誤（不是陣列）');
        return [];
      }

      return parsed.map((item: any) => ({
        googleColumn: item.googleColumn,
        supabaseColumn: item.supabaseColumn,
        confidence: Math.min(Math.max(item.confidence || 0, 0), 1), // 0-1
        dataType: item.dataType || 'text',
        transformFunction: item.transformFunction || undefined,
        isRequired: item.isRequired || false,
        reasoning: item.reasoning || 'AI suggested mapping'
      }));

    } catch (error) {
      console.error('❌ 解析 AI 回應失敗:', error);
      return [];
    }
  }

  /**
   * Fallback: 簡單規則對應
   */
  private fallbackMapping(
    googleColumns: string[],
    supabaseColumns: string[]
  ): MappingSuggestion[] {
    const suggestions: MappingSuggestion[] = [];

    for (const gCol of googleColumns) {
      const normalized = gCol.toLowerCase().replace(/[（）\(\)]/g, '');

      // 簡單規則匹配
      if (normalized.includes('email') || normalized === 'email') {
        suggestions.push({
          googleColumn: gCol,
          supabaseColumn: 'student_email',
          confidence: 0.9,
          dataType: 'text',
          transformFunction: 'cleanText',
          isRequired: true,
          reasoning: 'Email 欄位 (規則匹配)'
        });
      } else if (normalized.includes('姓名') || normalized === 'name') {
        suggestions.push({
          googleColumn: gCol,
          supabaseColumn: 'student_name',
          confidence: 0.9,
          dataType: 'text',
          transformFunction: 'cleanText',
          isRequired: true,
          reasoning: '姓名欄位 (規則匹配)'
        });
      } else if (normalized.includes('日期') || normalized.includes('date')) {
        const sCol = supabaseColumns.find(s => s.includes('date'));
        if (sCol) {
          suggestions.push({
            googleColumn: gCol,
            supabaseColumn: sCol,
            confidence: 0.7,
            dataType: 'date',
            transformFunction: 'toDate',
            isRequired: false,
            reasoning: '日期欄位 (規則匹配)'
          });
        }
      }
    }

    return suggestions;
  }
}

// ============================================
// 輔助函數
// ============================================

/**
 * 建立預設的 AI Field Mapper 實例
 */
export function createAIFieldMapper(): AIFieldMapper {
  return new AIFieldMapper();
}

// ============================================
// Schema Definitions for API
// ============================================

interface TableColumn {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

interface TableSchema {
  tableName: string;
  columns: TableColumn[];
}

/**
 * Supabase 表的欄位定義
 * 用於 AI 欄位對應與 API 端點
 */
export const SUPABASE_SCHEMAS: Record<string, TableSchema> = {
  trial_class_attendance: {
    tableName: 'trial_class_attendance',
    columns: [
      { name: 'student_name', type: 'text', required: true, description: '學生姓名' },
      { name: 'student_email', type: 'text', required: true, description: '學生 Email（JOIN key）' },
      { name: 'class_date', type: 'date', required: true, description: '體驗課上課日期' },
      { name: 'teacher_name', type: 'text', required: true, description: '授課老師姓名' },
      { name: 'is_reviewed', type: 'boolean', required: false, description: '是否已完成課後審核' },
      { name: 'no_conversion_reason', type: 'text', required: false, description: '未成功購買的原因' },
      { name: 'class_transcript', type: 'text', required: false, description: '課程內容摘要或記錄' },
      { name: 'notes', type: 'text', required: false, description: '額外備註說明' },
      { name: 'teacher_id', type: 'text', required: false, description: '老師 ID' },
      { name: 'sales_id', type: 'text', required: false, description: '業務 ID' },
      { name: 'department_id', type: 'uuid', required: false, description: '部門 ID' },
    ],
  },
  trial_class_purchase: {
    tableName: 'trial_class_purchase',
    columns: [
      { name: 'student_name', type: 'text', required: true, description: '學生姓名' },
      { name: 'student_email', type: 'text', required: true, description: '學生 Email（JOIN key）' },
      { name: 'package_name', type: 'text', required: true, description: '購買的方案名稱' },
      { name: 'purchase_date', type: 'date', required: true, description: '購買日期' },
      { name: 'package_price', type: 'integer', required: false, description: '方案價格（新台幣）' },
      { name: 'notes', type: 'text', required: false, description: '備註' },
      { name: 'age', type: 'integer', required: false, description: '學生年齡' },
      { name: 'occupation', type: 'text', required: false, description: '學生職業' },
      { name: 'trial_classes_total', type: 'integer', required: false, description: '已上體驗課總數' },
      { name: 'remaining_classes', type: 'integer', required: false, description: '剩餘堂數' },
      { name: 'current_status', type: 'text', required: false, description: '學員目前狀態' },
      { name: 'updated_date', type: 'date', required: false, description: '狀態更新日期' },
      { name: 'last_class_date', type: 'date', required: false, description: '最後一次上課日期' },
    ],
  },
  eods_for_closers: {
    tableName: 'eods_for_closers',
    columns: [
      { name: 'student_name', type: 'text', required: true, description: '學生姓名' },
      { name: 'student_email', type: 'text', required: true, description: '學生 Email（JOIN key）' },
      { name: 'closer_name', type: 'text', required: true, description: '諮詢師姓名' },
      { name: 'deal_date', type: 'date', required: false, description: '成交日期' },
      { name: 'consultation_date', type: 'date', required: false, description: '諮詢日期' },
      { name: 'form_submitted_at', type: 'timestamptz', required: false, description: 'Google Form 提交時間' },
      { name: 'notes', type: 'text', required: false, description: '備註' },
      { name: 'caller_name', type: 'text', required: false, description: '電訪人員姓名' },
      { name: 'is_online', type: 'boolean', required: false, description: '是否為線上諮詢' },
      { name: 'lead_source', type: 'text', required: false, description: '潛在客戶來源' },
      { name: 'consultation_result', type: 'text', required: false, description: '諮詢結果' },
      { name: 'deal_package', type: 'text', required: false, description: '成交的方案名稱' },
      { name: 'package_quantity', type: 'integer', required: false, description: '購買方案數量' },
      { name: 'payment_method', type: 'text', required: false, description: '付款方式' },
      { name: 'installment_periods', type: 'integer', required: false, description: '分期期數' },
      { name: 'package_price', type: 'integer', required: false, description: '方案原價' },
      { name: 'actual_amount', type: 'integer', required: false, description: '實際成交金額' },
      { name: 'month', type: 'integer', required: false, description: '成交月份' },
      { name: 'year', type: 'integer', required: false, description: '成交年份' },
      { name: 'week_number', type: 'integer', required: false, description: '成交週數' },
    ],
  },
};
