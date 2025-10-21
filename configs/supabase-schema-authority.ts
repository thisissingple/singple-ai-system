/**
 * ==================================================
 * SUPABASE SCHEMA - SINGLE SOURCE OF TRUTH
 * ==================================================
 *
 * 這是唯一權威的 schema 定義檔案。
 * 所有 Supabase 資料表的欄位定義都在這裡。
 *
 * 🔑 重要原則：
 * 1. 所有同步程式寫入的欄位必須在這裡定義
 * 2. Migration SQL 必須與這裡的定義完全一致
 * 3. 新增欄位時必須同步更新此檔案和 migration
 * 4. 測試會驗證實際寫入的欄位是否符合此定義
 */

import { z } from 'zod';

// ==================================================
// 共用欄位定義
// ==================================================

/**
 * 所有業務表都有的基礎追蹤欄位
 */
export const BaseTrackingFieldsSchema = z.object({
  id: z.string().uuid(),
  source_worksheet_id: z.string().uuid().nullable(),
  origin_row_index: z.number().int().nullable(),
  synced_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

/**
 * 所有業務表都有的 raw_data 欄位
 */
export const RawDataFieldSchema = z.object({
  raw_data: z.record(z.any()),
});

// ==================================================
// trial_class_attendance Schema
// ==================================================

/**
 * 體驗課上課記錄表
 *
 * 欄位來源：
 * 1. field mapping: student_name, student_email, class_date, teacher_name
 * 2. 系統自動追加: source_worksheet_id, origin_row_index, synced_at
 * 3. raw_data: 所有 Google Sheets 原始資料
 * 4. 舊有欄位: teacher_id, sales_id, department_id, notes
 */
export const TrialClassAttendanceSchema = BaseTrackingFieldsSchema.merge(RawDataFieldSchema).extend({
  // 從 Google Sheets mapping 來的欄位
  student_name: z.string().nullable(),
  student_email: z.string().nullable(), // 必填，但允許 null 以便驗證
  class_date: z.string().nullable(), // ISO date string or null
  teacher_name: z.string().nullable(),

  // 舊有的關聯欄位（Migration 006 之前就存在）
  teacher_id: z.string().nullable(),
  sales_id: z.string().nullable(),
  department_id: z.string().uuid().nullable(),
  notes: z.string().nullable(),
});

export type TrialClassAttendance = z.infer<typeof TrialClassAttendanceSchema>;

/**
 * 寫入時的欄位（排除自動生成的 id, created_at, updated_at）
 */
export const TrialClassAttendanceInsertSchema = TrialClassAttendanceSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type TrialClassAttendanceInsert = z.infer<typeof TrialClassAttendanceInsertSchema>;

// ==================================================
// trial_class_purchase Schema
// ==================================================

/**
 * 體驗課購買記錄表
 *
 * 欄位來源：
 * 1. field mapping: student_name, student_email, package_name, purchase_date, notes
 * 2. 系統自動追加: source_worksheet_id, origin_row_index, synced_at
 * 3. raw_data: 所有 Google Sheets 原始資料
 * 4. 舊有欄位: teacher_id, sales_id, department_id, package_price
 */
export const TrialClassPurchaseSchema = BaseTrackingFieldsSchema.merge(RawDataFieldSchema).extend({
  // 從 Google Sheets mapping 來的欄位
  student_name: z.string().nullable(),
  student_email: z.string().nullable(),
  package_name: z.string().nullable(),
  purchase_date: z.string().nullable(), // ISO date string or null
  notes: z.string().nullable(),

  // 舊有的關聯欄位
  teacher_id: z.string().nullable(),
  sales_id: z.string().nullable(),
  department_id: z.string().uuid().nullable(),
  package_price: z.number().nullable(),
});

export type TrialClassPurchase = z.infer<typeof TrialClassPurchaseSchema>;

export const TrialClassPurchaseInsertSchema = TrialClassPurchaseSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type TrialClassPurchaseInsert = z.infer<typeof TrialClassPurchaseInsertSchema>;

// ==================================================
// eods_for_closers Schema
// ==================================================

/**
 * EODs for Closers
 *
 * 欄位來源：
 * 1. field mapping: student_name, student_email, closer_name, deal_date, notes
 * 2. 系統自動追加: source_worksheet_id, origin_row_index, synced_at
 * 3. raw_data: 所有 Google Sheets 原始資料
 * 4. 舊有欄位: closer_id, setter_id, department_id, report_date
 */
export const EodsForClosersSchema = BaseTrackingFieldsSchema.merge(RawDataFieldSchema).extend({
  // 從 Google Sheets mapping 來的欄位
  student_name: z.string().nullable(),
  student_email: z.string().nullable(),
  closer_name: z.string().nullable(),
  deal_date: z.string().nullable(), // ISO date string or null
  notes: z.string().nullable(),

  // 舊有的關聯欄位
  closer_id: z.string().nullable(),
  setter_id: z.string().nullable(),
  department_id: z.string().uuid().nullable(),
  report_date: z.string().nullable(),
});

export type EodsForClosers = z.infer<typeof EodsForClosersSchema>;

export const EodsForClosersInsertSchema = EodsForClosersSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type EodsForClosersInsert = z.infer<typeof EodsForClosersInsertSchema>;

// ==================================================
// 欄位清單（用於測試驗證）
// ==================================================

/**
 * 每個表實際會寫入的欄位名稱（排除自動生成的 id, created_at, updated_at）
 */
export const EXPECTED_INSERT_FIELDS = {
  trial_class_attendance: [
    'student_name',
    'student_email',
    'class_date',
    'teacher_name',
    'teacher_id',
    'sales_id',
    'department_id',
    'notes',
    'raw_data',
    'source_worksheet_id',
    'origin_row_index',
    'synced_at',
  ] as const,

  trial_class_purchase: [
    'student_name',
    'student_email',
    'package_name',
    'purchase_date',
    'notes',
    'teacher_id',
    'sales_id',
    'department_id',
    'package_price',
    'raw_data',
    'source_worksheet_id',
    'origin_row_index',
    'synced_at',
  ] as const,

  eods_for_closers: [
    'student_name',
    'student_email',
    'closer_name',
    'deal_date',
    'notes',
    'closer_id',
    'setter_id',
    'department_id',
    'report_date',
    'raw_data',
    'source_worksheet_id',
    'origin_row_index',
    'synced_at',
  ] as const,
} as const;

/**
 * SQL 型別對應
 */
export const SQL_COLUMN_DEFINITIONS = {
  trial_class_attendance: {
    // 從 mapping 來的欄位
    student_name: 'TEXT',
    student_email: 'TEXT',
    class_date: 'DATE',
    teacher_name: 'TEXT',
    // 舊有欄位
    teacher_id: 'TEXT',
    sales_id: 'TEXT',
    department_id: 'UUID',
    notes: 'TEXT',
    // 系統欄位
    raw_data: 'JSONB NOT NULL DEFAULT \'{}\'::jsonb',
    source_worksheet_id: 'UUID REFERENCES worksheets(id) ON DELETE SET NULL',
    origin_row_index: 'INTEGER',
    synced_at: 'TIMESTAMPTZ DEFAULT NOW()',
  },

  trial_class_purchase: {
    student_name: 'TEXT',
    student_email: 'TEXT',
    package_name: 'TEXT',
    purchase_date: 'DATE',
    notes: 'TEXT',
    teacher_id: 'TEXT',
    sales_id: 'TEXT',
    department_id: 'UUID',
    package_price: 'NUMERIC(10,2)',
    raw_data: 'JSONB NOT NULL DEFAULT \'{}\'::jsonb',
    source_worksheet_id: 'UUID REFERENCES worksheets(id) ON DELETE SET NULL',
    origin_row_index: 'INTEGER',
    synced_at: 'TIMESTAMPTZ DEFAULT NOW()',
  },

  eods_for_closers: {
    student_name: 'TEXT',
    student_email: 'TEXT',
    closer_name: 'TEXT',
    deal_date: 'DATE',
    notes: 'TEXT',
    closer_id: 'TEXT',
    setter_id: 'TEXT',
    department_id: 'UUID',
    report_date: 'DATE',
    raw_data: 'JSONB NOT NULL DEFAULT \'{}\'::jsonb',
    source_worksheet_id: 'UUID REFERENCES worksheets(id) ON DELETE SET NULL',
    origin_row_index: 'INTEGER',
    synced_at: 'TIMESTAMPTZ DEFAULT NOW()',
  },
} as const;
