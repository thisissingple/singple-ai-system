# Is_Showed 欄位實作文件

## 概述

新增 `is_showed` 欄位到 `trial_class_attendance` 表，用於追蹤學員是否上線出席體驗課。

**實作日期**: 2025-11-20

## 資料庫變更

### Migration 063

**檔案**: `supabase/migrations/063_add_is_showed_to_trial_attendance.sql`

```sql
-- 新增 is_showed 欄位
ALTER TABLE trial_class_attendance
ADD COLUMN IF NOT EXISTS is_showed BOOLEAN DEFAULT NULL;

-- 欄位說明
COMMENT ON COLUMN trial_class_attendance.is_showed IS
  '學員是否上線出席體驗課 (true=有上線, false=未上線, null=未記錄)';

-- 索引（提升查詢效率）
CREATE INDEX IF NOT EXISTS idx_trial_attendance_is_showed
ON trial_class_attendance(is_showed)
WHERE is_showed IS NOT NULL;
```

**欄位特性**:
- 類型: `BOOLEAN`
- 預設值: `NULL`
- 允許空值: 是
- 索引: 部分索引（僅索引非 NULL 值）

## TypeScript 型別更新

### Frontend

**檔案**: `client/src/hooks/use-student-profile.ts`

```typescript
export interface TrialClassRecord {
  id: string;
  student_email: string;
  student_name: string;
  class_date: string;
  teacher_id?: string;
  teacher_name?: string;
  attendance_status?: string;
  is_showed?: boolean;  // ✨ 新增
  notes?: string;
  class_time?: string;
  course_type?: string;
  created_at?: string;
}
```

## UI 更新

### 公開體驗課表單

**檔案**: `client/src/pages/forms/public-trial-class-form.tsx`

**變更內容**:

1. **State 擴充**:
```typescript
const [formData, setFormData] = useState({
  studentName: '',
  studentEmail: '',
  classDate: '',
  teacherName: '',
  isShowed: '',      // ✨ 新增
  notes: '',
  noConversionReason: '',
});
```

2. **UI 欄位新增**（位於「授課老師」之後）:
```tsx
{/* 學員是否上線 */}
<div className="space-y-2">
  <Label htmlFor="isShowed">
    學員是否上線 <span className="text-red-500">*</span>
  </Label>
  <Select
    value={formData.isShowed}
    onValueChange={(value) => setFormData({ ...formData, isShowed: value })}
    disabled={loading}
    required
  >
    <SelectTrigger>
      <SelectValue placeholder="請選擇學員出席狀態" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="true">有上線</SelectItem>
      <SelectItem value="false">未上線</SelectItem>
    </SelectContent>
  </Select>
</div>
```

## 表單配置更新

### Custom Form Service

**檔案**: `server/services/custom-form-service.ts`

**變更內容**:

1. **欄位映射新增**:
```json
{
  "field_mappings": {
    "isShowed": "is_showed",
    // ... 其他映射
  }
}
```

2. **表單欄位新增**:
```json
{
  "id": "isShowed",
  "type": "select",
  "label": "學員是否上線",
  "order": 5,
  "required": true,
  "options": ["true", "false"],
  "placeholder": "請選擇學員出席狀態"
}
```

3. **字串轉布林處理**:
```typescript
// 在 saveToCustomTable 函數中
for (const [fieldId, columnName] of Object.entries(form.field_mappings)) {
  if (data[fieldId] !== undefined) {
    let value = data[fieldId];

    // ✨ 特殊處理：將字串 "true"/"false" 轉換為 boolean
    if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    }

    insertData[columnName] = value;
  }
}
```

## 測試

### 驗證腳本

1. **檢查欄位是否新增**:
```bash
npx tsx scripts/verify-is-showed-column.ts
```

2. **檢查表單配置**:
```bash
npx tsx scripts/check-trial-form-mapping.ts
```

3. **測試表單提交**:
```bash
npx tsx scripts/test-is-showed-submission.ts
```

### 測試結果

✅ 資料庫欄位新增成功
✅ 表單配置更新成功
✅ UI 欄位顯示正常
✅ 表單提交成功
✅ 字串轉布林轉換正確
✅ 資料庫儲存正確

## API 流程

```
使用者提交表單
  ↓
POST /api/forms/public/:id/submit
  ↓
customFormService.submitFormData()
  ↓
saveToCustomTable()
  ↓
字串 "true"/"false" → boolean true/false
  ↓
INSERT INTO trial_class_attendance
  ↓
is_showed 欄位儲存為 BOOLEAN
```

## 資料範例

### 表單提交資料
```json
{
  "studentName": "王小明",
  "studentEmail": "wang@example.com",
  "classDate": "2025-11-20",
  "teacherName": "Karen",
  "isShowed": "true",  // 字串形式
  "notes": "上課表現良好",
  "noConversionReason": ""
}
```

### 資料庫儲存結果
```sql
SELECT student_name, is_showed FROM trial_class_attendance;

student_name | is_showed
-------------|----------
王小明       | true      -- boolean 類型
```

## 注意事項

1. **欄位必填**: `is_showed` 在表單中設為必填欄位
2. **三態值**: 資料庫允許 `true`, `false`, `null` 三種狀態
3. **舊資料**: 舊的體驗課記錄 `is_showed` 為 `null`（未記錄）
4. **索引優化**: 僅索引非 NULL 值，減少索引大小

## 相關檔案

### 資料庫
- `supabase/migrations/063_add_is_showed_to_trial_attendance.sql`

### Backend
- `server/services/custom-form-service.ts` (型別轉換邏輯)

### Frontend
- `client/src/pages/forms/public-trial-class-form.tsx` (UI)
- `client/src/hooks/use-student-profile.ts` (TypeScript 型別)

### 測試腳本
- `scripts/verify-is-showed-column.ts`
- `scripts/check-trial-form-mapping.ts`
- `scripts/add-is-showed-to-trial-form.ts`
- `scripts/test-is-showed-submission.ts`

## 未來改進建議

1. **批量更新**: 提供介面批量更新舊資料的 `is_showed` 狀態
2. **統計分析**: 在報表中加入「上線率」指標（上線人數 / 總體驗課數）
3. **自動判斷**: 整合視訊會議系統，自動記錄學員是否上線
4. **提醒功能**: 學員未上線時自動發送提醒通知

## 變更記錄

| 日期 | 變更內容 | 責任人 |
|------|---------|--------|
| 2025-11-20 | 初始實作完成 | Claude |
