import { storage } from '../legacy/storage';
import { googleSheetsService } from '../legacy/google-sheets';
import type { Worksheet } from '@shared/schema';

export interface ColumnAnalysis {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone' | 'currency';
  confidence: number; // 0-1
  samples: any[];
  nullCount: number;
  uniqueCount: number;
  patterns?: string[];
}

export interface WorksheetAnalysis {
  worksheetId: string;
  worksheetName: string;
  category: 'sales' | 'customer' | 'analytics' | 'inventory' | 'financial' | 'education' | 'unknown';
  confidence: number;
  columns: ColumnAnalysis[];
  rowCount: number;
  suggestedReports: ReportSuggestion[];
  dataQuality: {
    completeness: number; // 0-1
    consistency: number; // 0-1
    accuracy: number; // 0-1
  };
}

export interface ReportSuggestion {
  type: 'kpi' | 'chart' | 'table' | 'funnel' | 'trend';
  title: string;
  description: string;
  chartType?: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  metrics: {
    column: string;
    aggregation: 'sum' | 'count' | 'average' | 'max' | 'min' | 'countDistinct';
  }[];
  filters?: {
    column: string;
    type: 'date' | 'category' | 'numeric';
  }[];
  groupBy?: string[];
  confidence: number;
}

export class AutoAnalysisService {

