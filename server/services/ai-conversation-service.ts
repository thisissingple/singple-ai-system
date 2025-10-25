/**
 * AI Conversation Service
 * Handles teacher-AI conversations about students
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

export const PRESET_QUESTIONS: Record<string, PresetQuestion> = {
  painPointAnalysis: {
    key: 'painPointAnalysis',
    label: '📊 學員痛點分析',
    description: '分析學員的核心痛點（標註出現次數和日期）'
  },
  conversionStrategy: {
    key: 'conversionStrategy',
    label: '🎯 推課話術建議',
    description: '提供具體可用的推課話術（3-5 個）'
  },
  conversionProbability: {
    key: 'conversionProbability',
    label: '📈 成交機率評估',
    description: '評估成交機率並說明依據'
  },
  executionEvaluation: {
    key: 'executionEvaluation',
    label: '✅ 上次建議執行情況',
    description: '評估上次建議是否執行及效果'
  },
  nextSteps: {
    key: 'nextSteps',
    label: '🚀 下次重點方向',
    description: '建議下次課程的重點方向'
  }
};

export interface ConversationRecord {
  id: string;
  teacher_id: string;
  student_email: string;
  student_kb_id: string | null;
  analysis_id: string | null;
  question: string;
  answer: string;
  question_type: 'preset' | 'custom';
  preset_question_key: string | null;
  tokens_used: number;
  model: string;
  response_time_ms: number;
  api_cost_usd: number;
  is_cached: boolean;
  cache_expires_at: string | null;
  created_at: string;
}

// ============================================================================
// OpenAI Client
// ============================================================================

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Ask AI a preset question about a student
 */
export async function askPresetQuestion(
  teacherId: string,
  studentEmail: string,
  presetKey: string
): Promise<{
  answer: string;
  isCached: boolean;
  tokensUsed: number;
  conversationId: string;
}> {
  const preset = PRESET_QUESTIONS[presetKey];
  if (!preset) {
    throw new Error(`Invalid preset question key: ${presetKey}`);
  }

  // Check if answer is already pre-generated
  const kb = await queryDatabase(`
    SELECT * FROM student_knowledge_base WHERE student_email = $1
  `, [studentEmail]);

  if (kb.rows.length > 0) {
    const insights = kb.rows[0].ai_pregenerated_insights;
    if (insights && insights[presetKey] && insights.generatedAt) {
      const generatedAt = new Date(insights.generatedAt);
      const now = new Date();
      const hoursSinceGenerated = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60);

      // Use cached answer if less than 24 hours old
      if (hoursSinceGenerated < 24) {
        // Save to conversation history
        const convResult = await queryDatabase(`
          INSERT INTO teacher_ai_conversations (
            teacher_id,
            student_email,
            student_kb_id,
            question,
            answer,
            question_type,
            preset_question_key,
            tokens_used,
            is_cached,
            cache_expires_at
          ) VALUES ($1, $2, $3, $4, $5, 'preset', $6, 0, true, NOW() + INTERVAL '24 hours')
          RETURNING id
        `, [
          teacherId,
          studentEmail,
          kb.rows[0].id,
          preset.label,
          insights[presetKey],
          presetKey
        ]);

        return {
          answer: insights[presetKey],
          isCached: true,
          tokensUsed: 0,
          conversationId: convResult.rows[0].id
        };
      }
    }
  }

  // No cached answer, generate new one
  return await askCustomQuestion(teacherId, studentEmail, preset.description, presetKey);
}

/**
 * Ask AI a custom question about a student
 */
