-- =============================================
-- Migration 042: Know-it-all AI Advisor System
-- =============================================
-- Description: 打造進階版 NotebookLM - 個人 AI 商業顧問
-- Created: 2025-10-30
-- Version: 1.0
-- =============================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- =============================================
-- Table 1: knowledge_base_documents
-- Purpose: 儲存知識文件與向量 embeddings
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_base_documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Basic Info
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_preview TEXT, -- 前 200 字預覽

    -- Vector Embedding (OpenAI text-embedding-3-small: 1536 dimensions)
    -- Note: Using text-embedding-3-small instead of large due to Supabase HNSW index limit (2000 dims)
    embedding vector(1536),

    -- Source Info
    source_type TEXT NOT NULL CHECK (source_type IN ('text', 'pdf', 'word', 'markdown', 'url', 'database', 'conversation')),
    source_url TEXT, -- 原始連結 (如果來自網頁)
    source_file_name TEXT, -- 原始檔名
    source_file_size INTEGER, -- 檔案大小 (bytes)

    -- Tags & Classification
    tags TEXT[] DEFAULT '{}', -- 標籤陣列
    category TEXT, -- 分類

    -- Metadata
    word_count INTEGER, -- 字數統計
    char_count INTEGER, -- 字元統計
    language TEXT DEFAULT 'zh-TW', -- 語言

    -- User Info
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ, -- 最後訪問時間

    -- Usage Stats
    access_count INTEGER DEFAULT 0, -- 訪問次數
    reference_count INTEGER DEFAULT 0, -- 被引用次數

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE -- 未來可擴展為多人共享
);

-- Indexes for knowledge_base_documents
CREATE INDEX idx_kb_docs_created_by ON knowledge_base_documents(created_by);
CREATE INDEX idx_kb_docs_source_type ON knowledge_base_documents(source_type);
CREATE INDEX idx_kb_docs_tags ON knowledge_base_documents USING GIN(tags);
CREATE INDEX idx_kb_docs_created_at ON knowledge_base_documents(created_at DESC);
CREATE INDEX idx_kb_docs_is_active ON knowledge_base_documents(is_active) WHERE is_active = TRUE;

-- Vector similarity search index (HNSW for better performance)
CREATE INDEX idx_kb_docs_embedding ON knowledge_base_documents
USING hnsw (embedding vector_cosine_ops);

-- Full-text search index
CREATE INDEX idx_kb_docs_content_fts ON knowledge_base_documents
USING GIN(to_tsvector('english', content));

CREATE INDEX idx_kb_docs_title_fts ON knowledge_base_documents
USING GIN(to_tsvector('english', title));