  async analyzeWorksheet(worksheetId: string): Promise<WorksheetAnalysis | null> {
    console.log(`🔍 Starting analysis for worksheet: ${worksheetId}`);

    try {
      // 檢查工作表是否存在
      const worksheet = await storage.getWorksheet(worksheetId);
      if (!worksheet) {
        console.error(`❌ Worksheet not found: ${worksheetId}`);
        throw new Error(`Worksheet ${worksheetId} not found`);
      }

      console.log(`✅ Found worksheet: ${worksheet.worksheetName} (enabled: ${worksheet.isEnabled})`);
      console.log(`📋 Worksheet headers: ${JSON.stringify(worksheet.headers)}`);

      // 獲取工作表數據 - 不分頁，獲取所有數據用於分析
      const data = await storage.getWorksheetData(worksheetId, 1, 10000);
      console.log(`📊 Retrieved ${data.length} rows of data for analysis`);

      if (!data || data.length === 0) {
        console.warn(`⚠️ No data found for worksheet ${worksheetId} (${worksheet.worksheetName})`);

        // 嘗試獲取 spreadsheet-level 數據
        const spreadsheetData = await storage.getSheetData(worksheet.spreadsheetId, 1, 10000);
        console.log(`📊 Found ${spreadsheetData.length} rows in spreadsheet-level data`);

        if (spreadsheetData.length === 0) {
          throw new Error(`No data found for worksheet ${worksheetId}. Please sync the worksheet first.`);
        }

        // 使用 spreadsheet 數據進行分析
        console.log(`🔄 Using spreadsheet-level data for analysis`);
        return await this.analyzeSpreadsheetData(worksheet, spreadsheetData);
      }

      // 檢查數據結構
      if (data.length > 0) {
        console.log(`📝 Sample data structure:`, {
          firstRow: data[0],
          dataKeys: Object.keys(data[0].data || {}),
          hasWorksheetId: !!data[0].worksheetId
        });
      }

      // 分析欄位
      console.log(`🔬 Analyzing columns...`);
      const columns = await this.analyzeColumns(data, worksheet.headers || []);
      console.log(`✅ Analyzed ${columns.length} columns`);

      // 分析工作表類別
      console.log(`🏷️ Categorizing worksheet...`);
      const category = this.categorizeWorksheet(worksheet.worksheetName, columns);
      console.log(`✅ Categorized as: ${category.category} (confidence: ${Math.round(category.confidence * 100)}%)`);

      // 生成報表建議
      console.log(`💡 Generating report suggestions...`);
      const suggestedReports = this.generateReportSuggestions(category.category, columns, data);
      console.log(`✅ Generated ${suggestedReports.length} report suggestions`);

      // 計算數據品質
      console.log(`🔍 Assessing data quality...`);
      const dataQuality = this.assessDataQuality(columns, data);
      console.log(`✅ Data quality: completeness=${Math.round(dataQuality.completeness * 100)}%, consistency=${Math.round(dataQuality.consistency * 100)}%`);

      const result = {
        worksheetId,
        worksheetName: worksheet.worksheetName,
        category: category.category,
        confidence: category.confidence,
        columns,
        rowCount: data.length,
        suggestedReports,
        dataQuality
      };

      console.log(`🎉 Analysis completed successfully for worksheet: ${worksheet.worksheetName}`);
      return result;

    } catch (error) {
      console.error(`❌ Error analyzing worksheet ${worksheetId}:`, error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  private async analyzeSpreadsheetData(worksheet: any, data: any[]): Promise<WorksheetAnalysis> {
    console.log(`🔄 Analyzing spreadsheet-level data for worksheet: ${worksheet.worksheetName}`);

    // 分析欄位
    const columns = await this.analyzeColumns(data, worksheet.headers || []);

    // 分析工作表類別
    const category = this.categorizeWorksheet(worksheet.worksheetName, columns);

    // 生成報表建議
    const suggestedReports = this.generateReportSuggestions(category.category, columns, data);

    // 計算數據品質
    const dataQuality = this.assessDataQuality(columns, data);

    return {
      worksheetId: worksheet.id,
      worksheetName: worksheet.worksheetName,
      category: category.category,
      confidence: category.confidence,
      columns,
      rowCount: data.length,
      suggestedReports,
      dataQuality
    };
  }

  async analyzeAllWorksheets(spreadsheetId: string): Promise<WorksheetAnalysis[]> {
    console.log(`🚀 Starting analysis for all worksheets in spreadsheet: ${spreadsheetId}`);

    const worksheets = await storage.getWorksheets(spreadsheetId);
    console.log(`📋 Found ${worksheets.length} worksheets`);

    const analyses: WorksheetAnalysis[] = [];
    let successCount = 0;
    let failureCount = 0;

    for (const worksheet of worksheets) {
      console.log(`📝 Processing worksheet: ${worksheet.worksheetName} (enabled: ${worksheet.isEnabled})`);

      if (worksheet.isEnabled) {
        const analysis = await this.analyzeWorksheet(worksheet.id);
        if (analysis) {
          analyses.push(analysis);
          successCount++;
          console.log(`✅ Successfully analyzed: ${worksheet.worksheetName}`);
        } else {
          failureCount++;
          console.log(`❌ Failed to analyze: ${worksheet.worksheetName}`);
        }
      } else {
        console.log(`⏭️ Skipping disabled worksheet: ${worksheet.worksheetName}`);
      }
    }

    console.log(`🎯 Analysis summary: ${successCount} succeeded, ${failureCount} failed out of ${worksheets.filter(w => w.isEnabled).length} enabled worksheets`);
    return analyses;
  }

  private async analyzeColumns(data: any[], headers: string[]): Promise<ColumnAnalysis[]> {
    const analyses: ColumnAnalysis[] = [];

    for (const header of headers) {
      const values = data.map(row => row.data[header]).filter(v => v !== null && v !== undefined && v !== '');
      const allValues = data.map(row => row.data[header]);

      const analysis: ColumnAnalysis = {
        name: header,
        type: this.detectColumnType(values),
        confidence: this.calculateTypeConfidence(values),
        samples: values.slice(0, 5),
        nullCount: allValues.length - values.length,
        uniqueCount: new Set(values).size,
        patterns: this.detectPatterns(values)
      };

      analyses.push(analysis);
    }

    return analyses;
  }

  private detectColumnType(values: any[]): ColumnAnalysis['type'] {
    if (values.length === 0) return 'string';

    const patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^[\+]?[0-9\-\(\)\s]{8,}$/,
      currency: /^[\$\¥\€\£]?[\d,]+\.?\d*$/,
      date: /^\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2}-\d{1,2}-\d{4}/
    };

    // 檢查特殊類型
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = values.filter(v => pattern.test(String(v))).length;
      if (matches / values.length > 0.8) {
        return type as ColumnAnalysis['type'];
      }
    }

    // 檢查數字
    const numbers = values.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
    if (numbers / values.length > 0.8) {
      return 'number';
    }

    // 檢查布林值
    const booleans = values.filter(v =>
      ['true', 'false', 'yes', 'no', '是', '否', '1', '0'].includes(String(v).toLowerCase())
    ).length;
    if (booleans / values.length > 0.8) {
      return 'boolean';
    }

    return 'string';
  }

