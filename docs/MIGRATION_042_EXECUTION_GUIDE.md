# Migration 042 執行指南

## 概述

Migration 042 建立 Know-it-all AI 顧問系統所需的資料庫表。

## 執行步驟

### 方式 1：Supabase Dashboard（推薦）

1. 登入 Supabase Dashboard: https://supabase.com/dashboard
2. 選擇你的專案
3. 點擊左側選單的「SQL Editor」
4. 點擊「New query」
5. 複製貼上 `supabase/migrations/042_create_know_it_all_system.sql` 的內容
6. 點擊「Run」執行

### 方式 2：使用 psql 命令列

```bash
psql "postgresql://postgres:your-password@your-host:5432/postgres" \
  -f supabase/migrations/042_create_know_it_all_system.sql
```

## Migration 042 建立的資料庫表

### 1. `know_it_all_knowledge_documents`
- **用途**：儲存知識文件與向量 embeddings
- **關鍵欄位**：
  - `id` (UUID): 主鍵
  - `title` (TEXT): 文件標題
  - `content` (TEXT): 文件內容
  - `embedding` (vector(1536)): OpenAI embeddings
  - `source_type` (TEXT): 來源類型 (text/pdf/word/markdown/url)
  - `tags` (TEXT[]): 標籤陣列
  - `created_by` (UUID): 建立者

### 2. `know_it_all_conversations`
- **用途**：儲存對話會話
- **關鍵欄位**：
  - `id` (UUID): 主鍵
  - `user_id` (UUID): 使用者 ID
  - `title` (TEXT): 對話標題
  - `message_count` (INTEGER): 訊息數量
  - `last_message_at` (TIMESTAMPTZ): 最後訊息時間

### 3. `know_it_all_messages`
- **用途**：儲存對話訊息
- **關鍵欄位**：
  - `id` (UUID): 主鍵
  - `conversation_id` (UUID): 所屬對話
  - `role` (TEXT): 角色 (user/assistant/system)
  - `content` (TEXT): 訊息內容
  - `model_used` (TEXT): 使用的 AI 模型
  - `prompt_tokens` (INTEGER): 輸入 tokens
  - `completion_tokens` (INTEGER): 輸出 tokens
  - `estimated_cost` (NUMERIC): 預估費用
  - `knowledge_docs_used` (UUID[]): 使用的知識文件

### 4. `know_it_all_access_control`
- **用途**：存取權限控制
- **關鍵欄位**：
  - `id` (UUID): 主鍵
  - `user_id` (UUID): 使用者 ID
  - `has_access` (BOOLEAN): 是否有存取權限
  - `max_documents` (INTEGER): 最大文件數量限制
  - `max_conversations` (INTEGER): 最大對話數量限制

## 建立的索引

- `idx_knowledge_docs_user`: 加速按使用者查詢文件
- `idx_knowledge_docs_created_at`: 加速按時間查詢
- `idx_knowledge_docs_tags`: 加速按標籤查詢（使用 GIN 索引）
- `idx_knowledge_docs_embedding`: 向量相似度搜尋索引（使用 HNSW）
- `idx_conversations_user`: 加速按使用者查詢對話
- `idx_messages_conversation`: 加速按對話查詢訊息
- `idx_access_user`: 加速存取權限查詢

## 建立的函數

### `search_knowledge_documents()`
- **用途**：向量相似度搜尋知識文件
- **參數**：
  - `query_embedding` (vector(1536)): 查詢的向量
  - `match_threshold` (float): 相似度閾值 (0-1)
  - `match_count` (int): 返回數量
  - `user_id_filter` (UUID): 使用者過濾

### `update_conversation_metadata()`
- **用途**：自動更新對話的訊息數量和最後訊息時間
- **觸發**：當 `know_it_all_messages` 表有新訊息時

## 驗證 Migration 是否成功

執行以下 SQL 查詢：

```sql
-- 檢查表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name LIKE 'know_it_all%';

-- 應該返回 4 個表：
-- 1. know_it_all_knowledge_documents
-- 2. know_it_all_conversations
-- 3. know_it_all_messages
-- 4. know_it_all_access_control
```

## 故障排除

### 錯誤：pgvector extension 不存在

```
ERROR: extension "vector" does not exist
```

**解決方案**：
1. 在 Supabase Dashboard 中啟用 pgvector extension
2. 或執行：`CREATE EXTENSION IF NOT EXISTS vector;`

### 錯誤：表已存在

```
ERROR: relation "know_it_all_knowledge_documents" already exists
```

**解決方案**：Migration 已經執行過，無需再次執行。

### 錯誤：users 表不存在

```
ERROR: relation "users" does not exist
```

**解決方案**：確保你的 users 表已經建立（應該在之前的 migration 中）。

## 執行後的下一步

1. 重新啟動開發服務器：`npm run dev:clean`
2. 前往 Know-it-all 聊天頁面：http://localhost:5001/tools/know-it-all-chat
3. 嘗試建立新對話
4. 上傳知識文件測試

## 注意事項

- ⚠️ **不要在生產環境直接執行 DROP TABLE**
- ✅ Migration 使用 `IF NOT EXISTS`，可以安全重複執行
- ✅ 所有外鍵都設定了 `ON DELETE CASCADE`，刪除使用者時會自動清理相關資料
- ✅ 使用 pgvector 的 HNSW 索引，查詢效能最佳化

## 相關文件

- [KNOW_IT_ALL_PLAN.md](./KNOW_IT_ALL_PLAN.md) - 完整系統規劃
- [MIGRATION_042_PROGRESS.md](./MIGRATION_042_PROGRESS.md) - 開發進度追蹤
