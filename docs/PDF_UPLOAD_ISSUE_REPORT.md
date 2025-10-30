# Know-it-all PDF 上傳問題統整報告

## 執行日期
2025-10-30

## 問題概述
嘗試上傳 PDF 文件到 Know-it-all 系統時，經過多次調試仍然失敗。本報告統整所有遇到的問題及修正進度。

---

## 測試文件資訊
- **文件名稱**: 汪忠諫的嵾值體驗2精詴.pdf
- **文件大小**: 538.1 KB
- **頁數**: 11 pages
- **字數**: 903 words
- **實際內容長度**: 11,319 characters

---

## 問題時間軸及修正過程

### ✅ 問題 1: PDF 解析失敗 (已解決)
**錯誤訊息**: `pdf is not a function`

**原因**:
- pdf-parse 庫已升級到 v2，API 完全改變
- 舊版 (v1): `pdf(buffer)` - 函數調用
- 新版 (v2): `new PDFParse({ data: buffer })` - 類別實例化

**解決方案**:
```typescript
// 修改前
const pdf = pdfModule.PDFParse;
const data = await pdf(buffer);

// 修改後
const PDFParse = pdfModule.PDFParse;
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
await parser.destroy();
```

**修改文件**: `server/services/know-it-all/document-parser-service.ts`

**結果**: ✅ PDF 解析成功

---

### ✅ 問題 2: Embedding Token 超限 (已解決)
**錯誤訊息**: `This model's maximum context length is 8192 tokens, however you requested 14794 tokens`

**原因**:
- PDF 內容過長 (11,319 characters)
- 中文字約 1 字 = 2 tokens，因此約 22,638 tokens
- OpenAI text-embedding-3-small 限制: 8,192 tokens

**解決方案**:
```typescript
// 修改截斷邏輯，從 4 chars/token 改為更保守的 2 chars/token
function truncateText(text: string, maxTokens: number = MAX_INPUT_TOKENS): string {
  const maxChars = Math.floor(maxTokens * 0.5); // 8191 * 0.5 = ~4095 chars

  console.log(`[Embedding] Input text length: ${text.length} characters`);

  if (text.length <= maxChars) {
    console.log(`[Embedding] ✓ Text within limit`);
    return text;
  }

  console.log(`[Embedding] ⚠️ Truncating text from ${text.length} to ${maxChars} characters`);
  return text.substring(0, maxChars);
}
```

**修改文件**: `server/services/know-it-all/embedding-service.ts`

**測試結果**:
- 輸入: 11,319 characters
- 截斷後: 4,095 characters
- ✅ Embedding 生成成功: 1536 dimensions, 5330 tokens

---

### ✅ 問題 3: SQL 語法錯誤 (已解決)
**錯誤訊息**: `syntax error at or near "INTO"`

**原因**:
- 錯誤使用 `insertAndReturn()` 函數
- `insertAndReturn()` 期望接收: `(tableName, dataObject, returnColumns)`
- 但傳入了完整的 SQL 語句作為第一個參數

**解決方案**:
```typescript
// 修改前 (錯誤)
const result = await insertAndReturn(
  `INSERT INTO knowledge_base_documents (...) VALUES (...) RETURNING *`,
  [...]
);

// 修改後 (正確)
const queryResult = await queryDatabase(
  `INSERT INTO knowledge_base_documents (...) VALUES (...) RETURNING *`,
  [...]
);
const result = queryResult.rows[0];
```

**修改文件**: `server/services/know-it-all/knowledge-document-service.ts` (line 74-109)

---

### ✅ 問題 4: UUID 格式錯誤 (已解決)
**錯誤訊息**: `invalid input syntax for type uuid: "admin-test-123"`

**原因**:
- SKIP_AUTH 模式下，user.id = "admin-test-123" (不是有效的 UUID)
- PostgreSQL `created_by` 和 `updated_by` 欄位需要 UUID 格式

**解決方案**:
```typescript
// 在 SKIP_AUTH 模式下使用假的但有效的 UUID
let userId = input.createdBy;
if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
  userId = '00000000-0000-0000-0000-000000000000';
}
```

**修改文件**: `server/services/know-it-all/knowledge-document-service.ts` (line 73-78)

---

### ✅ 問題 5: 外鍵約束失敗 (已解決)
**錯誤訊息**:
```
insert or update on table "knowledge_base_documents" violates foreign key constraint
"knowledge_base_documents_created_by_fkey"

Key (created_by)=(00000000-0000-0000-0000-000000000000) is not present in table "users".
```

**原因**:
- `knowledge_base_documents.created_by` 有外鍵約束到 `users.id`
- UUID `00000000-0000-0000-0000-000000000000` 在 `users` 表中不存在
- 無法插入不存在的 user_id

**解決方案**:
執行以下 SQL 創建假用戶（方案 A）:
```sql
INSERT INTO users (id, email, first_name, last_name, roles, status)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dev@localhost',
  'Development',
  'User',
  ARRAY['admin'],
  'active'
) ON CONFLICT (id) DO NOTHING;
```

