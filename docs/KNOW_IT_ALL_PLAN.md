# Know-it-all - AI 知識庫顧問系統

> **專案代號**: Know-it-all
> **目標**: 打造進階版 NotebookLM - 個人 AI 商業顧問
> **訪問權限**: 僅限 xk4xk4563022@gmail.com
> **AI 模型**: GPT-5 (gpt-5)
> **建立日期**: 2025-10-29

---

## 📋 專案概述

Know-it-all 是一個基於 GPT-5 的生成式知識庫系統,專為商業決策提供 AI 顧問服務。系統可以接收多種格式的知識輸入,透過語義搜尋提供精準回答,並將優質對話回饋到知識庫中,形成自我成長的知識體。

### 核心特色
- 🧠 **GPT-5 驅動** - 使用最新 GPT-5 模型 (2M TPM, 5K RPM)
- 📚 **全格式支援** - 文字、PDF、Word、Markdown、網頁、資料庫
- 🎯 **語義搜尋** - OpenAI Embeddings + pgvector
- ♻️ **自我進化** - 優質回答可編輯後回饋知識庫
- 🔒 **獨家訪問** - 僅限指定帳號使用
- 🏷️ **智能標籤** - AI 自動建議標籤,支援多標籤分類

---

## 🎯 需求規格

### 1. 知識庫內容格式 (全格式支援)
- ✅ **純文字輸入** - 手動複製貼上
- ✅ **文件上傳** - PDF, Word (.docx), Markdown (.md), TXT
- ✅ **網頁連結** - 自動抓取網頁內容
- ✅ **資料庫整合** - 整合現有學員記錄、報表數據

### 2. 對話回饋機制
- ✅ **手動標記** - 每次回覆後可點選「加入知識庫」按鈕
- ✅ **編輯功能** - 可編輯 AI 回覆內容後再存入知識庫
- ✅ **版本控制** - 保留原始回覆與編輯後版本

### 3. 知識檢索方式
- ✅ **語義搜尋** - 使用 OpenAI Embeddings (text-embedding-3-large)
- ✅ **向量資料庫** - PostgreSQL + pgvector extension
- ✅ **混合檢索** - 語義搜尋 + 關鍵字過濾 + 標籤篩選

### 4. 對話記錄保留 (分級管理)
```
🗂️ 第一級 - 所有對話 (自動保留)
   ├─ 保留期: 前 3 個月完整保留
   ├─ 功能: 可搜尋、可查看、可匯出
   └─ 成本: ~1GB 儲存空間

⭐ 第二級 - 已標記對話 (手動標記)
   ├─ 保留期: 3-12 個月
   ├─ 功能: 用戶按「有用」的對話
   └─ 用途: 定期回顧,挑選優質內容

📚 第三級 - 知識文件 (永久保留)
   ├─ 保留期: 永久
   ├─ 功能: 編輯後正式存入知識庫
   └─ 用途: 作為未來對話的上下文來源
```

### 5. 知識庫分類 (混合標籤架構)
```
1️⃣ 系統預設標籤 (AI 自動建議)
   營運策略、銷售技巧、人事管理、技術文件
   財務分析、客戶關係、教學品質、行銷推廣

2️⃣ 自訂標籤 (手動添加)
   用戶可自由創建新標籤
   支援多標籤 (一個文件可有多個標籤)

3️⃣ 智能標籤 (AI 自動產生)
   上傳文件時,AI 分析內容自動建議標籤
   學習用戶標籤習慣,提高建議準確度
```

### 6. 訪問入口
- **位置**: `/tools/ai-advisor` (工具選單下)
- **導航**: 側邊欄「工具」→「AI 顧問 (Know-it-all)」
- **圖示**: 🧠 或 💡

### 7. 訪問權限控制
- **白名單**: `xk4xk4563022@gmail.com`
- **驗證層級**:
  1. 後端中介層檢查 (主要防護)
  2. 前端路由守衛 (輔助隱藏)
  3. 導航選單條件顯示 (僅允許用戶可見)

---

## 🏗️ 技術架構

### 資料庫設計