  private calculateTypeConfidence(values: any[]): number {
    if (values.length === 0) return 0;

    // 基於一致性計算信心度
    const uniqueTypes = new Set(values.map(v => typeof v));
    const consistency = 1 - (uniqueTypes.size - 1) * 0.2;

    return Math.max(0, Math.min(1, consistency));
  }

  private detectPatterns(values: any[]): string[] {
    const patterns: string[] = [];

    // 檢查常見模式
    const stringValues = values.map(v => String(v));

    // 長度模式
    const lengths = stringValues.map(v => v.length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    if (lengths.every(l => Math.abs(l - avgLength) <= 2)) {
      patterns.push(`固定長度(${Math.round(avgLength)})`);
    }

    // 前綴模式
    const prefixes = stringValues.map(v => v.substring(0, 2));
    const commonPrefix = prefixes.find(p => prefixes.filter(pp => pp === p).length > prefixes.length * 0.5);
    if (commonPrefix) {
      patterns.push(`共同前綴(${commonPrefix})`);
    }

    return patterns;
  }

  private categorizeWorksheet(name: string, columns: ColumnAnalysis[]): { category: WorksheetAnalysis['category'], confidence: number } {
    const lowerName = name.toLowerCase();
    const columnNames = columns.map(c => c.name.toLowerCase());

    // 教育相關關鍵字
    const educationKeywords = ['學員', '學生', '課程', '班級', '成績', '出席', '體驗', '購買', '諮詢'];
    const salesKeywords = ['sales', '銷售', '購買', '交易', '金額', 'amount', 'price', '價格'];
    const customerKeywords = ['customer', '客戶', '用戶', '會員', 'member', 'user'];
    const analyticsKeywords = ['analytics', '分析', '統計', '報表', 'report', 'dashboard'];
    const inventoryKeywords = ['inventory', '庫存', '商品', 'product', '產品', 'item'];
    const financialKeywords = ['financial', '財務', '會計', 'accounting', '收入', '支出', 'revenue'];

    const categories = [
      { keywords: educationKeywords, category: 'education' as const },
      { keywords: salesKeywords, category: 'sales' as const },
      { keywords: customerKeywords, category: 'customer' as const },
      { keywords: analyticsKeywords, category: 'analytics' as const },
      { keywords: inventoryKeywords, category: 'inventory' as const },
      { keywords: financialKeywords, category: 'financial' as const }
    ];

    let bestMatch: { category: WorksheetAnalysis['category'], confidence: number } = { category: 'unknown' as const, confidence: 0 };

    for (const { keywords, category } of categories) {
      let score = 0;

      // 檢查工作表名稱
      for (const keyword of keywords) {
        if (lowerName.includes(keyword)) {
          score += 2;
        }
      }

      // 檢查欄位名稱
      for (const keyword of keywords) {
        for (const colName of columnNames) {
          if (colName.includes(keyword)) {
            score += 1;
          }
        }
      }

      const confidence = Math.min(1, score / 5);
      if (confidence > bestMatch.confidence) {
        bestMatch = { category, confidence };
      }
    }

    return bestMatch;
  }

  private generateReportSuggestions(category: WorksheetAnalysis['category'], columns: ColumnAnalysis[], data: any[]): ReportSuggestion[] {
    const suggestions: ReportSuggestion[] = [];

    // 尋找數字欄位和日期欄位
    const numericColumns = columns.filter(c => c.type === 'number' || c.type === 'currency');
    const dateColumns = columns.filter(c => c.type === 'date');
    const categoryColumns = columns.filter(c => c.type === 'string' && c.uniqueCount < data.length * 0.5);

    // 基於類別生成特定建議
    switch (category) {
      case 'education':
        suggestions.push(...this.generateEducationReports(numericColumns, dateColumns, categoryColumns));
        break;
      case 'sales':
        suggestions.push(...this.generateSalesReports(numericColumns, dateColumns, categoryColumns));
        break;
      case 'customer':
        suggestions.push(...this.generateCustomerReports(numericColumns, dateColumns, categoryColumns));
        break;
      default:
        suggestions.push(...this.generateGenericReports(numericColumns, dateColumns, categoryColumns));
    }

    return suggestions.filter(s => s.confidence > 0.5);
  }

  private generateEducationReports(numeric: ColumnAnalysis[], date: ColumnAnalysis[], category: ColumnAnalysis[]): ReportSuggestion[] {
    const reports: ReportSuggestion[] = [];

    // 學員統計
    if (category.length > 0) {
      reports.push({
        type: 'kpi',
        title: '總學員數',
        description: '統計總學員數量',
        metrics: [{ column: category[0].name, aggregation: 'countDistinct' }],
        confidence: 0.9
      });
    }

    // 購買趨勢（如果有金額和日期）
    const amountCol = numeric.find(c => c.name.toLowerCase().includes('金額') || c.name.toLowerCase().includes('amount'));
    const dateCol = date[0];

    if (amountCol && dateCol) {
      reports.push({
        type: 'chart',
        title: '購買趨勢',
        description: '顯示購買金額隨時間變化',
        chartType: 'line',
        metrics: [{ column: amountCol.name, aggregation: 'sum' }],
        groupBy: [dateCol.name],
        confidence: 0.8
      });
    }

    return reports;
  }

  private generateSalesReports(numeric: ColumnAnalysis[], date: ColumnAnalysis[], category: ColumnAnalysis[]): ReportSuggestion[] {
    const reports: ReportSuggestion[] = [];

    // 銷售總額
    const amountCol = numeric.find(c =>
      c.name.toLowerCase().includes('amount') ||
      c.name.toLowerCase().includes('金額') ||
      c.name.toLowerCase().includes('total')
    );

    if (amountCol) {
      reports.push({
        type: 'kpi',
        title: '總銷售額',
        description: '統計總銷售金額',
        metrics: [{ column: amountCol.name, aggregation: 'sum' }],
        confidence: 0.9
      });

      // 銷售趨勢
      if (date.length > 0) {
        reports.push({
          type: 'chart',
          title: '銷售趨勢',
          description: '顯示銷售額隨時間變化',
          chartType: 'line',
          metrics: [{ column: amountCol.name, aggregation: 'sum' }],
          groupBy: [date[0].name],
          confidence: 0.8
        });
      }
    }

    return reports;
  }

  private generateCustomerReports(numeric: ColumnAnalysis[], date: ColumnAnalysis[], category: ColumnAnalysis[]): ReportSuggestion[] {
    const reports: ReportSuggestion[] = [];

    // 客戶總數
    const nameCol = category.find(c =>
      c.name.toLowerCase().includes('name') ||
      c.name.toLowerCase().includes('客戶') ||
      c.name.toLowerCase().includes('姓名')
    );

    if (nameCol) {
      reports.push({
        type: 'kpi',
        title: '總客戶數',
        description: '統計客戶總數',
        metrics: [{ column: nameCol.name, aggregation: 'countDistinct' }],
        confidence: 0.9
      });
    }

    return reports;
  }

  private generateGenericReports(numeric: ColumnAnalysis[], date: ColumnAnalysis[], category: ColumnAnalysis[]): ReportSuggestion[] {
    const reports: ReportSuggestion[] = [];

    // 數據總覽表格
    reports.push({
      type: 'table',
      title: '數據總覽',
      description: '顯示前10筆數據',
      metrics: [],
      confidence: 0.7
    });

    // 數字欄位統計
    for (const col of numeric.slice(0, 2)) {
      reports.push({
        type: 'kpi',
        title: `${col.name}總計`,
        description: `統計${col.name}的總和`,
        metrics: [{ column: col.name, aggregation: 'sum' }],
        confidence: 0.6
      });
    }

    return reports;
  }

  private assessDataQuality(columns: ColumnAnalysis[], data: any[]): WorksheetAnalysis['dataQuality'] {
    const totalCells = columns.length * data.length;
    const nullCells = columns.reduce((sum, col) => sum + col.nullCount, 0);

    // 完整性：非空值比例
    const completeness = totalCells > 0 ? (totalCells - nullCells) / totalCells : 1;

    // 一致性：基於欄位類型信心度
    const consistency = columns.reduce((sum, col) => sum + col.confidence, 0) / columns.length;

    // 準確性：基於模式匹配和類型一致性
    const accuracy = consistency * 0.8 + completeness * 0.2;

    return {
      completeness: Math.round(completeness * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      accuracy: Math.round(accuracy * 100) / 100
    };
  }

  async generateAutoReport(analysis: WorksheetAnalysis, reportType: ReportSuggestion): Promise<any> {
    const data = await storage.getWorksheetData(analysis.worksheetId);

    switch (reportType.type) {
      case 'kpi':
        return this.generateKPIReport(data, reportType);
      case 'chart':
        return this.generateChartReport(data, reportType);
      case 'table':
        return this.generateTableReport(data, reportType);
      default:
        throw new Error(`Unsupported report type: ${reportType.type}`);
    }
  }

  private generateKPIReport(data: any[], suggestion: ReportSuggestion): any {
    const metric = suggestion.metrics[0];
    const values = data.map(row => row.data[metric.column]).filter(v => v !== null && v !== undefined && v !== '');

    let result = 0;
    switch (metric.aggregation) {
      case 'sum':
        result = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
        break;
      case 'count':
        result = values.length;
        break;
      case 'countDistinct':
        result = new Set(values).size;
        break;
      case 'average':
        const numValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        result = numValues.length > 0 ? numValues.reduce((a, b) => a + b, 0) / numValues.length : 0;
        break;
      case 'max':
        const maxValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        result = maxValues.length > 0 ? Math.max(...maxValues) : 0;
        break;
      case 'min':
        const minValues = values.map(v => Number(v)).filter(v => !isNaN(v));
        result = minValues.length > 0 ? Math.min(...minValues) : 0;
        break;
    }

    return {
      type: 'kpi',
      title: suggestion.title,
      value: result,
      metric: metric.column,
      aggregation: metric.aggregation
    };
  }

  private generateChartReport(data: any[], suggestion: ReportSuggestion): any {
    const metric = suggestion.metrics[0];
    const groupBy = suggestion.groupBy?.[0];

    if (!groupBy) {
      throw new Error('Chart reports require groupBy field');
    }

    const grouped = data.reduce((acc, row) => {
      const key = row.data[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row.data[metric.column]);
      return acc;
    }, {} as Record<string, any[]>);

    const chartData = Object.entries(grouped).map(([key, values]) => {
      const numValues = (values as any[]).map((v: any) => Number(v)).filter((v: number) => !isNaN(v));
      let aggregatedValue = 0;

      switch (metric.aggregation) {
        case 'sum':
          aggregatedValue = numValues.reduce((a: number, b: number) => a + b, 0);
          break;
        case 'average':
          aggregatedValue = numValues.length > 0 ? numValues.reduce((a: number, b: number) => a + b, 0) / numValues.length : 0;
          break;
        case 'count':
          aggregatedValue = (values as any[]).length;
          break;
      }

      return {
        label: key,
        value: aggregatedValue
      };
    });

    return {
      type: 'chart',
      chartType: suggestion.chartType,
      title: suggestion.title,
      data: chartData,
      xAxis: groupBy,
      yAxis: metric.column
    };
  }

  private generateTableReport(data: any[], suggestion: ReportSuggestion): any {
    const limitedData = data.slice(0, 10).map(row => row.data);

    return {
      type: 'table',
      title: suggestion.title,
      data: limitedData,
      totalRows: data.length
    };
  }
}

export const autoAnalysisService = new AutoAnalysisService();