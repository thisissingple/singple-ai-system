/**
 * ETL Load Module
 *
 * 負責將轉換後的資料載入 Supabase
 */

import { getSupabaseClient, isSupabaseAvailable } from '../supabase-client';
import type { Worksheet } from '../../../shared/schema';
import type { TransformResult } from './transform';
import { getValidRecords, standardizeRecords } from './transform';

export interface LoadResult {
  tableName: string;
  insertedCount: number;
  deletedCount: number;
  errors: string[];
  loadedAt: Date;
}

export interface LoadOptions {
  deleteOldData?: boolean;
  batchSize?: number;
}

/**
 * 載入資料到 Supabase
 */
export async function loadToSupabase(
  transformResult: TransformResult,
  options: LoadOptions = {}
): Promise<LoadResult> {
  const { deleteOldData = true, batchSize = 1000 } = options;

  const result: LoadResult = {
    tableName: transformResult.tableName,
    insertedCount: 0,
    deletedCount: 0,
    errors: [],
    loadedAt: new Date(),
  };

  // 檢查 Supabase 是否可用
  if (!isSupabaseAvailable()) {
    const errorMsg = 'Supabase not available';
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }

  const client = getSupabaseClient();
  if (!client) {
    const errorMsg = 'Supabase client not available';
    console.error(`❌ ${errorMsg}`);
    result.errors.push(errorMsg);
    return result;
  }

  try {
    const tableName = transformResult.tableName;
    const worksheet = transformResult.worksheet;

    // 取得有效記錄
    const validRecords = getValidRecords(transformResult);

    if (validRecords.length === 0) {
      console.log(`⚠️  No valid records to load for worksheet "${worksheet.worksheetName}"`);
      return result;
    }

    console.log(`💾 Loading ${validRecords.length} records to ${tableName}...`);

    // 標準化記錄（確保所有記錄有相同的欄位）
    const standardizedRecords = standardizeRecords(validRecords);
    console.log(`🔧 Standardized ${standardizedRecords.length} records`);

    // 刪除舊資料（避免重複）
    if (deleteOldData) {
      console.log(`🗑️  Deleting old data for worksheet ${worksheet.id} from ${tableName}...`);

      const { error: deleteError, count: deleteCount } = await client
        .from(tableName)
        .delete({ count: 'exact' })
        .eq('source_worksheet_id', worksheet.id);

      if (deleteError) {
        const errorMsg = `Error deleting old data: ${deleteError.message}`;
        console.error(`❌ ${errorMsg}`);
        result.errors.push(errorMsg);
        return result;
      }

      result.deletedCount = deleteCount || 0;
      console.log(`✅ Deleted ${result.deletedCount} old records`);
    }

    // 批次插入新資料
    if (standardizedRecords.length <= batchSize) {
      // 單次插入
      const insertResult = await insertBatch(client, tableName, standardizedRecords);

      if (insertResult.error) {
        result.errors.push(insertResult.error);
        return result;
      }

      result.insertedCount = insertResult.count;
    } else {
      // 分批插入
      console.log(`📦 Splitting into batches of ${batchSize}...`);

      for (let i = 0; i < standardizedRecords.length; i += batchSize) {
        const batch = standardizedRecords.slice(i, i + batchSize);
        console.log(`💾 Inserting batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(standardizedRecords.length / batchSize)}...`);

        const insertResult = await insertBatch(client, tableName, batch);

        if (insertResult.error) {
          result.errors.push(`Batch ${i}-${i + batch.length}: ${insertResult.error}`);
          continue;
        }

        result.insertedCount += insertResult.count;
      }
    }

    console.log(`✅ Successfully loaded ${result.insertedCount} records to ${tableName}`);

    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Error loading data to Supabase:`, error);
    result.errors.push(errorMsg);
    return result;
  }
}

/**
 * 插入單個批次的資料
 */
async function insertBatch(
  client: any,
  tableName: string,
  records: Record<string, any>[]
): Promise<{ count: number; error?: string }> {
  try {
    const { error: insertError, count: insertCount } = await client
      .from(tableName)
      .insert(records, { count: 'exact' });

    if (insertError) {
      const errorMsg = `Error inserting data: ${insertError.message}`;
      console.error(`❌ ${errorMsg}`);
      console.error(`📝 Sample record:`, JSON.stringify(records[0], null, 2));
      return { count: 0, error: errorMsg };
    }

    return { count: insertCount || records.length };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Insert error:`, error);
    return { count: 0, error: errorMsg };
  }
}

/**
 * 驗證載入結果
 */
export function validateLoadResult(loadResult: LoadResult): {
  isSuccess: boolean;
  message: string;
} {
  const { insertedCount, errors } = loadResult;

  if (errors.length > 0) {
    return {
      isSuccess: false,
      message: `Load failed: ${errors.join(', ')}`,
    };
  }

  if (insertedCount === 0) {
    return {
      isSuccess: false,
      message: 'No records were inserted',
    };
  }

  return {
    isSuccess: true,
    message: `Successfully loaded ${insertedCount} records`,
  };
}

/**
 * 生成載入摘要報告
 */
export function generateLoadSummary(loadResult: LoadResult): string {
  const { tableName, insertedCount, deletedCount, errors } = loadResult;

  let summary = `💾 Load Summary for ${tableName}\n`;
  summary += `🗑️  Deleted old records: ${deletedCount}\n`;
  summary += `✅ Inserted new records: ${insertedCount}\n`;

  if (errors.length > 0) {
    summary += `\n❌ Errors (${errors.length}):\n`;
    errors.slice(0, 5).forEach(error => {
      summary += `  - ${error}\n`;
    });

    if (errors.length > 5) {
      summary += `  ... and ${errors.length - 5} more errors\n`;
    }
  }

  return summary;
}
