/**
 * Sync Orchestrator
 * 統一管理 Google Sheets 同步流程，包含鎖機制、歷史記錄、錯誤處理
 */

import { google } from 'googleapis';
import { googleAuthService } from './google-auth-service';
import { getSupabaseClient } from './supabase-client';
import {
  identifyTargetTable,
  batchTransformAndValidate,
  type SupabaseTableName,
} from './reporting/sheet-to-supabase-mapping';

export interface SyncOptions {
  spreadsheetId: string;  // Supabase spreadsheets.id (UUID)
  triggeredBy: 'schedule' | 'manual';
  triggeredByUserId?: string | null;
  worksheetIds?: string[]; // 若指定，只同步特定 worksheets
}

export interface SyncResult {
  success: boolean;
  rowsSynced: number;
  rowsFailed: number;
  error?: string;
}

class SyncOrchestrator {
  /**
   * 主同步流程
   */
  async sync(options: SyncOptions): Promise<SyncResult> {
    const { spreadsheetId, triggeredBy, triggeredByUserId } = options;
    const supabase = getSupabaseClient();

    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // 1. 取得 spreadsheet 資訊
    const { data: spreadsheet, error: spreadsheetError } = await supabase
      .from('spreadsheets')
      .select('*')
      .eq('id', spreadsheetId)
      .single();

    if (spreadsheetError || !spreadsheet) {
      throw new Error(`Spreadsheet ${spreadsheetId} not found`);
    }

    // 2. 檢查同步鎖（防止併發）
    const lockAcquired = await this.acquireLock(spreadsheetId);
    if (!lockAcquired) {
      console.warn(`[Sync] 同步已在進行中，跳過: ${spreadsheet.name}`);
      return { success: false, rowsSynced: 0, rowsFailed: 0, error: 'Sync already in progress' };
    }

    // 3. 建立 sync_history 記錄
    const { data: syncRecord, error: syncRecordError } = await supabase
      .from('sync_history')
      .insert({
        spreadsheet_id: spreadsheetId,
        triggered_by: triggeredBy,
        triggered_by_user_id: triggeredByUserId || null,
        sync_type: 'full',
        status: 'running',
        started_at: new Date().toISOString(),
        is_locked: true,
        lock_acquired_at: new Date().toISOString(),
        lock_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 分鐘後過期
      })
      .select()
      .single();

    if (syncRecordError || !syncRecord) {
      await this.releaseLock(spreadsheetId);
      throw new Error('Failed to create sync record');
    }

    try {
      // 4. 取得有效的 OAuth2Client
      const ownerId = spreadsheet.owner_user_id;
      if (!ownerId) {
        throw new Error('Spreadsheet has no owner, cannot sync');
      }

      const oauth2Client = await googleAuthService.getValidOAuth2Client(ownerId);

      // 5. 建立 Google Sheets client
      const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

      // 6. 更新 spreadsheet 狀態
      await supabase
        .from('spreadsheets')
        .update({ sync_status: 'syncing' })
        .eq('id', spreadsheetId);

      // 7. 取得要同步的 worksheets
      const { data: worksheets } = await supabase
        .from('worksheets')
        .select('*')
        .eq('spreadsheet_id', spreadsheetId)
        .eq('is_enabled', true);

      let totalRowsSynced = 0;
      let totalRowsFailed = 0;

      // 8. 逐個 worksheet 同步
      for (const worksheet of worksheets || []) {
        try {
          const result = await this.syncWorksheet(
            sheets,
            spreadsheet,
            worksheet
          );
          totalRowsSynced += result.rowsSynced;
          totalRowsFailed += result.rowsFailed;
        } catch (error: any) {
          console.error(`[Sync] Worksheet 同步失敗: ${worksheet.worksheet_name}`, error);
          totalRowsFailed++;
        }
      }

      // 9. 更新同步記錄為成功
      await this.completeSyncRecord(syncRecord.id, {
        status: totalRowsFailed > 0 ? 'partial' : 'success',
        rows_synced: totalRowsSynced,
        rows_failed: totalRowsFailed
      });

      // 10. 更新 spreadsheet 狀態
      await supabase
        .from('spreadsheets')
        .update({
          last_sync_at: new Date().toISOString(),
          sync_status: 'success',
          last_sync_error: null
        })
        .eq('id', spreadsheetId);

      return {
        success: true,
        rowsSynced: totalRowsSynced,
        rowsFailed: totalRowsFailed
      };

    } catch (error: any) {
      // 11. 錯誤處理
      console.error(`[Sync] 同步失敗: ${spreadsheet.name}`, error);

      await this.completeSyncRecord(syncRecord.id, {
        status: 'failed',
        error_message: error.message
      });

      await supabase
        .from('spreadsheets')
        .update({
          sync_status: 'failed',
          last_sync_error: error.message
        })
        .eq('id', spreadsheetId);

      return {
        success: false,
        rowsSynced: 0,
        rowsFailed: 0,
        error: error.message
      };

    } finally {
      // 12. 釋放鎖
      await this.releaseLock(spreadsheetId);
    }
  }