#### 新增資料表 1: `knowledge_base_documents`
```sql
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_summary TEXT, -- AI 自動生成的摘要

  -- 向量搜尋
  content_embedding VECTOR(3072), -- text-embedding-3-large 的向量維度

  -- 分類與標籤
  category TEXT, -- 主分類
  tags TEXT[], -- 多標籤陣列

  -- 來源資訊
  source_type TEXT CHECK (source_type IN ('manual', 'file', 'url', 'database', 'conversation')),
  source_reference TEXT, -- 檔案路徑、URL、資料庫查詢等
  original_filename TEXT,
  file_type TEXT, -- pdf, docx, md, txt, html

  -- 內容統計
  word_count INTEGER,
  token_count INTEGER,

  -- 權限控制
  created_by UUID REFERENCES users(id),
  is_public BOOLEAN DEFAULT false, -- 未來可能開放給其他用戶

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ,

  -- 索引優化
  search_vector tsvector -- PostgreSQL 全文搜尋 (輔助)
);

-- 索引
CREATE INDEX idx_kb_docs_embedding ON knowledge_base_documents
  USING ivfflat (content_embedding vector_cosine_ops);
CREATE INDEX idx_kb_docs_tags ON knowledge_base_documents USING GIN (tags);
CREATE INDEX idx_kb_docs_category ON knowledge_base_documents (category);
CREATE INDEX idx_kb_docs_created_by ON knowledge_base_documents (created_by);
CREATE INDEX idx_kb_docs_source_type ON knowledge_base_documents (source_type);
CREATE INDEX idx_kb_docs_search_vector ON knowledge_base_documents USING GIN (search_vector);
```

#### 新增資料表 2: `know_it_all_conversations`
```sql
CREATE TABLE know_it_all_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 用戶與對話
  user_id UUID NOT NULL REFERENCES users(id),
  conversation_id UUID NOT NULL, -- 同一個對話串的 ID
  message_index INTEGER NOT NULL, -- 訊息在對話中的順序

  -- 訊息內容
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,

  -- AI 回應資訊 (僅 assistant 角色)
  model TEXT, -- gpt-5, gpt-5-mini
  temperature NUMERIC(3, 2),
  tokens_used INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  api_cost_usd NUMERIC(10, 6),

  -- 上下文資訊
  documents_referenced UUID[], -- 引用的知識文件 ID 陣列
  database_queries TEXT[], -- 如果查詢了資料庫,記錄 SQL

  -- 用戶回饋
  is_marked_useful BOOLEAN DEFAULT false, -- 用戶是否標記為有用
  is_added_to_knowledge BOOLEAN DEFAULT false, -- 是否已加入知識庫
  knowledge_document_id UUID REFERENCES knowledge_base_documents(id), -- 關聯的知識文件

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  marked_at TIMESTAMPTZ,
  added_to_knowledge_at TIMESTAMPTZ
);

-- 索引
CREATE INDEX idx_kia_conv_user ON know_it_all_conversations (user_id);
CREATE INDEX idx_kia_conv_conversation ON know_it_all_conversations (conversation_id);
CREATE INDEX idx_kia_conv_marked ON know_it_all_conversations (is_marked_useful)
  WHERE is_marked_useful = true;
CREATE INDEX idx_kia_conv_added ON know_it_all_conversations (is_added_to_knowledge)
  WHERE is_added_to_knowledge = true;
```

#### 新增資料表 3: `know_it_all_conversation_metadata`
```sql
CREATE TABLE know_it_all_conversation_metadata (
  conversation_id UUID PRIMARY KEY,

  -- 對話資訊
  title TEXT, -- 對話標題 (AI 自動生成或用戶自訂)
  user_id UUID NOT NULL REFERENCES users(id),

  -- 統計資訊
  message_count INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  total_cost_usd NUMERIC(10, 6) DEFAULT 0,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,

  -- 歸檔狀態
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_kia_meta_user ON know_it_all_conversation_metadata (user_id);
CREATE INDEX idx_kia_meta_updated ON know_it_all_conversation_metadata (updated_at DESC);
```

### 後端服務架構

```
server/services/know-it-all/
├── knowledge-base-document-service.ts    # 文件管理服務
│   ├── uploadDocument()
│   ├── createFromText()
│   ├── createFromUrl()
│   ├── updateDocument()
│   ├── deleteDocument()
│   ├── listDocuments()
│   └── searchDocuments()
│
├── knowledge-base-embedding-service.ts   # 向量嵌入服務
│   ├── generateEmbedding()
│   ├── batchGenerateEmbeddings()
│   ├── semanticSearch()
│   └── hybridSearch()
│
├── know-it-all-chat-service.ts           # 對話引擎服務
│   ├── chat()
│   ├── getConversationHistory()
│   ├── createNewConversation()
│   ├── listConversations()
│   ├── markMessageUseful()
│   └── addMessageToKnowledge()
│
├── document-parser-service.ts            # 文件解析服務
│   ├── parsePDF()
│   ├── parseDocx()
│   ├── parseMarkdown()
│   ├── parseTxt()
│   ├── parseHtml()
│   └── extractTextFromUrl()
│
└── ai-tag-suggestion-service.ts          # 智能標籤服務
    ├── suggestTags()
    ├── learnFromUserTags()
    └── getPopularTags()
```

### API 端點設計

