/**
 * Google Sheets → Supabase 同步服務
 *
 * 目標：穩定同步三張表，確保資料完整性
 * 流程：Extract → Transform → Load
 */

import { transformRowData, validateRequiredFields, detectMissingMappings, getFieldMapping, type MissingFieldInfo } from '../../configs/sheet-field-mappings';
import { getSupabaseClient, isSupabaseAvailable } from './supabase-client';
import type { Worksheet } from '../../shared/schema';

export interface InvalidRecord {
  rowIndex: number;
  errors: string[];
  rowData?: Record<string, any>;           // 原始資料，用於前端預覽
  missingFields?: string[];                 // 缺少的 Supabase 欄位名稱（snake_case）
  missingGoogleSheetColumns?: string[];    // 缺少的 Google Sheets 欄位名稱（用於前端 highlight）
}

export interface SyncResult {
  success: boolean;
  insertedCount: number;
  invalidCount: number;
  errors: string[];
  warnings: string[];
  missingMappings?: MissingFieldInfo[]; // 缺失的欄位映射
  invalidRecords?: InvalidRecord[]; // 無效資料的詳細資訊
}

/**
 * 將 Supabase 欄位名稱轉換為 Google Sheets 欄位名稱
 */
function convertSupabaseFieldsToGoogleSheetColumns(
  supabaseFields: string[],
  tableName: string
): string[] {
  const mapping = getFieldMapping(tableName);
  const result: string[] = [];

  for (const supabaseField of supabaseFields) {
    const found = mapping.find(m => m.supabaseColumn === supabaseField);
    if (found) {
      result.push(found.googleSheetColumn);
    } else {
      // 如果找不到映射，回傳原始欄位名稱
      result.push(supabaseField);
    }
  }

  return result;
}

/**
 * 同步 Google Sheets 工作表到 Supabase
 */
