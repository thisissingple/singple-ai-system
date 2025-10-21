# 體驗課打卡表單遷移至 Form Builder 系統

## 📅 遷移日期
2025-10-13

## 🎯 目標
將原本獨立的體驗課打卡表單遷移到統一的 Form Builder 系統，實現所有表單的統一管理。

## ✅ 已完成工作

### 1. 資料庫 Migration
- **檔案**: [026_create_trial_class_form.sql](supabase/migrations/026_create_trial_class_form.sql)
- **內容**: 在 `custom_forms` 表中預先建立體驗課打卡表單配置
- **執行狀態**: ✅ 已執行
- **表單 ID**: `7721acc7-5e6a-4ded-b70f-3db4aff0f840`

### 2. 表單配置
```json
{
  "name": "體驗課打卡記錄",
  "storage_type": "custom_table",
  "target_table": "trial_class_attendance",
  "display_locations": {
    "tabs": ["teacher"],
    "sidebar": false
  },
  "fields": [
    { "id": "studentName", "type": "text", "label": "學員姓名", "required": true },
    { "id": "studentEmail", "type": "email", "label": "學員 Email", "required": true },
    { "id": "classDate", "type": "date", "label": "上課日期", "required": true },
    { "id": "teacherName", "type": "select", "label": "授課老師", "required": true, "dataSource": "api" },
    { "id": "notes", "type": "textarea", "label": "課程文字檔" },
    { "id": "noConversionReason", "type": "textarea", "label": "未轉單原因" }
  ]
}
```

### 3. 移除的舊程式碼

#### 後端 API（[routes.ts](server/routes.ts:4537-4540)）
已移除 5 個舊的體驗課 API：
- ❌ `POST /api/forms/trial-class` - 新增記錄
- ❌ `GET /api/forms/trial-class` - 查詢列表
- ❌ `GET /api/forms/trial-class/stats` - 統計資訊
- ❌ `PUT /api/forms/trial-class/:id` - 更新記錄
- ❌ `DELETE /api/forms/trial-class/:id` - 刪除記錄

#### 前端組件（已移至 archive）
- ❌ [trial-class-form.tsx](archive/old-trial-class-form/trial-class-form.tsx) - 表單填寫組件
- ❌ [trial-class-records.tsx](archive/old-trial-class-form/trial-class-records.tsx) - 記錄管理組件

#### 路由配置（[App.tsx](client/src/App.tsx)）
- ❌ 移除 `/forms/trial-class/records` 路由
- ❌ 移除相關 import

### 4. 新的使用方式

#### 現在統一使用 Form Builder 系統 API：

**查詢表單配置**：
```bash
GET /api/forms/custom?status=active
```

**提交表單資料**：
```bash
POST /api/forms/custom/7721acc7-5e6a-4ded-b70f-3db4aff0f840/submit
Content-Type: application/json

{
  "data": {
    "studentName": "張三",
    "studentEmail": "test@example.com",
    "classDate": "2025-10-13",
    "teacherName": "Elena",
    "notes": "表現良好",
    "noConversionReason": ""
  }
}
```

**查詢提交記錄**：
```bash
GET /api/forms/custom/7721acc7-5e6a-4ded-b70f-3db4aff0f840/submissions?limit=10&offset=0
```

**更新表單配置**：
```bash
PUT /api/forms/custom/7721acc7-5e6a-4ded-b70f-3db4aff0f840
```

**刪除表單**：
```bash
DELETE /api/forms/custom/7721acc7-5e6a-4ded-b70f-3db4aff0f840
```

### 5. 前端使用

在 `/forms` 頁面（FormsPage）中：
1. 切換到「老師專區」分頁
2. 看到「體驗課打卡記錄」表單卡片
3. 點擊卡片即可填寫表單
4. 資料自動提交到 `trial_class_attendance` 表

## 🧪 測試驗證

### 測試 1：查詢表單列表
```bash
curl http://localhost:5000/api/forms/custom?status=active
```
✅ 結果：成功返回體驗課打卡表單配置

### 測試 2：提交表單資料
```bash
curl -X POST http://localhost:5000/api/forms/custom/7721acc7-5e6a-4ded-b70f-3db4aff0f840/submit \
  -H 'Content-Type: application/json' \
  -d '{"data": {"studentName": "測試學員", "studentEmail": "test@example.com", "classDate": "2025-10-13", "teacherName": "Elena", "notes": "表現良好"}}'
```
✅ 結果：成功提交，返回 `{"success": true, "id": "..."}`

### 測試 3：驗證資料庫
```sql
SELECT * FROM trial_class_attendance ORDER BY created_at DESC LIMIT 1;
```
✅ 結果：資料正確寫入 `trial_class_attendance` 表

## 📊 資料流程

```
前端表單 → Form Builder API → custom-form-service → trial_class_attendance 表
```

舊流程：
```
trial-class-form.tsx → /api/forms/trial-class → 直接寫入 trial_class_attendance
```

新流程：
```
FormsPage → DynamicFormRenderer → /api/forms/custom/:id/submit →
customFormService.submitFormData() → saveToCustomTable() → trial_class_attendance
```

## 🎯 優勢

1. **統一管理**：所有表單在 Form Builder 中統一配置和管理
2. **靈活配置**：可在資料庫或管理界面動態調整表單欄位
3. **程式碼簡化**：移除重複的 CRUD 邏輯，統一使用 `custom-form-service`
4. **可擴展性**：未來新增表單只需插入配置，不需寫程式碼
5. **一致性**：所有表單使用相同的 API 和 UI 渲染引擎

## 📝 注意事項

1. **資料表不變**：資料仍存放在原本的 `trial_class_attendance` 表，報表系統無需修改
2. **向後兼容**：舊的資料完全保留，可正常查詢
3. **API 變更**：前端需改用新的 Form Builder API
4. **表單 ID**：體驗課表單的 UUID 為 `7721acc7-5e6a-4ded-b70f-3db4aff0f840`

## 🚀 下一步

建議將其他表單也遷移至 Form Builder 系統：
- [ ] 電訪記錄表單
- [ ] 諮詢記錄表單
- [ ] 成本/收益表單（如需要）

## 🔗 相關文件

- [Form Builder 系統文件](PROJECT_PROGRESS.md#phase-15-form-builder-表單建立系統)
- [Custom Form Service](server/services/custom-form-service.ts)
- [Form Builder API Routes](server/routes.ts:4900-5050)
- [Migration 026](supabase/migrations/026_create_trial_class_form.sql)