```typescript
// server/routes-know-it-all.ts

import { Express } from 'express';
import { isAuthenticated } from './auth';
import { requireKnowItAllAccess } from './middleware/know-it-all-access';

export function registerKnowItAllRoutes(app: Express) {

  // ===== 文件管理 API =====

  // 上傳文件 (支援多種格式)
  app.post('/api/know-it-all/documents/upload',
    isAuthenticated,
    requireKnowItAllAccess,
    upload.single('file'),
    async (req, res) => {
      // 處理文件上傳、解析、向量化
    }
  );

  // 從文字創建文件
  app.post('/api/know-it-all/documents/from-text',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { title, content, tags, category } = req.body;
      // 創建文件 + 生成 embedding
    }
  );

  // 從網址創建文件
  app.post('/api/know-it-all/documents/from-url',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { url, tags, category } = req.body;
      // 抓取網頁 + 解析 + 創建文件
    }
  );

  // 列出所有文件
  app.get('/api/know-it-all/documents',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { category, tags, limit, offset } = req.query;
      // 返回文件列表 + 分頁
    }
  );

  // 取得單一文件詳情
  app.get('/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回文件完整內容
    }
  );

  // 更新文件
  app.put('/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 更新文件 + 重新生成 embedding (如果內容變更)
    }
  );

  // 刪除文件
  app.delete('/api/know-it-all/documents/:id',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 軟刪除或硬刪除
    }
  );

  // 搜尋文件 (語義搜尋)
  app.post('/api/know-it-all/documents/search',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { query, limit, category, tags } = req.body;
      // 生成查詢 embedding + 向量搜尋 + 過濾
    }
  );

  // ===== 對話 API =====

  // 發送訊息 (主要對話端點)
  app.post('/api/know-it-all/chat',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { message, conversationId, model, options } = req.body;
      // 1. 搜尋相關知識文件
      // 2. 構建上下文 (對話歷史 + 知識文件)
      // 3. 呼叫 GPT-5 API
      // 4. 儲存對話記錄
      // 5. 返回回應 + 引用來源
    }
  );

  // 創建新對話
  app.post('/api/know-it-all/conversations',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 創建新的 conversation_id
    }
  );

  // 列出所有對話
  app.get('/api/know-it-all/conversations',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回對話列表 (按最新訊息排序)
    }
  );

  // 取得對話歷史
  app.get('/api/know-it-all/conversations/:conversationId',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回完整對話記錄
    }
  );

  // 刪除對話
  app.delete('/api/know-it-all/conversations/:conversationId',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 刪除對話 (軟刪除,標記為 archived)
    }
  );

  // ===== 回饋機制 API =====

  // 標記訊息為「有用」
  app.post('/api/know-it-all/messages/:messageId/mark-useful',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 更新 is_marked_useful 欄位
    }
  );

  // 將訊息加入知識庫
  app.post('/api/know-it-all/messages/:messageId/add-to-knowledge',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { editedContent, title, tags, category } = req.body;
      // 1. 創建新的知識文件
      // 2. 生成 embedding
      // 3. 更新原訊息的 is_added_to_knowledge 欄位
    }
  );

  // 取得已標記的訊息列表
  app.get('/api/know-it-all/messages/marked',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回所有標記為有用的訊息
    }
  );

  // ===== 標籤管理 API =====

  // AI 建議標籤
  app.post('/api/know-it-all/tags/suggest',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { content } = req.body;
      // 使用 GPT-5 分析內容,建議標籤
    }
  );

  // 取得所有標籤 (含使用次數)
  app.get('/api/know-it-all/tags',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回所有標籤 + 統計資訊
    }
  );

  // ===== 統計與分析 API =====

  // 取得使用統計
  app.get('/api/know-it-all/stats',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      // 返回:
      // - 總文件數
      // - 總對話數
      // - 本月對話數
      // - 總 token 使用量
      // - 總成本
    }
  );

  // 成本追蹤
  app.get('/api/know-it-all/costs',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { startDate, endDate } = req.query;
      // 返回指定期間的成本明細
    }
  );

  // ===== 資料庫整合 API =====

  // 查詢學員資料
  app.post('/api/know-it-all/database/students/search',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { query } = req.body;
      // 使用 GPT-5 將自然語言轉為 SQL 查詢
      // 執行查詢並返回結果
    }
  );

  // 取得報表數據
  app.post('/api/know-it-all/database/reports',
    isAuthenticated,
    requireKnowItAllAccess,
    async (req, res) => {
      const { reportType, period } = req.body;
      // 整合現有的報表系統
    }
  );
}
```

### 中介層設計

```typescript
// server/middleware/know-it-all-access.ts

import { RequestHandler } from 'express';

const ALLOWED_EMAILS = ['xk4xk4563022@gmail.com'];

export const requireKnowItAllAccess: RequestHandler = async (req, res, next) => {
  // 開發模式跳過檢查
  if (process.env.SKIP_AUTH === 'true') {
    return next();
  }

  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized - Please login first'
    });
  }

  if (!ALLOWED_EMAILS.includes(user.email)) {
    console.warn(`[Know-it-all] Unauthorized access attempt by ${user.email}`);
    return res.status(403).json({
      success: false,
      message: 'Access denied - This feature is restricted to authorized users only'
    });
  }

  // 記錄訪問日誌 (可選)
  console.log(`[Know-it-all] Access granted to ${user.email}`);

  next();
};
```

