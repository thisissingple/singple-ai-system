/**
 * ETL Pipeline
 *
 * 整合 Extract、Transform、Load 三個階段
 * 提供統一的同步介面
 */

import type { Worksheet } from '../../../shared/schema';
import {
  extractFromSheets,
  validateExtractedData,
  type ExtractedData,
  type ExtractOptions,
} from './extract';
import {
  transformData,
  generateTransformSummary,
  type TransformResult,
  type TransformOptions,
} from './transform';
import {
  loadToSupabase,
  generateLoadSummary,
  validateLoadResult,
  type LoadResult,
  type LoadOptions,
} from './load';

export interface ETLResult {
  success: boolean;
  worksheet: Worksheet;
  tableName: string;
  extractedRows: number;
  validRows: number;
  invalidRows: number;
  insertedRows: number;
  deletedRows: number;
  errors: string[];
  warnings: string[];
  missingMappings?: import('../../../configs/sheet-field-mappings-complete').MissingFieldInfo[]; // 缺失的欄位映射（Sheet 缺欄位）
  unmappedSupabaseColumns?: import('../../../configs/sheet-field-mappings-complete').UnmappedSupabaseColumnInfo[]; // 未映射的 Supabase 欄位
  duration: number; // milliseconds
}

export interface ETLOptions {
  extract?: ExtractOptions;
  transform?: TransformOptions;
  load?: LoadOptions;
}

/**
 * 執行完整的 ETL 流程
 *
 * @param worksheet 工作表資訊
 * @param headers Google Sheets 欄位標題
 * @param dataRows Google Sheets 資料列
 * @param options ETL 選項
 * @returns ETL 執行結果
 */
