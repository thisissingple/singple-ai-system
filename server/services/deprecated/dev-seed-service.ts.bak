/**
 * Development Seed Service
 * Provides test data for Total Report in development mode
 */

import { storage } from '../legacy/storage';
import { googleSheetsService } from '../legacy/google-sheets';
import { randomUUID } from 'crypto';
import { supabaseReportRepository } from '../reporting/supabase-report-repository';
import { isSupabaseAvailable } from '../supabase-client';

export interface SeedResult {
  success: boolean;
  spreadsheetsCreated: number;
  worksheetsCreated: number;
  dataRowsInserted: number;
  supabaseRowsInserted?: number;
  supabase: boolean;
  supabaseTables?: {
    trial_class_attendance: number;
    trial_class_purchase: number;
    eods_for_closers: number;
  };
  warnings?: string[];
}

export class DevSeedService {
  async seedTotalReportData(): Promise<SeedResult> {
    let spreadsheetsCreated = 0;
    let worksheetsCreated = 0;
    let dataRowsInserted = 0;

    // 1. Create/Get Spreadsheets
    const spreadsheetConfigs = [
      {
        name: '體驗課上課記錄表（測試）',
        spreadsheetId: 'test-trial-class-attendance',
        range: 'A1:Z1000',
      },
      {
        name: '體驗課購買記錄表（測試）',
        spreadsheetId: 'test-trial-class-purchase',
        range: 'A1:Z1000',
      },
      {
        name: 'EODs for Closers（測試）',
        spreadsheetId: 'test-eods-for-closers',
        range: 'A1:Z1000',
      },
    ];

    for (const config of spreadsheetConfigs) {
      // Check if exists
      let spreadsheet = await storage.getSpreadsheetBySheetId(config.spreadsheetId);

      if (!spreadsheet) {
        spreadsheet = await storage.createSpreadsheet({
          name: config.name,
          spreadsheetId: config.spreadsheetId,
          range: config.range,
        });
        spreadsheetsCreated++;
      }

      // Create worksheet if not exists
      const existingWorksheets = await storage.getWorksheets(config.spreadsheetId);

      if (existingWorksheets.length === 0) {
        await storage.createWorksheet({
          spreadsheetId: config.spreadsheetId,
          worksheetName: 'Sheet1',
          gid: '0',
          isEnabled: true,
          range: config.range,
        });
        worksheetsCreated++;
      }

      // Sync to populate with mock data
      try {
        await googleSheetsService.syncSpreadsheet(spreadsheet);
        const dataCount = await storage.getSheetDataCount(config.spreadsheetId);
        dataRowsInserted += dataCount;
      } catch (error) {
        console.warn(`Failed to sync ${config.name}, will use mock data:`, error);
      }
    }

    // Check Supabase data
    const supabaseAvailable = isSupabaseAvailable();
    let supabaseRowsInserted: number | undefined;
    let supabaseTables: { trial_class_attendance: number; trial_class_purchase: number; eods_for_closers: number } | undefined;
    const warnings: string[] = [];

    if (supabaseAvailable) {
      try {
        const counts = await supabaseReportRepository.getTableCounts();
        supabaseRowsInserted = counts.attendance + counts.purchases + counts.deals;
        supabaseTables = {
          trial_class_attendance: counts.attendance,
          trial_class_purchase: counts.purchases,
          eods_for_closers: counts.deals,
        };
        console.log(`✓ Supabase 同步成功：${supabaseRowsInserted} 筆資料`);
      } catch (error) {
        console.error('Failed to get Supabase counts:', error);
        warnings.push(`Supabase 資料統計失敗：${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      warnings.push('Supabase 未設定，資料僅存於 local storage');
      console.warn('⚠️  Supabase not configured - data only stored locally');
    }

    return {
      success: true,
      spreadsheetsCreated,
      worksheetsCreated,
      dataRowsInserted,
      supabaseRowsInserted,
      supabase: supabaseAvailable,
      supabaseTables,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  async clearTestData(): Promise<{ success: boolean; deletedCount: number }> {
    let deletedCount = 0;

    const testSheetIds = [
      'test-trial-class-attendance',
      'test-trial-class-purchase',
      'test-eods-for-closers',
    ];

    for (const sheetId of testSheetIds) {
      const spreadsheet = await storage.getSpreadsheetBySheetId(sheetId);
      if (spreadsheet) {
        await storage.deleteSheetData(sheetId);
        await storage.deleteWorksheets(sheetId);
        await storage.deleteSpreadsheet(spreadsheet.id);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  }
}

export const devSeedService = new DevSeedService();