### 前端架構

```
client/src/pages/tools/know-it-all/
├── index.tsx                         # 主頁面 (對話介面)
├── documents.tsx                     # 文件管理頁面
├── conversations.tsx                 # 對話歷史頁面
├── stats.tsx                         # 統計頁面

client/src/components/know-it-all/
├── chat-interface.tsx                # 對話介面主元件
├── message-bubble.tsx                # 訊息氣泡
├── message-actions.tsx               # 訊息操作 (標記、加入知識庫)
├── document-uploader.tsx             # 文件上傳器
├── document-card.tsx                 # 文件卡片
├── document-list.tsx                 # 文件列表
├── tag-selector.tsx                  # 標籤選擇器
├── conversation-sidebar.tsx          # 對話側邊欄
├── source-citations.tsx              # 來源引用顯示
└── edit-modal.tsx                    # 編輯回覆的彈窗
```

---

## 🔧 實作步驟

### Phase 1: 資料庫與後端基礎 (3-4 小時)

#### 1.1 資料庫設置 (30 分鐘)
- [ ] 檢查 pgvector extension 是否已安裝
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] 創建 migration: `supabase/migrations/044_create_know_it_all_system.sql`
- [ ] 包含所有 3 張資料表
- [ ] 執行 migration

#### 1.2 中介層實作 (30 分鐘)
- [ ] 創建 `server/middleware/know-it-all-access.ts`
- [ ] 實作 `requireKnowItAllAccess` 函式
- [ ] 加入訪問日誌記錄

#### 1.3 核心服務 - 文件管理 (2 小時)
- [ ] 創建 `server/services/know-it-all/knowledge-base-document-service.ts`
  - [ ] `createDocument()` - 創建文件
  - [ ] `updateDocument()` - 更新文件
  - [ ] `deleteDocument()` - 刪除文件
  - [ ] `listDocuments()` - 列出文件 (支援過濾與分頁)
  - [ ] `getDocumentById()` - 取得單一文件

#### 1.4 核心服務 - 向量嵌入 (1 小時)
- [ ] 創建 `server/services/know-it-all/knowledge-base-embedding-service.ts`
  - [ ] `generateEmbedding()` - 呼叫 OpenAI Embeddings API
  - [ ] `semanticSearch()` - 向量搜尋
  - [ ] 使用 pgvector 的 cosine similarity
  ```typescript
  SELECT id, title, content,
         1 - (content_embedding <=> $1) as similarity
  FROM knowledge_base_documents
  WHERE 1 - (content_embedding <=> $1) > 0.7
  ORDER BY similarity DESC
  LIMIT 5;
  ```

---

### Phase 2: 文件解析與上傳 (2-3 小時)

#### 2.1 文件解析服務 (2 小時)
- [ ] 創建 `server/services/know-it-all/document-parser-service.ts`
- [ ] 安裝依賴套件:
  ```bash
  npm install pdf-parse mammoth cheerio axios
  ```
- [ ] 實作解析器:
  - [ ] `parsePDF()` - 使用 `pdf-parse`
  - [ ] `parseDocx()` - 使用 `mammoth`
  - [ ] `parseMarkdown()` - 基本文字處理
  - [ ] `parseTxt()` - 直接讀取
  - [ ] `parseHtml()` - 使用 `cheerio`
  - [ ] `extractTextFromUrl()` - 抓取網頁內容

#### 2.2 檔案上傳端點 (1 小時)
- [ ] 創建 `server/routes-know-it-all.ts`
- [ ] 設置 multer 中介層 (檔案上傳)
  ```typescript
  import multer from 'multer';
  const upload = multer({
    dest: 'uploads/know-it-all/',
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
  });
  ```
- [ ] 實作 `/api/know-it-all/documents/upload` 端點
- [ ] 實作 `/api/know-it-all/documents/from-text` 端點
- [ ] 實作 `/api/know-it-all/documents/from-url` 端點
- [ ] 在 `server/index.ts` 註冊路由

---

### Phase 3: 對話引擎 (3-4 小時)

