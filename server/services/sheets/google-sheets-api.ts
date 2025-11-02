/**
 * Google Sheets API Service
 *
 * 負責與 Google Sheets API 互動，讀取工作表資料
 */

import { google } from 'googleapis';

export class GoogleSheetsAPI {
  private sheets;
  private auth;

  constructor(credentials: any) {
    this.auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(credentials),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  /**
   * 列出 Google Sheet 中所有工作表
   */
  async listWorksheets(sheetId: string): Promise<string[]> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId
      });

      const worksheetNames = response.data.sheets?.map(
        sheet => sheet.properties?.title || ''
      ).filter(name => name !== '') || [];

      console.log(`📋 Found ${worksheetNames.length} worksheets in sheet ${sheetId}`);
      return worksheetNames;
    } catch (error: any) {
      console.error(`❌ Error listing worksheets:`, error.message);
      throw new Error(`Failed to list worksheets: ${error.message}`);
    }
  }

  /**
   * 讀取工作表所有資料
   */
  async getWorksheetData(sheetId: string, worksheetName: string): Promise<any[][]> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${worksheetName}!A1:ZZ`,
      });

      const values = response.data.values || [];
      console.log(`📊 Retrieved ${values.length} rows from ${worksheetName}`);
      return values;
    } catch (error: any) {
      console.error(`❌ Error reading worksheet data:`, error.message);
      throw new Error(`Failed to read worksheet: ${error.message}`);
    }
  }

  /**
   * 只讀取工作表標題列（第一行）
   */
  async getWorksheetHeaders(sheetId: string, worksheetName: string): Promise<string[]> {
    try {
      const data = await this.getWorksheetData(sheetId, worksheetName);
      const headers = data[0] || [];
      console.log(`📌 Headers: ${headers.join(', ')}`);
      return headers;
    } catch (error: any) {
      console.error(`❌ Error reading headers:`, error.message);
      throw new Error(`Failed to read headers: ${error.message}`);
    }
  }

  /**
   * 從 Google Sheets URL 解析 Sheet ID
   */
  static extractSheetId(url: string): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheets URL');
    }
    return match[1];
  }
}
