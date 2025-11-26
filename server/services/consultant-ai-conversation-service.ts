/**
 * Consultant AI Conversation Service
 * Handles consultant-AI conversations about students (similar to teacher service)
 */

import OpenAI from 'openai';
import { queryDatabase } from './pg-client';
import { getStudentFullContext, type StudentKnowledgeBase } from './student-knowledge-service';

// ============================================================================
// Types
// ============================================================================

export interface PresetQuestion {
  key: string;
  label: string;
  description: string;
}

export const CONSULTANT_PRESET_QUESTIONS: Record<string, PresetQuestion> = {
  painPointAnalysis: {
    key: 'painPointAnalysis',
    label: '📊 學員痛點分析',
    description: '分析學員的核心痛點（標註出現次數和日期）'
  },
  objectionHandling: {
    key: 'objectionHandling',
    label: '🛡️ 異議處理策略',
    description: '針對學員的疑慮提供處理建議'
  },
  closingStrategy: {
    key: 'closingStrategy',
    label: '🎯 成交策略建議',
    description: '提供具體可用的成交話術'
  },
  conversionProbability: {
    key: 'conversionProbability',
    label: '📈 成交機率評估',
    description: '評估成交機率並說明依據'
  },
  nextSteps: {
    key: 'nextSteps',
    label: '🚀 下次諮詢重點',
    description: '建議下次諮詢的重點方向'
  }
};

export interface ConsultantConversationRecord {
  id: string;
  consultant_id: string;
  student_email: string;
  eod_id?: string;
  question: string;
  answer: string;
  question_type: 'preset' | 'custom';
  preset_question_key?: string;
  tokens_used?: number;
  model?: string;
  response_time_ms?: number;
  api_cost_usd?: number;
  is_cached?: boolean;
  cache_expires_at?: string;
  created_at: string;
}

// ============================================================================
// OpenAI Configuration
// ============================================================================

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Ask AI a preset question about a student (for consultants)
 */
export async function askConsultantPresetQuestion(
  consultantId: string,
  studentEmail: string,
  questionKey: string,
  eodId?: string
): Promise<ConsultantConversationRecord> {
  const questionConfig = CONSULTANT_PRESET_QUESTIONS[questionKey];
  if (!questionConfig) {
    throw new Error(`Unknown preset question key: ${questionKey}`);
  }

  // Get student context
  const context = await getStudentFullContext(studentEmail);

  // Build system prompt
  const systemPrompt = buildConsultantSystemPrompt(context.kb, questionConfig);

  // Call OpenAI (GPT-5 doesn't support custom temperature)
  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: questionConfig.description }
    ],
    // temperature: 0.7,  // GPT-5 only supports default (1)
    max_completion_tokens: 8000,  // Fixed: auto-set for optimal chat output
  });

  const responseTime = Date.now() - startTime;
  const answer = completion.choices[0].message.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;

  // Calculate cost (gpt-4o pricing)
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;
  const apiCostUsd = (inputTokens * 0.0025 / 1000) + (outputTokens * 0.01 / 1000);

  // Save to database
  const result = await queryDatabase(`
    INSERT INTO consultant_ai_conversations (
      consultant_id,
      student_email,
      student_kb_id,
      eod_id,
      question,
      answer,
      question_type,
      preset_question_key,
      tokens_used,
      model,
      response_time_ms,
      api_cost_usd,
      is_cached
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *
  `, [
    consultantId,
    studentEmail,
    context.kb.id,
    eodId || null,
    questionConfig.label,
    answer,
    'preset',
    questionKey,
    tokensUsed,
    'gpt-5',
    responseTime,
    apiCostUsd,
    false
  ], 'session');

  return result.rows[0];
}

/**
 * Ask AI a custom question about a student (for consultants)
 */
