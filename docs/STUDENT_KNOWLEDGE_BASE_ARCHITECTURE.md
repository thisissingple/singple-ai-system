# Student Knowledge Base Architecture

## 🎯 核心理念

**所有學員相關的資料都必須統一儲存到 `student_knowledge_base` 資料表中。**

這是一個**以學員為中心的知識庫系統**，用於追蹤每位學員的完整旅程。

## 📊 資料表結構

### `student_knowledge_base` 表
```sql
CREATE TABLE student_knowledge_base (
  id UUID PRIMARY KEY,
  student_email VARCHAR(255) UNIQUE NOT NULL,
  student_name VARCHAR(255),
  profile_summary JSONB,           -- 學員個人檔案摘要
  data_sources JSONB,              -- 資料來源參照 (重要!)
  ai_pregenerated_insights JSONB,  -- AI 預生成的洞察
  total_classes INTEGER,
  total_consultations INTEGER,
  total_interactions INTEGER,
  first_contact_date TIMESTAMP,
  last_interaction_date TIMESTAMP,
  conversion_status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### `data_sources` 欄位結構
```json
{
  "trial_classes": ["attendance_id_1", "attendance_id_2"],
  "eods_records": ["eod_id_1", "eod_id_2"],
  "ai_analyses": ["analysis_id_1", "analysis_id_2"],
  "purchases": ["purchase_id_1"],
  "telemarketing_records": ["telemarketing_id_1", "telemarketing_id_2"]
}
```

## 🔄 資料來源整合

### 1. 體驗課品質分析 (Teaching Quality Analysis)
- **資料表**: `teaching_quality_analysis`
- **儲存位置**: `data_sources.ai_analyses[]`
- **實作**: ✅ 已完成
- **檔案**: `server/routes-teaching-quality-new.ts` (line 430-444)

### 2. 諮詢品質分析 (Consultation Quality Analysis)
- **資料表**: `consultation_quality_analysis`
- **儲存位置**: `data_sources.ai_analyses[]`
- **實作**: 🚧 待修改 (目前錯誤儲存到 `know_it_all_documents`)
- **檔案**: `server/routes-consultation-quality.ts` (line 531-614)

### 3. 電訪記錄 (Telemarketing Records)
- **資料表**: (待定)
- **儲存位置**: `data_sources.telemarketing_records[]`
- **實作**: ⏳ 未來功能

### 4. 體驗課出席記錄 (Trial Class Attendance)
- **資料表**: `trial_class_attendance`
- **儲存位置**: `data_sources.trial_classes[]`
- **實作**: ✅ 已完成

### 5. 諮詢記錄 (EOD Records)
- **資料表**: `eods_for_closers`
- **儲存位置**: `data_sources.eods_records[]`
- **實作**: ✅ 已完成

### 6. 購買記錄 (Purchase History)
- **資料表**: `trial_class_purchase`
- **儲存位置**: `data_sources.purchases[]`
- **實作**: ✅ 已完成

## 🛠️ 核心服務函數

### `getOrCreateStudentKB(studentEmail, studentName)`
- 位置: `server/services/student-knowledge-service.ts`
- 功能: 取得或創建學員知識庫
- 用途: 所有新增資料前必須先呼叫

### `addDataSourceRef(studentEmail, sourceType, recordId)`
- 位置: `server/services/student-knowledge-service.ts`
- 功能: 新增資料來源參照到 `data_sources` 欄位
- 參數:
  - `sourceType`: 'trial_classes' | 'eods_records' | 'ai_analyses' | 'purchases' | 'telemarketing_records'
  - `recordId`: 對應資料表的主鍵 UUID

### `syncStudentStats(studentEmail)`
- 位置: `server/services/student-knowledge-service.ts`
- 功能: 同步學員統計數據 (課程數、諮詢數等)

## ⚠️ 重要規則

### ❌ 禁止的做法
1. **不要**將學員相關分析儲存到 `know_it_all_documents`
2. **不要**創建新的學員知識庫資料表
3. **不要**在各自的功能中維護獨立的學員資料

### ✅ 正確的做法
1. **所有新功能**都必須使用 `student_knowledge_base`
2. **所有學員資料**都必須透過 `data_sources` 欄位連結
3. **新增記錄時**必須同步更新知識庫

## 📝 實作範例

### 正確的實作模式 (體驗課分析)
```typescript
// 1. 分析完成後
const analysisResult = await insertAnalysis(attendance.id, analysis);

// 2. 確保學員知識庫存在
await getOrCreateStudentKB(attendance.student_email, attendance.student_name);

// 3. 新增資料來源參照
await addDataSourceRef(attendance.student_email, 'ai_analyses', analysisResult.id);

console.log(`✅ Auto-saved analysis ${analysisResult.id} to knowledge base`);
```

### 錯誤的實作模式 (目前的諮詢品質分析)
```typescript
// ❌ 錯誤：儲存到全域文件庫
const insertResult = await pool.query(`
  INSERT INTO know_it_all_documents (title, content, ...)
  VALUES ($1, $2, ...)
`, [documentTitle, documentContent, ...]);
```

## 🔧 待修改項目

### 1. 諮詢品質分析 - Save to KB 端點
- **檔案**: `server/routes-consultation-quality.ts`
- **端點**: `POST /api/consultation-quality/:eodId/save-to-kb`
- **目前狀態**: 儲存到 `know_it_all_documents` (錯誤)
- **修改方向**: 改用 `getOrCreateStudentKB` + `addDataSourceRef`
- **優先級**: 🔴 高 (必須立即修改)

### 2. 聊天對話記錄
- **檔案**: `server/routes-consultation-quality.ts`
- **端點**: `POST /api/consultation-quality/chat`
- **目前狀態**: 對話記錄未儲存
- **修改方向**: 考慮是否需要儲存聊天歷史到知識庫
- **優先級**: 🟡 中 (可選功能)

## 🚀 未來擴展

當新增**電訪系統**時：

1. 創建電訪記錄資料表 (例如: `telemarketing_records`)
2. 在 `addDataSourceRef` 函數中新增 `'telemarketing_records'` 類型支援
3. 在電訪記錄儲存後，呼叫:
   ```typescript
   await getOrCreateStudentKB(studentEmail, studentName);
   await addDataSourceRef(studentEmail, 'telemarketing_records', recordId);
   ```

## 📌 總結

**核心原則**: 一個學員，一個知識庫，所有資料都透過 `data_sources` 連結。

這樣設計的優點：
- ✅ 學員資料統一管理
- ✅ 完整追蹤學員旅程
- ✅ AI 可以基於完整歷史提供洞察
- ✅ 方便未來擴展新功能
- ✅ 避免資料分散在多個地方

---

**最後更新**: 2025-11-06
**維護者**: System Architecture Team
