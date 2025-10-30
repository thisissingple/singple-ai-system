/**
 * Knowledge Document Service
 *
 * Purpose: Manage knowledge base documents (CRUD + search)
 * Features: Vector search, full-text search, tag filtering
 * Created: 2025-10-30
 */

import { queryDatabase, insertAndReturn } from '../pg-client.js';
import { generateEmbedding } from './embedding-service.js';
import { generateCategory } from './category-service.js';
import type {
  KnowledgeDocument,
  CreateKnowledgeDocumentInput,
  UpdateKnowledgeDocumentInput,
  SearchKnowledgeDocumentInput,
  KnowledgeDocumentSearchResult,
  SourceType,
} from './types.js';
import { KnowItAllError } from './types.js';

// =============================================
// Helper Functions
// =============================================

/**
 * Generate content preview (first 200 characters)
 */
function generateContentPreview(content: string, maxLength: number = 200): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.substring(0, maxLength) + '...';
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Count characters in text (excluding whitespace)
 */
function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

// =============================================
// Create Operations
// =============================================

/**
 * Create a new knowledge document
 *
 * @param input - Document creation input
 * @returns Created document
 */
export async function createKnowledgeDocument(
  input: CreateKnowledgeDocumentInput
): Promise<KnowledgeDocument> {
  try {
    console.log(`[KnowledgeDoc] Creating document: "${input.title}"`);

    // Auto-generate category if not provided
    let category = input.category;
    if (!category) {
      category = await generateCategory(input.title, input.content);
    }

    // Generate embedding
    const embedding = await generateEmbedding(input.content);

    // Calculate metadata
    const contentPreview = generateContentPreview(input.content);
    const wordCount = countWords(input.content);
    const charCount = countChars(input.content);

    // Handle user ID for SKIP_AUTH mode (need valid UUID)
    let userId = input.createdBy;
    if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
      // Use a dummy but valid UUID in development mode
      userId = '00000000-0000-0000-0000-000000000000';
    }

    // Insert into database using queryDatabase
    const queryResult = await queryDatabase(
      `INSERT INTO knowledge_base_documents (
        title, content, content_preview, embedding,
        source_type, source_url, source_file_name, source_file_size,
        tags, category, word_count, char_count, language,
        created_by, updated_by, access_count, reference_count,
        is_active, is_public
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 0, 0, TRUE, FALSE)
      RETURNING *`,
      [
        input.title,
        input.content,
        contentPreview,
        JSON.stringify(embedding), // Store as JSON string
        input.sourceType,
        input.sourceUrl || null,
        input.sourceFileName || null,
        input.sourceFileSize || null,
        input.tags || [],
        category || null,
        wordCount,
        charCount,
        input.language || 'zh-TW',
        userId,
        userId,
      ]
    );

    const result = queryResult.rows[0];
    console.log(`[KnowledgeDoc] ✅ Created document ${result.id}`);

    return mapDatabaseRowToDocument(result);
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error creating document:', error);
    throw new KnowItAllError(
      'Failed to create knowledge document',
      'DOCUMENT_CREATE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Create document from text
 */
export async function createFromText(
  title: string,
  content: string,
  userId: string,
  tags?: string[],
  category?: string
): Promise<KnowledgeDocument> {
  return createKnowledgeDocument({
    title,
    content,
    sourceType: 'text',
    tags,
    category,
    createdBy: userId,
  });
}

/**
 * Create document from URL
 */
export async function createFromUrl(
  url: string,
  content: string,
  userId: string,
  tags?: string[]
): Promise<KnowledgeDocument> {
  // Extract title from URL or content
  const title = extractTitleFromContent(content) || url;

  return createKnowledgeDocument({
    title,
    content,
    sourceType: 'url',
    sourceUrl: url,
    tags,
    createdBy: userId,
  });
}

// =============================================
// Read Operations
// =============================================

/**
 * Get document by ID
 */
export async function getDocumentById(
  documentId: string,
  userId: string
): Promise<KnowledgeDocument | null> {
  try {
    // Handle user ID for SKIP_AUTH mode (need valid UUID)
    let validUserId = userId;
    if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
      // Use the dummy UUID in development mode
      validUserId = '00000000-0000-0000-0000-000000000000';
    }

    const result = await queryDatabase(
      `SELECT * FROM knowledge_base_documents
       WHERE id = $1 AND created_by = $2`,
      [documentId, validUserId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Update access stats
    await queryDatabase(
      `UPDATE knowledge_base_documents
       SET access_count = access_count + 1, last_accessed_at = NOW()
       WHERE id = $1`,
      [documentId]
    );

    return mapDatabaseRowToDocument(result.rows[0]);
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error getting document:', error);
    throw new KnowItAllError(
      'Failed to get document',
      'DOCUMENT_GET_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * List all documents for a user
 */
export async function listDocuments(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    sourceType?: SourceType;
    tags?: string[];
    isActive?: boolean;
  }
): Promise<{ documents: KnowledgeDocument[]; total: number }> {
  try {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Build WHERE clause
    // In SKIP_AUTH mode, don't filter by user
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    if (process.env.SKIP_AUTH !== 'true') {
      whereClause = 'WHERE created_by = $1';
      params.push(userId);
      paramIndex = 2;
    }

    if (options?.sourceType) {
      const connector = whereClause ? ' AND' : 'WHERE';
      whereClause += `${connector} source_type = $${paramIndex}`;
      params.push(options.sourceType);
      paramIndex++;
    }

    if (options?.tags && options.tags.length > 0) {
      const connector = whereClause ? ' AND' : 'WHERE';
      whereClause += `${connector} tags && $${paramIndex}::text[]`;
      params.push(options.tags);
      paramIndex++;
    }

    if (options?.isActive !== undefined) {
      const connector = whereClause ? ' AND' : 'WHERE';
      whereClause += `${connector} is_active = $${paramIndex}`;
      params.push(options.isActive);
      paramIndex++;
    }

    // Get total count
    const countResult = await queryDatabase(
      `SELECT COUNT(*) as total FROM knowledge_base_documents ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get documents
    const result = await queryDatabase(
      `SELECT * FROM knowledge_base_documents ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const documents = result.rows.map(mapDatabaseRowToDocument);

    return { documents, total };
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error listing documents:', error);
    throw new KnowItAllError(
      'Failed to list documents',
      'DOCUMENT_LIST_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Update Operations
// =============================================

/**
 * Update a document
 */
export async function updateDocument(
  input: UpdateKnowledgeDocumentInput
): Promise<KnowledgeDocument> {
  try {
    console.log(`[KnowledgeDoc] Updating document ${input.id}`);

    // Handle user ID for SKIP_AUTH mode (need valid UUID)
    let validUserId = input.updatedBy;
    if (process.env.SKIP_AUTH === 'true' && validUserId === 'admin-test-123') {
      validUserId = '00000000-0000-0000-0000-000000000000';
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex}`);
      params.push(input.title);
      paramIndex++;
    }

    if (input.content !== undefined) {
      // Regenerate embedding if content changed
      const embedding = await generateEmbedding(input.content);
      const contentPreview = generateContentPreview(input.content);
      const wordCount = countWords(input.content);
      const charCount = countChars(input.content);

      updates.push(`content = $${paramIndex}`);
      params.push(input.content);
      paramIndex++;

      updates.push(`content_preview = $${paramIndex}`);
      params.push(contentPreview);
      paramIndex++;

      updates.push(`embedding = $${paramIndex}`);
      params.push(JSON.stringify(embedding));
      paramIndex++;

      updates.push(`word_count = $${paramIndex}`);
      params.push(wordCount);
      paramIndex++;

      updates.push(`char_count = $${paramIndex}`);
      params.push(charCount);
      paramIndex++;
    }

    if (input.tags !== undefined) {
      updates.push(`tags = $${paramIndex}`);
      params.push(input.tags);
      paramIndex++;
    }

    if (input.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(input.category);
      paramIndex++;
    }

    if (input.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(input.isActive);
      paramIndex++;
    }

    updates.push(`updated_by = $${paramIndex}`);
    params.push(validUserId);
    paramIndex++;

    if (updates.length === 0) {
      throw new KnowItAllError(
        'No fields to update',
        'NO_UPDATE_FIELDS',
        400
      );
    }

    params.push(input.id);

    const result = await queryDatabase(
      `UPDATE knowledge_base_documents
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new KnowItAllError(
        'Document not found',
        'DOCUMENT_NOT_FOUND',
        404
      );
    }

    console.log(`[KnowledgeDoc] ✅ Updated document ${input.id}`);

    return mapDatabaseRowToDocument(result.rows[0]);
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error updating document:', error);
    if (error instanceof KnowItAllError) throw error;
    throw new KnowItAllError(
      'Failed to update document',
      'DOCUMENT_UPDATE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Delete Operations
// =============================================

/**
 * Delete a document
 */
export async function deleteDocument(
  documentId: string,
  userId: string
): Promise<boolean> {
  try {
    console.log(`[KnowledgeDoc] Deleting document ${documentId}`);

    // Handle user ID for SKIP_AUTH mode (need valid UUID)
    let validUserId = userId;
    if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
      // Use the dummy UUID in development mode
      validUserId = '00000000-0000-0000-0000-000000000000';
    }

    const result = await queryDatabase(
      `DELETE FROM knowledge_base_documents
       WHERE id = $1 AND created_by = $2`,
      [documentId, validUserId]
    );

    const deleted = result.rowCount > 0;

    if (deleted) {
      console.log(`[KnowledgeDoc] ✅ Deleted document ${documentId}`);
    } else {
      console.log(`[KnowledgeDoc] ⚠️ Document ${documentId} not found or unauthorized`);
    }

    return deleted;
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error deleting document:', error);
    throw new KnowItAllError(
      'Failed to delete document',
      'DOCUMENT_DELETE_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Search Operations
// =============================================

/**
 * Search documents using semantic search
 */
export async function searchDocuments(
  input: SearchKnowledgeDocumentInput
): Promise<KnowledgeDocumentSearchResult[]> {
  try {
    console.log(`[KnowledgeDoc] Searching for: "${input.query}"`);

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(input.query);

    const matchThreshold = input.matchThreshold || 0.7;
    const matchCount = input.matchCount || 10;

    // Call database function for vector search
    const result = await queryDatabase(
      `SELECT * FROM search_knowledge_documents($1, $2, $3, $4)`,
      [JSON.stringify(queryEmbedding), matchThreshold, matchCount, input.userId]
    );

    console.log(`[KnowledgeDoc] ✅ Found ${result.rows.length} matching documents`);

    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      contentPreview: row.content_preview,
      tags: row.tags,
      similarity: parseFloat(row.similarity),
    }));
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error searching documents:', error);
    throw new KnowItAllError(
      'Failed to search documents',
      'DOCUMENT_SEARCH_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Helper Functions
// =============================================

/**
 * Map database row to KnowledgeDocument object
 */
function mapDatabaseRowToDocument(row: any): KnowledgeDocument {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentPreview: row.content_preview,
    embedding: row.embedding ? JSON.parse(row.embedding) : undefined,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
    sourceFileName: row.source_file_name,
    sourceFileSize: row.source_file_size,
    tags: row.tags || [],
    category: row.category,
    wordCount: row.word_count,
    charCount: row.char_count,
    language: row.language,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
    accessCount: row.access_count,
    referenceCount: row.reference_count,
    isActive: row.is_active,
    isPublic: row.is_public,
  };
}

/**
 * Extract title from content (first line or first 50 chars)
 */
function extractTitleFromContent(content: string): string | null {
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 100) {
    return firstLine;
  }
  return content.substring(0, 50) + '...';
}

/**
 * Get knowledge base statistics
 * Returns total documents, total tokens (estimated), avg document size
 */
export async function getKnowledgeBaseStats(userId: string): Promise<{
  totalDocuments: number;
  totalWords: number;
  totalChars: number;
  estimatedTokens: number;
  avgWordsPerDoc: number;
  avgTokensPerDoc: number;
}> {
  try {
    console.log(`[KnowledgeDoc] Getting knowledge base stats for user ${userId}`);

    const result = await queryDatabase(
      `SELECT
        COUNT(*) as total_documents,
        COALESCE(SUM(word_count), 0) as total_words,
        COALESCE(SUM(char_count), 0) as total_chars
       FROM know_it_all_knowledge_documents
       WHERE created_by = $1 AND is_active = true`,
      [userId]
    );

    const row = result.rows[0];
    const totalDocuments = parseInt(row.total_documents);
    const totalWords = parseInt(row.total_words);
    const totalChars = parseInt(row.total_chars);

    // Estimate tokens: roughly 1 token = 4 characters for English/Chinese mix
    const estimatedTokens = Math.ceil(totalChars / 4);
    const avgWordsPerDoc = totalDocuments > 0 ? Math.ceil(totalWords / totalDocuments) : 0;
    const avgTokensPerDoc = totalDocuments > 0 ? Math.ceil(estimatedTokens / totalDocuments) : 0;

    console.log(`[KnowledgeDoc] ✅ Stats: ${totalDocuments} docs, ~${estimatedTokens.toLocaleString()} tokens`);

    return {
      totalDocuments,
      totalWords,
      totalChars,
      estimatedTokens,
      avgWordsPerDoc,
      avgTokensPerDoc,
    };
  } catch (error: any) {
    console.error('[KnowledgeDoc] Error getting stats:', error);
    throw new KnowItAllError(
      'Failed to get knowledge base stats',
      'STATS_FETCH_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

// =============================================
// Export
// =============================================

export const KnowledgeDocumentService = {
  createKnowledgeDocument,
  createFromText,
  createFromUrl,
  getDocumentById,
  listDocuments,
  updateDocument,
  deleteDocument,
  searchDocuments,
  getKnowledgeBaseStats,
};

export default KnowledgeDocumentService;
