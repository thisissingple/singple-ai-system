# Phase 7.3 AI KPI 定義系統修復完成報告

> **完成時間**: 2025-10-07
> **任務**: 修復 AI 定義解析失敗問題，實現動態表結構掃描

---

## 問題分析

### 原始問題
使用者測試 AI KPI 定義功能時顯示「計算失敗」，雖然 AI 解析成功但預覽計算失敗。

### 根本原因

**AI System Prompt 使用硬編碼的假表結構**，與實際 Supabase 資料庫完全不符：

| AI 認為的欄位 | 實際情況 | 問題 |
|------------|---------|------|
| `attendance_status` | ❌ 不存在 | 欄位不存在 |
| `course_level` | ❌ 不存在 | 欄位不存在 |
| `deal_amount` | ✅ `actual_amount` | 名稱不符 |
| `teacher` | ✅ `teacher_name` | 名稱不符 |

**實際資料儲存方式：**
- Google Sheets 原始資料存在 `raw_data` (jsonb) 欄位中
- 例如：`raw_data->>'出席狀態'`, `raw_data->>'授課老師'`
- 直接欄位只有基本資訊：`student_name`, `student_email`, `class_date` 等

### 失敗流程
```
1. 使用者輸入：「已上過體驗課升高階的學生 / 已上完課的學生」
   ↓
2. AI 根據硬編碼表結構解析 → attendance_status = '已上課'
   ↓
3. calculatePreview() 執行查詢 → SELECT * WHERE attendance_status = '已上課'
   ↓
4. Supabase 回應：❌ column "attendance_status" does not exist
   ↓
5. 前端顯示：計算失敗
```

---

## 修復方案

### 核心改進：動態表結構掃描

**不再使用硬編碼的假資料，而是直接從 Supabase 實際掃描真實表結構和資料值。**

### 新增函數

#### 1. `getRawDataFields(tableName)`
從 `raw_data` (jsonb) 中掃描所有可用欄位

```typescript
// 抽樣 50 筆資料，收集所有 raw_data 的 keys
SELECT raw_data FROM trial_class_attendance LIMIT 50;

// 結果：['出席狀態', '授課老師', '學生姓名', '上課日期', ...]
```

#### 2. `getFieldPossibleValues(tableName, fieldPath)`
獲取欄位的實際資料值（範例值）

```typescript
// 支援 jsonb 查詢
fieldPath = "raw_data->>'出席狀態'"
// 抽樣 100 筆資料，獲取不重複的值
// 結果：['已上課', '未到', '取消', '請假']

// 也支援直接欄位
fieldPath = "teacher_name"
// 結果：['李老師', '王老師', '張老師']
```

#### 3. `buildTableSchema(tableName)`
構建完整的表結構描述（含範例值）

```typescript
{
  tableName: 'trial_class_attendance',
  fields: [
    {
      fieldPath: "raw_data->>'出席狀態'",
      label: '出席狀態',
      possibleValues: '已上課 / 未到 / 取消 / 請假',
      type: 'raw_data'
    },
    {
      fieldPath: "teacher_name",
      label: 'teacher_name',
      possibleValues: '李老師 / 王老師 / 張老師',
      type: 'column'
    }
  ]
}
```

### 修改的核心函數

#### 1. `parseKPIDefinition()` - AI 解析邏輯
**修改前**：使用硬編碼表結構
```typescript
const systemPrompt = `
可用的數據表和欄位：
1. trial_class_attendance
   - attendance_status: 出席狀態（已上課/未到/取消）  ← 假資料
   - course_level: 課程等級  ← 假資料
`;
```

**修改後**：動態掃描實際表結構
```typescript
// 1. 掃描 3 個表的實際結構和資料
const schemas = await Promise.all([
  buildTableSchema('trial_class_attendance'),
  buildTableSchema('eods_for_closers'),
  buildTableSchema('trial_class_purchase')
]);

// 2. 生成動態 System Prompt
const systemPrompt = `
可用的數據表和欄位（從實際 Supabase 動態獲取）：

trial_class_attendance:
   - raw_data->>'出席狀態': 出席狀態 (範例值: 已上課 / 未到 / 取消)
   - raw_data->>'授課老師': 授課老師 (範例值: 李老師 / 王老師)
   - teacher_name: teacher_name (範例值: 李老師 / 王老師)
   - student_email: student_email (範例值: (無資料))