#### 3.1 對話服務核心 (2.5 小時)
- [ ] 創建 `server/services/know-it-all/know-it-all-chat-service.ts`
- [ ] 實作 `chat()` 函式:
  ```typescript
  async function chat(params: {
    userId: string;
    conversationId: string;
    message: string;
    model?: string;
    options?: ChatOptions;
  }): Promise<ChatResponse> {
    // 1. 搜尋相關知識文件 (語義搜尋)
    const relevantDocs = await embeddingService.semanticSearch(message, 5);

    // 2. 載入對話歷史
    const history = await getConversationHistory(conversationId);

    // 3. 構建 GPT-5 prompt
    const systemPrompt = buildSystemPrompt(relevantDocs);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];

    // 4. 呼叫 OpenAI API
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: model || 'gpt-5',
      messages,
      temperature: 0.7,
      max_tokens: 2000
    });

    // 5. 計算成本
    const cost = calculateCost(completion.usage);

    // 6. 儲存對話記錄
    await saveConversationMessages({
      conversationId,
      userMessage: message,
      assistantMessage: completion.choices[0].message.content,
      documentsReferenced: relevantDocs.map(d => d.id),
      tokensUsed: completion.usage.total_tokens,
      cost
    });

    // 7. 返回回應
    return {
      message: completion.choices[0].message.content,
      sources: relevantDocs,
      tokensUsed: completion.usage.total_tokens,
      cost
    };
  }
  ```

#### 3.2 System Prompt 設計 (30 分鐘)
- [ ] 設計核心 system prompt:
  ```typescript
  function buildSystemPrompt(relevantDocs: Document[]): string {
    return `你是 Know-it-all,一個專業的商業顧問 AI 助手。

你的角色:
- 你是用戶的個人 AI 顧問,專注於商業決策與策略建議
- 你擁有用戶累積的所有商業知識與經驗
- 你的回答應該精準、實用、可執行

知識來源:
以下是與用戶問題相關的知識文件:

${relevantDocs.map((doc, i) => `
[文件 ${i + 1}] ${doc.title}
標籤: ${doc.tags.join(', ')}
內容摘要:
${doc.content_summary || doc.content.substring(0, 500)}
`).join('\n---\n')}

回答指南:
1. 優先使用上述知識文件中的資訊
2. 如果知識文件不足以回答,可以使用你的通用知識,但請明確說明
3. 引用來源時,使用 [文件 N] 的格式
4. 回答要具體、可執行,避免空泛的建議
5. 如果不確定,誠實說明並建議需要補充哪些資訊

語氣:
- 專業但友善
- 直接且高效
- 像是一個經驗豐富的商業夥伴`;
  }
  ```

#### 3.3 對話 API 端點 (1 小時)
- [ ] 實作 `/api/know-it-all/chat` (主要對話端點)
- [ ] 實作 `/api/know-it-all/conversations` (創建/列出對話)
- [ ] 實作 `/api/know-it-all/conversations/:id` (取得對話歷史)

---

### Phase 4: 回饋機制 (1-2 小時)

#### 4.1 回饋服務 (1 小時)
- [ ] 在 `know-it-all-chat-service.ts` 加入:
  - [ ] `markMessageUseful()` - 標記訊息為有用
  - [ ] `addMessageToKnowledge()` - 將訊息加入知識庫
    ```typescript
    async function addMessageToKnowledge(params: {
      messageId: string;
      editedContent?: string;
      title: string;
      tags: string[];
      category?: string;
    }): Promise<Document> {
      // 1. 取得原始訊息
      const message = await getMessage(messageId);

      // 2. 使用編輯後的內容 (或原始內容)
      const content = editedContent || message.content;

      // 3. 生成 embedding
      const embedding = await embeddingService.generateEmbedding(content);

      // 4. 創建知識文件
      const document = await documentService.createDocument({
        title,
        content,
        content_embedding: embedding,
        tags,
        category,
        source_type: 'conversation',
        source_reference: messageId,
        created_by: message.user_id
      });

      // 5. 更新原訊息狀態
      await updateMessage(messageId, {
        is_added_to_knowledge: true,
        knowledge_document_id: document.id,
        added_to_knowledge_at: new Date()
      });

      return document;
    }
    ```

#### 4.2 回饋 API 端點 (1 小時)
- [ ] 實作 `/api/know-it-all/messages/:id/mark-useful`
- [ ] 實作 `/api/know-it-all/messages/:id/add-to-knowledge`
- [ ] 實作 `/api/know-it-all/messages/marked` (列出已標記訊息)

---

### Phase 5: 標籤系統 (1 小時)

#### 5.1 智能標籤服務 (30 分鐘)
- [ ] 創建 `server/services/know-it-all/ai-tag-suggestion-service.ts`
- [ ] 實作 `suggestTags()`:
  ```typescript
  async function suggestTags(content: string): Promise<string[]> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // 使用較便宜的模型
      messages: [
        {
          role: 'system',
          content: `你是一個標籤建議專家。分析內容並建議 3-5 個相關的中文標籤。

常用標籤類別:
- 營運策略、銷售技巧、人事管理、技術文件
- 財務分析、客戶關係、教學品質、行銷推廣
- 招募、培訓、KPI、流程、SOP

