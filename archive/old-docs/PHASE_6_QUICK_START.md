# 🚀 Phase 6: AI 欄位對應 - 快速啟動指南

> **Phase 6 後端已完成** ✅
> 本指南幫助您快速測試和使用 AI 欄位對應功能

---

## 📋 目錄

1. [快速測試（5 分鐘）](#快速測試)
2. [執行 Migration（5 分鐘）](#執行-migration)
3. [API 使用範例](#api-使用範例)
4. [前端整合指南](#前端整合指南)

---

## ⚡ 快速測試

### 1️⃣ CLI 測試（不需啟動伺服器）

```bash
# 測試 AI Field Mapper 核心邏輯
npx tsx tests/test-ai-field-mapper.ts
```

**預期結果**:
- ✅ 規則式對應正常運作
- ✅ 3 個測試案例全部通過
- ✅ 平均信心分數 83.3%

---

### 2️⃣ API 端點測試

**步驟 1: 啟動開發伺服器**
```bash
npm run dev
```

**步驟 2: 執行 API 測試**
```bash
# 開新終端
npx tsx tests/test-field-mapping-api.ts
```

**預期結果**:
- ✅ GET `/api/field-mapping/schemas` → 200
- ✅ GET `/api/field-mapping/schemas/:tableName` → 200
- ✅ POST `/api/worksheets/:id/analyze-fields` → 200
- ✅ 錯誤處理測試通過

---

## 🗄️ 執行 Migration

### 方法 1: Supabase Dashboard（推薦）

1. **登入 Supabase**
   - 前往 https://supabase.com/dashboard
   - 選擇您的專案

2. **執行 SQL**
   - 點選左側選單 **SQL Editor**
   - 點選 **New Query**
   - 複製 [`supabase/migrations/011_create_field_mappings.sql`](supabase/migrations/011_create_field_mappings.sql) 內容
   - 點選 **Run** 執行

3. **驗證**
   ```bash
   npx tsx scripts/run-migration-011.ts
   ```

   **預期輸出**:
   ```
   ✅ field_mappings 表已存在
   ✅ mapping_history 表已存在
   ```

### 方法 2: psql 指令（進階）

```bash
# 設定資料庫連線
export SUPABASE_DB_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# 執行 migration
psql "$SUPABASE_DB_URL" -f supabase/migrations/011_create_field_mappings.sql
```

---

## 📡 API 使用範例

### 1. 取得所有可用的表

**請求**:
```bash
curl http://localhost:5000/api/field-mapping/schemas
```

**回應**:
```json
{
  "success": true,
  "data": [
    "trial_class_attendance",
    "trial_class_purchase",
    "eods_for_closers"
  ]
}
```

---

### 2. 取得特定表的 Schema

**請求**:
```bash
curl http://localhost:5000/api/field-mapping/schemas/trial_class_attendance
```

**回應**:
```json
{
  "success": true,
  "data": {
    "tableName": "trial_class_attendance",
    "columns": [
      {
        "name": "student_name",
        "type": "text",
        "required": true,
        "description": "學生姓名"
      },
      {
        "name": "student_email",
        "type": "text",
        "required": true,
        "description": "學生 Email（JOIN key）"
      }
      // ... 更多欄位
    ]
  }
}
```

---

### 3. 分析欄位並取得對應建議

**請求**:
```bash
curl -X POST http://localhost:5000/api/worksheets/test-id/analyze-fields \
  -H "Content-Type: application/json" \
  -d '{
    "googleColumns": ["學員姓名", "Email", "體驗課日期", "老師"],
    "supabaseTable": "trial_class_attendance"
  }'
```

**回應**:
```json
{
  "success": true,
  "data": {
    "worksheetName": "體驗課上課記錄",
    "supabaseTable": "trial_class_attendance",
    "suggestions": [
      {
        "googleColumn": "學員姓名",
        "supabaseColumn": "student_name",
        "confidence": 0.9,
        "dataType": "text",
        "transformFunction": "cleanText",
        "isRequired": true,
        "reasoning": "姓名欄位 (規則匹配)"
      },
      {
        "googleColumn": "Email",
        "supabaseColumn": "student_email",
        "confidence": 0.9,
        "dataType": "text",
        "transformFunction": "cleanText",
        "isRequired": true,
        "reasoning": "Email 欄位 (規則匹配)"
      }
      // ... 更多建議
    ],
    "unmappedGoogleColumns": ["老師"],
    "unmappedSupabaseColumns": [],
    "overallConfidence": 0.833
  }
}
```

---

## 🎨 前端整合指南

### React Hook 範例

```typescript
// useFieldMapping.ts
import { useState } from 'react';

interface MappingSuggestion {
  googleColumn: string;
  supabaseColumn: string;
  confidence: number;
  dataType: string;
  transformFunction?: string;
  isRequired: boolean;
  reasoning: string;
}

export function useFieldMapping() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<MappingSuggestion[]>([]);

  const analyzeFields = async (
    worksheetId: string,
    googleColumns: string[],
    supabaseTable: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/worksheets/${worksheetId}/analyze-fields`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ googleColumns, supabaseTable })
        }
      );

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data.suggestions);
      }
    } catch (error) {
      console.error('Failed to analyze fields:', error);
    } finally {
      setLoading(false);
    }
  };

  return { suggestions, loading, analyzeFields };
}
```

### UI 組件範例

```tsx
// FieldMappingDialog.tsx
import { useFieldMapping } from './useFieldMapping';