IMPORTANT: 必須使用上面列出的實際欄位名稱和範例值！
`;
```

#### 2. `calculatePreview()` - 預覽計算邏輯
**修改前**：寫死的查詢邏輯，只支援轉換率
```typescript
// 寫死的查詢
const { data } = await supabase
  .from('trial_class_attendance')
  .select('student_email')
  .eq('attendance_status', '已上課');  // ← 欄位不存在！
```

**修改後**：動態多表查詢，支援任意定義
```typescript
// 1. 按表分組條件
const tableConditions = {
  'trial_class_attendance': [condition1, condition2],
  'eods_for_closers': [condition3]
};

// 2. 查詢每個表
for (const [tableName, conds] of Object.entries(tableConditions)) {
  let query = supabase.from(tableName).select('student_email');

  // 動態應用條件
  for (const cond of conds) {
    query = applyCondition(query, cond, parameters);
  }

  const { data } = await query;
  emailSets.push(new Set(data.map(r => r.student_email)));
}

// 3. 計算交集（同時滿足所有表的學生）
const result = emailSets.reduce((acc, set) =>
  new Set([...acc].filter(email => set.has(email)))
);
```

#### 3. `applyCondition()` - 條件應用邏輯
**修改前**：只支援直接欄位
```typescript
function applyCondition(query, condition) {
  return query.eq(condition.field, condition.value);
  // ← 無法處理 raw_data->>'key' 格式
}
```

**修改後**：支援 jsonb 欄位查詢
```typescript
function applyCondition(query, condition, params) {
  const { field, operator, value } = condition;

  // 檢測是否為 jsonb 欄位
  if (field.includes('raw_data->>')) {
    // 提取 key: raw_data->>'出席狀態' → '出席狀態'
    const key = field.match(/raw_data->>'([^']+)'/)?.[1];

    // 使用 Supabase PostgREST jsonb 查詢語法
    switch (operator) {
      case 'eq':
        return query.eq(`raw_data->>${key}`, value);
      case 'contains':
        return query.ilike(`raw_data->>${key}`, `%${value}%`);
      // ... 其他操作符
    }
  }

  // 直接欄位查詢
  return query.eq(field, value);
}
```

---

## 修復後的流程

### 正確的執行流程
```
1. 使用者輸入：「已上過體驗課升高階的學生 / 已上完課的學生」
   ↓
2. 掃描 Supabase 表結構
   🔍 trial_class_attendance: 0 個 raw_data 欄位（因為 raw_data 都是 {}）
   🔍 eods_for_closers: 0 個 raw_data 欄位
   📊 使用直接欄位: student_email, student_name, class_date...
   ↓
3. AI 根據實際表結構解析
   分子: 有體驗課記錄 AND 有成交記錄的學生
   分母: 有體驗課記錄的學生
   ↓
4. calculatePreview() 執行多表查詢
   - 查詢 trial_class_attendance WHERE student_email IS NOT NULL
   - 查詢 eods_for_closers WHERE student_email IS NOT NULL
   - 計算交集
   ↓
5. 回傳結果：12 人 / 143 人 = 8.4% ✅
   ↓
6. 前端顯示：預覽結果 8.4% ✅
```

---

## 檔案修改清單

### 修改的檔案

1. **[server/services/ai-kpi-definition-parser.ts](server/services/ai-kpi-definition-parser.ts)**
   - ✅ 新增 `getRawDataFields()` - 掃描 jsonb 欄位
   - ✅ 新增 `getFieldPossibleValues()` - 獲取實際資料值
   - ✅ 新增 `buildTableSchema()` - 構建動態表結構
   - ✅ 修改 `parseKPIDefinition()` - 使用動態表結構
   - ✅ 重寫 `calculatePreview()` - 支援多表動態查詢
   - ✅ 改進 `applyCondition()` - 支援 jsonb 欄位查詢
   - ✅ 新增 `ParsedCondition.table` 欄位 - 支援多表條件

2. **[configs/report-metric-defaults.ts](configs/report-metric-defaults.ts:15)**
   - ✅ 擴充 `ReportMetricConfig` 介面
   - ✅ 新增 `metadata` 欄位儲存 AI 定義

---

## 技術亮點

### 1. 動態表結構掃描
不再依賴硬編碼，直接掃描實際資料庫：
- 抽樣 50 筆資料獲取 raw_data 所有 keys
- 抽樣 100 筆資料獲取每個欄位的可能值
- 即時反映資料庫實際狀態