export async function syncWorksheetToSupabase(
  worksheet: Worksheet,
  headers: string[],
  dataRows: any[][]
): Promise<SyncResult> {
  const result: SyncResult = {
    success: false,
    insertedCount: 0,
    invalidCount: 0,
    errors: [],
    warnings: [],
  };

  // 前置檢查
  if (!isSupabaseAvailable()) {
    result.errors.push('Supabase not available');
    return result;
  }

  if (!worksheet.supabaseTable) {
    result.errors.push(`Worksheet "${worksheet.worksheetName}" has no Supabase table mapping`);
    return result;
  }

  const client = getSupabaseClient();
  if (!client) {
    result.errors.push('Supabase client not available');
    return result;
  }

  const tableName = worksheet.supabaseTable;
  console.log(`\n🔄 Syncing: ${worksheet.worksheetName} → ${tableName}`);
  console.log(`📥 Extracting ${dataRows.length} rows...`);
  console.log(`🔍 First row sample:`, dataRows[0]);

  try {
    // ============================================
    // 檢測缺失的欄位映射
    // ============================================
    const missingMappings = detectMissingMappings(headers, tableName);

    if (missingMappings.length > 0) {
      result.missingMappings = missingMappings;

      // 記錄缺失欄位（必填與選填分開）
      const requiredMissing = missingMappings.filter(m => m.required);
      const optionalMissing = missingMappings.filter(m => !m.required);

      if (requiredMissing.length > 0) {
        const missingLabels = requiredMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
        result.warnings.push(`⚠️  缺少必填欄位：${missingLabels}`);
        console.log(`⚠️  缺少必填欄位：${missingLabels}`);
      }

      if (optionalMissing.length > 0) {
        const missingLabels = optionalMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
        result.warnings.push(`ℹ️  缺少選填欄位：${missingLabels}`);
        console.log(`ℹ️  缺少選填欄位：${missingLabels}`);
      }
    } else {
      console.log(`✅ All field mappings found in Sheet headers`);
    }

    // ============================================
    // EXTRACT: 建立 row data
    // ============================================
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowData: Record<string, any> = {};

      // 建立 header → value mapping
      headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // 跳過空列
      const hasAnyValue = Object.values(rowData).some(v => v !== '');
      if (!hasAnyValue) {
        continue;
      }

      rows.push(rowData);
    }

    console.log(`✅ Extracted ${rows.length} non-empty rows`);

    if (rows.length === 0) {
      result.warnings.push('No data rows found');
      result.success = true;
      return result;
    }

    // ============================================
    // TRANSFORM: 欄位映射與驗證
    // ============================================
    console.log(`🔄 Transforming data...`);

    const validRecords: Record<string, any>[] = [];
    const invalidRecords: Array<{ rowIndex: number; errors: string[] }> = [];

    for (let i = 0; i < rows.length; i++) {
      const rowData = rows[i];

      try {
        // 欄位映射
        const transformed = transformRowData(rowData, tableName);

        // 加入追蹤欄位
        transformed.source_worksheet_id = worksheet.id;
        transformed.origin_row_index = i;
        transformed.synced_at = new Date().toISOString();

        // 驗證必填欄位
        const validation = validateRequiredFields(transformed, tableName);

        if (!validation.isValid) {
          const googleSheetColumns = convertSupabaseFieldsToGoogleSheetColumns(validation.missingFields, tableName);
          invalidRecords.push({
            rowIndex: i,
            errors: [`缺少必填欄位：${validation.missingFields.join('、')}`],
            rowData: rowData,  // 保留原始 Google Sheets 資料
            missingFields: validation.missingFields,
            missingGoogleSheetColumns: googleSheetColumns,  // 用於前端 highlight
          });
          result.invalidCount++;
          continue;
        }

        // 額外驗證：student_email
        if (!transformed.student_email || transformed.student_email.trim() === '') {
          const googleSheetColumns = convertSupabaseFieldsToGoogleSheetColumns(['student_email'], tableName);
          invalidRecords.push({
            rowIndex: i,
            errors: ['缺少必填欄位：student_email（用於跨表關聯）'],
            rowData: rowData,
            missingFields: ['student_email'],
            missingGoogleSheetColumns: googleSheetColumns,
          });
          result.invalidCount++;
          continue;
        }

        validRecords.push(transformed);
      } catch (error) {
        invalidRecords.push({
          rowIndex: i,
          errors: [error instanceof Error ? error.message : '資料轉換錯誤'],
          rowData: rowData,
          missingFields: [],
        });
        result.invalidCount++;
      }
    }

    console.log(`✅ Valid: ${validRecords.length} | ❌ Invalid: ${result.invalidCount}`);

    // 記錄無效資料（前 5 筆）
    if (invalidRecords.length > 0) {
      result.warnings.push(`Found ${invalidRecords.length} invalid rows`);
      invalidRecords.slice(0, 5).forEach(({ rowIndex, errors }) => {
        console.log(`⚠️  Row ${rowIndex}: ${errors.join(', ')}`);
      });
    }

    if (validRecords.length === 0) {
      result.errors.push('No valid records to sync');
      return result;
    }

    // ============================================
    // 標準化記錄（確保所有記錄有相同的欄位）
    // ============================================
    const allKeys = new Set<string>();
    validRecords.forEach(record => {
      Object.keys(record).forEach(key => allKeys.add(key));
    });

    const standardizedRecords = validRecords.map(record => {
      const standardized: Record<string, any> = {};
      allKeys.forEach(key => {
        standardized[key] = record[key] !== undefined ? record[key] : null;
      });
      return standardized;
    });

    console.log(`🔧 Standardized ${standardizedRecords.length} records with ${allKeys.size} fields`);

    // ============================================
    // LOAD: 刪除舊資料 + 批次插入
    // ============================================
    console.log(`💾 Loading to Supabase...`);

    // 刪除舊資料（避免重複）
    console.log(`🗑️  Deleting old data for worksheet ${worksheet.id}...`);

    // 1. 刪除該 worksheet 的舊資料
    const { error: deleteError, count: deleteCount } = await client
      .from(tableName)
      .delete({ count: 'exact' })
      .eq('source_worksheet_id', worksheet.id);

    if (deleteError) {
      result.errors.push(`Delete error: ${deleteError.message}`);
      return result;
    }

    console.log(`✅ Deleted ${deleteCount || 0} old records`);

    // 2. 清理 source_worksheet_id 為 null 的舊資料（避免累積）
    const { error: deleteNullError, count: deleteNullCount } = await client
      .from(tableName)
      .delete({ count: 'exact' })
      .is('source_worksheet_id', null);

    if (!deleteNullError && deleteNullCount && deleteNullCount > 0) {
      console.log(`🗑️  Cleaned up ${deleteNullCount} records with null source_worksheet_id`);
    }

    // 批次插入
    console.log(`💾 Inserting ${standardizedRecords.length} records...`);
    const { error: insertError, count: insertCount } = await client
      .from(tableName)
      .insert(standardizedRecords, { count: 'exact' });

    if (insertError) {
      result.errors.push(`Insert error: ${insertError.message}`);
      console.error(`❌ Insert failed:`, insertError);
      console.error(`📝 Sample record:`, JSON.stringify(standardizedRecords[0], null, 2));
      return result;
    }

    result.insertedCount = insertCount || standardizedRecords.length;
    result.success = true;
    result.invalidRecords = invalidRecords; // 回傳無效資料的詳細資訊

    console.log(`✅ Successfully synced ${result.insertedCount} records to ${tableName}\n`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Sync failed:`, error);
    result.errors.push(errorMsg);
    return result;
  }
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

  // 查詢三張表
  const [attendance, purchase, eods] = await Promise.all([
    client
      .from('trial_class_attendance')
      .select('*')
      .eq('student_email', studentEmail)
      .order('class_date', { ascending: false }),

    client
      .from('trial_class_purchase')
      .select('*')
      .eq('student_email', studentEmail)
      .order('purchase_date', { ascending: false }),

    client
      .from('eods_for_closers')
      .select('*')
      .eq('student_email', studentEmail)
      .order('deal_date', { ascending: false }),
  ]);

  if (attendance.error) throw new Error(`Attendance error: ${attendance.error.message}`);
  if (purchase.error) throw new Error(`Purchase error: ${purchase.error.message}`);
  if (eods.error) throw new Error(`EODs error: ${eods.error.message}`);

  return {
    studentEmail,
    attendance: attendance.data || [],
    purchases: purchase.data || [],
    eods: eods.data || [],
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

  if (startDate) query = query.gte('deal_date', startDate);
  if (endDate) query = query.lte('deal_date', endDate);

  const { data, error } = await query.order('deal_date', { ascending: false });

  if (error) {
    throw new Error(`Error fetching closer performance: ${error.message}`);
  }

  return data || [];
}
