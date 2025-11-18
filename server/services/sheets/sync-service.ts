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
}

export interface SyncProgress {
  mappingId: string;
  stage: 'reading' | 'transforming' | 'clearing' | 'inserting' | 'completed' | 'failed';
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

      // 5. 清空目標表（全量同步）
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

      const syncResult = await this.loadToSupabase(mapping.target_table, transformedData, mappingId);

      // 7. 記錄同步結果（包含成功/失敗數量）
      const logMessage = syncResult.errorCount > 0
        ? `成功: ${syncResult.successCount}, 失敗: ${syncResult.errorCount}。失敗原因: ${syncResult.errors.slice(0, 3).join('; ')}${syncResult.errors.length > 3 ? '...' : ''}`
        : null;

      await this.logSync(
        mappingId,
        syncResult.errorCount > 0 ? 'failed' : 'success',
        syncResult.successCount,
        logMessage
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
      sheet_id: row.sheet_id
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
          // 將空字串轉為 null，以符合 PostgreSQL 的 DATE/TIMESTAMP 類型
          const value = row[googleIndex];
          record[mapping.supabaseColumn] = value === '' ? null : value;
        }
      });

      return record;
    }).filter(record => Object.keys(record).length > 0); // 過濾空記錄
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
