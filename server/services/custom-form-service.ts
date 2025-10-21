/**
 * Custom Form Service
 * 自訂表單系統服務
 *
 * 功能：
 * - 建立、查詢、更新、刪除自訂表單
 * - 提交表單資料（支援兩種模式）
 * - 查詢表單提交記錄
 */

import { createPool } from './pg-client';
import { createClient } from '@supabase/supabase-js';

// ================================================
// 型別定義
// ================================================

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'number' | 'tel' | 'date' | 'select' | 'textarea' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  order: number;

  // 特殊設定
  options?: string[];      // select/checkbox 的選項
  min?: number;            // number 的最小值
  max?: number;            // number 的最大值
  minLength?: number;      // text/textarea 的最小長度
  maxLength?: number;      // text/textarea 的最大長度
  defaultValue?: any;      // 預設值
}

export interface DisplayLocations {
  tabs: ('teacher' | 'telemarketing' | 'consultant')[];
  sidebar: boolean;
  sidebar_section?: 'tools' | 'reports' | 'settings';
}

export interface FormConfig {
  id: string;
  name: string;
  description?: string;
  display_locations: DisplayLocations;
  storage_type: 'form_submissions' | 'custom_table';
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
  storage_type: 'form_submissions' | 'custom_table';
  target_table?: string;
  field_mappings?: Record<string, string>;
  fields: FormField[];
  created_by?: string;
}

export interface SubmitFormInput {
  form_id: string;
  data: Record<string, any>;
  submitted_by?: string;
}

// ================================================
// 表單 CRUD
// ================================================

/**
 * 建立自訂表單
 */
export async function createCustomForm(input: CreateFormInput): Promise<FormConfig> {
  const client = createPool();

  // 驗證：如果是 custom_table 模式，必須提供 target_table 和 field_mappings
  if (input.storage_type === 'custom_table') {
    if (!input.target_table) {
      throw new Error('storage_type 為 custom_table 時，必須提供 target_table');
    }
    if (!input.field_mappings || Object.keys(input.field_mappings).length === 0) {
      throw new Error('storage_type 為 custom_table 時，必須提供 field_mappings');
    }
  }

  const result = await client.query(
    `INSERT INTO custom_forms
      (name, description, display_locations, storage_type, target_table, field_mappings, fields, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      input.name,
      input.description || null,
      JSON.stringify(input.display_locations),
      input.storage_type,
      input.target_table || null,
      JSON.stringify(input.field_mappings || {}),
      JSON.stringify(input.fields),
      input.created_by || null
    ]
  );

  return parseFormConfig(result.rows[0]);
}

/**
 * 取得所有表單（可篩選狀態）
 */
export async function getAllForms(status?: 'active' | 'archived'): Promise<FormConfig[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase.from('custom_forms').select('*').order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`查詢表單失敗: ${error.message}`);
  }

  return (data || []).map(parseFormConfig);
}

/**
 * 根據 ID 取得單一表單
 */
export async function getFormById(formId: string): Promise<FormConfig | null> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('custom_forms')
    .select('*')
    .eq('id', formId)
    .single();

  if (error || !data) {
    return null;
  }

  return parseFormConfig(data);
}

/**
 * 更新表單
 */
export async function updateCustomForm(formId: string, input: Partial<CreateFormInput>): Promise<FormConfig> {
  const client = createPool();

  const updateFields: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  if (input.name !== undefined) {
    updateFields.push(`name = $${paramIndex++}`);
    params.push(input.name);
  }

  if (input.description !== undefined) {
    updateFields.push(`description = $${paramIndex++}`);
    params.push(input.description);
  }

  if (input.display_locations !== undefined) {
    updateFields.push(`display_locations = $${paramIndex++}`);
    params.push(JSON.stringify(input.display_locations));
  }

  if (input.storage_type !== undefined) {
    updateFields.push(`storage_type = $${paramIndex++}`);
    params.push(input.storage_type);
  }

  if (input.target_table !== undefined) {
    updateFields.push(`target_table = $${paramIndex++}`);
    params.push(input.target_table);
  }

  if (input.field_mappings !== undefined) {
    updateFields.push(`field_mappings = $${paramIndex++}`);
    params.push(JSON.stringify(input.field_mappings));
  }

  if (input.fields !== undefined) {
    updateFields.push(`fields = $${paramIndex++}`);
    params.push(JSON.stringify(input.fields));
  }

  if (updateFields.length === 0) {
    throw new Error('至少要提供一個欄位進行更新');
  }

  params.push(formId);

  const result = await client.query(
    `UPDATE custom_forms
     SET ${updateFields.join(', ')}, updated_at = NOW()
     WHERE id = $${paramIndex}
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new Error('找不到指定的表單');
  }

  return parseFormConfig(result.rows[0]);
}