  /**
   * 同步單個 worksheet
   */
  private async syncWorksheet(
    sheets: any,
    spreadsheet: any,
    worksheet: any
  ): Promise<{ rowsSynced: number; rowsFailed: number }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }

    // 1. 動態取得 worksheet 範圍（不寫死 A1:Z1000）
    const sheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheet.spreadsheet_id,
      fields: 'sheets(properties(title,sheetId,gridProperties))'
    });

    const sheet = sheetMetadata.data.sheets?.find((s: any) =>
      s.properties.title === worksheet.worksheet_name
    );

    if (!sheet) {
      throw new Error(`Worksheet "${worksheet.worksheet_name}" not found`);
    }

    const gridProps = sheet.properties.gridProperties;
    const maxRows = gridProps?.rowCount || 1000;
    const maxCols = gridProps?.columnCount || 26;

    // 轉換欄數為字母（A=1, Z=26, AA=27）
    const maxColLetter = this.numberToColumn(Math.min(maxCols, 50)); // 限制最多 50 欄
    const range = `${worksheet.worksheet_name}!A1:${maxColLetter}${Math.min(maxRows, 10000)}`;

    console.log(`[Sync] Using dynamic range: ${range}`);

    // 2. 讀取 Google Sheets 資料
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheet.spreadsheet_id,
      range
    });

    const values = response.data.values || [];
    if (values.length === 0) {
      return { rowsSynced: 0, rowsFailed: 0 };
    }

    const headers = values[0];
    const dataRows = values.slice(1);

    // 3. 轉換與驗證資料
    const targetTable = worksheet.supabase_table;
    if (!targetTable) {
      console.warn(`[Sync] Worksheet "${worksheet.worksheet_name}" has no target table, skipping`);
      return { rowsSynced: 0, rowsFailed: 0 };
    }

    const { validRecords, invalidRecords } = batchTransformAndValidate(
      dataRows,
      headers,
      targetTable as SupabaseTableName,
      spreadsheet.id
    );

    // 4. 刪除舊資料（使用 source_spreadsheet_id + source_worksheet_id 避免刪除其他 worksheet 的資料）
    await supabase
      .from(targetTable)
      .delete()
      .eq('source_spreadsheet_id', spreadsheet.id)
      .eq('source_worksheet_id', worksheet.id);

    // 5. 批次插入新資料（500 筆/批，避免超時）
    const batchSize = 500;
    let insertedCount = 0;

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      const { error } = await supabase
        .from(targetTable)
        .insert(batch);

      if (error) {
        console.error(`[Sync] 批次插入失敗:`, error);
      } else {
        insertedCount += batch.length;
      }
    }

    // 6. 更新 worksheet 同步狀態
    await supabase
      .from('worksheets')
      .update({
        last_sync_at: new Date().toISOString(),
        row_count: insertedCount
      })
      .eq('id', worksheet.id);

    return {
      rowsSynced: insertedCount,
      rowsFailed: invalidRecords.length
    };
  }

  /**
   * 取得同步鎖
   */
  private async acquireLock(spreadsheetId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return false;
    }

    const now = new Date();

    // 檢查是否有未過期的鎖
    const { data: activeLocks } = await supabase
      .from('sync_history')
      .select('*')
      .eq('spreadsheet_id', spreadsheetId)
      .eq('is_locked', true)
      .gte('lock_expires_at', now.toISOString())
      .limit(1);

    if (activeLocks && activeLocks.length > 0) {
      return false; // 已有進行中的同步
    }

    return true;
  }

  /**
   * 釋放同步鎖
   */
  private async releaseLock(spreadsheetId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    await supabase
      .from('sync_history')
      .update({
        is_locked: false,
        lock_expires_at: null
      })
      .eq('spreadsheet_id', spreadsheetId)
      .eq('is_locked', true);
  }

  /**
   * 完成同步記錄
   */
  private async completeSyncRecord(
    syncRecordId: string,
    updates: {
      status: string;
      rows_synced?: number;
      rows_failed?: number;
      error_message?: string;
    }
  ): Promise<void> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const { data: record } = await supabase
      .from('sync_history')
      .select('started_at')
      .eq('id', syncRecordId)
      .single();

    const duration = record
      ? Math.floor((Date.now() - new Date(record.started_at).getTime()) / 1000)
      : 0;

    await supabase
      .from('sync_history')
      .update({
        ...updates,
        completed_at: new Date().toISOString(),
        duration_seconds: duration,
        is_locked: false
      })
      .eq('id', syncRecordId);
  }

  /**
   * 轉換欄數為字母
   */
  private numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result || 'A';
  }
}

export const syncOrchestrator = new SyncOrchestrator();