export async function askCustomQuestion(
  teacherId: string,
  studentEmail: string,
  question: string,
  presetKey?: string
): Promise<{
  answer: string;
  isCached: boolean;
  tokensUsed: number;
  conversationId: string;
}> {
  const startTime = Date.now();

  // Get student full context
  const context = await getStudentFullContext(studentEmail);

  // Build context summary for AI
  const contextSummary = buildStudentContextSummary(context);

  // Call OpenAI
  const client = getOpenAIClient();
  const prompt = buildCustomQuestionPrompt(contextSummary, question);

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CUSTOM_QUESTION_SYSTEM_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const answer = completion.choices[0].message.content || '';
  const tokensUsed = completion.usage?.total_tokens || 0;
  const responseTime = Date.now() - startTime;

  // Calculate cost (GPT-4o pricing: $0.005/1K input, $0.015/1K output)
  const inputTokens = completion.usage?.prompt_tokens || 0;
  const outputTokens = completion.usage?.completion_tokens || 0;
  const apiCost = (inputTokens / 1000) * 0.005 + (outputTokens / 1000) * 0.015;

  // Save conversation
  const convResult = await queryDatabase(`
    INSERT INTO teacher_ai_conversations (
      teacher_id,
      student_email,
      student_kb_id,
      question,
      answer,
      question_type,
      preset_question_key,
      tokens_used,
      model,
      response_time_ms,
      api_cost_usd,
      is_cached
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'gpt-4o', $9, $10, false)
    RETURNING id
  `, [
    teacherId,
    studentEmail,
    context.kb.id,
    question,
    answer,
    presetKey ? 'preset' : 'custom',
    presetKey || null,
    tokensUsed,
    responseTime,
    apiCost
  ]);

  return {
    answer,
    isCached: false,
    tokensUsed,
    conversationId: convResult.rows[0].id
  };
}

/**
 * Generate preset answers for common questions
 * Called after each teaching quality analysis
 */
export async function generatePresetAnswers(
  studentEmail: string,
  analysisId: string
): Promise<void> {
  const context = await getStudentFullContext(studentEmail);
  const contextSummary = buildStudentContextSummary(context);

  const client = getOpenAIClient();

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: PRESET_INSIGHTS_GENERATION_PROMPT },
      { role: 'user', content: buildPresetGenerationPrompt(contextSummary) }
    ],
    temperature: 0.7,
    max_tokens: 3000
  });

  const content = completion.choices[0].message.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Parse JSON response
  const insights = JSON.parse(content);
  insights.generatedAt = new Date().toISOString();

  // Update student KB
  await queryDatabase(`
    UPDATE student_knowledge_base
    SET ai_pregenerated_insights = $1,
        updated_at = NOW()
    WHERE student_email = $2
  `, [JSON.stringify(insights), studentEmail]);
}

/**
 * Get conversation history for a student
 */