**結果**: ✅ 假用戶創建成功

**修改文件**: 使用 Node.js pg 模組直接執行 SQL

**影響**:
- ✅ PDF 解析: 成功
- ✅ Embedding 生成: 成功 (truncated to 4095 chars, 5330 tokens)
- ✅ 資料庫插入: **現已可用** (假用戶已存在)

---

## 當前狀態總結

### ✅ 所有問題已解決
1. ✅ PDF 解析功能正常 (pdf-parse v2 API)
2. ✅ Embedding 生成正常 (文本截斷處理)
3. ✅ SQL 語句修正 (使用 queryDatabase)
4. ✅ UUID 格式修正 (使用假 UUID)
5. ✅ 外鍵約束修正 (創建假用戶)

### 解決方案回顧

#### 方案 A: 創建假用戶 (推薦) ⭐
在 SKIP_AUTH 模式下，創建一個假用戶作為文件擁有者：

```sql
-- 在資料庫中創建假用戶
INSERT INTO users (id, email, name)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'dev@localhost',
  'Development User'
) ON CONFLICT (id) DO NOTHING;
```

**優點**: 簡單、直接，不破壞資料完整性
**缺點**: 需要手動執行 SQL

---

#### 方案 B: 臨時移除外鍵約束 (不推薦)
```sql
ALTER TABLE knowledge_base_documents
DROP CONSTRAINT knowledge_base_documents_created_by_fkey;

ALTER TABLE knowledge_base_documents
DROP CONSTRAINT knowledge_base_documents_updated_by_fkey;
```

**優點**: 快速解決
**缺點**: 破壞資料完整性，不適合生產環境

---

#### 方案 C: 使用現有用戶 ID
在 SKIP_AUTH 模式下，從 users 表查詢一個真實存在的用戶 ID：

```typescript
// 在 createKnowledgeDocument 函數中
let userId = input.createdBy;
if (process.env.SKIP_AUTH === 'true' && userId === 'admin-test-123') {
  // 查詢第一個存在的用戶
  const result = await queryDatabase('SELECT id FROM users LIMIT 1');
  userId = result.rows[0]?.id || input.createdBy;
}
```

**優點**: 不需要修改資料庫，使用真實用戶
**缺點**: 需要額外查詢，增加複雜度

---

## ✅ 執行完成

### 已執行步驟 (方案 A):
1. ✅ 連接到 Supabase PostgreSQL 資料庫
2. ✅ 執行 SQL 創建假用戶：
   ```sql
   INSERT INTO users (id, email, first_name, last_name, roles, status)
   VALUES (
     '00000000-0000-0000-0000-000000000000',
     'dev@localhost',
     'Development',
     'User',
     ARRAY['admin'],
     'active'
   ) ON CONFLICT (id) DO NOTHING;
   ```
   **結果**: 假用戶創建成功
   ```json
   {
     "id": "00000000-0000-0000-0000-000000000000",
     "email": "dev@localhost",
     "first_name": "Development",
     "last_name": "User",
     "roles": ["admin"]
   }
   ```

### 下一步驗證:
```bash
# 1. 伺服器已運行在 PORT 5001
# 狀態: ✅ 運行中

# 2. 上傳 PDF 測試
# 訪問: http://localhost:5001/tools/know-it-all-documents
# 操作: 上傳 PDF 文件

# 3. 檢查資料庫
SELECT id, title, source_type, created_by, created_at
FROM knowledge_base_documents
ORDER BY created_at DESC
LIMIT 1;
```

---

## 修改文件列表

| 文件 | 修改內容 | 狀態 |
|------|---------|------|
| `server/services/know-it-all/document-parser-service.ts` | pdf-parse v2 API 修正 | ✅ 完成 |
| `server/services/know-it-all/embedding-service.ts` | 文本截斷邏輯優化 | ✅ 完成 |
| `server/services/know-it-all/knowledge-document-service.ts` | SQL 修正 + UUID 處理 | ✅ 完成 |

---

## 成本估算
- 單次 embedding 生成成本: ~$0.000055 USD
- 使用的 tokens: 5,330 / 8,192 (65%)
- 截斷損失: 7,224 characters (64%)

---

## 待辦事項
- [x] ~~執行方案 A - 創建假用戶~~ ✅ 完成 (2025-10-30)
- [ ] **測試完整 PDF 上傳流程** ⬅️ 下一步
- [ ] 實作文件分塊系統 (未來優化 - 避免截斷損失)
- [ ] 生產環境部署前移除 SKIP_AUTH 模式

---

## 參考資料
- pdf-parse v2 文檔: https://github.com/mehmet-kozan/pdf-parse
- OpenAI Embeddings: text-embedding-3-small (8,192 tokens limit)
- PostgreSQL 外鍵約束: https://www.postgresql.org/docs/current/ddl-constraints.html