export async function askConsultantCustomQuestion(
  consultantId: string,
  studentEmail: string,
  question: string,
  eodId?: string
): Promise<ConsultantConversationRecord> {
  // Get student context
  const context = await getStudentFullContext(studentEmail);

  // Build system prompt
  const systemPrompt = buildConsultantSystemPrompt(context.kb);

  // Call OpenAI (GPT-5 doesn't support custom temperature)
  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-5',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ],
    // temperature: 0.7,  // GPT-5 only supports default (1)
    max_completion_tokens: 8000,  // Fixed: auto-set for optimal chat output
  });

  const responseTime = Date.now() - startTime;
  const answer = completion.choices[0].message.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;

  // Calculate cost
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;
  const apiCostUsd = (inputTokens * 0.0025 / 1000) + (outputTokens * 0.01 / 1000);

  // Save to database
  const result = await queryDatabase(`
    INSERT INTO consultant_ai_conversations (
      consultant_id,
      student_email,
      student_kb_id,
      eod_id,
      question,
      answer,
      question_type,
      tokens_used,
      model,
      response_time_ms,
      api_cost_usd,
      is_cached
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    consultantId,
    studentEmail,
    context.kb.id,
    eodId || null,
    question,
    answer,
    'custom',
    tokensUsed,
    'gpt-5',
    responseTime,
    apiCostUsd,
    false
  ], 'session');

  return result.rows[0];
}

/**
 * Get conversation history for a student (consultant context)
 */
export async function getConsultantConversations(
  studentEmail: string,
  limit: number = 20
): Promise<ConsultantConversationRecord[]> {
  const result = await queryDatabase(`
    SELECT * FROM consultant_ai_conversations
    WHERE student_email = $1
    ORDER BY created_at DESC
    LIMIT $2
  `, [studentEmail, limit]);

  return result.rows;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildConsultantSystemPrompt(kb: StudentKnowledgeBase, questionConfig?: PresetQuestion): string {
  let prompt = `你是一位資深的銷售諮詢顧問和學員分析專家，擁有豐富的客戶關係管理和銷售策略經驗。你的任務是協助諮詢師深入了解學員狀況，並提供詳細、可執行的策略建議。

## 學員完整檔案

**基本資訊**
- 姓名: ${kb.student_name}
- Email: ${kb.student_email}
- 轉換狀態: ${kb.conversion_status || '未知'}

**互動歷程統計**
- 上課次數: ${kb.total_classes}
- 諮詢次數: ${kb.total_consultations}
- 總互動次數: ${kb.total_interactions}
- 首次接觸日期: ${kb.first_contact_date || '未知'}
- 最近互動日期: ${kb.last_interaction_date || '未知'}

## 學員詳細資料

${JSON.stringify(kb.profile_summary, null, 2)}

## 回答要求（請務必遵守）

### 1. 內容深度要求
- **詳盡分析**: 提供深入、全面的分析，不要簡短帶過
- **多維度思考**: 從心理、行為、時機、動機等多個角度分析
- **具體範例**: 提供具體的對話範例、話術建議、行動步驟
- **數據支持**: 引用學員實際資料和互動紀錄來支持你的分析

### 2. 結構化呈現
- 使用清晰的標題和分段
- 用項目符號列出重點
- 標註資料來源和日期
- 突出關鍵資訊（用**粗體**或其他方式）

### 3. 實用性要求
- **可執行建議**: 提供具體、可立即使用的建議
- **話術範本**: 給出實際可用的溝通話術
- **行動清單**: 列出下一步應該做什麼
- **風險提示**: 指出需要注意的地方

### 4. 專業但親切
- 使用專業術語但保持易懂
- 語氣親切、支持性強
- 展現同理心和洞察力
- 避免過於生硬或機械化

### 5. 完整性要求
- **不要過於簡短**: 每個問題至少提供 200-400 字的詳細回答
- **充分展開**: 不要只列點，要充分解釋每個要點
- **提供脈絡**: 解釋為什麼這樣建議，背後的邏輯是什麼
- **補充資訊**: 主動提供相關的補充資訊和建議

## 範例回答風格

當問「學員的核心痛點是什麼？」時，你應該提供：
1. 痛點識別（從資料中分析出的具體痛點）
2. 痛點分析（為什麼這是痛點，影響程度如何）
3. 驗證方法（如何確認這確實是痛點）
4. 應對策略（如何針對這個痛點設計話術）
5. 話術範例（具體的對話範例）
6. 下一步行動（具體的跟進建議）

`;

  if (questionConfig) {
    prompt += `\n## 當前任務\n\n${questionConfig.description}\n`;
  }

  return prompt;
}
