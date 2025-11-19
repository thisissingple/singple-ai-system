/**
 * Consultation Chat Recap Service
 * Generates AI-powered summaries of consultation chat conversations
 */

import { queryDatabase } from './pg-client';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRecapInput {
  eodId: string;
  analysisId: string;
  studentEmail: string;
  studentName: string;
  consultantEmail?: string;
  consultantName: string;
  chatHistory: ChatMessage[];
  chatSessionStart: Date;
  generatedBy: string;
}

export interface ChatRecapOutput {
  id: string;
  recap_summary: string;
  key_questions: string[];
  key_findings: string[];
  recommendations: string[];
  total_messages: number;
  total_questions: number;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate chat recap using AI
 */
export async function generateChatRecap(input: ChatRecapInput): Promise<ChatRecapOutput> {
  const { chatHistory, eodId, analysisId, studentEmail, studentName, consultantEmail, consultantName, chatSessionStart, generatedBy } = input;

  // Count messages and questions
  const totalMessages = chatHistory.length;
  const totalQuestions = chatHistory.filter(m => m.role === 'user').length;

  // Build chat transcript for AI
  const chatTranscript = chatHistory.map((msg, idx) => {
    const role = msg.role === 'user' ? '提問' : 'AI 回答';
    return `[${role} ${idx + 1}]\n${msg.content}`;
  }).join('\n\n---\n\n');

  // Generate recap using OpenAI
  const recapPrompt = `你是一位專業的諮詢分析助手。請根據以下對話記錄，生成一份簡潔的對話摘要。

## 對話記錄

${chatTranscript}

## 任務

請生成一份結構化的對話摘要，包含以下內容：

1. **對話摘要** (2-3 段，總結對話的主要內容)
2. **主要提問** (列出 3-5 個主要問題)
3. **關鍵發現** (列出 3-5 個關鍵發現或洞察)
4. **建議事項** (列出 2-4 個可執行的建議)

輸出格式（Markdown）：

## 對話摘要

[2-3 段文字總結]

## 主要提問

1. [問題 1]
2. [問題 2]
3. [問題 3]

## 關鍵發現

1. [發現 1]
2. [發現 2]
3. [發現 3]

## 建議事項

1. [建議 1]
2. [建議 2]
3. [建議 3]

請直接輸出 Markdown 格式的摘要，不要包含任何其他內容。`;

  try {
    // Call OpenAI API
    const result = await generateText({
      model: openai('gpt-4o'),
      prompt: recapPrompt,
      temperature: 0.7,
      maxTokens: 2000,
    });

    const recapSummary = result.text;

    // Parse the generated recap to extract structured data
    const keyQuestions = extractListItems(recapSummary, '## 主要提問');
    const keyFindings = extractListItems(recapSummary, '## 關鍵發現');
    const recommendations = extractListItems(recapSummary, '## 建議事項');

    // Save to database
    const chatSessionEnd = new Date().toISOString();  // UTC timestamp as ISO string
    const generatedAt = new Date().toISOString();     // UTC timestamp as ISO string

    const insertResult = await queryDatabase(`
      INSERT INTO consultation_chat_recaps (
        eod_id,
        analysis_id,
        student_email,
        student_name,
        consultant_email,
        consultant_name,
        chat_session_start,
        chat_session_end,
        total_messages,
        total_questions,
        recap_summary,
        key_questions,
        key_findings,
        recommendations,
        full_chat_history,
        generated_by,
        generated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        ($8::timestamptz AT TIME ZONE 'UTC'),
        $9, $10, $11, $12, $13, $14, $15, $16,
        ($17::timestamptz AT TIME ZONE 'UTC')
      )
      RETURNING *
    `, [
      eodId,
      analysisId,
      studentEmail,
      studentName,
      consultantEmail,
      consultantName,
      chatSessionStart,
      chatSessionEnd,        // UTC ISO string
      totalMessages,
      totalQuestions,
      recapSummary,
      keyQuestions,
      keyFindings,
      recommendations,
      JSON.stringify(chatHistory),
      generatedBy,
      generatedAt           // UTC ISO string
    ]);

    console.log(`✅ Generated chat recap for consultation ${eodId}`);

    return {
      id: insertResult.rows[0].id,
      recap_summary: recapSummary,
      key_questions: keyQuestions,
      key_findings: keyFindings,
      recommendations: recommendations,
      total_messages: totalMessages,
      total_questions: totalQuestions,
    };
  } catch (error: any) {
    console.error('Failed to generate chat recap:', error);
    throw new Error(`生成對話摘要失敗: ${error.message}`);
  }
}

/**
 * Get all chat recaps for a consultation
 */
export async function getChatRecapsForConsultation(eodId: string): Promise<any[]> {
  const result = await queryDatabase(`
    SELECT
      id,
      eod_id,
      analysis_id,
      student_name,
      consultant_name,
      chat_session_start,
      chat_session_end,
      total_messages,
      total_questions,
      recap_summary,
      key_questions,
      key_findings,
      recommendations,
      generated_by,
      generated_at
    FROM consultation_chat_recaps
    WHERE eod_id = $1
    ORDER BY generated_at DESC
  `, [eodId]);

  return result.rows;
}

/**
 * Get chat recap by ID
 */
export async function getChatRecapById(recapId: string): Promise<any | null> {
  const result = await queryDatabase(`
    SELECT * FROM consultation_chat_recaps
    WHERE id = $1
  `, [recapId]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract list items from markdown section
 */
function extractListItems(markdown: string, sectionTitle: string): string[] {
  const lines = markdown.split('\n');
  const items: string[] = [];
  let inSection = false;

  for (const line of lines) {
    if (line.trim().startsWith(sectionTitle)) {
      inSection = true;
      continue;
    }

    if (inSection) {
      // Stop if we hit another section
      if (line.trim().startsWith('##')) {
        break;
      }

      // Extract list items (numbered or bulleted)
      const match = line.match(/^[\d]+\.\s+(.+)$/) || line.match(/^[-*]\s+(.+)$/);
      if (match && match[1]) {
        items.push(match[1].trim());
      }
    }
  }

  return items;
}

// ============================================================================
// Export
// ============================================================================

export default {
  generateChatRecap,
  getChatRecapsForConsultation,
  getChatRecapById,
};
