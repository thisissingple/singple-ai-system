import { google } from 'googleapis';
import type { DataSource, DataSourceConfig } from '@shared/simple-schema';
import { simpleStorage } from '../simple-storage';

interface SheetParseResult {
  headers: string[];
  rows: Array<Record<string, any>>;
  emailColumn: string;
  dateColumn?: string;
}

class SimpleSheetsService {
  private auth: any;
  private sheets: any;

  constructor() {
    // 使用服務帳號認證 (簡化版本)
    this.initAuth();
  }

  private async initAuth() {
    try {
      // 這裡應該使用你的 Google Sheets API 認證
      // 暫時用假的認證，實際使用時需要設定 service account key
      this.auth = new google.auth.GoogleAuth({
        // keyFile: 'path/to/service-account-key.json',
        scopes: ['https://www.googleapis.com/spreadsheets/readonly'],
      });
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    } catch (error) {
      console.error('Google Sheets auth error:', error);
      // 在沒有認證的情況下，使用模擬數據
      this.sheets = null;
    }
  }

  async parseSheetStructure(spreadsheetId: string, worksheetName?: string): Promise<SheetParseResult> {
    try {
      if (!this.sheets) {
        // 返回模擬數據結構用於測試
        return this.getMockSheetStructure(spreadsheetId);
      }

      const range = worksheetName ? `${worksheetName}!A1:Z1000` : 'A1:Z1000';
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });

      const values = response.data.values || [];
      if (values.length < 2) {
        throw new Error('工作表數據不足，至少需要標題行和一行數據');
      }