/**
 * 刪除表單（軟刪除：改為 archived）
 */
export async function archiveForm(formId: string): Promise<void> {
  const client = createPool();

  await client.query(
    'UPDATE custom_forms SET status = $1, updated_at = NOW() WHERE id = $2',
    ['archived', formId]
  );
}

/**
 * 永久刪除表單
 */
export async function deleteForm(formId: string): Promise<void> {
  const client = createPool();

  await client.query('DELETE FROM custom_forms WHERE id = $1', [formId]);
}

// ================================================
// 表單提交
// ================================================

/**
 * 提交表單資料
 *
 * 根據表單的 storage_type 決定存放位置：
 * - form_submissions: 存入統一的 form_submissions 表
 * - custom_table: 根據 field_mappings 映射後存入指定表
 */
export async function submitFormData(input: SubmitFormInput): Promise<{ id: string; success: boolean }> {
  // 1. 取得表單配置
  const form = await getFormById(input.form_id);
  if (!form) {
    throw new Error('找不到指定的表單');
  }

  if (form.status !== 'active') {
    throw new Error('此表單已停用，無法提交');
  }

  // 2. 驗證必填欄位
  validateRequiredFields(form.fields, input.data);

  // 3. 根據 storage_type 決定存放方式
  if (form.storage_type === 'form_submissions') {
    // 存入統一表
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        form_id: input.form_id,
        data: input.data,
        submitted_by: input.submitted_by || null
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`儲存表單失敗: ${error.message}`);
    }

    return { id: data.id, success: true };
  } else {
    // 存入自訂表
    return await saveToCustomTable(form, input.data, input.submitted_by);
  }
}

/**
 * 儲存到自訂表（根據欄位映射）
 */
async function saveToCustomTable(
  form: FormConfig,
  data: Record<string, any>,
  submittedBy?: string
): Promise<{ id: string; success: boolean }> {
  if (!form.target_table || !form.field_mappings) {
    throw new Error('表單配置錯誤：缺少 target_table 或 field_mappings');
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 建立欄位映射
  const insertData: Record<string, any> = {};

  for (const [fieldId, columnName] of Object.entries(form.field_mappings)) {
    if (data[fieldId] !== undefined) {
      insertData[columnName] = data[fieldId];
    }
  }

  if (Object.keys(insertData).length === 0) {
    throw new Error('沒有可儲存的資料');
  }

  try {
    const { data: result, error } = await supabase
      .from(form.target_table)
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return { id: result.id, success: true };
  } catch (error: any) {
    console.error('儲存到自訂表失敗:', error);
    throw new Error(`儲存到表 ${form.target_table} 失敗: ${error.message}`);
  }
}

/**
 * 驗證必填欄位
 */
function validateRequiredFields(fields: FormField[], data: Record<string, any>): void {
  for (const field of fields) {
    if (field.required && (data[field.id] === undefined || data[field.id] === null || data[field.id] === '')) {
      throw new Error(`欄位「${field.label}」為必填`);
    }
  }
}

// ================================================
// 查詢提交記錄
// ================================================

/**
 * 取得表單的所有提交記錄（僅限 form_submissions 模式）
 */
export async function getFormSubmissions(
  formId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<any[]> {
  const client = createPool();

  const { limit = 50, offset = 0 } = options;

  const result = await client.query(
    `SELECT * FROM form_submissions
     WHERE form_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [formId, limit, offset]
  );

  return result.rows.map(row => ({
    id: row.id,
    form_id: row.form_id,
    data: row.data,
    submitted_by: row.submitted_by,
    created_at: row.created_at,
    updated_at: row.updated_at
  }));
}

/**
 * 統計表單提交數量
 */
export async function countFormSubmissions(formId: string): Promise<number> {
  const client = createPool();

  const result = await client.query(
    'SELECT COUNT(*) FROM form_submissions WHERE form_id = $1',
    [formId]
  );

  return parseInt(result.rows[0].count);
}

// ================================================
// 輔助函式
// ================================================

/**
 * 解析資料庫回傳的表單配置
 */
function parseFormConfig(row: any): FormConfig {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    display_locations: typeof row.display_locations === 'string'
      ? JSON.parse(row.display_locations)
      : row.display_locations,
    storage_type: row.storage_type,
    target_table: row.target_table,
    field_mappings: typeof row.field_mappings === 'string'
      ? JSON.parse(row.field_mappings)
      : row.field_mappings,
    fields: typeof row.fields === 'string'
      ? JSON.parse(row.fields)
      : row.fields,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: row.created_by
  };
}
