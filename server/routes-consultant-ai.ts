/**
 * Consultant AI Conversation Routes
 * API endpoints for consultant-student AI conversations
 */

import type { Express } from 'express';
import { isAuthenticated } from './auth.ts';

export function registerConsultantAIRoutes(app: Express) {
  // ============================================================================
  // 1. POST /api/consultant-ai/student/:email/ask-preset
  // Ask AI a preset question about a student
  // ============================================================================
  app.post('/api/consultant-ai/student/:email/ask-preset', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.params;
      const { questionType, eodId } = req.body;
      const consultantId = req.user.email || req.user.id;

      if (!questionType) {
        return res.status(400).json({ error: 'Missing questionType' });
      }

      const consultantAIService = await import('./services/consultant-ai-conversation-service');

      const result = await consultantAIService.askConsultantPresetQuestion(
        consultantId,
        email,
        questionType,
        eodId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Consultant AI 預設問題查詢失敗:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 2. POST /api/consultant-ai/student/:email/ask-custom
  // Ask AI a custom question about a student
  // ============================================================================
  app.post('/api/consultant-ai/student/:email/ask-custom', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.params;
      const { question, eodId } = req.body;
      const consultantId = req.user.email || req.user.id;

      if (!question || question.trim() === '') {
        return res.status(400).json({ error: 'Missing question' });
      }

      const consultantAIService = await import('./services/consultant-ai-conversation-service');

      const result = await consultantAIService.askConsultantCustomQuestion(
        consultantId,
        email,
        question,
        eodId
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      console.error('Consultant AI 自訂問題查詢失敗:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 3. GET /api/consultant-ai/student/:email/conversations
  // Get conversation history for a student
  // ============================================================================
  app.get('/api/consultant-ai/student/:email/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const consultantAIService = await import('./services/consultant-ai-conversation-service');

      const conversations = await consultantAIService.getConsultantConversations(email, limit);

      res.json({
        success: true,
        data: conversations
      });
    } catch (error: any) {
      console.error('獲取 Consultant 對話歷史失敗:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // 4. GET /api/consultant-ai/preset-questions
  // Get list of preset questions for consultants
  // ============================================================================
  app.get('/api/consultant-ai/preset-questions', isAuthenticated, async (req: any, res) => {
    try {
      const consultantAIService = await import('./services/consultant-ai-conversation-service');

      const questions = Object.values(consultantAIService.CONSULTANT_PRESET_QUESTIONS);

      res.json({
        success: true,
        data: questions
      });
    } catch (error: any) {
      console.error('獲取預設問題失敗:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
