/**
 * Sync Service
 *
 * 核心同步邏輯：從 Google Sheets 讀取資料 → 轉換 → 寫入 Supabase
 */

import { GoogleSheetsAPI } from './google-sheets-api';
import { insertAndReturn, queryDatabase } from '../pg-client';
import { syncAllStudentsToKB } from '../student-knowledge-service';

interface FieldMapping {
  googleColumn: string;
  supabaseColumn: string;
}

interface MappingConfig {
  id: string;
  source_id: string;
  worksheet_name: string;
  target_table: string;
  field_mappings: FieldMapping[];
  sheet_id: string;  // From source
  upsert_config: UpsertConfig | null;  // 🔑 從資料庫讀取的 UPSERT 配置
}

/**
 * 🔑 UPSERT 配置：定義每個表的唯一鍵
 *
 * 配置來源：sheet_mappings.upsert_config 欄位（JSONB）
 * 透過 UI 設定，無需修改程式碼！
 *
 * 配置結構：
 * - uniqueKeys: 唯一鍵欄位陣列
 * - allowNullKeys: 是否允許 NULL 參與唯一性（預設 false）
 */
interface UpsertConfig {
  uniqueKeys: string[];           // 唯一鍵欄位
  allowNullKeys: boolean;         // 是否允許唯一鍵為 NULL（使用 partial index）
}

export interface SyncProgress {
  mappingId: string;
  stage: 'reading' | 'transforming' | 'clearing' | 'inserting' | 'upserting' | 'completed' | 'failed';
  current: number;
  total: number;
  message: string;
  percentage: number;
}

export class SyncService {
  private api: GoogleSheetsAPI;
  private progressCallback?: (progress: SyncProgress) => void;

  constructor(credentials: any, progressCallback?: (progress: SyncProgress) => void) {
    this.api = new GoogleSheetsAPI(credentials);
    this.progressCallback = progressCallback;
  }

  /**
   * 發送進度更新
   */
  private sendProgress(progress: Partial<SyncProgress>) {
    if (this.progressCallback) {
      this.progressCallback(progress as SyncProgress);
    }
  }