回傳格式: 只回傳標籤,用逗號分隔,不要其他說明。
範例: 招募, closer, SOP, 人資`
        },
        {
          role: 'user',
          content: `請為以下內容建議標籤:\n\n${content.substring(0, 1000)}`
        }
      ],
      temperature: 0.5,
      max_tokens: 100
    });

    const tags = completion.choices[0].message.content
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return tags;
  }
  ```

#### 5.2 標籤 API 端點 (30 分鐘)
- [ ] 實作 `/api/know-it-all/tags/suggest`
- [ ] 實作 `/api/know-it-all/tags` (取得所有標籤 + 統計)

---

### Phase 6: 前端介面 - 文件管理 (2-3 小時)

#### 6.1 文件上傳元件 (1.5 小時)
- [ ] 創建 `client/src/components/know-it-all/document-uploader.tsx`
- [ ] 支援拖放上傳
- [ ] 支援多種格式 (PDF, DOCX, MD, TXT)
- [ ] 顯示上傳進度
- [ ] 上傳後自動取得 AI 標籤建議

#### 6.2 文件管理頁面 (1.5 小時)
- [ ] 創建 `client/src/pages/tools/know-it-all/documents.tsx`
- [ ] 功能:
  - [ ] 文件列表 (卡片式顯示)
  - [ ] 搜尋與過濾 (標籤、分類)
  - [ ] 文件預覽
  - [ ] 編輯/刪除
  - [ ] 批次操作

---

### Phase 7: 前端介面 - 對話系統 (3-4 小時)

#### 7.1 對話介面主元件 (2 小時)
- [ ] 創建 `client/src/pages/tools/know-it-all/index.tsx`
- [ ] 參考 `ai-chat-compact.tsx` 的設計
- [ ] 布局:
  ```
  ┌─────────────┬──────────────────────────────┐
  │             │  📝 Know-it-all             │
  │  對話列表   ├──────────────────────────────┤
  │             │                              │
  │  + 新對話   │                              │
  │             │     對話訊息區域              │
  │  📁 對話1   │                              │
  │  📁 對話2   │                              │
  │  📁 對話3   │                              │
  │             ├──────────────────────────────┤
  │             │  💬 輸入框                   │
  │             │  [模型選擇] [發送]           │
  └─────────────┴──────────────────────────────┘
  ```

#### 7.2 訊息氣泡元件 (1 小時)
- [ ] 創建 `client/src/components/know-it-all/message-bubble.tsx`
- [ ] 顯示:
  - [ ] 用戶/AI 訊息 (不同樣式)
  - [ ] 時間戳記
  - [ ] Token 使用量 (僅 AI 訊息)
  - [ ] 引用來源標籤 (點擊可查看文件)
  - [ ] 操作按鈕:
    - [ ] 👍 標記有用
    - [ ] 📚 加入知識庫
    - [ ] 📋 複製
    - [ ] 🔄 重新生成

#### 7.3 訊息操作元件 (1 小時)
- [ ] 創建 `client/src/components/know-it-all/message-actions.tsx`
- [ ] 標記為有用的功能
- [ ] 加入知識庫的彈窗:
  - [ ] 可編輯訊息內容
  - [ ] 輸入標題
  - [ ] 選擇/新增標籤
  - [ ] 選擇分類
  - [ ] 預覽最終文件

---

### Phase 8: 進階功能 (2-3 小時)

#### 8.1 來源引用顯示 (1 小時)
- [ ] 創建 `client/src/components/know-it-all/source-citations.tsx`
- [ ] 在 AI 回應下方顯示引用的文件
- [ ] 點擊可展開查看文件片段
- [ ] 顯示相似度分數

#### 8.2 統計頁面 (1 小時)
- [ ] 創建 `client/src/pages/tools/know-it-all/stats.tsx`
- [ ] 顯示:
  - [ ] 總文件數
  - [ ] 總對話數
  - [ ] 本月對話數
  - [ ] Token 使用統計圖表
  - [ ] 成本追蹤
  - [ ] 最常用標籤

#### 8.3 對話歷史頁面 (1 小時)
- [ ] 創建 `client/src/pages/tools/know-it-all/conversations.tsx`
- [ ] 列出所有對話
- [ ] 搜尋對話內容
- [ ] 匯出對話 (Markdown 格式)
- [ ] 刪除/歸檔對話

---

### Phase 9: 導航與路由 (30 分鐘)

