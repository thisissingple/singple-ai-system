-- ================================================
-- 建立體驗課打卡表單（使用 Form Builder 系統）
-- ================================================

-- 插入體驗課打卡表單定義
INSERT INTO custom_forms (
  name,
  description,
  display_locations,
  storage_type,
  target_table,
  field_mappings,
  fields,
  status,
  created_by
) VALUES (
  '體驗課打卡記錄',
  '記錄學生體驗課出席情況，資料將即時同步至體驗課報表',
  '{"tabs": ["teacher"], "sidebar": false}'::jsonb,
  'custom_table',
  'trial_class_attendance',
  '{
    "studentName": "student_name",
    "studentEmail": "student_email",
    "classDate": "class_date",
    "teacherName": "teacher_name",
    "notes": "class_transcript",
    "noConversionReason": "no_conversion_reason"
  }'::jsonb,
  '[
    {
      "id": "studentName",
      "type": "text",
      "label": "學員姓名",
      "placeholder": "請輸入學員姓名",
      "required": true,
      "order": 1
    },
    {
      "id": "studentEmail",
      "type": "email",
      "label": "學員 Email",
      "placeholder": "student@example.com",
      "required": true,
      "order": 2
    },
    {
      "id": "classDate",
      "type": "date",
      "label": "上課日期",
      "required": true,
      "order": 3,
      "defaultValue": "today"
    },
    {
      "id": "teacherName",
      "type": "select",
      "label": "授課老師",
      "placeholder": "請選擇授課老師",
      "required": true,
      "order": 4,
      "dataSource": {
        "type": "api",
        "endpoint": "/api/teachers",
        "valueField": "name",
        "labelField": "name"
      }
    },
    {
      "id": "notes",
      "type": "textarea",
      "label": "課程文字檔",
      "placeholder": "課後記錄、學生表現、特殊事項等...",
      "required": false,
      "order": 5,
      "minLength": 0,
      "maxLength": 2000
    },
    {
      "id": "noConversionReason",
      "type": "textarea",
      "label": "未轉單原因",
      "placeholder": "如果學生未轉單，請填寫原因...",
      "required": false,
      "order": 6,
      "minLength": 0,
      "maxLength": 500
    }
  ]'::jsonb,
  'active',
  'system'
);

-- 註解說明
COMMENT ON TABLE custom_forms IS '自訂表單定義表 - 已包含體驗課打卡表單';