-- =============================================
-- Table 2: know_it_all_conversations
-- Purpose: 儲存對話記錄（訊息級別）
-- =============================================
CREATE TABLE IF NOT EXISTS know_it_all_conversations (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Conversation Grouping
    conversation_id UUID NOT NULL, -- 用於分組多輪對話

    -- Message Content
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,

    -- AI Response Info (僅 assistant 訊息)
    model_used TEXT, -- 例如: 'gpt-5', 'gpt-4-turbo'
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost NUMERIC(10, 6), -- USD

    -- Context Used
    knowledge_docs_used UUID[], -- 使用的知識文件 IDs
    context_summary TEXT, -- 使用的上下文摘要

    -- User Feedback
    is_useful BOOLEAN DEFAULT NULL, -- NULL: 未評價, TRUE: 有用, FALSE: 無用
    feedback_comment TEXT,
    added_to_knowledge_base BOOLEAN DEFAULT FALSE, -- 是否已加入知識庫

    -- User Info
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for know_it_all_conversations
CREATE INDEX idx_kia_conv_conversation_id ON know_it_all_conversations(conversation_id);
CREATE INDEX idx_kia_conv_user_id ON know_it_all_conversations(user_id);
CREATE INDEX idx_kia_conv_created_at ON know_it_all_conversations(created_at DESC);
CREATE INDEX idx_kia_conv_is_useful ON know_it_all_conversations(is_useful) WHERE is_useful IS NOT NULL;
CREATE INDEX idx_kia_conv_added_to_kb ON know_it_all_conversations(added_to_knowledge_base) WHERE added_to_knowledge_base = TRUE;

-- =============================================
-- Table 3: know_it_all_conversation_metadata
-- Purpose: 儲存對話元數據（對話級別）
-- =============================================
CREATE TABLE IF NOT EXISTS know_it_all_conversation_metadata (
    -- Primary Key
    conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Conversation Info
    title TEXT, -- 對話標題（可由 AI 自動生成）
    summary TEXT, -- 對話摘要

    -- User Info
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Statistics
    message_count INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,
    total_cost NUMERIC(10, 6) DEFAULT 0, -- USD

    -- Status
    is_archived BOOLEAN DEFAULT FALSE,
    archive_after_days INTEGER DEFAULT 90, -- 自動歸檔天數

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ
);

-- Indexes for know_it_all_conversation_metadata
CREATE INDEX idx_kia_meta_user_id ON know_it_all_conversation_metadata(user_id);
CREATE INDEX idx_kia_meta_created_at ON know_it_all_conversation_metadata(created_at DESC);
CREATE INDEX idx_kia_meta_is_archived ON know_it_all_conversation_metadata(is_archived);
CREATE INDEX idx_kia_meta_last_message ON know_it_all_conversation_metadata(last_message_at DESC);

-- =============================================
-- Row Level Security (RLS) Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE know_it_all_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE know_it_all_conversation_metadata ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only see their own knowledge documents
CREATE POLICY "Users can view own knowledge documents"
ON knowledge_base_documents
FOR SELECT
USING (created_by = auth.uid() OR is_public = TRUE);

CREATE POLICY "Users can create knowledge documents"
ON knowledge_base_documents
FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own knowledge documents"
ON knowledge_base_documents
FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own knowledge documents"
ON knowledge_base_documents
FOR DELETE
USING (created_by = auth.uid());

-- Policy 2: Users can only see their own conversations
CREATE POLICY "Users can view own conversations"
ON know_it_all_conversations
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create conversations"
ON know_it_all_conversations
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversations"
ON know_it_all_conversations
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversations"
ON know_it_all_conversations
FOR DELETE
USING (user_id = auth.uid());

-- Policy 3: Users can only see their own conversation metadata
CREATE POLICY "Users can view own conversation metadata"
ON know_it_all_conversation_metadata
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create conversation metadata"
ON know_it_all_conversation_metadata
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own conversation metadata"
ON know_it_all_conversation_metadata
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own conversation metadata"
ON know_it_all_conversation_metadata
FOR DELETE
USING (user_id = auth.uid());

-- =============================================
-- Triggers for automatic timestamp updates
-- =============================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables
CREATE TRIGGER update_kb_docs_updated_at
    BEFORE UPDATE ON knowledge_base_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kia_conv_updated_at
    BEFORE UPDATE ON know_it_all_conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kia_meta_updated_at
    BEFORE UPDATE ON know_it_all_conversation_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Helper Functions
-- =============================================

-- Function: Search knowledge documents by semantic similarity
CREATE OR REPLACE FUNCTION search_knowledge_documents(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10,
    filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    content_preview TEXT,
    tags TEXT[],
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.title,
        kb.content,
        kb.content_preview,
        kb.tags,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base_documents kb
    WHERE
        kb.is_active = TRUE
        AND (filter_user_id IS NULL OR kb.created_by = filter_user_id)
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-archive old conversations
CREATE OR REPLACE FUNCTION auto_archive_old_conversations()
RETURNS void AS $$
BEGIN
    UPDATE know_it_all_conversation_metadata
    SET
        is_archived = TRUE,
        archived_at = NOW()
    WHERE
        is_archived = FALSE
        AND last_message_at < NOW() - INTERVAL '1 day' * archive_after_days;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Comments for documentation
-- =============================================

COMMENT ON TABLE knowledge_base_documents IS 'Know-it-all 知識庫文件表 - 儲存所有知識文件與向量 embeddings';
COMMENT ON TABLE know_it_all_conversations IS 'Know-it-all 對話記錄表 - 儲存每條訊息的詳細資訊';
COMMENT ON TABLE know_it_all_conversation_metadata IS 'Know-it-all 對話元數據表 - 儲存對話層級的統計與狀態';

COMMENT ON COLUMN knowledge_base_documents.embedding IS 'OpenAI text-embedding-3-small 向量 (1536 維度)';
COMMENT ON COLUMN knowledge_base_documents.reference_count IS '被對話引用的次數，用於統計知識文件的價值';
COMMENT ON COLUMN know_it_all_conversations.knowledge_docs_used IS '該訊息使用的知識文件 ID 陣列';
COMMENT ON COLUMN know_it_all_conversations.estimated_cost IS 'OpenAI API 呼叫預估成本 (USD)';

-- =============================================
-- Migration Complete
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration 042 完成: Know-it-all 系統已建立';
    RAISE NOTICE '   - 3 張資料表已創建';
    RAISE NOTICE '   - pgvector extension 已啟用';
    RAISE NOTICE '   - RLS 安全政策已設定';
    RAISE NOTICE '   - 索引與觸發器已建立';
END $$;