#### 9.1 前端路由 (15 分鐘)
- [ ] 在 `client/src/App.tsx` 加入路由:
  ```tsx
  const KnowItAll = lazy(() => import("@/pages/tools/know-it-all/index"));
  const KnowItAllDocuments = lazy(() => import("@/pages/tools/know-it-all/documents"));
  const KnowItAllStats = lazy(() => import("@/pages/tools/know-it-all/stats"));

  // 在路由中加入
  <Route path="/tools/know-it-all">
    <ProtectedRoute>
      <KnowItAll />
    </ProtectedRoute>
  </Route>
  <Route path="/tools/know-it-all/documents">
    <ProtectedRoute>
      <KnowItAllDocuments />
    </ProtectedRoute>
  </Route>
  <Route path="/tools/know-it-all/stats">
    <ProtectedRoute>
      <KnowItAllStats />
    </ProtectedRoute>
  </Route>
  ```

#### 9.2 導航選單 (15 分鐘)
- [ ] 在側邊欄「工具」區塊加入連結
- [ ] 條件顯示 (僅允許的用戶可見):
  ```tsx
  {user?.email === 'xk4xk4563022@gmail.com' && (
    <NavLink to="/tools/know-it-all">
      🧠 AI 顧問
    </NavLink>
  )}
  ```

---

### Phase 10: 測試與優化 (2-3 小時)

#### 10.1 後端測試 (1 小時)
- [ ] 創建 `tests/test-know-it-all.ts`
- [ ] 測試項目:
  - [ ] 文件上傳與解析
  - [ ] Embedding 生成
  - [ ] 語義搜尋
  - [ ] 對話流程
  - [ ] 成本計算
  - [ ] 權限檢查

#### 10.2 前端測試 (1 小時)
- [ ] 測試各種文件格式上傳
- [ ] 測試對話流程
- [ ] 測試標記與加入知識庫
- [ ] 測試搜尋與過濾
- [ ] 行動裝置響應式設計

#### 10.3 效能優化 (1 小時)
- [ ] pgvector 索引優化
- [ ] 對話歷史分頁載入
- [ ] 文件列表虛擬滾動 (如果文件很多)
- [ ] API 回應快取 (React Query)
- [ ] 圖片/大檔案 lazy loading

---

## 📊 成本估算

### OpenAI API 成本

#### GPT-5 對話成本 (假設 GPT-5 定價類似 GPT-4o)
- **輸入**: $0.005 / 1K tokens
- **輸出**: $0.015 / 1K tokens

**單次對話估算**:
- 知識文件上下文: ~3,000 tokens
- 對話歷史: ~1,000 tokens
- 用戶問題: ~100 tokens
- **總輸入**: ~4,100 tokens → $0.0205
- AI 回答: ~500 tokens → $0.0075
- **單次成本**: ~$0.028 (約 NT$0.85)

#### Embeddings 成本
- **text-embedding-3-large**: $0.00013 / 1K tokens
- 平均文件: 2,000 tokens → $0.00026 (幾乎可忽略)

#### 標籤建議成本
- **GPT-4o-mini**: $0.00015 / 1K tokens (輸入)
- 單次標籤建議: ~$0.0002 (可忽略)

### 月度成本估算

| 使用情境 | 每日對話數 | 月對話數 | 月成本 (USD) | 月成本 (TWD) |
|---------|-----------|---------|-------------|-------------|
| **輕度使用** | 5 次 | 150 次 | $4.2 | ~NT$130 |
| **中度使用** | 20 次 | 600 次 | $16.8 | ~NT$510 |
| **重度使用** | 50 次 | 1,500 次 | $42 | ~NT$1,280 |
| **極重度使用** | 100 次 | 3,000 次 | $84 | ~NT$2,560 |

**額外成本**:
- Embeddings: 每月約 $1-2 (100-200 個文件)
- 標籤建議: 每月約 $0.5
- **總計**: 比上表多約 NT$100

### 儲存成本
- PostgreSQL 儲存: 幾乎免費 (Supabase 免費方案 500MB)
- 上傳檔案儲存: 可使用 Supabase Storage (免費方案 1GB)

---

## 🔐 安全性考量

### 1. 訪問控制
- ✅ **多層防護**:
  1. 後端 middleware 檢查 (主要防線)
  2. 前端路由守衛 (輔助)
  3. UI 條件渲染 (隱藏入口)

### 2. 資料隔離
- ✅ 所有查詢必須加上 `created_by = user_id` 條件
- ✅ 防止跨用戶資料洩露 (雖然目前只有一個用戶)

### 3. 輸入驗證
- ✅ 檔案類型白名單: `['.pdf', '.docx', '.md', '.txt']`
- ✅ 檔案大小限制: 10MB
- ✅ 內容長度限制: 最多 100,000 字元
- ✅ SQL Injection 防護: 使用 parameterized queries

### 4. API 金鑰保護
- ✅ OpenAI API Key 存在環境變數
- ✅ 不在前端暴露
- ✅ 定期輪換 API Key

### 5. 成本控制
- ✅ 單次對話 token 上限: 2,000 tokens (輸出)
- ✅ 每日對話次數限制: 可選 (例如 100 次/日)
- ✅ 異常使用警報: 成本超過閾值時發送通知

