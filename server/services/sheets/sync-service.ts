/**
 * Sync Service
 *
 * 核心同步邏輯：從 Google Sheets 讀取資料 → 轉換 → 寫入 Supabase
 */

import { GoogleSheetsAPI } from './google-sheets-api';
import { insertAndReturn, queryDatabase } from '../pg-client';

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

export class SyncService {
  private api: GoogleSheetsAPI;

  constructor(credentials: any) {
    this.api = new GoogleSheetsAPI(credentials);
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
      const rawData = await this.api.getWorksheetData(
        mapping.sheet_id,
        mapping.worksheet_name
      );

      if (rawData.length === 0) {
        console.log('⚠️  No data found in worksheet');
        await this.logSync(mappingId, 'success', 0);
        return;
      }

      // 4. 轉換資料
      const transformedData = this.transformData(rawData, mapping.field_mappings);
      console.log(`🔄 Transformed ${transformedData.length} records`);

      // 5. 清空目標表（全量同步）
      await this.clearTable(mapping.target_table);

      // 6. 寫入 Supabase
      await this.loadToSupabase(mapping.target_table, transformedData);

      // 7. 記錄同步成功
      await this.logSync(mappingId, 'success', transformedData.length);
      console.log(`✅ Sync completed: ${transformedData.length} records synced`);

    } catch (error: any) {
      console.error(`❌ Sync failed:`, error.message);
      await this.logSync(mappingId, 'failed', 0, error.message);
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
          record[mapping.supabaseColumn] = row[googleIndex];
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
    await queryDatabase(`DELETE FROM ${table}`);
  }

  /**
   * 寫入 Supabase
   */
  private async loadToSupabase(table: string, data: any[]): Promise<void> {
    console.log(`💾 Loading ${data.length} records to ${table}...`);

    for (const record of data) {
      try {
        await insertAndReturn(table, record);
      } catch (error: any) {
        console.error(`❌ Error inserting record:`, error.message);
        console.error(`📝 Record:`, JSON.stringify(record, null, 2));
        // 繼續處理其他記錄
      }
    }
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