export function FieldMappingDialog({ worksheetId, googleColumns, supabaseTable }) {
  const { suggestions, loading, analyzeFields } = useFieldMapping();

  useEffect(() => {
    analyzeFields(worksheetId, googleColumns, supabaseTable);
  }, []);

  if (loading) return <div>分析中...</div>;

  return (
    <div className="field-mapping-dialog">
      <h2>欄位對應建議</h2>
      <table>
        <thead>
          <tr>
            <th>Google Sheets 欄位</th>
            <th>→</th>
            <th>Supabase 欄位</th>
            <th>信心分數</th>
            <th>原因</th>
          </tr>
        </thead>
        <tbody>
          {suggestions.map((suggestion, i) => (
            <tr key={i}>
              <td>{suggestion.googleColumn}</td>
              <td>→</td>
              <td>{suggestion.supabaseColumn}</td>
              <td>
                <ConfidenceBadge value={suggestion.confidence} />
              </td>
              <td className="text-sm text-gray-600">
                {suggestion.reasoning}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const percentage = Math.round(value * 100);
  const color = value >= 0.8 ? 'green' : value >= 0.5 ? 'yellow' : 'red';

  return (
    <span className={`badge badge-${color}`}>
      {percentage}%
    </span>
  );
}
```

---

## 🔧 進階設定

### 啟用 AI 模式（選填）

預設使用規則式對應。若要啟用 AI 模式：

1. **取得 Anthropic API Key**
   - 前往 https://console.anthropic.com/
   - 建立 API Key

2. **設定環境變數**
   ```env
   # .env
   ANTHROPIC_API_KEY=sk-ant-xxx
   ```

3. **重啟伺服器**
   ```bash
   npm run dev
   ```

**差異**:
- ✅ **有 API Key**: AI 自動對應（更準確，支援複雜欄位名稱）
- ✅ **沒有 API Key**: 規則式對應（仍可運作，適合簡單欄位）

---

## 📊 支援的資料表

### 1. trial_class_attendance (體驗課上課記錄)
- **欄位數**: 11
- **必填欄位**: student_name, student_email, class_date, teacher_name
- **用途**: 追蹤學員體驗課上課情況

### 2. trial_class_purchase (體驗課購買記錄)
- **欄位數**: 13
- **必填欄位**: student_name, student_email, package_name, purchase_date
- **用途**: 追蹤學員購買方案

### 3. eods_for_closers (EODs for Closers)
- **欄位數**: 20
- **必填欄位**: student_name, student_email, closer_name
- **用途**: 追蹤諮詢師業績

---

## 🧪 測試檢查清單

執行以下測試確保一切正常：

- [ ] CLI 測試通過 (`npx tsx tests/test-ai-field-mapper.ts`)
- [ ] 開發伺服器啟動成功 (`npm run dev`)
- [ ] API 測試通過 (`npx tsx tests/test-field-mapping-api.ts`)
- [ ] Migration 執行成功（透過 Supabase Dashboard）
- [ ] Migration 驗證通過 (`npx tsx scripts/run-migration-011.ts`)

---

## 🐛 常見問題

### Q1: API 測試失敗，顯示 "ECONNREFUSED"
**A**: 開發伺服器未啟動，執行 `npm run dev`

### Q2: Migration 顯示 "table already exists"
**A**: 表已建立，這是正常的。驗證腳本會確認表存在。

### Q3: 規則式對應準確度不夠
**A**: 加入 `ANTHROPIC_API_KEY` 啟用 AI 模式，或在前端 UI 手動調整對應。

### Q4: 如何新增支援的資料表？
**A**: 編輯 `server/services/ai-field-mapper.ts` 的 `SUPABASE_SCHEMAS` 物件。

---

## 📚 相關文檔

- **完整總結**: [docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md](docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md)
- **專案進度**: [PROJECT_PROGRESS.md](PROJECT_PROGRESS.md)
- **API 文檔**: 見上方「API 使用範例」
- **原始碼**:
  - AI 服務: [server/services/ai-field-mapper.ts](server/services/ai-field-mapper.ts)
  - API 端點: [server/routes.ts](server/routes.ts) (第 3590-3700 行)
  - Migration: [supabase/migrations/011_create_field_mappings.sql](supabase/migrations/011_create_field_mappings.sql)

---

## 🚀 下一步

1. **執行 Migration** → 建立資料表
2. **測試 API** → 確保功能正常
3. **開發前端 UI** → 欄位對應編輯介面（Phase 6.4）
4. **整合 ETL** → 使用動態對應進行資料轉換（Phase 6.5）

---

**🎉 Phase 6 已準備就緒，開始使用吧！**

如有問題，請參考 [完整總結文檔](docs/PHASE_6_AI_FIELD_MAPPING_SUMMARY.md) 或查看測試腳本範例。
