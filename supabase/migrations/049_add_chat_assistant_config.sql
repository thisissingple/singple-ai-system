-- ============================================================================
-- Migration 049: Add Chat Assistant Config Fields
-- Purpose: Add configurable settings for consultation quality chat assistant
-- ============================================================================

-- Add chat assistant configuration columns
ALTER TABLE consultation_analysis_config
ADD COLUMN IF NOT EXISTS chat_ai_model VARCHAR(50) NOT NULL DEFAULT 'gpt-4o',
ADD COLUMN IF NOT EXISTS chat_temperature DECIMAL(3, 2) NOT NULL DEFAULT 0.7,
ADD COLUMN IF NOT EXISTS chat_max_tokens INTEGER NOT NULL DEFAULT 2000,
ADD COLUMN IF NOT EXISTS chat_system_prompt TEXT NOT NULL DEFAULT '你是一位專業的諮詢分析助手。你的任務是根據提供的諮詢逐字稿和 AI 分析結果，回答使用者的問題。

請根據以上資訊，用專業、友善的方式回答問題。如果資訊不足以回答問題，請誠實告知。回答時請：
1. 直接回答問題，不要重複問題
2. 引用具體的對話內容或分析結果作為依據
3. 提供洞察和建議
4. 保持簡潔明確';

-- Add comments
COMMENT ON COLUMN consultation_analysis_config.chat_ai_model IS '聊天助手 OpenAI 模型名稱';
COMMENT ON COLUMN consultation_analysis_config.chat_temperature IS '聊天助手創意度參數 (0.0-1.0)';
COMMENT ON COLUMN consultation_analysis_config.chat_max_tokens IS '聊天助手單次回應最大 token 數';
COMMENT ON COLUMN consultation_analysis_config.chat_system_prompt IS '聊天助手的 system prompt';

-- ============================================================================
-- Completed
-- ============================================================================
