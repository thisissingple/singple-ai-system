/**
 * Document Parser Service
 *
 * Purpose: Parse different file formats (PDF, Word, Markdown, TXT) into plain text
 * Supported: PDF (.pdf), Word (.docx), Markdown (.md), Text (.txt)
 * Created: 2025-10-30
 */

import mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import axios from 'axios';
import { KnowItAllError } from './types.js';
import { createRequire } from 'module';

// pdf-parse is CommonJS, use require
const require = createRequire(import.meta.url);
const pdfModule = require('pdf-parse');
// pdf-parse v2 exports PDFParse as a named export (class constructor)
const PDFParse = pdfModule.PDFParse;

// =============================================
// Type Definitions
// =============================================

export interface ParsedDocument {
  title: string;
  content: string;
  metadata: {
    pageCount?: number;
    author?: string;
    creator?: string;
    creationDate?: Date;
    wordCount: number;
    charCount: number;
  };
}

// =============================================
// PDF Parser
// =============================================

/**
 * Parse PDF file to text
 *
 * @param buffer - PDF file buffer
 * @param fileName - Original filename
 * @returns Parsed document
 */
export async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  try {
    console.log(`[Parser] Parsing PDF: ${fileName}`);

    // pdf-parse v2 API: instantiate with new PDFParse({ data: buffer })
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy(); // Clean up resources

    // Extract title from filename or metadata
    const title = result.info?.Title || fileName.replace(/\.pdf$/i, '');

    const content = result.text.trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.replace(/\s/g, '').length;

    console.log(`[Parser] ✅ Parsed PDF: ${result.total} pages, ${wordCount} words`);

    return {
      title,
      content,
      metadata: {
        pageCount: result.total,
        author: result.info?.Author,
        creator: result.info?.Creator,
        creationDate: result.info?.CreationDate ? new Date(result.info.CreationDate) : undefined,
        wordCount,
        charCount,
      },
    };
  } catch (error: any) {
    console.error('[Parser] Error parsing PDF:', error);
    throw new KnowItAllError(
      'Failed to parse PDF file',
      'PDF_PARSE_FAILED',
      400,
      { originalError: error.message, fileName }
    );
  }
}

// =============================================
// Word Parser
// =============================================

/**
 * Parse Word (.docx) file to text
 *
 * @param buffer - Word file buffer
 * @param fileName - Original filename
 * @returns Parsed document
 */
export async function parseWord(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  try {
    console.log(`[Parser] Parsing Word document: ${fileName}`);

    const result = await mammoth.extractRawText({ buffer });

    const title = fileName.replace(/\.docx?$/i, '');
    const content = result.value.trim();
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.replace(/\s/g, '').length;

    // Check for warnings
    if (result.messages.length > 0) {
      console.warn(`[Parser] ⚠️ Word parsing warnings:`, result.messages);
    }

    console.log(`[Parser] ✅ Parsed Word: ${wordCount} words`);

    return {
      title,
      content,
      metadata: {
        wordCount,
        charCount,
      },
    };
  } catch (error: any) {
    console.error('[Parser] Error parsing Word document:', error);
    throw new KnowItAllError(
      'Failed to parse Word document',
      'WORD_PARSE_FAILED',
      400,
      { originalError: error.message, fileName }
    );
  }
}

// =============================================
// Markdown Parser
// =============================================

/**
 * Parse Markdown file (strip markdown syntax, keep plain text)
 *
 * @param buffer - Markdown file buffer
 * @param fileName - Original filename
 * @returns Parsed document
 */
export async function parseMarkdown(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  try {
    console.log(`[Parser] Parsing Markdown: ${fileName}`);

    const content = buffer.toString('utf-8').trim();

    // Extract title from first heading or filename
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/i, '');

    // Basic markdown cleanup (optional: keep some formatting or remove all)
    // For now, we keep markdown as-is since it's human-readable
    const cleanContent = content;

    const wordCount = cleanContent.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = cleanContent.replace(/\s/g, '').length;

    console.log(`[Parser] ✅ Parsed Markdown: ${wordCount} words`);

    return {
      title,
      content: cleanContent,
      metadata: {
        wordCount,
        charCount,
      },
    };
  } catch (error: any) {
    console.error('[Parser] Error parsing Markdown:', error);
    throw new KnowItAllError(
      'Failed to parse Markdown file',
      'MARKDOWN_PARSE_FAILED',
      400,
      { originalError: error.message, fileName }
    );
  }
}