      const headers = values[0] as string[];
      const rows = values.slice(1).map((row: any[]) => {
        const rowData: Record<string, any> = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });
        return rowData;
      });

      // 自動識別 email 欄位
      const emailColumn = this.findEmailColumn(headers);
      if (!emailColumn) {
        throw new Error('無法找到 email 欄位，請確認工作表包含 email 相關欄位');
      }

      // 自動識別日期欄位
      const dateColumn = this.findDateColumn(headers);

      return {
        headers,
        rows,
        emailColumn,
        dateColumn,
      };
    } catch (error) {
      console.error('Parse sheet error:', error);
      throw error;
    }
  }

  private getMockSheetStructure(spreadsheetId: string): SheetParseResult {
    console.log(`Getting mock data for spreadsheet: ${spreadsheetId}`);

    // 根據 spreadsheetId 返回對應的模擬數據結構
    if (spreadsheetId === '1FZffolNcXjkZ-14vA3NVRdN7czm8E6JjdkGidn38LgM') {
      // 體驗課相關的工作表
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      return {
        headers: ['姓名', 'email', '上課日期', '授課老師', '是否已評價', '未轉單原因', '體驗課文字檔'],
        rows: [
          {
            '姓名': '張小明',
            'email': 'zhang@example.com',
            '上課日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '授課老師': 'Teacher A',
            '是否已評價': '是',
            '未轉單原因': '',
            '體驗課文字檔': '完成'
          },
          {
            '姓名': '李小華',
            'email': 'li@example.com',
            '上課日期': yesterday.toISOString().split('T')[0].replace(/-/g, '/'),
            '授課老師': 'Teacher B',
            '是否已評價': '否',
            '未轉單原因': '時間不合適',
            '體驗課文字檔': '進行中'
          },
          {
            '姓名': '王小美',
            'email': 'wang@example.com',
            '上課日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '授課老師': 'Teacher C',
            '是否已評價': '是',
            '未轉單原因': '',
            '體驗課文字檔': '完成'
          }
        ],
        emailColumn: 'email',
        dateColumn: '上課日期',
      };
    } else if (spreadsheetId === '1xPMeomC2w3P79jj7gs8RxHpdbRFBxWBcrRy_g3OkBXI') {
      // EODs for Closers 諮詢記錄
      const today = new Date();
      return {
        headers: ['Name', 'Email', '（諮詢）諮詢日期', '（諮詢）成交方案', '（諮詢）實收金額', '（諮詢）諮詢結果'],
        rows: [
          {
            'Name': '王小美',
            'Email': 'wang@example.com',
            '（諮詢）諮詢日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '（諮詢）成交方案': '基礎方案',
            '（諮詢）實收金額': '8000',
            '（諮詢）諮詢結果': '成交'
          },
          {
            'Name': '李小華',
            'Email': 'li@example.com',
            '（諮詢）諮詢日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '（諮詢）成交方案': '進階方案',
            '（諮詢）實收金額': '12000',
            '（諮詢）諮詢結果': '成交'
          }
        ],
        emailColumn: 'Email',
        dateColumn: '（諮詢）諮詢日期',
      };
    }

    // 體驗課購買記錄表的模擬數據
    if (spreadsheetId.includes('purchase') || spreadsheetId === '1FZffolNcXjkZ-14vA3NVRdN7czm8E6JjdkGidn38LgM') {
      const today = new Date();
      return {
        headers: ['姓名', 'email', '年齡', '職業', '方案名稱', '體驗堂數', '體驗課購買日期', '目前狀態'],
        rows: [
          {
            '姓名': '張小明',
            'email': 'zhang@example.com',
            '年齡': '25',
            '職業': '工程師',
            '方案名稱': '體驗方案',
            '體驗堂數': '3',
            '體驗課購買日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '目前狀態': '進行中'
          },
          {
            '姓名': '王小美',
            'email': 'wang@example.com',
            '年齡': '28',
            '職業': '設計師',
            '方案名稱': '體驗方案',
            '體驗堂數': '5',
            '體驗課購買日期': today.toISOString().split('T')[0].replace(/-/g, '/'),
            '目前狀態': '已完成'
          }
        ],
        emailColumn: 'email',
        dateColumn: '體驗課購買日期',
      };
    }

    // 默認結構
    return {
      headers: ['name', 'email', 'date'],
      rows: [],
      emailColumn: 'email',
      dateColumn: 'date',
    };
  }

  private findEmailColumn(headers: string[]): string | undefined {
    const emailPatterns = ['email', 'Email', 'EMAIL', '電子郵件', '郵箱', 'mail'];
    return headers.find(header =>
      emailPatterns.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))
    );
  }

  private findDateColumn(headers: string[]): string | undefined {
    const datePatterns = ['date', 'Date', 'DATE', '日期', '時間', '上課日期', '購買日期', '諮詢日期', '成交日期'];
    return headers.find(header =>
      datePatterns.some(pattern => header.toLowerCase().includes(pattern.toLowerCase()))
    );
  }

  async syncDataSource(dataSource: DataSource): Promise<number> {
    try {
      const sheetData = await this.parseSheetStructure(
        dataSource.spreadsheetId,
        dataSource.worksheetName ?? undefined
      );

      // 清除舊數據
      await simpleStorage.clearRawDataBySource(dataSource.id);

      // 插入新數據
      let insertedCount = 0;
      for (const row of sheetData.rows) {
        const email = row[dataSource.emailColumn];
        if (!email) continue;

        // 嘗試解析日期
        let extractedDate: Date | null = null;
        if (dataSource.dateColumn != null && row[dataSource.dateColumn] != null) {
          extractedDate = this.parseDate(row[dataSource.dateColumn]) ?? null;
        }

        await simpleStorage.addRawData({
          dataSourceId: dataSource.id,
          email: email.toString().toLowerCase().trim(),
          rowData: row,
          extractedDate,
        });

        insertedCount++;
      }

      // 更新同步時間
      await simpleStorage.updateDataSourceSync(dataSource.id);

      console.log(`Synced ${insertedCount} rows for data source: ${dataSource.name}`);
      return insertedCount;

    } catch (error) {
      console.error(`Sync error for data source ${dataSource.name}:`, error);
      throw error;
    }
  }

  private parseDate(dateStr: string): Date | undefined {
    if (!dateStr) return undefined;

    // 嘗試多種日期格式
    const formats = [
      // YYYY/MM/DD
      /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,
      // YYYY-MM-DD
      /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
      // MM/DD/YYYY
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    ];

    for (const format of formats) {
      const match = dateStr.trim().match(format);
      if (match) {
        let year, month, day;
        if (format === formats[2]) {
          // MM/DD/YYYY
          [, month, day, year] = match;
        } else {
          // YYYY/MM/DD or YYYY-MM-DD
          [, year, month, day] = match;
        }

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    // 嘗試 JavaScript 原生解析
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // 創建數據源配置
  async createDataSource(config: DataSourceConfig): Promise<DataSource> {
    // 先解析工作表結構來驗證配置
    const sheetData = await this.parseSheetStructure(config.spreadsheetId, config.worksheetName);

    // 驗證 email 欄位存在
    if (!sheetData.headers.includes(config.emailColumn)) {
      throw new Error(`指定的 email 欄位 "${config.emailColumn}" 不存在於工作表中`);
    }

    // 如果指定了日期欄位，驗證其存在
    if (config.dateColumn && !sheetData.headers.includes(config.dateColumn)) {
      throw new Error(`指定的日期欄位 "${config.dateColumn}" 不存在於工作表中`);
    }

    // 創建數據源
    const dataSource = await simpleStorage.addDataSource({
      name: config.name,
      type: config.type,
      spreadsheetId: config.spreadsheetId,
      worksheetName: config.worksheetName,
      gid: config.gid,
      emailColumn: config.emailColumn,
      dateColumn: config.dateColumn,
      headers: sheetData.headers,
    });

    // 立即同步一次數據
    await this.syncDataSource(dataSource);

    return dataSource;
  }

  // 同步所有活躍的數據源
  async syncAllDataSources(): Promise<void> {
    const dataSources = await simpleStorage.getDataSources();

    for (const dataSource of dataSources) {
      try {
        await this.syncDataSource(dataSource);
      } catch (error) {
        console.error(`Failed to sync data source ${dataSource.name}:`, error);
      }
    }
  }
}

export const simpleSheetsService = new SimpleSheetsService();