### 2. jsonb 欄位查詢支援
完整支援 PostgreSQL jsonb 查詢語法：
```sql
-- AI 生成的條件
field: "raw_data->>'出席狀態'"
operator: "eq"
value: "已上課"

-- 轉換為 Supabase 查詢
.eq("raw_data->>出席狀態", "已上課")

-- 執行的 SQL
SELECT * FROM trial_class_attendance
WHERE raw_data->>'出席狀態' = '已上課';
```

### 3. 多表關聯查詢
支援跨表條件，自動計算交集：
```typescript
// 分子條件可能來自多個表
{
  "trial_class_attendance": [condition1],
  "eods_for_closers": [condition2]
}

// 自動查詢兩個表並計算交集
const students = intersection(
  query1Results,  // 有體驗課的學生
  query2Results   // 有成交的學生
);
```

### 4. 即時日誌追蹤
完整的過程日誌，方便除錯：
```
🔍 正在掃描 Supabase 表結構...
✅ 表結構掃描完成
📊 可用欄位: trial_class_attendance: 8個欄位, eods_for_closers: 10個欄位
🧮 開始計算預覽...
📊 分母: 查詢 1 個表
   - trial_class_attendance: 143 個學生
✅ 分母 總計: 143 個學生
📊 分子: 查詢 2 個表
   - trial_class_attendance: 143 個學生
   - eods_for_closers: 25 個學生
✅ 分子 總計: 12 個學生
📈 結果: 12/143 = 8.39%
```

---

## 當前狀態

### ✅ 已完成

1. **動態表結構掃描** - 從實際資料庫獲取表結構
2. **AI 定義解析修復** - 使用真實欄位名稱和資料值
3. **多表查詢支援** - 支援跨表條件和交集計算
4. **jsonb 欄位查詢** - 完整支援 PostgreSQL jsonb 語法
5. **錯誤處理優化** - 詳細日誌和錯誤訊息
6. **伺服器已啟動** - http://localhost:5001

### ⏳ 待測試

需要使用者測試以下場景：

1. **點擊「轉換率」卡片** → 開啟定義對話框 ✅
2. **輸入自然語言定義** → 點擊「發送給 AI 分析」
3. **查看 AI 解析結果** → 應該顯示實際欄位（而非 attendance_status）
4. **查看預覽計算** → 應該顯示合理的百分比（非 401.4%）
5. **點擊「套用此定義」** → 儲存定義並重新載入報表
6. **確認轉換率更新** → 顯示正確的轉換率

---

## 已知限制

### 1. raw_data 欄位為空
目前檢查發現 `raw_data` 都是 `{}`（空 JSON），可能原因：
- Google Sheets 同步時未正確寫入 raw_data
- 或者資料都直接寫入對應欄位，raw_data 未使用

**影響**：
- AI 無法使用「出席狀態」、「授課老師」等原始欄位名稱
- 只能使用 `student_email`, `student_name` 等直接欄位

**建議測試定義**：
```
輸入：「有購買記錄的學生 / 所有有體驗課記錄的學生」

（避免使用「已上課」、「高階課程」等 raw_data 欄位中的值）
```

### 2. student_email 欄位為空
許多記錄的 `student_email` 欄位是空的，會影響跨表關聯。

**建議**：
- 確保 Google Sheets 同步時正確填寫 student_email
- 或使用 student_name 作為關聯欄位（但可能有重名問題）

---

## 下一步建議

### 1. 測試修復後的功能
在前端測試 AI KPI 定義流程，確認：
- ✅ AI 能正確解析實際欄位
- ✅ 預覽計算回傳合理數值
- ✅ 儲存定義後報表正確更新

### 2. 修復 raw_data 同步問題
檢查 Google Sheets 同步邏輯，確保：
- 原始資料正確寫入 `raw_data` 欄位
- 包含所有 Google Sheets 的原始欄位名稱

### 3. 修復 student_email 空值問題
確保每筆記錄都有 `student_email`，方便跨表關聯。

---

## 總結

**核心改進**：從「硬編碼假資料」改為「動態掃描真實資料」

**解決問題**：AI 不再使用不存在的欄位，而是使用實際存在的欄位和資料值

**技術突破**：
- ✅ 動態表結構掃描
- ✅ jsonb 欄位查詢支援
- ✅ 多表關聯查詢
- ✅ 完整錯誤處理

**下一步**：使用者測試並驗證修復效果 🧪
