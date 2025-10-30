/**
 * Know-it-all Chat Service
 *
 * Purpose: Core conversation engine with RAG (Retrieval-Augmented Generation)
 * Features: GPT-5 integration, context retrieval, conversation history
 * Created: 2025-10-30
 */

import OpenAI from 'openai';
import { queryDatabase, insertAndReturn } from '../pg-client.js';
import { searchDocuments } from './knowledge-document-service.js';
import { analyzeQuery } from './query-analyzer-service.js';
import type {
  ConversationMessage,
  ConversationMetadata,
  CreateConversationInput,
  SendMessageInput,
  SendMessageOutput,
  AIResponse,
  AIContextInput,
  MessageRole,
} from './types.js';
import { KnowItAllError } from './types.js';

// =============================================
// Configuration
// =============================================

// GPT-5 Model (fallback to GPT-4 Turbo if not available)
const AI_MODEL = process.env.KNOW_IT_ALL_MODEL || 'gpt-4-turbo-preview';

// Cost per 1M tokens (USD) - OpenAI Pricing (2025)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-5': { input: 2.00, output: 6.00 },
  'gpt-5-mini': { input: 0.40, output: 1.20 },
  'gpt-5-nano': { input: 0.10, output: 0.30 },
  'o1': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },
  'o3': { input: 10.00, output: 40.00 },
  'o4-mini': { input: 2.00, output: 8.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4-turbo-preview': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
};

// Fallback pricing (GPT-4 Turbo)
const DEFAULT_PRICING = { input: 10.00, output: 30.00 };

// Context limits
const MAX_CONTEXT_TOKENS = 4000; // Reserve tokens for context
const MAX_RESPONSE_TOKENS = 2000; // Max tokens for response

// Initialize OpenAI client
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new KnowItAllError(
        'OpenAI API key not configured',
        'OPENAI_API_KEY_MISSING',
        500
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

// =============================================
// System Prompt
// =============================================

const SYSTEM_PROMPT = `你是 Know-it-all，一個專業的 AI 商業顧問助手。

你的角色：
- 專業、友善、準確
- 基於提供的知識庫文件回答問題
- 如果知識庫中沒有相關資訊，誠實告知並提供一般性建議
- 主動引用知識庫中的具體內容以支持你的回答
- 以繁體中文回答（除非使用者要求其他語言）

回答格式：
1. 直接回答問題
2. 如果有相關知識文件，引用關鍵內容
3. 提供具體可行的建議
4. 必要時詢問澄清問題

記住：
- 保持專業但不失親切
- 避免過度正式的用語
- 主動思考使用者的實際需求
- 如果不確定，誠實說明並請求更多資訊`;

// =============================================
// Helper Functions
// =============================================

/**
 * Convert test user ID to valid UUID for SKIP_AUTH mode
 */
function ensureValidUserId(userId: string): string {
  if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
    return '00000000-0000-0000-0000-000000000000';
  }
  return userId;
}

// =============================================
// Conversation Management
// =============================================

/**
 * Create a new conversation
 */