export async function getConversationHistory(
  teacherId: string,
  studentEmail: string,
  limit: number = 20
): Promise<ConversationRecord[]> {
  const result = await queryDatabase(`
    SELECT * FROM teacher_ai_conversations
    WHERE teacher_id = $1 AND student_email = $2
    ORDER BY created_at DESC
    LIMIT $3
  `, [teacherId, studentEmail, limit]);

  return result.rows;
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildStudentContextSummary(context: {
  kb: StudentKnowledgeBase;
  trialClasses: any[];
  eodsRecords: any[];
  aiAnalyses: any[];
  purchases: any[];
}): string {
  const { kb, trialClasses, eodsRecords, aiAnalyses, purchases } = context;

  let summary = `# 學員檔案：${kb.student_name} (${kb.student_email})\n\n`;

  // Basic stats
  summary += `## 基本統計\n`;
  summary += `- 總上課次數：${kb.total_classes} 堂\n`;
  summary += `- 總諮詢次數：${kb.total_consultations} 次\n`;
  summary += `- 首次接觸：${kb.first_contact_date || '未知'}\n`;
  summary += `- 最後互動：${kb.last_interaction_date || '未知'}\n`;
  summary += `- 成交狀態：${kb.conversion_status || '未知'}\n\n`;

  // Profile summary
  if (kb.profile_summary) {
    summary += `## 累積資訊\n`;

    if (kb.profile_summary.basicInfo && Object.keys(kb.profile_summary.basicInfo).length > 0) {
      summary += `### 基本資料\n${JSON.stringify(kb.profile_summary.basicInfo, null, 2)}\n\n`;
    }

    if (kb.profile_summary.painPoints && kb.profile_summary.painPoints.length > 0) {
      summary += `### 痛點\n`;
      kb.profile_summary.painPoints.forEach((p: any) => {
        summary += `- ${p.point} (出現 ${p.occurrences} 次)\n`;
      });
      summary += `\n`;
    }

    if (kb.profile_summary.goals && Object.keys(kb.profile_summary.goals).length > 0) {
      summary += `### 目標與動機\n${JSON.stringify(kb.profile_summary.goals, null, 2)}\n\n`;
    }
  }

  // Recent classes (last 3) with transcripts
  if (trialClasses.length > 0) {
    summary += `## 最近上課記錄（最近 3 堂）\n`;
    trialClasses.slice(-3).forEach((c: any, index: number) => {
      summary += `\n### 第 ${trialClasses.length - 2 + index} 堂課\n`;
      summary += `- 日期：${c.class_date}\n`;
      summary += `- 老師：${c.teacher_name}\n`;
      summary += `- 狀態：${c.no_conversion_reason || '進行中'}\n`;

      // Include class transcript if available (truncate to 3000 chars to save tokens)
      if (c.class_transcript) {
        const transcript = c.class_transcript.length > 3000
          ? c.class_transcript.substring(0, 3000) + '\n... (對話太長，已截斷)'
          : c.class_transcript;
        summary += `\n**課堂對話記錄：**\n\`\`\`\n${transcript}\n\`\`\`\n`;
      }
    });
    summary += `\n`;
  }

  // Recent EODS (last 2)
  if (eodsRecords.length > 0) {
    summary += `## 最近諮詢記錄（最近 2 次）\n`;
    eodsRecords.slice(-2).forEach((e: any) => {
      summary += `- ${e.諮詢日期 || e.成交日期}：${e.closer_name}（${e.consultation_result || e.諮詢結果}）\n`;
    });
    summary += `\n`;
  }

  // Purchases
  if (purchases.length > 0) {
    summary += `## 購課記錄\n`;
    purchases.forEach((p: any) => {
      summary += `- ${p.purchase_date}：${p.package_name}（${p.current_status}）\n`;
    });
    summary += `\n`;
  }

  return summary;
}

function buildCustomQuestionPrompt(contextSummary: string, question: string): string {
  return `${contextSummary}

---

老師的問題：${question}

請基於學員的完整檔案，回答老師的問題。要求：
- 具體、可執行
- 引用具體證據（日期、對話片段）
- 如果需要更多資訊，說明缺少什麼
- 使用 Markdown 格式（可包含列表、粗體等）
`;
}

function buildPresetGenerationPrompt(contextSummary: string): string {
  return `${contextSummary}

---

請針對以下 5 個常見問題生成答案（JSON 格式）：

{
  "painPointAnalysis": "學員的核心痛點分析（2-3 個主要痛點，標註出現次數和日期）",
  "conversionStrategy": "推薦的推課話術建議（3-5 個具體話術，可直接使用）",
  "conversionProbability": "成交機率評估（百分比 + 評估依據）",
  "executionEvaluation": "上次建議執行情況（如果有上次分析的話）",
  "nextSteps": "下次課程的重點方向（2-3 個具體建議）"
}

輸出格式：嚴格遵守 JSON 格式。
`;
}

// ============================================================================
// System Prompts
// ============================================================================

const CUSTOM_QUESTION_SYSTEM_PROMPT = `你是專精學員分析的策略助手。

你的任務是基於學員的完整檔案（包含上課記錄、諮詢記錄、AI 分析記錄、購課記錄），回答老師關於學員的問題。

重要提醒：
- 學員檔案中的「課堂對話記錄」包含完整的師生對話內容，請仔細閱讀並從中提取關鍵資訊
- 如果有課堂對話記錄，代表學員**已經上過課**，不要建議聯絡學員開始上課
- 老師問什麼就回答什麼，不要提供額外建議

回答要求：
1. **聚焦問題**：老師問痛點就只分析痛點，問策略就只給策略
2. **引用證據**：從課堂對話中引用具體片段（包含時間戳）
3. **具體可執行**：提供可直接使用的話術或做法
4. 使用 Markdown 格式（列表、粗體、引用）
5. 如果資訊確實不足，才說明缺少什麼

回答長度：200-500 字`;

const PRESET_INSIGHTS_GENERATION_PROMPT = `你是專精學員分析的策略教練。

我會提供你一個學員的完整檔案（包含所有上課記錄、諮詢記錄、AI 分析記錄），請針對 5 個常見問題生成答案。

生成要求：
1. painPointAnalysis：列出 2-3 個核心痛點，標註出現次數、首次和最後提及日期
2. conversionStrategy：提供 3-5 個具體可用的推課話術，包含使用時機
3. conversionProbability：評估成交機率（0-100%），並列出 2-3 個評估依據
4. executionEvaluation：如果有上次分析，評估建議執行情況；如果沒有，說明「首次分析」
5. nextSteps：建議下次課程的 2-3 個重點方向

輸出格式：嚴格遵守 JSON 格式，不要加任何其他文字。`;