  /**
   * 執行同步
   */
  async syncMapping(mappingId: string): Promise<void> {
    console.log(`\n🔄 Starting sync for mapping ${mappingId}...`);

    try {
      // 1. 讀取映射設定
      const mapping = await this.getMapping(mappingId);
      console.log(`📋 Target table: ${mapping.target_table}`);
      console.log(`📋 Worksheet: ${mapping.worksheet_name}`);

      // 2. 記錄同步開始
      await this.logSync(mappingId, 'running', 0);

      // 3. 從 Google Sheets 讀取資料
      this.sendProgress({
        mappingId,
        stage: 'reading',
        current: 0,
        total: 0,
        message: '正在讀取 Google Sheets 資料...',
        percentage: 10,
      });

      const rawData = await this.api.getWorksheetData(
        mapping.sheet_id,
        mapping.worksheet_name
      );

      if (rawData.length === 0) {
        console.log('⚠️  No data found in worksheet');
        await this.logSync(mappingId, 'success', 0);
        this.sendProgress({
          mappingId,
          stage: 'completed',
          current: 0,
          total: 0,
          message: '工作表中沒有資料',
          percentage: 100,
        });
        return;
      }

      // 4. 轉換資料
      this.sendProgress({
        mappingId,
        stage: 'transforming',
        current: 0,
        total: rawData.length - 1,
        message: `正在轉換 ${rawData.length - 1} 筆資料...`,
        percentage: 30,
      });

      const transformedData = this.transformData(rawData, mapping.field_mappings);
      console.log(`🔄 Transformed ${transformedData.length} records`);

      // 5. 根據表格類型選擇同步策略
      let syncResult: { successCount: number; errorCount: number; errors: string[] };

      // 🎯 從資料庫讀取 UPSERT 配置（透過 UI 設定，全自動）
      const upsertConfig = mapping.upsert_config;

      if (upsertConfig && upsertConfig.uniqueKeys && upsertConfig.uniqueKeys.length > 0) {
        // ✅ 有 UPSERT 配置的表格：使用 UPSERT 策略（避免重複資料問題）
        console.log(`📌 Using UPSERT strategy for ${mapping.target_table}`);
        console.log(`   Unique keys: ${upsertConfig.uniqueKeys.join(', ')}`);
        console.log(`   Allow NULL keys: ${upsertConfig.allowNullKeys ?? false}`);

        // 確保 allowNullKeys 有預設值
        const config: UpsertConfig = {
          uniqueKeys: upsertConfig.uniqueKeys,
          allowNullKeys: upsertConfig.allowNullKeys ?? false,
        };

        // 先對源資料去重（同一個 batch 內不能有重複 key，否則 PostgreSQL UPSERT 會報錯）
        const deduplicatedData = this.deduplicateByConfig(transformedData, config);
        console.log(`📊 Deduplicated: ${transformedData.length} → ${deduplicatedData.length} records`);

        this.sendProgress({
          mappingId,
          stage: 'upserting',
          current: 0,
          total: deduplicatedData.length,
          message: `正在 UPSERT ${deduplicatedData.length} 筆資料...`,
          percentage: 40,
        });

        syncResult = await this.loadToSupabaseWithUpsert(mapping.target_table, deduplicatedData, mappingId, config);
      } else {
        // ⚠️ 沒有 UPSERT 配置的表格：使用 DELETE + INSERT
        console.log(`ℹ️ No UPSERT config for ${mapping.target_table}, using DELETE + INSERT`);
        console.log(`   (可在同步設定中配置唯一鍵以啟用 UPSERT)`);

        this.sendProgress({
          mappingId,
          stage: 'clearing',
          current: 0,
          total: transformedData.length,
          message: '正在清空目標表格...',
          percentage: 40,
        });

        await this.clearTable(mapping.target_table);

        // 6. 寫入 Supabase
        this.sendProgress({
          mappingId,
          stage: 'inserting',
          current: 0,
          total: transformedData.length,
          message: `正在寫入 ${transformedData.length} 筆資料...`,
          percentage: 50,
        });

        syncResult = await this.loadToSupabase(mapping.target_table, transformedData, mappingId);
      }

      // 7. 記錄同步結果（包含成功/失敗數量）
      const logMessage = syncResult.errorCount > 0
        ? `成功: ${syncResult.successCount}, 失敗: ${syncResult.errorCount}。失敗原因: ${syncResult.errors.slice(0, 3).join('; ')}${syncResult.errors.length > 3 ? '...' : ''}`
        : null;

      await this.logSync(
        mappingId,
        syncResult.errorCount > 0 ? 'failed' : 'success',
        syncResult.successCount,
        logMessage ?? undefined
      );

      const completionMessage = syncResult.errorCount > 0
        ? `同步完成! 成功 ${syncResult.successCount} 筆，失敗 ${syncResult.errorCount} 筆`
        : `同步完成! 已同步 ${syncResult.successCount} 筆資料`;

      console.log(`✅ Sync completed: ${syncResult.successCount} success, ${syncResult.errorCount} failed`);

      // 🎯 同步完成後，自動建檔所有學員到 student_knowledge_base
      try {
        console.log(`\n📚 Starting student KB sync...`);
        this.sendProgress({
          mappingId,
          stage: 'completed',
          current: syncResult.successCount,
          total: transformedData.length,
          message: '正在同步學員檔案...',
          percentage: 95,
        });

        const studentSyncResult = await syncAllStudentsToKB();
        console.log(`✅ Student KB sync completed:`, studentSyncResult);
        console.log(`   - Total found: ${studentSyncResult.totalFound}`);
        console.log(`   - New students: ${studentSyncResult.newStudents}`);
        console.log(`   - Updated students: ${studentSyncResult.existingStudents}`);
      } catch (studentSyncError: any) {
        // 學員同步失敗不影響主同步流程，僅記錄錯誤
        console.error(`⚠️ Student KB sync failed (non-critical):`, studentSyncError.message);
      }

      this.sendProgress({
        mappingId,
        stage: 'completed',
        current: syncResult.successCount,
        total: transformedData.length,
        message: completionMessage,
        percentage: 100,
      });

    } catch (error: any) {
      console.error(`❌ Sync failed:`, error.message);
      await this.logSync(mappingId, 'failed', 0, error.message);

      this.sendProgress({
        mappingId,
        stage: 'failed',
        current: 0,
        total: 0,
        message: `同步失敗: ${error.message}`,
        percentage: 0,
      });

      throw error;
    }
  }