// =============================================
// Text Parser
// =============================================

/**
 * Parse plain text file
 *
 * @param buffer - Text file buffer
 * @param fileName - Original filename
 * @returns Parsed document
 */
export async function parseText(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  try {
    console.log(`[Parser] Parsing text file: ${fileName}`);

    const content = buffer.toString('utf-8').trim();

    // Use first line as title or filename
    const firstLine = content.split('\n')[0].trim();
    const title = (firstLine.length > 0 && firstLine.length <= 100)
      ? firstLine
      : fileName.replace(/\.txt$/i, '');

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.replace(/\s/g, '').length;

    console.log(`[Parser] ✅ Parsed text: ${wordCount} words`);

    return {
      title,
      content,
      metadata: {
        wordCount,
        charCount,
      },
    };
  } catch (error: any) {
    console.error('[Parser] Error parsing text file:', error);
    throw new KnowItAllError(
      'Failed to parse text file',
      'TEXT_PARSE_FAILED',
      400,
      { originalError: error.message, fileName }
    );
  }
}

// =============================================
// URL Parser (Web Scraping)
// =============================================

/**
 * Fetch and parse content from URL
 *
 * @param url - URL to fetch
 * @returns Parsed document
 */
export async function parseURL(url: string): Promise<ParsedDocument> {
  try {
    console.log(`[Parser] Fetching URL: ${url}`);

    // Fetch HTML
    const response = await axios.get(url, {
      timeout: 30000, // 30 seconds
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KnowItAll/1.0; +https://yourdomain.com)',
      },
    });

    const html = response.data;

    // Parse HTML
    const $ = cheerio.load(html);

    // Remove script and style tags
    $('script, style, nav, footer, header, aside').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || url;

    // Extract main content
    // Try common content selectors
    let content = '';
    const contentSelectors = [
      'article',
      'main',
      '[role="main"]',
      '.content',
      '.post-content',
      '.entry-content',
      '#content',
      'body',
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 100) {
          break; // Found substantial content
        }
      }
    }

    // Fallback: get all text from body
    if (content.length < 100) {
      content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').trim();

    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;
    const charCount = content.replace(/\s/g, '').length;

    console.log(`[Parser] ✅ Parsed URL: ${wordCount} words`);

    return {
      title,
      content,
      metadata: {
        wordCount,
        charCount,
      },
    };
  } catch (error: any) {
    console.error('[Parser] Error parsing URL:', error);
    throw new KnowItAllError(
      'Failed to parse URL',
      'URL_PARSE_FAILED',
      400,
      { originalError: error.message, url }
    );
  }
}

// =============================================
// Main Parser Function
// =============================================

/**
 * Parse file based on extension
 *
 * @param buffer - File buffer
 * @param fileName - Original filename
 * @returns Parsed document
 */
export async function parseFile(buffer: Buffer, fileName: string): Promise<ParsedDocument> {
  const ext = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1];

  switch (ext) {
    case 'pdf':
      return parsePDF(buffer, fileName);
    case 'docx':
    case 'doc':
      return parseWord(buffer, fileName);
    case 'md':
    case 'markdown':
      return parseMarkdown(buffer, fileName);
    case 'txt':
      return parseText(buffer, fileName);
    default:
      throw new KnowItAllError(
        `Unsupported file type: .${ext}`,
        'UNSUPPORTED_FILE_TYPE',
        400,
        { fileName, extension: ext }
      );
  }
}

// =============================================
// Validation Functions
// =============================================

/**
 * Validate file type
 */
export function isValidFileType(fileName: string): boolean {
  const ext = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1];
  return ['pdf', 'docx', 'doc', 'md', 'markdown', 'txt'].includes(ext || '');
}

/**
 * Validate file size (max 10MB)
 */
export function isValidFileSize(size: number, maxSizeMB: number = 10): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return size <= maxBytes;
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['.pdf', '.docx', '.doc', '.md', '.markdown', '.txt'];
}

// =============================================
// Export
// =============================================

export const DocumentParserService = {
  parseFile,
  parsePDF,
  parseWord,
  parseMarkdown,
  parseText,
  parseURL,
  isValidFileType,
  isValidFileSize,
  getSupportedExtensions,
};

export default DocumentParserService;
