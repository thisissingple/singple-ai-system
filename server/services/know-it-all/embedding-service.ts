/**
 * Knowledge Base Embedding Service
 *
 * Purpose: Generate embeddings using OpenAI API for semantic search
 * Model: text-embedding-3-large (3072 dimensions)
 * Created: 2025-10-30
 */

import OpenAI from 'openai';
import { KnowItAllError } from './types.js';

// =============================================
// Configuration
// =============================================

// Note: Using text-embedding-3-small (1536 dims) instead of large (3072 dims)
// Reason: Supabase pgvector HNSW index has a 2000 dimension limit
const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536 dimensions
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_TOKENS = 8191; // Model limit

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
// Helper Functions
// =============================================

/**
 * Truncate text to fit within token limit
 * For Chinese text: ~1 character ≈ 2 tokens (conservative estimate)
 * For safety, we use 1 character per token to ensure we never exceed limits
 */
function truncateText(text: string, maxTokens: number = MAX_INPUT_TOKENS): string {
  // VERY conservative: 1 character per token for Chinese text (actual is ~2 tokens per char)
  // This means we use only half the available tokens, but ensures we never exceed limits
  const maxChars = Math.floor(maxTokens * 0.5); // 8191 * 0.5 = ~4095 chars

  console.log(`[Embedding] Input text length: ${text.length} characters`);

  if (text.length <= maxChars) {
    console.log(`[Embedding] ✓ Text within limit (${text.length} <= ${maxChars} chars)`);
    return text;
  }

  console.log(`[Embedding] ⚠️ Truncating text from ${text.length} to ${maxChars} characters (${maxTokens} tokens limit)`);
  return text.substring(0, maxChars);
}

/**
 * Calculate estimated cost for embedding
 * text-embedding-3-small: $0.00002 per 1K tokens
 * For Chinese text: ~1.5 characters per token
 */
function calculateEmbeddingCost(text: string): number {
  const estimatedTokens = Math.ceil(text.length / 1.5); // Chinese text estimate
  const costPer1KTokens = 0.00002; // text-embedding-3-small pricing
  return (estimatedTokens / 1000) * costPer1KTokens;
}

// =============================================
// Main Functions
// =============================================

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @returns Embedding vector (3072 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getOpenAIClient();

    // Truncate if needed
    const truncatedText = truncateText(text);

    // Calculate estimated cost
    const estimatedCost = calculateEmbeddingCost(truncatedText);
    console.log(`[Embedding] Generating embedding (est. cost: $${estimatedCost.toFixed(6)})`);

    // Generate embedding
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embedding = response.data[0].embedding;

    // Validate dimensions
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new KnowItAllError(
        `Unexpected embedding dimensions: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`,
        'EMBEDDING_DIMENSION_MISMATCH',
        500
      );
    }

    console.log(`[Embedding] ✅ Generated embedding (${embedding.length} dimensions, ${response.usage.total_tokens} tokens)`);

    return embedding;
  } catch (error: any) {
    console.error('[Embedding] Error generating embedding:', error);

    if (error instanceof KnowItAllError) {
      throw error;
    }

    throw new KnowItAllError(
      'Failed to generate embedding',
      'EMBEDDING_GENERATION_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  try {
    const client = getOpenAIClient();

    // Truncate all texts
    const truncatedTexts = texts.map(text => truncateText(text));

    // Calculate estimated cost
    const totalCost = truncatedTexts.reduce(
      (sum, text) => sum + calculateEmbeddingCost(text),
      0
    );
    console.log(`[Embedding] Generating ${texts.length} embeddings (est. cost: $${totalCost.toFixed(6)})`);

    // Generate embeddings
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedTexts,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    const embeddings = response.data.map(item => item.embedding);

    // Validate all dimensions
    embeddings.forEach((embedding, index) => {
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new KnowItAllError(
          `Unexpected embedding dimensions at index ${index}: ${embedding.length} (expected ${EMBEDDING_DIMENSIONS})`,
          'EMBEDDING_DIMENSION_MISMATCH',
          500
        );
      }
    });

    console.log(`[Embedding] ✅ Generated ${embeddings.length} embeddings (${response.usage.total_tokens} total tokens)`);

    return embeddings;
  } catch (error: any) {
    console.error('[Embedding] Error generating batch embeddings:', error);

    if (error instanceof KnowItAllError) {
      throw error;
    }

    throw new KnowItAllError(
      'Failed to generate batch embeddings',
      'EMBEDDING_BATCH_GENERATION_FAILED',
      500,
      { originalError: error.message }
    );
  }
}

/**
 * Calculate cosine similarity between two embeddings
 *
 * @param embedding1 - First embedding vector
 * @param embedding2 - Second embedding vector
 * @returns Similarity score (0.0 - 1.0)
 */
export function cosineSimilarity(embedding1: number[], embedding2: number[]): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error('Embeddings must have same dimensions');
  }

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    norm1 += embedding1[i] * embedding1[i];
    norm2 += embedding2[i] * embedding2[i];
  }

  const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

  // Normalize to 0-1 range (cosine similarity is -1 to 1, but embeddings are usually positive)
  return (similarity + 1) / 2;
}

/**
 * Find top N most similar documents
 *
 * @param queryEmbedding - Query embedding vector
 * @param documentEmbeddings - Array of { id, embedding } objects
 * @param topN - Number of results to return
 * @returns Array of { id, similarity } sorted by similarity (descending)
 */
export function findMostSimilar(
  queryEmbedding: number[],
  documentEmbeddings: Array<{ id: string; embedding: number[] }>,
  topN: number = 10
): Array<{ id: string; similarity: number }> {
  // Calculate similarities
  const similarities = documentEmbeddings.map(doc => ({
    id: doc.id,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  // Sort by similarity (descending) and take top N
  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

// =============================================
// Export
// =============================================

export const EmbeddingService = {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
  findMostSimilar,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};

export default EmbeddingService;
