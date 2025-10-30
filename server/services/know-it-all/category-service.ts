/**
 * Category Service
 *
 * Purpose: AI-powered automatic document categorization
 * Features: Generate category based on document title and content
 * Created: 2025-10-30
 */

import OpenAI from 'openai';
import { KnowItAllError } from './types.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate category for a document using AI
 *
 * @param title - Document title
 * @param content - Document content (first 500 characters)
 * @returns Suggested category
 */
export async function generateCategory(
  title: string,
  content: string
): Promise<string> {
  try {
    console.log(`[Category] Generating category for: "${title}"`);

    // Truncate content to first 500 characters for efficiency
    const contentPreview = content.substring(0, 500);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `你是一個文件分類專家。根據文件的標題和內容，為文件生成一個簡潔的分類標籤（2-6個中文字）。

常見的分類包括：
- 教學資料
- 課程筆記
- 學員回饋
- 行政文件
- 教材內容
- 會議記錄
- 操作手冊
- 技術文件
- 市場資料
- 財務報表

請只回傳一個分類標籤，不要有其他說明文字。`,
        },
        {
          role: 'user',
          content: `標題：${title}\n\n內容預覽：\n${contentPreview}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 20,
    });

    const category = response.choices[0]?.message?.content?.trim() || '未分類';

    console.log(`[Category] ✅ Generated category: "${category}"`);

    return category;
  } catch (error: any) {
    console.error('[Category] Error generating category:', error);

    // If AI fails, return a default category instead of throwing
    return '未分類';
  }
}

/**
 * Generate category with cost estimation
 */
export async function generateCategoryWithCost(
  title: string,
  content: string
): Promise<{ category: string; estimatedCost: number }> {
  const contentPreview = content.substring(0, 500);

  // Rough token estimation (1 token ≈ 0.75 words for Chinese)
  const estimatedTokens = Math.ceil(
    (title.length + contentPreview.length) * 0.4 + 100 // 100 for system prompt
  );

  // GPT-3.5-turbo pricing: $0.0005 per 1K input tokens, $0.0015 per 1K output tokens
  const estimatedCost = (estimatedTokens / 1000) * 0.0005 + (20 / 1000) * 0.0015;

  console.log(`[Category] Est. tokens: ${estimatedTokens}, Est. cost: $${estimatedCost.toFixed(6)}`);

  const category = await generateCategory(title, content);

  return {
    category,
    estimatedCost,
  };
}