export async function createConversation(
  input: CreateConversationInput
): Promise<ConversationMetadata> {
  try {
    const validUserId = ensureValidUserId(input.userId);
    console.log(`[Chat] Creating conversation for user ${validUserId}`);

    const conversationId = crypto.randomUUID();

    // 使用正確的表名：know_it_all_conversation_metadata (對話元數據)
    const result = await queryDatabase(
      `INSERT INTO know_it_all_conversation_metadata (
        conversation_id, user_id, title, message_count,
        total_tokens_used, total_cost, is_archived,
        created_at, updated_at
      ) VALUES ($1, $2, $3, 0, 0, 0, FALSE, NOW(), NOW())
      RETURNING *`,
      [conversationId, validUserId, input.title || '新對話'],
      'session' // 使用 session mode 進行寫入操作
    );

    console.log(`[Chat] ✅ Created conversation ${conversationId}`);

    return mapDatabaseRowToMetadata(result.rows[0]);
  } catch (error: any) {
    console.error('[Chat] Error creating conversation:', error);
    throw new KnowItAllError(
      'Failed to create conversation',
      'CONVERSATION_CREATE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Get conversation metadata
 */
export async function getConversationMetadata(
  conversationId: string,
  userId: string
): Promise<ConversationMetadata | null> {
  try {
    const validUserId = ensureValidUserId(userId);
    const result = await queryDatabase(
      `SELECT * FROM know_it_all_conversation_metadata
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, validUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapDatabaseRowToMetadata(result.rows[0]);
  } catch (error: any) {
    console.error('[Chat] Error getting conversation metadata:', error);
    throw new KnowItAllError(
      'Failed to get conversation metadata',
      'CONVERSATION_GET_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * List conversations for a user
 */
export async function listConversations(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    includeArchived?: boolean;
  }
): Promise<{ conversations: ConversationMetadata[]; total: number }> {
  try {
    const validUserId = ensureValidUserId(userId);
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const includeArchived = options?.includeArchived || false;

    // In SKIP_AUTH mode, don't filter by user
    let whereClause = '';
    let params: any[] = [];
    let paramIndex = 1;

    if (process.env.SKIP_AUTH !== 'true') {
      whereClause = 'WHERE user_id = $1';
      params.push(validUserId);
      paramIndex = 2;
    }

    if (!includeArchived) {
      const connector = whereClause ? ' AND' : 'WHERE';
      whereClause += `${connector} is_archived = FALSE`;
    }

    // Get total count
    const countResult = await queryDatabase(
      `SELECT COUNT(*) as total FROM know_it_all_conversation_metadata ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get conversations
    const result = await queryDatabase(
      `SELECT * FROM know_it_all_conversation_metadata ${whereClause}
       ORDER BY last_message_at DESC NULLS LAST, created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const conversations = result.rows.map(mapDatabaseRowToMetadata);

    return { conversations, total };
  } catch (error: any) {
    console.error('[Chat] Error listing conversations:', error);
    throw new KnowItAllError(
      'Failed to list conversations',
      'CONVERSATION_LIST_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Get conversation history (messages)
 */
export async function getConversationHistory(
  conversationId: string,
  userId: string,
  limit: number = 50
): Promise<ConversationMessage[]> {
  try {
    const validUserId = ensureValidUserId(userId);
    const result = await queryDatabase(
      `SELECT * FROM know_it_all_conversations
       WHERE conversation_id = $1 AND user_id = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [conversationId, validUserId, limit]
    );

    return result.rows.map(mapDatabaseRowToMessage);
  } catch (error: any) {
    console.error('[Chat] Error getting conversation history:', error);
    throw new KnowItAllError(
      'Failed to get conversation history',
      'CONVERSATION_HISTORY_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    const validUserId = ensureValidUserId(userId);
    console.log(`[Chat] Deleting conversation ${conversationId}`);

    // Delete messages first (due to foreign key)
    await queryDatabase(
      `DELETE FROM know_it_all_conversations
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, validUserId]
    );

    // Delete metadata
    const result = await queryDatabase(
      `DELETE FROM know_it_all_conversation_metadata
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, validUserId]
    );

    const deleted = result.rowCount > 0;

    if (deleted) {
      console.log(`[Chat] ✅ Deleted conversation ${conversationId}`);
    }

    return deleted;
  } catch (error: any) {
    console.error('[Chat] Error deleting conversation:', error);
    throw new KnowItAllError(
      'Failed to delete conversation',
      'CONVERSATION_DELETE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Message Sending & AI Response
// =============================================

/**
 * Send a message and get AI response
 */
export async function sendMessage(input: SendMessageInput): Promise<SendMessageOutput> {
  try {
    console.log(`[Chat] Processing message in conversation ${input.conversationId}`);

    // 1. Verify conversation exists and belongs to user
    const metadata = await getConversationMetadata(input.conversationId, input.userId);
    if (!metadata) {
      throw new KnowItAllError(
        'Conversation not found',
        'CONVERSATION_NOT_FOUND',
        404
      );
    }

    // 2. Get conversation history
    const history = await getConversationHistory(input.conversationId, input.userId, 10);

    // 3. Retrieve relevant knowledge documents (if requested)
    let knowledgeDocs: any[] = [];
    if (input.retrieveKnowledge !== false) {
      try {
        knowledgeDocs = await searchDocuments({
          query: input.content,
          userId: input.userId,
          matchThreshold: 0.75,
          matchCount: input.knowledgeMatchCount || 5,
        });
        console.log(`[Chat] Retrieved ${knowledgeDocs.length} relevant knowledge documents`);
      } catch (error) {
        console.warn('[Chat] Failed to retrieve knowledge documents:', error);
        // Continue without knowledge docs
      }
    }

    // 4. Determine model to use (smart mode or user selection)
    let modelToUse = input.model || AI_MODEL;
    let queryAnalysis = null;

    // If smart mode is enabled (model = 'smart'), analyze query and choose model
    if (input.model === 'smart' || input.useSmartMode === true) {
      queryAnalysis = analyzeQuery(input.content);
      modelToUse = queryAnalysis.recommendedModel;
      console.log(`[Chat] 🧠 Smart Mode: ${queryAnalysis.complexity} query (score: ${queryAnalysis.score}) → ${modelToUse}`);
      console.log(`[Chat] 💡 Reasoning: ${queryAnalysis.reasoning}`);
    }

    // 5. Save user message
    const userMessage = await saveMessage({
      conversationId: input.conversationId,
      role: 'user',
      content: input.content,
      userId: input.userId,
    });

    // 6. Generate AI response
    const aiResponse = await generateAIResponse({
      userQuery: input.content,
      conversationHistory: history,
      knowledgeDocuments: knowledgeDocs,
      model: modelToUse,
    });

    // 6. Save assistant message
    const assistantMessage = await saveMessage({
      conversationId: input.conversationId,
      role: 'assistant',
      content: aiResponse.content,
      userId: input.userId,
      modelUsed: aiResponse.model,
      promptTokens: aiResponse.promptTokens,
      completionTokens: aiResponse.completionTokens,
      totalTokens: aiResponse.totalTokens,
      estimatedCost: aiResponse.estimatedCost,
      knowledgeDocsUsed: knowledgeDocs.map(doc => doc.id),
    });

    // 7. Update conversation metadata
    await updateConversationMetadata(
      input.conversationId,
      aiResponse.totalTokens,
      aiResponse.estimatedCost
    );

    // 8. Auto-generate title if first message
    if (history.length === 0) {
      await autoGenerateConversationTitle(input.conversationId, input.content);
    }

    console.log(`[Chat] ✅ Message processed (${aiResponse.totalTokens} tokens, $${aiResponse.estimatedCost.toFixed(6)})`);

    return {
      messageId: assistantMessage.id,
      conversationId: input.conversationId,
      userMessage,
      assistantMessage,
      knowledgeDocsUsed: knowledgeDocs,
      metadata: {
        tokensUsed: aiResponse.totalTokens,
        estimatedCost: aiResponse.estimatedCost,
        model: aiResponse.model,
      },
    };
  } catch (error: any) {
    console.error('[Chat] Error sending message:', error);
    if (error instanceof KnowItAllError) throw error;
    throw new KnowItAllError(
      'Failed to send message',
      'MESSAGE_SEND_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// AI Response Generation
// =============================================

/**
 * Generate AI response using GPT-5 (or GPT-4 Turbo)
 */
async function generateAIResponse(context: AIContextInput): Promise<AIResponse> {
  try {
    const client = getOpenAIClient();

    // Build messages for OpenAI API
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: context.systemPrompt || SYSTEM_PROMPT,
      },
    ];

    // Add conversation history (last 10 messages)
    const recentHistory = context.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      });
    }

    // Add knowledge context (if available)
    if (context.knowledgeDocuments.length > 0) {
      const knowledgeContext = formatKnowledgeContext(context.knowledgeDocuments);
      messages.push({
        role: 'system',
        content: `以下是相關的知識庫文件，請參考這些內容來回答問題：\n\n${knowledgeContext}`,
      });
    }

    // Add user query
    messages.push({
      role: 'user',
      content: context.userQuery,
    });

    // Use provided model or fall back to default
    const modelToUse = context.model || AI_MODEL;
    console.log(`[Chat] Calling ${modelToUse} with ${messages.length} messages`);

    // Call OpenAI API
    const response = await client.chat.completions.create({
      model: modelToUse,
      messages,
      max_tokens: MAX_RESPONSE_TOKENS,
      temperature: 0.7,
      top_p: 0.9,
    });

    const choice = response.choices[0];
    const usage = response.usage!;

    // Calculate cost based on model pricing
    const pricing = MODEL_PRICING[modelToUse] || DEFAULT_PRICING;
    const inputCost = (usage.prompt_tokens / 1000000) * pricing.input;
    const outputCost = (usage.completion_tokens / 1000000) * pricing.output;
    const estimatedCost = inputCost + outputCost;

    console.log(`[Chat] 💰 Cost: $${estimatedCost.toFixed(6)} (${usage.prompt_tokens} input + ${usage.completion_tokens} output tokens, model: ${modelToUse})`);

    return {
      content: choice.message.content || '',
      model: modelToUse,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      estimatedCost,
      finishReason: choice.finish_reason,
    };
  } catch (error: any) {
    console.error('[Chat] Error generating AI response:', error);
    throw new KnowItAllError(
      'Failed to generate AI response',
      'AI_RESPONSE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Format knowledge documents for context
 */
function formatKnowledgeContext(documents: any[]): string {
  return documents
    .map((doc, index) => {
      return `[文件 ${index + 1}] ${doc.title}\n${doc.contentPreview || doc.content.substring(0, 500)}...`;
    })
    .join('\n\n---\n\n');
}

// =============================================
// Database Operations
// =============================================

/**
 * Save a message to database
 */
async function saveMessage(input: {
  conversationId: string;
  role: MessageRole;
  content: string;
  userId: string;
  modelUsed?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number;
  knowledgeDocsUsed?: string[];
}): Promise<ConversationMessage> {
  const validUserId = ensureValidUserId(input.userId);

  // 儲存訊息到 know_it_all_conversations 表（訊息級別）
  const result = await queryDatabase(
    `INSERT INTO know_it_all_conversations (
      conversation_id, role, content, user_id,
      model_used, prompt_tokens, completion_tokens, total_tokens,
      estimated_cost, knowledge_docs_used, added_to_knowledge_base,
      created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, NOW(), NOW())
    RETURNING *`,
    [
      input.conversationId,
      input.role,
      input.content,
      validUserId,
      input.modelUsed || null,
      input.promptTokens || null,
      input.completionTokens || null,
      input.totalTokens || null,
      input.estimatedCost || null,
      input.knowledgeDocsUsed || null,
    ],
    'session' // 使用 session mode 進行寫入操作
  );

  return mapDatabaseRowToMessage(result.rows[0]);
}

/**
 * Update conversation metadata (token usage, cost)
 */
async function updateConversationMetadata(
  conversationId: string,
  tokensUsed: number,
  cost: number
): Promise<void> {
  await queryDatabase(
    `UPDATE know_it_all_conversation_metadata
     SET message_count = message_count + 2,
         total_tokens_used = total_tokens_used + $2,
         total_cost = total_cost + $3,
         last_message_at = NOW(),
         updated_at = NOW()
     WHERE conversation_id = $1`,
    [conversationId, tokensUsed, cost]
  );
}

/**
 * Auto-generate conversation title from first message
 */
async function autoGenerateConversationTitle(
  conversationId: string,
  firstMessage: string
): Promise<void> {
  // Simple title: first 50 chars of message
  const title = firstMessage.length > 50
    ? firstMessage.substring(0, 50) + '...'
    : firstMessage;

  await queryDatabase(
    `UPDATE know_it_all_conversation_metadata
     SET title = $2
     WHERE conversation_id = $1 AND title IS NULL`,
    [conversationId, title]
  );
}

// =============================================
// Mapper Functions
// =============================================

function mapDatabaseRowToMessage(row: any): ConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    modelUsed: row.model_used,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    estimatedCost: row.estimated_cost ? parseFloat(row.estimated_cost) : undefined,
    knowledgeDocsUsed: row.knowledge_docs_used,
    contextSummary: row.context_summary,
    isUseful: row.is_useful,
    feedbackComment: row.feedback_comment,
    addedToKnowledgeBase: row.added_to_knowledge_base,
    userId: row.user_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapDatabaseRowToMetadata(row: any): ConversationMetadata {
  return {
    conversationId: row.conversation_id,
    title: row.title,
    summary: row.summary,
    userId: row.user_id,
    messageCount: row.message_count,
    totalTokensUsed: row.total_tokens_used,
    totalCost: parseFloat(row.total_cost),
    isArchived: row.is_archived,
    archiveAfterDays: row.archive_after_days,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : undefined,
    archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
  };
}

// =============================================
// Export
// =============================================

export const ChatService = {
  createConversation,
  getConversationMetadata,
  listConversations,
  getConversationHistory,
  deleteConversation,
  sendMessage,
};

export default ChatService;
