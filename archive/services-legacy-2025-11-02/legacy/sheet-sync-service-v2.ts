/**
 * Google Sheets 到 Supabase 同步服務 V2
 *
 * 使用 ETL 模式重構：Extract → Transform → Load
 * 提供更清晰的資料流程和錯誤處理
 *
 * 替代: server/services/sheet-sync-service.ts
 */

import { runETL, generateETLSummary, type ETLResult, type ETLOptions } from './etl';
import { getSupabaseClient, isSupabaseAvailable } from './supabase-client';
import type { Worksheet } from '../../shared/schema';

export interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: import('../../configs/sheet-field-mappings-complete').MissingFieldInfo[]; // 缺失的欄位映射（Sheet 缺欄位）
  unmappedSupabaseColumns?: import('../../configs/sheet-field-mappings-complete').UnmappedSupabaseColumnInfo[]; // 未映射的 Supabase 欄位
  duration: number;
}

/**
 * 將 Google Sheets 工作表資料同步到 Supabase
 *
 * @param worksheet 工作表資訊
 * @param headers Google Sheets 欄位標題
 * @param dataRows Google Sheets 資料列（二維陣列）
 * @param options ETL 選項（可選）
 * @returns 同步結果
 */
export async function syncWorksheetToSupabase(
  worksheet: Worksheet,
  headers: string[],
  dataRows: any[][],
  options: ETLOptions = {}
): Promise<SyncResult> {
  // 檢查 Supabase 是否可用
  if (!isSupabaseAvailable()) {
    console.log('⚠️  Supabase not available, skipping sync');
    return {
      success: false,
      insertedCount: 0,
      invalidCount: 0,
      errors: ['Supabase not available'],
      warnings: [],
      duration: 0,
    };
  }

  // 檢查是否有 Supabase table mapping
  if (!worksheet.supabaseTable) {
    console.log(`⚠️  Worksheet "${worksheet.worksheetName}" has no Supabase table configured`);
    return {
      success: false,
      insertedCount: 0,
      invalidCount: 0,
      errors: ['No Supabase table mapping configured'],
      warnings: [],
      duration: 0,
    };
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 Syncing: ${worksheet.worksheetName} → ${worksheet.supabaseTable}`);
  console.log(`${'='.repeat(60)}`);

  // 執行 ETL 流程
  const etlResult: ETLResult = await runETL(worksheet, headers, dataRows, options);

  // 列印詳細摘要
  console.log(generateETLSummary(etlResult));

  // 轉換為 SyncResult 格式（向後相容）
  return {
    success: etlResult.success,
    insertedCount: etlResult.insertedRows,
    invalidCount: etlResult.invalidRows,
    errors: etlResult.errors,
    warnings: etlResult.warnings,
    missingMappings: etlResult.missingMappings,
    unmappedSupabaseColumns: etlResult.unmappedSupabaseColumns,
    duration: etlResult.duration,
  };
}

/**
 * 批次同步多個工作表
 */
export async function syncMultipleWorksheets(
  worksheets: Array<{
    worksheet: Worksheet;
    headers: string[];
    dataRows: any[][];
  }>,
  options: ETLOptions = {}
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const { worksheet, headers, dataRows } of worksheets) {
    const result = await syncWorksheetToSupabase(worksheet, headers, dataRows, options);
    results.push(result);
  }

  return results;
}

/**
 * 查詢學生的完整旅程（跨三張表）
 */
export async function getStudentJourney(studentEmail: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('Supabase not available');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  // 查詢體驗課上課記錄
  const { data: attendanceData, error: attendanceError } = await client
    .from('trial_class_attendance')
    .select('*')
    .eq('student_email', studentEmail)
    .order('class_date', { ascending: false });

  if (attendanceError) {
    throw new Error(`Error fetching attendance: ${attendanceError.message}`);
  }

  // 查詢體驗課購買記錄
  const { data: purchaseData, error: purchaseError } = await client
    .from('trial_class_purchase')
    .select('*')
    .eq('student_email', studentEmail)
    .order('purchase_date', { ascending: false });

  if (purchaseError) {
    throw new Error(`Error fetching purchase: ${purchaseError.message}`);
  }

  // 查詢 EODs 記錄
  const { data: eodsData, error: eodsError } = await client
    .from('eods_for_closers')
    .select('*')
    .eq('student_email', studentEmail)
    .order('deal_date', { ascending: false });

  if (eodsError) {
    throw new Error(`Error fetching EODs: ${eodsError.message}`);
  }

  return {
    studentEmail,
    attendance: attendanceData || [],
    purchases: purchaseData || [],
    eods: eodsData || [],
  };
}

/**
 * 取得老師的學員列表
 */
export async function getTeacherStudents(teacherName: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('Supabase not available');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  const { data, error } = await client
    .from('trial_class_attendance')
    .select('student_email, student_name, class_date, is_reviewed, notes')
    .eq('teacher_name', teacherName)
    .order('class_date', { ascending: false });

  if (error) {
    throw new Error(`Error fetching teacher students: ${error.message}`);
  }

  return data || [];
}

/**
 * 取得咨詢師的業績
 */
export async function getCloserPerformance(closerName: string, startDate?: string, endDate?: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('Supabase not available');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  let query = client
    .from('eods_for_closers')
    .select('*')
    .eq('closer_name', closerName);

  if (startDate) {
    query = query.gte('deal_date', startDate);
  }

  if (endDate) {
    query = query.lte('deal_date', endDate);
  }

  const { data, error } = await query.order('deal_date', { ascending: false });

  if (error) {
    throw new Error(`Error fetching closer performance: ${error.message}`);
  }

  return data || [];
}

/**
 * 取得電訪人員的業績
 */
export async function getCallerPerformance(callerName: string, startDate?: string, endDate?: string) {
  if (!isSupabaseAvailable()) {
    throw new Error('Supabase not available');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  let query = client
    .from('eods_for_closers')
    .select('*')
    .eq('caller_name', callerName);

  if (startDate) {
    query = query.gte('consultation_date', startDate);
  }

  if (endDate) {
    query = query.lte('consultation_date', endDate);
  }

  const { data, error } = await query.order('consultation_date', { ascending: false });

  if (error) {
    throw new Error(`Error fetching caller performance: ${error.message}`);
  }

  return data || [];
}

/**
 * 取得轉換率統計（全公司或特定老師）
 */
export async function getConversionStats(
  teacherName?: string,
  startDate?: string,
  endDate?: string
) {
  if (!isSupabaseAvailable()) {
    throw new Error('Supabase not available');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  // 查詢體驗課上課記錄
  let attendanceQuery = client
    .from('trial_class_attendance')
    .select('student_email, student_name, class_date, is_reviewed');

  if (teacherName) {
    attendanceQuery = attendanceQuery.eq('teacher_name', teacherName);
  }

  if (startDate) {
    attendanceQuery = attendanceQuery.gte('class_date', startDate);
  }

  if (endDate) {
    attendanceQuery = attendanceQuery.lte('class_date', endDate);
  }

  const { data: attendanceData, error: attendanceError } = await attendanceQuery;

  if (attendanceError) {
    throw new Error(`Error fetching attendance: ${attendanceError.message}`);
  }

  // 查詢購買記錄
  let purchaseQuery = client
    .from('trial_class_purchase')
    .select('student_email, purchase_date');

  if (startDate) {
    purchaseQuery = purchaseQuery.gte('purchase_date', startDate);
  }

  if (endDate) {
    purchaseQuery = purchaseQuery.lte('purchase_date', endDate);
  }

  const { data: purchaseData, error: purchaseError } = await purchaseQuery;

  if (purchaseError) {
    throw new Error(`Error fetching purchases: ${purchaseError.message}`);
  }

  // 計算轉換率
  const totalTrialClasses = attendanceData?.length || 0;
  const purchasedEmails = new Set(purchaseData?.map(p => p.student_email) || []);
  const convertedStudents = attendanceData?.filter(a => purchasedEmails.has(a.student_email)).length || 0;
  const conversionRate = totalTrialClasses > 0 ? (convertedStudents / totalTrialClasses) * 100 : 0;

  return {
    totalTrialClasses,
    convertedStudents,
    conversionRate: Math.round(conversionRate * 100) / 100, // 四捨五入到小數點後兩位
    period: {
      startDate: startDate || 'all',
      endDate: endDate || 'all',
    },
    teacher: teacherName || 'all',
  };
}
