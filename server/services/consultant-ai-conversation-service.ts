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

  // Call OpenAI
  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: questionConfig.description }
    ],
    temperature: 0.7,
    max_tokens: 2000,
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
    'gpt-4o',
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

  // Call OpenAI
  const startTime = Date.now();
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question }
    ],
    temperature: 0.7,
    max_tokens: 2000,
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
    'gpt-4o',
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
  let prompt = `你是一位專業的銷售諮詢顧問，正在協助諮詢師了解學員資訊。

## 學員檔案

**姓名**: ${kb.student_name}
**Email**: ${kb.student_email}
**轉換狀態**: ${kb.conversion_status || '未知'}
**上課次數**: ${kb.total_classes}
**諮詢次數**: ${kb.total_consultations}
**總互動**: ${kb.total_interactions}
**首次接觸**: ${kb.first_contact_date || '未知'}
**最近互動**: ${kb.last_interaction_date || '未知'}

## 學員摘要

${JSON.stringify(kb.profile_summary, null, 2)}

## 回答指南

1. 提供具體、可執行的建議
2. 基於學員實際資料分析
3. 使用專業但親切的語氣
4. 標註資料來源和日期
5. 突出重要資訊

`;

  if (questionConfig) {
    prompt += `\n## 當前任務\n\n${questionConfig.description}\n`;
  }

  return prompt;
}
