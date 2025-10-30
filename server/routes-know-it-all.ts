/**
 * Know-it-all API Routes
 *
 * Purpose: All API endpoints for Know-it-all AI Advisor system
 * Created: 2025-10-30
 * Total endpoints: 20
 */

import type { Express } from 'express';
import multer from 'multer';
import { isAuthenticated } from './auth.js';
import {
  requireKnowItAllAccess,
  checkKnowItAllAccessHandler,
} from './middleware/know-it-all-access.js';

// Services
import KnowledgeDocumentService from './services/know-it-all/knowledge-document-service.js';
import DocumentParserService from './services/know-it-all/document-parser-service.js';
import ChatService from './services/know-it-all/chat-service.js';

import type {
  ApiResponse,
  KnowledgeDocument,
  ConversationMetadata,
  ConversationMessage,
  SendMessageOutput,
} from './services/know-it-all/types.js';

// =============================================
// Multer Configuration for File Uploads
// =============================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const isValid = DocumentParserService.isValidFileType(file.originalname);
    if (isValid) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Supported: .pdf, .docx, .md, .txt'));
    }
  },
});

// =============================================
// Helper Functions
// =============================================

function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

function errorResponse(error: string, message: string, details?: any): ApiResponse {
  return { success: false, error, message, details };
}

// =============================================
// Route Registration
// =============================================

