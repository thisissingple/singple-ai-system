/**
 * Know-it-all Type Definitions
 *
 * Purpose: Central type definitions for Know-it-all system
 * Created: 2025-10-30
 */

// =============================================
// Knowledge Base Document Types
// =============================================

export type SourceType = 'text' | 'pdf' | 'word' | 'markdown' | 'url' | 'database' | 'conversation';

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  contentPreview?: string;
  embedding?: number[]; // OpenAI embedding vector (1536 dimensions - text-embedding-3-small)
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFileName?: string;
  sourceFileSize?: number;
  tags: string[];
  category?: string;
  wordCount?: number;
  charCount?: number;
  language: string;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  referenceCount: number;
  isActive: boolean;
  isPublic: boolean;
}

export interface CreateKnowledgeDocumentInput {
  title: string;
  content: string;
  sourceType: SourceType;
  sourceUrl?: string;
  sourceFileName?: string;
  sourceFileSize?: number;
  tags?: string[];
  category?: string;
  language?: string;
  createdBy: string;
}

export interface UpdateKnowledgeDocumentInput {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  category?: string;
  isActive?: boolean;
  updatedBy: string;
}

export interface SearchKnowledgeDocumentInput {
  query: string;
  userId: string;
  matchThreshold?: number; // Similarity threshold (0.0 - 1.0)
  matchCount?: number; // Max results
  tags?: string[]; // Filter by tags
  sourceType?: SourceType; // Filter by source type
}

export interface KnowledgeDocumentSearchResult {
  id: string;
  title: string;
  content: string;
  contentPreview?: string;
  tags: string[];
  similarity: number; // Cosine similarity score
}

// =============================================
// Conversation Types
// =============================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  modelUsed?: string; // e.g., 'gpt-5', 'gpt-4-turbo'
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCost?: number; // USD
  knowledgeDocsUsed?: string[]; // IDs of knowledge documents used
  contextSummary?: string;
  isUseful?: boolean; // User feedback
  feedbackComment?: string;
  addedToKnowledgeBase: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMetadata {
  conversationId: string;
  title?: string;
  summary?: string;
  userId: string;
  messageCount: number;
  totalTokensUsed: number;
  totalCost: number; // USD
  isArchived: boolean;
  archiveAfterDays: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  archivedAt?: Date;
}

export interface CreateConversationInput {
  userId: string;
  title?: string;
}

export interface SendMessageInput {
  conversationId: string;
  userId: string;
  content: string;
  model?: string; // AI model to use (e.g., 'gpt-4o', 'gpt-4o-mini', 'smart' for auto-selection)
  useSmartMode?: boolean; // Use AI to automatically select optimal model
  retrieveKnowledge?: boolean; // Whether to retrieve relevant knowledge
  knowledgeMatchCount?: number; // How many knowledge docs to retrieve
}

export interface SendMessageOutput {
  messageId: string;
  conversationId: string;
  userMessage: ConversationMessage;
  assistantMessage: ConversationMessage;
  knowledgeDocsUsed: KnowledgeDocumentSearchResult[];
  metadata: {
    tokensUsed: number;
    estimatedCost: number;
    model: string;
  };
}

// =============================================
// AI Response Types
// =============================================

export interface AIResponse {
  content: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  finishReason?: string;
}

export interface AIContextInput {
  userQuery: string;
  conversationHistory: ConversationMessage[];
  knowledgeDocuments: KnowledgeDocumentSearchResult[];
  systemPrompt?: string;
  model?: string; // AI model to use (e.g., 'gpt-4o', 'gpt-4o-mini')
}

// =============================================
// Tag Suggestion Types
// =============================================

export interface TagSuggestion {
  tag: string;
  confidence: number; // 0.0 - 1.0
  reason?: string;
}

export interface TagSuggestionInput {
  content: string;
  existingTags?: string[]; // Tags already in the system
}

// =============================================
// Statistics Types
// =============================================

export interface UsageStatistics {
  userId: string;
  totalConversations: number;
  totalMessages: number;
  totalKnowledgeDocuments: number;
  totalTokensUsed: number;
  totalCost: number; // USD
  avgMessagesPerConversation: number;
  avgCostPerConversation: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface CostTracking {
  date: Date;
  conversationId?: string;
  messageId?: string;
  userId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
  operationType: 'chat' | 'embedding' | 'tag-suggestion';
}

// =============================================
// File Upload Types
// =============================================

export interface FileUploadInput {
  file: Express.Multer.File;
  userId: string;
  tags?: string[];
  category?: string;
}

export interface FileUploadResult {
  documentId: string;
  title: string;
  fileName: string;
  fileSize: number;
  sourceType: SourceType;
  contentPreview: string;
  wordCount: number;
  tags: string[];
}

// =============================================
// Error Types
// =============================================

export class KnowItAllError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'KnowItAllError';
  }
}

// =============================================
// API Response Types
// =============================================

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
