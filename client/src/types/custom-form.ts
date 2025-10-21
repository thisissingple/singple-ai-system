/**
 * Custom Form Types
 * 自訂表單系統型別定義
 */

export type FieldType = 'text' | 'email' | 'number' | 'tel' | 'date' | 'select' | 'textarea' | 'checkbox';

export type DataSource = 'manual' | 'teachers' | 'students';

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;

  // 特殊設定
  options?: string[];      // select/checkbox 的選項（手動輸入時使用）
  dataSource?: DataSource; // 資料來源（從資料庫載入選項）
  min?: number;            // number 的最小值
  max?: number;            // number 的最大值
  minLength?: number;      // text/textarea 的最小長度
  maxLength?: number;      // text/textarea 的最大長度
  defaultValue?: any;      // 預設值
}

export type RoleType = 'teacher' | 'telemarketing' | 'consultant';

export type SidebarSection = 'tools' | 'reports' | 'settings';

export interface DisplayLocations {
  tabs: RoleType[];
  sidebar: boolean;
  sidebar_section?: SidebarSection;
}

export type StorageType = 'form_submissions' | 'custom_table';

export interface FormConfig {
  id: string;
  name: string;
  description?: string;
  display_locations: DisplayLocations;
  storage_type: StorageType;
  target_table?: string;
  field_mappings?: Record<string, string>;  // field_id -> table_column_name
  fields: FormField[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateFormInput {
  name: string;
  description?: string;
  display_locations: DisplayLocations;
  storage_type: StorageType;
  target_table?: string;
  field_mappings?: Record<string, string>;
  fields: FormField[];
  created_by?: string;
}

export interface TableColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

export interface TableInfo {
  table_name: string;
  columns: TableColumn[];
}

export interface FormSubmission {
  id: string;
  form_id: string;
  data: Record<string, any>;
  submitted_by?: string;
  created_at: string;
  updated_at: string;
}

// 欄位類型標籤
export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: '文字輸入',
  email: 'Email',
  number: '數字',
  tel: '電話',
  date: '日期',
  select: '下拉選單',
  textarea: '長文本',
  checkbox: '多選框'
};

// 角色標籤
export const ROLE_LABELS: Record<RoleType, string> = {
  teacher: '老師專區',
  telemarketing: '電訪人員專區',
  consultant: '諮詢師專區'
};

// 側邊選單區域標籤
export const SIDEBAR_SECTION_LABELS: Record<SidebarSection, string> = {
  tools: '工具',
  reports: '報表分析',
  settings: '設定'
};

// 資料來源標籤
export const DATA_SOURCE_LABELS: Record<DataSource, string> = {
  manual: '手動輸入選項',
  teachers: '從資料庫載入：老師列表',
  students: '從資料庫載入：學生列表'
};
