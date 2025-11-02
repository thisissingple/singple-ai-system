import { google } from 'googleapis';
import { storage } from './storage';
import { type Spreadsheet, type Worksheet } from '@shared/schema';
import { getSupabaseClient, isSupabaseAvailable, SUPABASE_TABLES } from '../supabase-client';
import { resolveField, parseDateField, parseNumberField } from '../reporting/field-mapping-v2';
import {
  identifyTargetTable,
  batchTransformAndValidate,
  type SupabaseTableName,
} from '../reporting/sheet-to-supabase-mapping';

export class GoogleSheetsService {
  private sheets: any;
  private auth: any;
  private authReady: Promise<void>;

  constructor() {
    this.authReady = this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const credentials = JSON.parse(
      process.env.GOOGLE_SHEETS_CREDENTIALS || 
      process.env.GOOGLE_APPLICATION_CREDENTIALS || 
      '{}'
    );

    if (!credentials.client_email || !credentials.private_key) {
      console.warn('Google Sheets credentials not configured. Using mock data.');
      this.sheets = null;
      return;
    }

    if (typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async syncSpreadsheet(spreadsheet: Spreadsheet): Promise<void> {
    console.log('🔄 Starting syncSpreadsheet for:', spreadsheet.name, 'ID:', spreadsheet.id);
    await this.authReady;
    console.log('✓ Auth ready');

    if (!this.sheets) {
      console.log('⚠️  Google Sheets not configured, using mock data for demo');
      await this.syncWithMockData(spreadsheet);
      return;
    }

    try {
      console.log('📡 Fetching data from Google Sheets API...');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheet.spreadsheetId,
        range: spreadsheet.range || 'A1:Z1000',
      });
      console.log('✓ Got response from Google Sheets API');

      const values = response.data.values || [];
      console.log(`📊 Got ${values.length} rows from Google Sheets`);

      if (values.length === 0) {
        console.log('⚠️  No data found in spreadsheet');
        return;
      }

      // First row as headers
      const headers = values[0] as string[];
      const dataRows = values.slice(1);
      console.log(`📋 Headers: ${headers.join(', ')}`);
      console.log(`📝 Data rows: ${dataRows.length}`);

      // Update headers
      console.log('💾 Updating spreadsheet metadata...');
      await storage.updateSpreadsheet(spreadsheet.id, {
        headers,
        rowCount: dataRows.length,
        lastSyncAt: new Date(),
      });
      console.log('✓ Updated spreadsheet metadata');

      // Clear existing data - Use internal UUID
      console.log('🗑️  Clearing old data...');
      await storage.deleteSheetData(spreadsheet.id);
      console.log('✓ Cleared old data');

      // Insert new data
      console.log('💾 Inserting new data...');
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowData: Record<string, any> = {};

        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Use internal UUID for foreign key reference
        await storage.upsertSheetData(spreadsheet.id, i, rowData);
      }
      console.log(`✓ Inserted ${dataRows.length} rows`);

      console.log(`✅ Synced ${dataRows.length} rows for spreadsheet ${spreadsheet.name}`);

      // Sync to Supabase if available
      console.log('🔄 Checking Supabase sync...');
      await this.syncToSupabase(spreadsheet, headers, dataRows);
      console.log('🎉 syncSpreadsheet complete!');
    } catch (error) {
      console.error('❌ Error syncing spreadsheet:', error);
      throw error;
    }
  }

  /**
   * Sync data to Supabase (使用統一的 mapping 配置)
   *
   * @returns 物件包含 insertedCount, invalidCount, tableName
   */
  private async syncToSupabase(
    spreadsheet: Spreadsheet,
    headers: string[],
    dataRows: any[][]
  ): Promise<{ insertedCount: number; invalidCount: number; tableName: string | null }> {
    if (!isSupabaseAvailable()) {
      console.log('Supabase not available, skipping Supabase sync');
      return { insertedCount: 0, invalidCount: 0, tableName: null };
    }

    const client = getSupabaseClient();
    if (!client) return { insertedCount: 0, invalidCount: 0, tableName: null };

    try {
      // 1. 識別目標表（傳遞 headers 用於智能識別）
      const tableName = identifyTargetTable(spreadsheet.name, headers);

      if (!tableName) {
        console.log(`⚠️  Spreadsheet "${spreadsheet.name}" does not match any known table pattern`);
        console.log(`   Headers: ${headers.slice(0, 5).join(', ')}`);
        return { insertedCount: 0, invalidCount: 0, tableName: null };
      }

      console.log(`📊 Syncing to Supabase table: ${tableName}`);

      // 2. 批次轉換與驗證
      const { validRecords, invalidRecords, stats } = batchTransformAndValidate(
        dataRows,
        headers,
        tableName as SupabaseTableName,
        spreadsheet.spreadsheetId
      );

      console.log(`   Total rows: ${stats.total}, Valid: ${stats.valid}, Invalid: ${stats.invalid}`);

      // 報告無效記錄
      if (invalidRecords.length > 0) {
        console.warn(`⚠️  ${invalidRecords.length} invalid records:`,
          invalidRecords.slice(0, 3).map(r => `Row ${r.rowIndex}: ${r.errors.join(', ')}`));
      }

      if (validRecords.length === 0) {
        console.log('   No valid records to sync');
        return { insertedCount: 0, invalidCount: invalidRecords.length, tableName };
      }

      // 3. 刪除舊資料（使用 source_worksheet_id 作為 key）
      // Note: We no longer have worksheet_id at spreadsheet level,
      // so we delete all records with the same spreadsheet_id from raw_data
      console.log(`🗑️  Deleting old data for spreadsheet ${spreadsheet.spreadsheetId} from ${tableName}...`);

      // This is a fallback method - normally should use syncWorksheetToSupabase instead
      const { error: deleteError, count: deleteCount } = await client
        .from(tableName)
        .delete({ count: 'exact' })
        .filter('raw_data->>spreadsheet_id', 'eq', spreadsheet.spreadsheetId);

      if (deleteError) {
        console.error(`❌ Error deleting old data:`, deleteError);
        // Continue anyway - upsert will handle duplicates
      } else {
        console.log(`✓ Deleted ${deleteCount ?? 0} old records from ${tableName}`);
      }

      // 4. 批次插入新資料
      const batchSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        const { error: insertError } = await client
          .from(tableName)
          .insert(batch);

        if (insertError) {
          console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError);
          console.error(`   Sample record:`, JSON.stringify(batch[0], null, 2));
          continue;
        }

        insertedCount += batch.length;
      }

      console.log(`✓ Successfully synced ${insertedCount} rows to ${tableName}`);

      return {
        insertedCount,
        invalidCount: invalidRecords.length,
        tableName,
      };
    } catch (error) {
      console.error('❌ Error in syncToSupabase:', error);
      return { insertedCount: 0, invalidCount: 0, tableName: null };
    }
  }

  /**
   * Sync worksheet data to Supabase using worksheet's configured table mapping
   */
  private async syncWorksheetToSupabase(
    worksheet: Worksheet,
    headers: string[],
    dataRows: any[][]
  ): Promise<{ insertedCount: number; invalidCount: number }> {
    if (!isSupabaseAvailable()) {
      console.log('Supabase not available, skipping Supabase sync');
      return { insertedCount: 0, invalidCount: 0 };
    }

    if (!worksheet.supabaseTable) {
      console.log(`⚠️  Worksheet "${worksheet.worksheetName}" has no Supabase table configured`);
      return { insertedCount: 0, invalidCount: 0 };
    }

    const client = getSupabaseClient();
    if (!client) return { insertedCount: 0, invalidCount: 0 };

    try {
      const tableName = worksheet.supabaseTable as SupabaseTableName;

      // Use mapping system to transform data
      const transformResult = await batchTransformAndValidate(
        dataRows,
        headers,
        tableName,
        worksheet.spreadsheetId
      );

      console.log(`📊 Transform results: ${transformResult.stats.valid} valid, ${transformResult.stats.invalid} invalid out of ${transformResult.stats.total} rows`);

      // Add source_worksheet_id to all valid records
      const records = transformResult.validRecords.map(record => ({
        ...record,
        source_worksheet_id: worksheet.id,
      }));

      if (records.length === 0) {
        console.log(`⚠️  No valid records to sync for worksheet "${worksheet.worksheetName}"`);
        return { insertedCount: 0, invalidCount: transformResult.stats.invalid };
      }

      // Delete old data for this worksheet
      console.log(`🗑️  Deleting old data for worksheet ${worksheet.id} from ${tableName}...`);
      const { error: deleteError, count: deleteCount } = await client
        .from(tableName)
        .delete({ count: 'exact' })
        .eq('source_worksheet_id', worksheet.id);

      if (deleteError) {
        console.error(`❌ Error deleting old data from ${tableName}:`, deleteError);
        return { insertedCount: 0, invalidCount: transformResult.stats.invalid };
      }

      console.log(`✓ Deleted ${deleteCount ?? 0} old records from ${tableName}`);

      // Insert new data
      const batchSize = 500;
      let insertedCount = 0;

      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        const { error: insertError } = await client
          .from(tableName)
          .insert(batch);

        if (insertError) {
          console.error(`❌ Error inserting batch to ${tableName}:`, insertError);
          console.error(`   Sample record:`, JSON.stringify(batch[0], null, 2));
          continue;
        }

        insertedCount += batch.length;
      }

      console.log(`✓ Successfully synced ${insertedCount} rows to Supabase table: ${tableName}`);

      return { insertedCount, invalidCount: transformResult.stats.invalid };
    } catch (error) {
      console.error('❌ Error in syncWorksheetToSupabase:', error);
      return { insertedCount: 0, invalidCount: 0 };
    }
  }

  async getWorksheets(spreadsheetId: string): Promise<Array<{ name: string; gid: string }> | null> {
    await this.authReady;
    if (!this.sheets) {
      console.log('Google Sheets not configured, returning mock worksheets');
      return [
        { name: 'Sheet1', gid: '0' },
        { name: '體驗課上課記錄表', gid: '1' },
        { name: '體驗課購買記錄表', gid: '2' }
      ];
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets(properties(title,sheetId))'
      });

      if (!response.data.sheets) {
        return null;
      }

      return response.data.sheets.map((sheet: any) => ({
        name: sheet.properties.title,
        gid: sheet.properties.sheetId.toString()
      }));
    } catch (error) {
      console.error('Error fetching worksheets:', error);
      return null;
    }
  }

  async validateSpreadsheet(spreadsheetId: string): Promise<{ name: string; sheets: string[] } | null> {
    await this.authReady;
    if (!this.sheets) {
      // Return mock data for development
      return {
        name: `Mock Spreadsheet ${spreadsheetId.slice(-8)}`,
        sheets: ['Sheet1', 'Sheet2'],
      };
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      return {
        name: response.data.properties?.title || 'Untitled Spreadsheet',
        sheets: response.data.sheets?.map((sheet: any) => sheet.properties?.title) || [],
      };
    } catch (error) {
      console.error('Error validating spreadsheet:', error);
      return null;
    }
  }

  async getSpreadsheetMetadata(spreadsheetId: string): Promise<any> {
    await this.authReady;
    if (!this.sheets) {
      return null;
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
      });

      return response.data;
    } catch (error) {
      console.error('Error getting spreadsheet metadata:', error);
      return null;
    }
  }

  private async syncWithMockData(spreadsheet: Spreadsheet): Promise<void> {
    // Generate mock data for demonstration
    const mockData = this.generateMockData(spreadsheet.name);
    
    // Update headers
    await storage.updateSpreadsheet(spreadsheet.id, { 
      headers: mockData.headers,
      rowCount: mockData.rows.length,
      lastSyncAt: new Date(),
    });

    // Clear existing data - Use internal UUID
    await storage.deleteSheetData(spreadsheet.id);

    // Insert mock data
    for (let i = 0; i < mockData.rows.length; i++) {
      const row = mockData.rows[i];
      const rowData: Record<string, any> = {};

      mockData.headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      await storage.upsertSheetData(spreadsheet.id, i, rowData);
    }

    console.log(`Synced ${mockData.rows.length} mock rows for spreadsheet ${spreadsheet.name}`);

    // Sync to Supabase if available
    await this.syncToSupabase(spreadsheet, mockData.headers, mockData.rows);
  }

  async syncWorksheet(worksheet: Worksheet, spreadsheet: Spreadsheet): Promise<{
    totalRows: number;
    insertedToSupabase: number;
    invalidRows: number;
    mappedFields: number;
    hasSyncedToSupabase: boolean;
    invalidRecords?: Array<{ rowIndex: number; errors: string[] }>;
  } | null> {
    if (!this.sheets) {
      console.log('Google Sheets not configured, using mock data for demo');
      await this.syncWorksheetWithMockData(worksheet);
      return null;
    }

    try {
      // First, get the worksheet metadata to determine its actual size
      const sheetMetadata = await this.sheets.spreadsheets.get({
        spreadsheetId: spreadsheet.spreadsheetId,
        fields: 'sheets(properties(title,sheetId,gridProperties))'
      });

      // Find the specific worksheet
      const sheet = sheetMetadata.data.sheets?.find((s: any) =>
        s.properties.title === worksheet.worksheetName
      );

      if (!sheet) {
        throw new Error(`Worksheet "${worksheet.worksheetName}" not found`);
      }

      // Get actual worksheet dimensions
      const gridProps = sheet.properties.gridProperties;
      const maxRows = gridProps?.rowCount || 1000;
      const maxCols = gridProps?.columnCount || 26;

      // Create a safe range that doesn't exceed worksheet bounds
      // Convert column count to letter (A=1, B=2, ..., Z=26, AA=27, etc.)
      const maxColLetter = this.numberToColumn(Math.min(maxCols, 26)); // Limit to Z for safety
      const safeRange = `${worksheet.worksheetName}!A1:${maxColLetter}${Math.min(maxRows, 1000)}`;

      console.log(`Using safe range for ${worksheet.worksheetName}: ${safeRange}`);

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheet.spreadsheetId,
        range: safeRange,
      });

      const values = response.data.values || [];
      if (values.length === 0) {
        console.log(`No data found in worksheet ${worksheet.worksheetName}`);
        return {
          totalRows: 0,
          insertedToSupabase: 0,
          invalidRows: 0,
          mappedFields: 0,
          hasSyncedToSupabase: false
        };
      }

      // First row as headers
      const headers = values[0] as string[];
      const dataRows = values.slice(1);

      // Update worksheet headers and row count
      await storage.updateWorksheet(worksheet.id, {
        headers,
        rowCount: dataRows.length,
        lastSyncAt: new Date(),
        range: safeRange, // Update with the safe range
      });

      // Clear existing worksheet data
      console.log('🗑️  Deleting old worksheet data...');
      await storage.deleteWorksheetData(worksheet.id);
      console.log('✓ Deleted old worksheet data');

      // Batch insert new data - much faster than row-by-row
      console.log(`💾 Batch inserting ${dataRows.length} rows...`);
      const batchData = dataRows.map((row, i) => {
        const rowData: Record<string, any> = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        return {
          spreadsheetId: spreadsheet.id,
          worksheetId: worksheet.id,
          rowIndex: i,
          data: rowData,
        };
      });

      try {
        await storage.batchInsertSheetData(batchData);
        console.log(`✅ Batch inserted ${dataRows.length} rows`);
      } catch (error) {
        console.error(`❌ Error batch inserting data:`, error);
        throw error;
      }

      console.log(`✅ Synced ${dataRows.length} rows for worksheet ${worksheet.worksheetName}`);

      // Sync to Supabase if mapping is configured
      let syncResult: any = null;
      if (worksheet.supabaseTable) {
        console.log(`📊 Syncing worksheet "${worksheet.worksheetName}" to Supabase table: ${worksheet.supabaseTable}`);
        // Use internal method instead of importing from legacy service
        syncResult = await this.syncWorksheetToSupabase(worksheet, headers, dataRows);
        console.log(`✅ Sync result: ${syncResult.insertedCount} inserted, ${syncResult.invalidCount} invalid`);
        if (syncResult.errors.length > 0) {
          console.error(`⚠️  Sync errors:`, syncResult.errors);
        }

        return {
          totalRows: dataRows.length,
          insertedToSupabase: syncResult.insertedCount,
          invalidRows: syncResult.invalidCount,
          mappedFields: headers.length,
          hasSyncedToSupabase: true,
          invalidRecords: syncResult.invalidRecords || []
        };
      } else {
        console.log(`⚠️  Worksheet "${worksheet.worksheetName}" has no Supabase table mapping configured`);
        return {
          totalRows: dataRows.length,
          insertedToSupabase: 0,
          invalidRows: 0,
          mappedFields: headers.length,
          hasSyncedToSupabase: false
        };
      }
    } catch (error) {
      console.error(`Error syncing worksheet ${worksheet.worksheetName}:`, error);
      throw error;
    }
  }

  // Helper function to convert column number to letter (1=A, 2=B, etc.)
  private numberToColumn(num: number): string {
    let result = '';
    while (num > 0) {
      num--;
      result = String.fromCharCode(65 + (num % 26)) + result;
      num = Math.floor(num / 26);
    }
    return result || 'A';
  }

  async syncEnabledWorksheets(spreadsheetId: string): Promise<void> {
    await this.authReady;
    // spreadsheetId here is Google Sheets ID, need to get internal UUID first
    const spreadsheet = await storage.getSpreadsheetBySheetId(spreadsheetId);
    if (!spreadsheet) {
      throw new Error('Spreadsheet not found');
    }
    const worksheets = await storage.getWorksheets(spreadsheet.id);
    const enabledWorksheets = worksheets.filter(w => w.isEnabled);

    if (enabledWorksheets.length === 0) {
      console.log('No enabled worksheets to sync');
      return;
    }

    console.log(`Syncing ${enabledWorksheets.length} enabled worksheets for spreadsheet ${spreadsheetId}`);

    // Clear any legacy spreadsheet-level data to prevent duplication
    // This ensures we have a single source of truth when using per-worksheet sync
    await storage.deleteSheetData(spreadsheetId);

    for (const worksheet of enabledWorksheets) {
      try {
        // Fetch latest worksheet data to ensure we have the most recent supabaseTable mapping
        const latestWorksheet = await storage.getWorksheet(worksheet.id);
        if (!latestWorksheet) {
          console.error(`Worksheet ${worksheet.id} not found, skipping`);
          continue;
        }

        console.log(`📋 Worksheet "${latestWorksheet.worksheetName}" mapping: ${latestWorksheet.supabaseTable || 'NOT SET'}`);
        await this.syncWorksheet(latestWorksheet);
      } catch (error) {
        console.error(`Failed to sync worksheet ${worksheet.worksheetName}:`, error);
        // Continue with other worksheets even if one fails
      }
    }
    
    // Update spreadsheet metadata after successful sync
    try {
      const totalRowCount = await storage.getSheetDataCount(spreadsheetId);
      const spreadsheet = await storage.getSpreadsheetBySheetId(spreadsheetId);
      
      if (spreadsheet) {
        await storage.updateSpreadsheet(spreadsheet.id, {
          rowCount: totalRowCount,
          lastSyncAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to update spreadsheet metadata after sync:', error);
    }
  }

  private async syncWorksheetWithMockData(worksheet: Worksheet): Promise<void> {
    // Generate mock data for specific worksheet
    const mockData = this.generateMockDataForWorksheet(worksheet.worksheetName);
    
    // Update worksheet headers and metadata
    await storage.updateWorksheet(worksheet.id, { 
      headers: mockData.headers,
      rowCount: mockData.rows.length,
      lastSyncAt: new Date(),
    });

    // Clear existing worksheet data
    await storage.deleteWorksheetData(worksheet.id);

    // Insert mock data with worksheet association
    for (let i = 0; i < mockData.rows.length; i++) {
      const row = mockData.rows[i];
      const rowData: Record<string, any> = {};
      
      mockData.headers.forEach((header, index) => {
        rowData[header] = row[index] || '';
      });

      // Use worksheet's spreadsheetId (internal UUID) for storage
      await storage.upsertSheetData(worksheet.spreadsheetId, i, rowData, worksheet.id);
    }

    console.log(`Synced ${mockData.rows.length} mock rows for worksheet ${worksheet.worksheetName}`);
  }

  private generateMockDataForWorksheet(worksheetName: string) {
    const lowerName = worksheetName.toLowerCase();

    // 體驗課上課記錄表
    if (lowerName.includes('上課') || lowerName.includes('class')) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const format = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '/');

      return {
        headers: ['姓名', 'email', '上課日期', '授課老師', '是否已評價', '未轉單原因', '體驗課文字檔'],
        rows: [
          ['張小明', 'zhang@example.com', format(today), 'Teacher A', '是', '', '完成'],
          ['李小華', 'li@example.com', format(yesterday), 'Teacher B', '否', '價格太高', '進行中'],
          ['王小美', 'wang@example.com', format(today), 'Teacher C', '是', '', '完成'],
        ],
      };
    }

    // 體驗課購買記錄表
    if (lowerName.includes('購買') || lowerName.includes('purchase')) {
      const today = new Date();
      const format = (date: Date, daysAgo: number = 0) => {
        const d = new Date(date);
        d.setDate(d.getDate() - daysAgo);
        return d.toISOString().split('T')[0].replace(/-/g, '/');
      };

      return {
        headers: ['姓名', 'email', '體驗課購買日期', '方案名稱', '體驗堂數', '目前狀態'],
        rows: [
          ['張小明', 'zhang@example.com', format(today, 0), '體驗方案A', '3', '進行中'],
          ['王小美', 'wang@example.com', format(today, 1), '體驗方案B', '5', '已完成'],
          ['李小華', 'li@example.com', format(today, 2), '體驗方案C', '4', '進行中'],
          ['陳大同', 'chen@example.com', format(today, 3), '體驗方案A', '3', '已完成'],
          ['林小芳', 'lin@example.com', format(today, 4), '體驗方案D', '6', '進行中'],
          ['黃小明', 'huang@example.com', format(today, 5), '體驗方案B', '5', '已取消'],
          ['周小文', 'zhou@example.com', format(today, 6), '體驗方案A', '3', '進行中'],
          ['吳小強', 'wu@example.com', format(today, 7), '體驗方案C', '4', '已完成'],
          ['鄭小玲', 'zheng@example.com', format(today, 8), '體驗方案B', '5', '進行中'],
          ['謝小龍', 'xie@example.com', format(today, 9), '體驗方案D', '6', '已完成'],
          ['劉小雲', 'liu@example.com', format(today, 10), '體驗方案A', '3', '進行中'],
          ['楊小婷', 'yang@example.com', format(today, 11), '體驗方案C', '4', '進行中'],
          ['賴小宇', 'lai@example.com', format(today, 12), '體驗方案B', '5', '已完成'],
          ['蔡小安', 'tsai@example.com', format(today, 13), '體驗方案D', '6', '進行中'],
          ['何小威', 'he@example.com', format(today, 14), '體驗方案A', '3', '已完成'],
          ['許小晴', 'xu@example.com', format(today, 15), '體驗方案C', '4', '進行中'],
          ['曾小豪', 'zeng@example.com', format(today, 16), '體驗方案B', '5', '進行中'],
          ['邱小萱', 'qiu@example.com', format(today, 17), '體驗方案A', '3', '已完成'],
          ['潘小杰', 'pan@example.com', format(today, 18), '體驗方案D', '6', '進行中'],
          ['范小琪', 'fan@example.com', format(today, 19), '體驗方案C', '4', '已完成'],
          ['余小涵', 'yu@example.com', format(today, 20), '體驗方案B', '5', '進行中'],
          ['施小瑜', 'shi@example.com', format(today, 21), '體驗方案A', '3', '進行中'],
          ['羅小婕', 'luo@example.com', format(today, 22), '體驗方案D', '6', '已完成'],
          ['丁小宏', 'ding@example.com', format(today, 23), '體驗方案C', '4', '進行中'],
          ['傅小敏', 'fu@example.com', format(today, 24), '體驗方案B', '5', '已完成'],
          ['游小慧', 'you@example.com', format(today, 25), '體驗方案A', '3', '進行中'],
          ['梁小健', 'liang@example.com', format(today, 26), '體驗方案D', '6', '進行中'],
          ['韓小君', 'han@example.com', format(today, 27), '體驗方案C', '4', '已完成'],
          ['薛小芳', 'xue@example.com', format(today, 28), '體驗方案B', '5', '進行中'],
          ['孫小偉', 'sun@example.com', format(today, 29), '體驗方案A', '3', '已完成'],
          ['馬小珍', 'ma@example.com', format(today, 30), '體驗方案D', '6', '進行中'],
          // ... 繼續增加到 95 筆
          ['錢小剛', 'qian@example.com', format(today, 31), '體驗方案C', '4', '進行中'],
          ['高小麗', 'gao@example.com', format(today, 32), '體驗方案B', '5', '已完成'],
          ['石小林', 'shi2@example.com', format(today, 33), '體驗方案A', '3', '進行中'],
          ['田小青', 'tian@example.com', format(today, 34), '體驗方案D', '6', '已完成'],
          ['董小紅', 'dong@example.com', format(today, 35), '體驗方案C', '4', '進行中'],
          ['袁小軍', 'yuan@example.com', format(today, 36), '體驗方案B', '5', '進行中'],
          ['江小松', 'jiang@example.com', format(today, 37), '體驗方案A', '3', '已完成'],
          ['余小梅', 'yu2@example.com', format(today, 38), '體驗方案D', '6', '進行中'],
          ['葉小花', 'ye@example.com', format(today, 39), '體驗方案C', '4', '已完成'],
          ['杜小蘭', 'du@example.com', format(today, 40), '體驗方案B', '5', '進行中'],
          ['顏小雨', 'yan@example.com', format(today, 41), '體驗方案A', '3', '進行中'],
          ['康小寧', 'kang@example.com', format(today, 42), '體驗方案D', '6', '已完成'],
          ['伍小海', 'wu2@example.com', format(today, 43), '體驗方案C', '4', '進行中'],
          ['齊小雪', 'qi@example.com', format(today, 44), '體驗方案B', '5', '已完成'],
          ['沈小月', 'shen@example.com', format(today, 45), '體驗方案A', '3', '進行中'],
          ['姜小亮', 'jiang2@example.com', format(today, 46), '體驗方案D', '6', '進行中'],
          ['史小東', 'shi3@example.com', format(today, 47), '體驗方案C', '4', '已完成'],
          ['秦小西', 'qin@example.com', format(today, 48), '體驗方案B', '5', '進行中'],
          ['汪小南', 'wang2@example.com', format(today, 49), '體驗方案A', '3', '已完成'],
          ['彭小北', 'peng@example.com', format(today, 50), '體驗方案D', '6', '進行中'],
          ['常小晨', 'chang@example.com', format(today, 51), '體驗方案C', '4', '進行中'],
          ['莊小夜', 'zhuang@example.com', format(today, 52), '體驗方案B', '5', '已完成'],
          ['文小光', 'wen@example.com', format(today, 53), '體驗方案A', '3', '進行中'],
          ['方小暗', 'fang@example.com', format(today, 54), '體驗方案D', '6', '已完成'],
          ['唐小天', 'tang@example.com', format(today, 55), '體驗方案C', '4', '進行中'],
          ['夏小地', 'xia@example.com', format(today, 56), '體驗方案B', '5', '進行中'],
          ['盧小人', 'lu@example.com', format(today, 57), '體驗方案A', '3', '已完成'],
          ['蔣小和', 'jiang3@example.com', format(today, 58), '體驗方案D', '6', '進行中'],
          ['龔小水', 'gong@example.com', format(today, 59), '體驗方案C', '4', '已完成'],
          ['卓小火', 'zhuo@example.com', format(today, 60), '體驗方案B', '5', '進行中'],
          ['戴小木', 'dai@example.com', format(today, 61), '體驗方案A', '3', '進行中'],
          ['崔小金', 'cui@example.com', format(today, 62), '體驗方案D', '6', '已完成'],
          ['任小土', 'ren@example.com', format(today, 63), '體驗方案C', '4', '進行中'],
          ['陸小山', 'lu2@example.com', format(today, 64), '體驗方案B', '5', '已完成'],
          ['魏小川', 'wei@example.com', format(today, 65), '體驗方案A', '3', '進行中'],
          ['柳小河', 'liu2@example.com', format(today, 66), '體驗方案D', '6', '進行中'],
          ['宋小江', 'song@example.com', format(today, 67), '體驗方案C', '4', '已完成'],
          ['鄒小湖', 'zou@example.com', format(today, 68), '體驗方案B', '5', '進行中'],
          ['章小海', 'zhang2@example.com', format(today, 69), '體驗方案A', '3', '已完成'],
          ['雷小浪', 'lei@example.com', format(today, 70), '體驗方案D', '6', '進行中'],
          ['畢小風', 'bi@example.com', format(today, 71), '體驗方案C', '4', '進行中'],
          ['塗小雲', 'tu@example.com', format(today, 72), '體驗方案B', '5', '已完成'],
          ['殷小雷', 'yin@example.com', format(today, 73), '體驗方案A', '3', '進行中'],
          ['歐小電', 'ou@example.com', format(today, 74), '體驗方案D', '6', '已完成'],
          ['嚴小霜', 'yan2@example.com', format(today, 75), '體驗方案C', '4', '進行中'],
          ['穆小露', 'mu@example.com', format(today, 76), '體驗方案B', '5', '進行中'],
          ['左小雪', 'zuo@example.com', format(today, 77), '體驗方案A', '3', '已完成'],
          ['甘小冰', 'gan@example.com', format(today, 78), '體驗方案D', '6', '進行中'],
          ['倪小霧', 'ni@example.com', format(today, 79), '體驗方案C', '4', '已完成'],
          ['邢小晴', 'xing@example.com', format(today, 80), '體驗方案B', '5', '進行中'],
          ['裴小陰', 'pei@example.com', format(today, 81), '體驗方案A', '3', '進行中'],
          ['席小陽', 'xi@example.com', format(today, 82), '體驗方案D', '6', '已完成'],
          ['祝小光', 'zhu@example.com', format(today, 83), '體驗方案C', '4', '進行中'],
          ['桂小影', 'gui@example.com', format(today, 84), '體驗方案B', '5', '已完成'],
          ['耿小明', 'geng@example.com', format(today, 85), '體驗方案A', '3', '進行中'],
          ['焦小暗', 'jiao@example.com', format(today, 86), '體驗方案D', '6', '進行中'],
          ['巫小靈', 'wu3@example.com', format(today, 87), '體驗方案C', '4', '已完成'],
          ['尚小魂', 'shang@example.com', format(today, 88), '體驗方案B', '5', '進行中'],
          ['饒小魄', 'rao@example.com', format(today, 89), '體驗方案A', '3', '已完成'],
          ['鐘小神', 'zhong@example.com', format(today, 90), '體驗方案D', '6', '進行中'],
          ['費小仙', 'fei@example.com', format(today, 91), '體驗方案C', '4', '進行中'],
          ['岳小妖', 'yue@example.com', format(today, 92), '體驗方案B', '5', '已完成'],
          ['滕小怪', 'teng@example.com', format(today, 93), '體驗方案A', '3', '進行中'],
          ['殷小聖', 'yin2@example.com', format(today, 94), '體驗方案D', '6', '已完成'],
        ],
      };
    }

    // 諮詢/成交記錄 (EODs for Closers)
    if (lowerName.includes('eods') || lowerName.includes('closer') || lowerName.includes('諮詢')) {
      const today = new Date();
      const format = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '/');

      return {
        headers: ['姓名', 'email', '成交日期', '課程類型', '成交金額', '狀態'],
        rows: [
          ['王小美', 'wang@example.com', format(today), '進階方案', '12000', '成交'],
          ['李小華', 'li@example.com', format(today), '基礎方案', '8000', '成交'],
        ],
      };
    }

    // 預設模板 - 至少包含 email 與日期欄位
    const today = new Date();
    const format = (date: Date) => date.toISOString().split('T')[0].replace(/-/g, '/');

    return {
      headers: ['姓名', 'email', '上課日期', '授課老師', '備註'],
      rows: [
        ['測試學員', 'test1@example.com', format(today), 'Teacher X', '模擬資料'],
      ],
    };
  }

  private generateMockData(spreadsheetName: string) {
    const lowerName = spreadsheetName.toLowerCase();

    if (lowerName.includes('上課') || lowerName.includes('class')) {
      return this.generateMockDataForWorksheet('體驗課上課記錄表');
    }

    if (lowerName.includes('購買') || lowerName.includes('purchase')) {
      return this.generateMockDataForWorksheet('體驗課購買記錄表');
    }

    if (lowerName.includes('closer') || lowerName.includes('諮詢') || lowerName.includes('eods')) {
      return this.generateMockDataForWorksheet('EODs for Closers');
    }

    return this.generateMockDataForWorksheet('體驗課上課記錄表');
  }
}

export const googleSheetsService = new GoogleSheetsService();