  /**
   * 讀取映射設定
   */
  private async getMapping(mappingId: string): Promise<MappingConfig> {
    const result = await queryDatabase(`
      SELECT
        sm.*,
        gs.sheet_id
      FROM sheet_mappings sm
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
      WHERE sm.id = $1
    `, [mappingId]);

    if (result.rows.length === 0) {
      throw new Error(`Mapping not found: ${mappingId}`);
    }

    const row = result.rows[0];
    return {
      id: row.id,
      source_id: row.source_id,
      worksheet_name: row.worksheet_name,
      target_table: row.target_table,
      field_mappings: row.field_mappings,
      sheet_id: row.sheet_id,
      upsert_config: row.upsert_config || null,  // 🔑 從資料庫讀取 UPSERT 配置
    };
  }

  /**
   * 轉換資料：Google Sheets 格式 → Supabase 格式
   */
  private transformData(rawData: any[][], fieldMappings: FieldMapping[]): any[] {
    const [headers, ...rows] = rawData;

    return rows.map(row => {
      const record: any = {};

      fieldMappings.forEach(mapping => {
        const googleIndex = headers.indexOf(mapping.googleColumn);
        if (googleIndex >= 0 && row[googleIndex] !== undefined) {
          let value = row[googleIndex];

          // 將空字串轉為 null
          if (value === '') {
            record[mapping.supabaseColumn] = null;
            return;
          }

          // 🆕 自動清理字串前後的空白、tab、換行符號（預防資料品質問題）
          if (typeof value === 'string') {
            value = value.trim();
            // trim 後如果變成空字串，轉為 null
            if (value === '') {
              record[mapping.supabaseColumn] = null;
              return;
            }
          }

          // 清理中文數字（例如 "１" -> "1"）- 必須先做
          if (typeof value === 'string' && /[０-９]/.test(value)) {
            value = value.replace(/[０-９]/g, (ch) => {
              return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30);
            });
          }

          // 特殊處理數字欄位（amount_twd, quantity）
          if (mapping.supabaseColumn === 'amount_twd' || mapping.supabaseColumn === 'quantity') {
            if (typeof value === 'string') {
              // 移除 $ 符號和逗號
              value = value.replace(/[\$,]/g, '').trim();

              // 如果清理後還包含非數字字元（除了負號和小數點），設為 null
              if (value === '' || !/^-?\d+\.?\d*$/.test(value)) {
                value = null;
              }
            }
          }

          record[mapping.supabaseColumn] = value;
        }
      });

      return record;
    }).filter(record => Object.keys(record).length > 0); // 過濾空記錄
  }

  /**
   * 🔑 通用資料去重方法（根據 UPSERT 配置）
   *
   * 去重策略：
   * - allowNullKeys = false (partial index): 只保留所有 key 都有值的記錄
   * - allowNullKeys = true: 保留所有記錄，用完整 key 組合去重
   *
   * @param data 原始資料
   * @param config UPSERT 配置
   * @returns 去重後的資料
   */
  private deduplicateByConfig(data: any[], config: UpsertConfig): any[] {
    const uniqueMap = new Map<string, any>();
    const incompleteKeyRecords: any[] = [];

    for (const record of data) {
      // 建立唯一鍵值
      const keyValues = config.uniqueKeys.map(key => record[key]);
      const hasAllKeys = keyValues.every(v => v !== null && v !== undefined && v !== '');

      if (config.allowNullKeys) {
        // 允許 NULL：用完整 key 組合去重（包含 NULL 值）
        const key = keyValues.map(v => v ?? 'NULL').join('|');
        uniqueMap.set(key, record);
      } else {
        // 不允許 NULL (partial index)：只保留完整 key 的記錄
        if (hasAllKeys) {
          const key = keyValues.join('|');
          uniqueMap.set(key, record);
        } else {
          incompleteKeyRecords.push(record);
        }
      }
    }

    // 記錄跳過的記錄
    if (incompleteKeyRecords.length > 0) {
      console.log(`⚠️ Skipped ${incompleteKeyRecords.length} records with incomplete key`);
      console.log(`   Required keys: ${config.uniqueKeys.join(', ')}`);
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * 清空目標表
   */
  private async clearTable(table: string): Promise<void> {
    console.log(`🗑️  Clearing table ${table}...`);
    // ✅ 使用 'session' mode 執行 DELETE（寫入操作）
    await queryDatabase(`DELETE FROM ${table}`, [], 'session');
    console.log(`✅ Table ${table} cleared successfully`);
  }

  /**
   * 寫入 Supabase (批次插入優化 + 進度回報)
   */
  private async loadToSupabase(table: string, data: any[], mappingId?: string): Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    console.log(`💾 Loading ${data.length} records to ${table}...`);

    if (data.length === 0) {
      return { successCount: 0, errorCount: 0, errors: [] };
    }

    // 批次大小 (每次插入 100 筆)
    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const startTime = Date.now();

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);

      try {
        // 批次插入
        await this.batchInsert(table, batch);
        successCount += batch.length;

        // 計算預估剩餘時間
        const elapsedMs = Date.now() - startTime;
        const avgTimePerRecord = elapsedMs / successCount;
        const remainingRecords = data.length - successCount - errorCount;
        const estimatedRemainingMs = avgTimePerRecord * remainingRecords;
        const estimatedMinutes = Math.ceil(estimatedRemainingMs / 60000);

        // 發送進度更新
        const percentage = 50 + Math.floor(((successCount + errorCount) / data.length) * 50);
        if (mappingId) {
          const timeMessage = estimatedMinutes > 0 ? ` (預估剩餘 ${estimatedMinutes} 分鐘)` : '';
          this.sendProgress({
            mappingId,
            stage: 'inserting',
            current: successCount + errorCount,
            total: data.length,
            message: `正在寫入資料: ${successCount}/${data.length}${timeMessage}`,
            percentage,
          });
        }

        console.log(`✅ Batch ${batchNumber}/${totalBatches}: ${successCount}/${data.length} records inserted`);
      } catch (error: any) {
        console.error(`❌ Batch ${batchNumber} insert failed, falling back to individual inserts:`, error.message);

        // 如果批次失敗,逐一插入這個批次
        for (const record of batch) {
          try {
            await insertAndReturn(table, record);
            successCount++;

            // 更新進度 (逐筆插入時)
            if (mappingId && (successCount + errorCount) % 10 === 0) {
              const percentage = 50 + Math.floor(((successCount + errorCount) / data.length) * 50);
              this.sendProgress({
                mappingId,
                stage: 'inserting',
                current: successCount + errorCount,
                total: data.length,
                message: `正在寫入資料: ${successCount}/${data.length} (逐筆處理)`,
                percentage,
              });
            }
          } catch (err: any) {
            errorCount++;
            const errorMsg = `${err.message}`;
            if (!errors.includes(errorMsg)) {
              errors.push(errorMsg);
            }
            console.error(`❌ Error inserting record:`, err.message);
          }
        }
      }
    }

    console.log(`📊 Insert complete: ${successCount} success, ${errorCount} failed`);
    if (errors.length > 0) {
      console.log(`📋 Unique errors: ${errors.join(', ')}`);
    }

    return { successCount, errorCount, errors };
  }

  /**
   * 批次插入記錄
   */
  private async batchInsert(table: string, records: any[]): Promise<void> {
    if (records.length === 0) return;

    // 取得欄位名稱 (從第一筆記錄)
    const columns = Object.keys(records[0]);

    // 建立 VALUES 子句
    const values: any[] = [];
    const placeholders: string[] = [];

    records.forEach((record, index) => {
      const rowPlaceholders: string[] = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = index * columns.length + colIndex + 1;
        rowPlaceholders.push(`$${paramIndex}`);
        values.push(record[col]);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    // ✅ 使用 'session' mode 執行 INSERT（寫入操作）
    await queryDatabase(sql, values, 'session');
  }

  /**
   * 🔑 使用 UPSERT 策略寫入資料（通用方法）
   *
   * @param table 目標表名
   * @param data 資料陣列
   * @param mappingId 映射 ID（用於進度回報）
   * @param config UPSERT 配置
   */
  private async loadToSupabaseWithUpsert(
    table: string,
    data: any[],
    mappingId: string | undefined,
    config: UpsertConfig
  ): Promise<{
    successCount: number;
    errorCount: number;
    errors: string[];
  }> {
    console.log(`💾 UPSERT ${data.length} records to ${table}...`);

    if (data.length === 0) {
      return { successCount: 0, errorCount: 0, errors: [] };
    }

    const BATCH_SIZE = 100;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const startTime = Date.now();

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(data.length / BATCH_SIZE);

      try {
        await this.batchUpsert(table, batch, config);
        successCount += batch.length;

        // 發送進度更新
        const percentage = 40 + Math.floor(((successCount + errorCount) / data.length) * 60);
        if (mappingId) {
          const elapsedMs = Date.now() - startTime;
          const avgTimePerRecord = elapsedMs / successCount;
          const remainingRecords = data.length - successCount - errorCount;
          const estimatedRemainingMs = avgTimePerRecord * remainingRecords;
          const estimatedMinutes = Math.ceil(estimatedRemainingMs / 60000);
          const timeMessage = estimatedMinutes > 0 ? ` (預估剩餘 ${estimatedMinutes} 分鐘)` : '';

          this.sendProgress({
            mappingId,
            stage: 'upserting',
            current: successCount + errorCount,
            total: data.length,
            message: `正在 UPSERT: ${successCount}/${data.length}${timeMessage}`,
            percentage,
          });
        }

        console.log(`✅ UPSERT Batch ${batchNumber}/${totalBatches}: ${successCount}/${data.length} records`);
      } catch (error: any) {
        console.error(`❌ UPSERT Batch ${batchNumber} failed:`, error.message);
        errorCount += batch.length;
        if (!errors.includes(error.message)) {
          errors.push(error.message);
        }
      }
    }

    console.log(`📊 UPSERT complete: ${successCount} success, ${errorCount} failed`);
    return { successCount, errorCount, errors };
  }

  /**
   * 🔑 批次 UPSERT 記錄（通用方法）
   *
   * @param table 目標表名
   * @param records 記錄陣列
   * @param config UPSERT 配置
   */
  private async batchUpsert(table: string, records: any[], config: UpsertConfig): Promise<void> {
    if (records.length === 0) return;

    const columns = Object.keys(records[0]);

    // 建立 VALUES 子句
    const values: any[] = [];
    const placeholders: string[] = [];

    records.forEach((record, index) => {
      const rowPlaceholders: string[] = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = index * columns.length + colIndex + 1;
        rowPlaceholders.push(`$${paramIndex}`);
        values.push(record[col]);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    // 建立 UPDATE SET 子句（排除唯一鍵欄位）
    const updateColumns = columns.filter(col => !config.uniqueKeys.includes(col));
    const updateSet = updateColumns.length > 0
      ? updateColumns.map(col => `${col} = EXCLUDED.${col}`).join(', ')
      : columns[0] + ' = EXCLUDED.' + columns[0];  // 至少要有一個 UPDATE 欄位

    // 🔑 根據配置建立 ON CONFLICT 子句
    const conflictKeys = config.uniqueKeys.join(', ');
    let conflictClause = `ON CONFLICT (${conflictKeys})`;

    // 如果不允許 NULL，需要加上 WHERE 條件（partial index）
    if (!config.allowNullKeys) {
      const whereConditions = config.uniqueKeys
        .map(key => `${key} IS NOT NULL`)
        .join(' AND ');
      conflictClause += `\n      WHERE ${whereConditions}`;
    }

    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders.join(', ')}
      ${conflictClause}
      DO UPDATE SET ${updateSet}
    `;

    // ✅ 使用 'session' mode 執行 UPSERT（寫入操作）
    await queryDatabase(sql, values, 'session');
  }

  /**
   * 記錄同步日誌
   */
  private async logSync(
    mappingId: string,
    status: 'running' | 'success' | 'failed',
    recordsSynced: number,
    errorMessage?: string
  ): Promise<void> {
    await insertAndReturn('sync_logs', {
      mapping_id: mappingId,
      status,
      records_synced: recordsSynced,
      error_message: errorMessage || null
    });
  }
}