export async function runETL(
  worksheet: Worksheet,
  headers: string[],
  dataRows: any[][],
  options: ETLOptions = {}
): Promise<ETLResult> {
  const startTime = Date.now();

  const result: ETLResult = {
    success: false,
    worksheet,
    tableName: worksheet.supabaseTable || '',
    extractedRows: 0,
    validRows: 0,
    invalidRows: 0,
    insertedRows: 0,
    deletedRows: 0,
    errors: [],
    warnings: [],
    duration: 0,
  };

  try {
    // ============================================
    // Stage 1: Extract
    // ============================================
    console.log(`\n📥 [EXTRACT] Extracting data from Google Sheets...`);

    const extractedData = extractFromSheets(
      worksheet,
      headers,
      dataRows,
      options.extract
    );

    // 驗證抽取的資料
    const extractValidation = validateExtractedData(extractedData);
    if (!extractValidation.isValid) {
      result.errors.push(...extractValidation.errors);
      result.duration = Date.now() - startTime;
      return result;
    }

    result.extractedRows = extractedData.totalRows;
    console.log(`✅ Extracted ${extractedData.totalRows} rows`);

    // 處理缺失的欄位映射（Sheet 缺欄位）
    if (extractedData.missingMappings && extractedData.missingMappings.length > 0) {
      result.missingMappings = extractedData.missingMappings;

      // 分類必填與選填
      const requiredMissing = extractedData.missingMappings.filter(m => m.required);
      const optionalMissing = extractedData.missingMappings.filter(m => !m.required);

      if (requiredMissing.length > 0) {
        const missingLabels = requiredMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
        result.warnings.push(`⚠️  Sheet 缺少必填欄位：${missingLabels}`);
        console.log(`⚠️  Sheet 缺少必填欄位：${missingLabels}`);
      }

      if (optionalMissing.length > 0) {
        const missingLabels = optionalMissing.map(m => `${m.label} (${m.googleSheetColumn})`).join('、');
        result.warnings.push(`ℹ️  Sheet 缺少選填欄位：${missingLabels}`);
        console.log(`ℹ️  Sheet 缺少選填欄位：${missingLabels}`);
      }
    } else {
      console.log(`✅ All field mappings found in Sheet headers`);
    }

    // 處理未映射的 Supabase 欄位
    if (extractedData.unmappedSupabaseColumns && extractedData.unmappedSupabaseColumns.length > 0) {
      result.unmappedSupabaseColumns = extractedData.unmappedSupabaseColumns;

      // 過濾掉系統管理欄位和舊有業務欄位
      const userMappableColumns = extractedData.unmappedSupabaseColumns.filter(
        col => !col.isSystemManaged && !col.isLegacyBusiness
      );

      if (userMappableColumns.length > 0) {
        const columnNames = userMappableColumns.map(c => c.supabaseColumn).join('、');
        result.warnings.push(`📋 Supabase 有未映射欄位：${columnNames}`);
        console.log(`📋 Supabase 有未映射欄位 (${userMappableColumns.length})：${columnNames}`);
      }

      // 記錄系統管理欄位（僅供參考）
      const systemColumns = extractedData.unmappedSupabaseColumns.filter(col => col.isSystemManaged);
      if (systemColumns.length > 0) {
        console.log(`ℹ️  系統管理欄位 (${systemColumns.length})：${systemColumns.map(c => c.supabaseColumn).join('、')}`);
      }
    }

    if (extractedData.totalRows === 0) {
      result.warnings.push('No data rows found in worksheet');
      result.success = true; // Not an error, just no data
      result.duration = Date.now() - startTime;
      return result;
    }

    // 驗證 Supabase table mapping
    if (!worksheet.supabaseTable) {
      result.errors.push(`No Supabase table mapping configured for worksheet "${worksheet.worksheetName}"`);
      result.duration = Date.now() - startTime;
      return result;
    }

    result.tableName = worksheet.supabaseTable;

    // ============================================
    // Stage 2: Transform
    // ============================================
    console.log(`\n🔄 [TRANSFORM] Transforming data to Supabase format...`);

    let transformResult: TransformResult;
    try {
      transformResult = transformData(extractedData, options.transform);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Transform failed';
      result.errors.push(errorMsg);
      result.duration = Date.now() - startTime;
      return result;
    }

    result.validRows = transformResult.validCount;
    result.invalidRows = transformResult.invalidCount;

    console.log(generateTransformSummary(transformResult));

    if (transformResult.validCount === 0) {
      result.warnings.push('No valid records after transformation');
      result.success = true; // Not an error, but no data to load
      result.duration = Date.now() - startTime;
      return result;
    }

    // ============================================
    // Stage 3: Load
    // ============================================
    console.log(`\n💾 [LOAD] Loading data to Supabase...`);

    const loadResult = await loadToSupabase(transformResult, options.load);

    result.insertedRows = loadResult.insertedCount;
    result.deletedRows = loadResult.deletedCount;

    if (loadResult.errors.length > 0) {
      result.errors.push(...loadResult.errors);
    }

    console.log(generateLoadSummary(loadResult));

    // 驗證載入結果
    const loadValidation = validateLoadResult(loadResult);
    if (!loadValidation.isSuccess) {
      result.errors.push(loadValidation.message);
      result.duration = Date.now() - startTime;
      return result;
    }

    // ============================================
    // Success
    // ============================================
    result.success = true;
    result.duration = Date.now() - startTime;

    console.log(`\n✅ [ETL] Pipeline completed successfully in ${result.duration}ms`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown ETL error';
    console.error(`❌ [ETL] Pipeline failed:`, error);
    result.errors.push(errorMsg);
    result.duration = Date.now() - startTime;
    return result;
  }
}

/**
 * 生成 ETL 執行摘要報告
 */
export function generateETLSummary(result: ETLResult): string {
  const {
    success,
    worksheet,
    tableName,
    extractedRows,
    validRows,
    invalidRows,
    insertedRows,
    deletedRows,
    errors,
    warnings,
    duration,
  } = result;

  let summary = `\n${'='.repeat(60)}\n`;
  summary += `📊 ETL Summary: ${worksheet.worksheetName} → ${tableName}\n`;
  summary += `${'='.repeat(60)}\n\n`;

  summary += `Status: ${success ? '✅ SUCCESS' : '❌ FAILED'}\n`;
  summary += `Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)\n\n`;

  summary += `📥 Extract:\n`;
  summary += `   - Rows extracted: ${extractedRows}\n\n`;

  summary += `🔄 Transform:\n`;
  summary += `   - Valid rows: ${validRows}\n`;
  summary += `   - Invalid rows: ${invalidRows}\n\n`;

  summary += `💾 Load:\n`;
  summary += `   - Old records deleted: ${deletedRows}\n`;
  summary += `   - New records inserted: ${insertedRows}\n\n`;

  if (warnings.length > 0) {
    summary += `⚠️  Warnings (${warnings.length}):\n`;
    warnings.forEach(warning => {
      summary += `   - ${warning}\n`;
    });
    summary += `\n`;
  }

  if (errors.length > 0) {
    summary += `❌ Errors (${errors.length}):\n`;
    errors.forEach(error => {
      summary += `   - ${error}\n`;
    });
    summary += `\n`;
  }

  summary += `${'='.repeat(60)}\n`;

  return summary;
}

/**
 * 批次執行多個工作表的 ETL
 */
export async function runBatchETL(
  worksheets: Array<{
    worksheet: Worksheet;
    headers: string[];
    dataRows: any[][];
  }>,
  options: ETLOptions = {}
): Promise<ETLResult[]> {
  console.log(`\n🚀 Starting batch ETL for ${worksheets.length} worksheets...\n`);

  const results: ETLResult[] = [];

  for (const { worksheet, headers, dataRows } of worksheets) {
    const result = await runETL(worksheet, headers, dataRows, options);
    results.push(result);

    console.log(generateETLSummary(result));
  }

  // 統計摘要
  const totalExtracted = results.reduce((sum, r) => sum + r.extractedRows, 0);
  const totalValid = results.reduce((sum, r) => sum + r.validRows, 0);
  const totalInvalid = results.reduce((sum, r) => sum + r.invalidRows, 0);
  const totalInserted = results.reduce((sum, r) => sum + r.insertedRows, 0);
  const totalDeleted = results.reduce((sum, r) => sum + r.deletedRows, 0);
  const successCount = results.filter(r => r.success).length;
  const failedCount = results.filter(r => !r.success).length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Batch ETL Summary`);
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Worksheets processed: ${worksheets.length}`);
  console.log(`Success: ${successCount} | Failed: ${failedCount}\n`);
  console.log(`Total extracted: ${totalExtracted}`);
  console.log(`Total valid: ${totalValid}`);
  console.log(`Total invalid: ${totalInvalid}`);
  console.log(`Total deleted: ${totalDeleted}`);
  console.log(`Total inserted: ${totalInserted}\n`);
  console.log(`${'='.repeat(60)}\n`);

  return results;
}

// 匯出所有模組
export * from './extract';
export * from './transform';
export * from './load';