### 6. 資料備份
- ✅ 定期備份知識庫文件
- ✅ 對話記錄定期歸檔
- ✅ 重要對話標記後永久保留

---

## 🎨 UI/UX 設計建議

### 色彩主題
- **主色**: 紫色/藍色漸層 (象徵智慧、科技)
- **強調色**: 金色 (象徵知識的價值)
- **輔助色**: 灰階 (保持專業感)

### 圖示系統
- 🧠 Know-it-all 主圖示
- 📚 知識庫/文件
- 💬 對話
- ⭐ 已標記
- 🏷️ 標籤
- 📊 統計

### 互動反饋
- ✅ **即時回應**: 打字動畫 (模擬 ChatGPT)
- ✅ **進度指示**: 上傳文件時顯示進度條
- ✅ **成功通知**: Toast 提示 (加入知識庫成功等)
- ✅ **錯誤處理**: 友善的錯誤訊息

### 響應式設計
- **桌面**: 側邊欄 + 主內容區 (如上述布局)
- **平板**: 可收合側邊欄
- **手機**: 全螢幕對話,底部導航

---

## 🚀 未來擴展功能 (Phase 2)

### 優先級 A (高價值)
- [ ] **多文件對話**: 選擇特定幾個文件進行對話
- [ ] **引用追蹤**: 每個回答標註來源段落
- [ ] **自動摘要**: 上傳長文件自動生成摘要
- [ ] **資料庫整合**: 直接查詢學員/報表數據

### 優先級 B (提升體驗)
- [ ] **語音輸入**: 使用 OpenAI Whisper API
- [ ] **匯出功能**: 對話匯出成 Markdown/PDF
- [ ] **知識圖譜**: 視覺化文件關聯
- [ ] **協作筆記**: 在對話中做筆記

### 優先級 C (錦上添花)
- [ ] **語音輸出**: AI 回答朗讀
- [ ] **多語言支援**: 自動翻譯外文文件
- [ ] **OCR**: 掃描件文字識別
- [ ] **定時摘要**: 每週自動生成知識摘要郵件

---

## 📚 參考資源

### OpenAI API 文件
- [GPT-5 API Reference](https://platform.openai.com/docs/api-reference/chat)
- [Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)

### pgvector 文件
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Supabase + pgvector Guide](https://supabase.com/docs/guides/ai/vector-columns)

### 相關專案靈感
- [NotebookLM](https://notebooklm.google.com/) - Google 的 AI 筆記本
- [Obsidian + AI](https://obsidian.md/) - 知識管理工具
- [Mem.ai](https://get.mem.ai/) - AI 知識庫

---

## ✅ 檢查清單

開始開發前的準備:

### 環境檢查
- [ ] Node.js 版本 >= 18
- [ ] PostgreSQL 可訪問
- [ ] Supabase 連線正常
- [ ] OpenAI API Key 已設置
- [ ] pgvector extension 已安裝

### 依賴安裝
```bash
# 後端依賴
npm install openai pdf-parse mammoth cheerio axios multer @types/multer

# 前端依賴 (可能已安裝)
npm install react-markdown react-syntax-highlighter framer-motion
```

### 環境變數
```env
# .env 檔案
OPENAI_API_KEY=sk-proj-xxxxx
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

---

## 📞 開發時的注意事項

1. **先從 MVP 開始**
   - 第一版先做核心功能: 文字上傳 + 對話
   - 確保基礎功能穩定後再加進階功能

2. **測試 GPT-5 API**
   - 先用簡單的 API 呼叫測試 GPT-5 是否正常
   - 確認計費方式與成本

3. **pgvector 索引**
   - 向量索引需要時間建立 (大量文件時)
   - 先測試小規模 (10-20 個文件)

4. **錯誤處理**
   - OpenAI API 可能失敗 (rate limit, timeout)
   - 文件解析可能失敗 (格式問題)
   - 前端要有友善的錯誤提示

5. **成本監控**
   - 定期檢查 OpenAI 使用量
   - 設置預算警報

---

## 📝 結語

Know-it-all 是一個強大的個人 AI 顧問系統,透過整合 GPT-5、語義搜尋、自動標籤等技術,打造出一個能夠持續成長的知識體。

**預計開發時間**: 12-16 小時 (MVP 版本)
**預計月成本**: NT$500-800 (中度使用)
**技術挑戰度**: 中高 (需要理解向量搜尋、OpenAI API)

**開始開發日期**: 2025-10-30
**預計完成日期**: 2025-10-31 or 2025-11-01

---

**祝開發順利!** 🚀

如有任何問題,可以隨時詢問 Claude Code。

---

*本文件由 Claude Code 於 2025-10-29 生成*
*專案負責人: xk4xk4563022@gmail.com*