export function registerKnowItAllRoutes(app: Express) {
  console.log('📚 Registering Know-it-all routes...');

  // =============================================
  // Access Control
  // =============================================

  /**
   * GET /api/know-it-all/check-access
   * Check if user has access to Know-it-all
   */
  app.get(
    '/api/know-it-all/check-access',
    isAuthenticated,
    checkKnowItAllAccessHandler
  );

  // =============================================
  // Knowledge Document Management
  // =============================================

  /**
   * POST /api/know-it-all/documents/upload
   * Upload a file and create knowledge document
   */
  app.post(
    '/api/know-it-all/documents/upload',
    isAuthenticated,
    requireKnowItAllAccess,
    upload.single('file'),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json(
            errorResponse('NO_FILE', 'No file uploaded')
          );
        }

        const userId = (req as any).user.id;
        const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
        const category = req.body.category;

        // Fix filename encoding (multer may receive incorrectly encoded filenames)
        // Convert from latin1 to utf8 to fix double-encoding issue
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        // Parse file
        const parsed = await DocumentParserService.parseFile(
          req.file.buffer,
          originalName
        );

        // Determine source type
        const ext = originalName.toLowerCase().match(/\.([^.]+)$/)?.[1];
        const sourceTypeMap: { [key: string]: string } = {
          pdf: 'pdf',
          docx: 'word',
          doc: 'word',
          md: 'markdown',
          markdown: 'markdown',
          txt: 'text',
        };
        const sourceType = sourceTypeMap[ext || ''] || 'text';

        // Create document
        const document = await KnowledgeDocumentService.createKnowledgeDocument({
          title: parsed.title,
          content: parsed.content,
          sourceType: sourceType as any,
          sourceFileName: originalName,
          sourceFileSize: req.file.size,
          tags,
          category,
          createdBy: userId,
        });

        res.json(successResponse(document, 'Document uploaded successfully'));
      } catch (error: any) {
        console.error('[API] Document upload error:', error);
        res.status(500).json(
          errorResponse('UPLOAD_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * POST /api/know-it-all/documents/from-text
   * Create document from plain text
   */
  app.post(
    '/api/know-it-all/documents/from-text',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const { title, content, tags, category } = req.body;
        const userId = (req as any).user.id;

        if (!title || !content) {
          return res.status(400).json(
            errorResponse('MISSING_FIELDS', 'Title and content are required')
          );
        }

        const document = await KnowledgeDocumentService.createFromText(
          title,
          content,
          userId,
          tags,
          category
        );

        res.json(successResponse(document, 'Document created successfully'));
      } catch (error: any) {
        console.error('[API] Create from text error:', error);
        res.status(500).json(
          errorResponse('CREATE_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * POST /api/know-it-all/documents/from-url
   * Create document from URL
   */
  app.post(
    '/api/know-it-all/documents/from-url',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const { url, tags } = req.body;
        const userId = (req as any).user.id;

        if (!url) {
          return res.status(400).json(
            errorResponse('MISSING_URL', 'URL is required')
          );
        }

        // Parse URL content
        const parsed = await DocumentParserService.parseURL(url);

        // Create document
        const document = await KnowledgeDocumentService.createFromUrl(
          url,
          parsed.content,
          userId,
          tags
        );

        res.json(successResponse(document, 'Document created from URL successfully'));
      } catch (error: any) {
        console.error('[API] Create from URL error:', error);
        res.status(500).json(
          errorResponse('CREATE_FROM_URL_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * GET /api/know-it-all/documents
   * List all documents for current user
   */
  app.get(
    '/api/know-it-all/documents',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const sourceType = req.query.sourceType as any;
        const tags = req.query.tags ? (req.query.tags as string).split(',') : undefined;

        const result = await KnowledgeDocumentService.listDocuments(userId, {
          limit,
          offset,
          sourceType,
          tags,
        });

        res.json(successResponse(result));
      } catch (error: any) {
        console.error('[API] List documents error:', error);
        res.status(500).json(
          errorResponse('LIST_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * GET /api/know-it-all/documents/:id
   * Get single document by ID
   */
  app.get(
    '/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const documentId = req.params.id;

        const document = await KnowledgeDocumentService.getDocumentById(
          documentId,
          userId
        );

        if (!document) {
          return res.status(404).json(
            errorResponse('NOT_FOUND', 'Document not found')
          );
        }

        res.json(successResponse(document));
      } catch (error: any) {
        console.error('[API] Get document error:', error);
        res.status(500).json(
          errorResponse('GET_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * PUT /api/know-it-all/documents/:id
   * Update a document
   */
  app.put(
    '/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const documentId = req.params.id;
        const { title, content, tags, category, isActive } = req.body;

        const document = await KnowledgeDocumentService.updateDocument({
          id: documentId,
          title,
          content,
          tags,
          category,
          isActive,
          updatedBy: userId,
        });

        res.json(successResponse(document, 'Document updated successfully'));
      } catch (error: any) {
        console.error('[API] Update document error:', error);
        res.status(500).json(
          errorResponse('UPDATE_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * DELETE /api/know-it-all/documents/:id
   * Delete a document
   */
  app.delete(
    '/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const documentId = req.params.id;

        const deleted = await KnowledgeDocumentService.deleteDocument(
          documentId,
          userId
        );

        if (!deleted) {
          return res.status(404).json(
            errorResponse('NOT_FOUND', 'Document not found or unauthorized')
          );
        }

        res.json(successResponse({ deleted: true }, 'Document deleted successfully'));
      } catch (error: any) {
        console.error('[API] Delete document error:', error);
        res.status(500).json(
          errorResponse('DELETE_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * POST /api/know-it-all/documents/search
   * Search documents using semantic search
   */
  app.post(
    '/api/know-it-all/documents/search',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const { query, matchThreshold, matchCount, tags, sourceType } = req.body;

        if (!query) {
          return res.status(400).json(
            errorResponse('MISSING_QUERY', 'Query is required')
          );
        }

        const results = await KnowledgeDocumentService.searchDocuments({
          query,
          userId,
          matchThreshold,
          matchCount,
          tags,
          sourceType,
        });

        res.json(successResponse(results));
      } catch (error: any) {
        console.error('[API] Search documents error:', error);
        res.status(500).json(
          errorResponse('SEARCH_FAILED', error.message, error.details)
        );
      }
    }
  );

  // =============================================
  // Conversation Management
  // =============================================

  /**
   * POST /api/know-it-all/conversations
   * Create a new conversation
   */
  app.post(
    '/api/know-it-all/conversations',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const { title } = req.body;

        const conversation = await ChatService.createConversation({
          userId,
          title,
        });

        res.json(successResponse(conversation, 'Conversation created successfully'));
      } catch (error: any) {
        console.error('[API] Create conversation error:', error);
        res.status(500).json(
          errorResponse('CREATE_CONVERSATION_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * GET /api/know-it-all/conversations
   * List all conversations for current user
   */
  app.get(
    '/api/know-it-all/conversations',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const includeArchived = req.query.includeArchived === 'true';

        const result = await ChatService.listConversations(userId, {
          limit,
          offset,
          includeArchived,
        });

        res.json(successResponse(result));
      } catch (error: any) {
        console.error('[API] List conversations error:', error);
        res.status(500).json(
          errorResponse('LIST_CONVERSATIONS_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * GET /api/know-it-all/conversations/:id
   * Get conversation history (messages)
   */
  app.get(
    '/api/know-it-all/conversations/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const conversationId = req.params.id;
        const limit = parseInt(req.query.limit as string) || 50;

        const messages = await ChatService.getConversationHistory(
          conversationId,
          userId,
          limit
        );

        res.json(successResponse(messages));
      } catch (error: any) {
        console.error('[API] Get conversation error:', error);
        res.status(500).json(
          errorResponse('GET_CONVERSATION_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * DELETE /api/know-it-all/conversations/:id
   * Delete a conversation
   */
  app.delete(
    '/api/know-it-all/conversations/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const conversationId = req.params.id;

        const deleted = await ChatService.deleteConversation(
          conversationId,
          userId
        );

        if (!deleted) {
          return res.status(404).json(
            errorResponse('NOT_FOUND', 'Conversation not found or unauthorized')
          );
        }

        res.json(successResponse({ deleted: true }, 'Conversation deleted successfully'));
      } catch (error: any) {
        console.error('[API] Delete conversation error:', error);
        res.status(500).json(
          errorResponse('DELETE_CONVERSATION_FAILED', error.message, error.details)
        );
      }
    }
  );

  // =============================================
  // Chat & Messaging
  // =============================================

  /**
   * POST /api/know-it-all/chat
   * Send a message and get AI response
   */
  app.post(
    '/api/know-it-all/chat',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const { conversationId, content, model, retrieveKnowledge, knowledgeMatchCount } = req.body;

        if (!conversationId || !content) {
          return res.status(400).json(
            errorResponse('MISSING_FIELDS', 'conversationId and content are required')
          );
        }

        const result = await ChatService.sendMessage({
          conversationId,
          userId,
          content,
          model,
          retrieveKnowledge,
          knowledgeMatchCount,
        });

        res.json(successResponse(result));
      } catch (error: any) {
        console.error('[API] Chat error:', error);
        res.status(500).json(
          errorResponse('CHAT_FAILED', error.message, error.details)
        );
      }
    }
  );

  // =============================================
  // Statistics & Info
  // =============================================

  /**
   * GET /api/know-it-all/stats
   * Get usage statistics
   */
  app.get(
    '/api/know-it-all/stats',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;

        // TODO: Implement statistics aggregation
        // For now, return placeholder
        const stats = {
          totalDocuments: 0,
          totalConversations: 0,
          totalMessages: 0,
          totalTokensUsed: 0,
          totalCost: 0,
        };

        res.json(successResponse(stats));
      } catch (error: any) {
        console.error('[API] Get stats error:', error);
        res.status(500).json(
          errorResponse('GET_STATS_FAILED', error.message, error.details)
        );
      }
    }
  );

  /**
   * 16. Get knowledge base statistics
   * GET /api/know-it-all/knowledge-base/stats
   * Returns total documents, tokens, average size (for cost estimation)
   */
  app.get(
    '/api/know-it-all/knowledge-base/stats',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      try {
        const userId = (req as any).user.id;
        const stats = await KnowledgeDocumentService.getKnowledgeBaseStats(userId);
        res.json(successResponse(stats));
      } catch (error: any) {
        console.error('[API] Get knowledge base stats error:', error);
        res.status(500).json(
          errorResponse('GET_KB_STATS_FAILED', error.message, error.details)
        );
      }
    }
  );

  console.log('✅ Know-it-all routes registered (16 endpoints)');
}
