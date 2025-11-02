import {
  dataSources,
  rawData,
  reports,
  type DataSource,
  type InsertDataSource,
  type RawData,
  type InsertRawData,
  type Report,
  type InsertReport
} from "@shared/simple-schema";

// 簡化的記憶體存儲 - 用於 MVP
class SimpleStorage {
  private dataSourcesMap = new Map<string, DataSource>();
  private rawDataMap = new Map<string, RawData>();
  private reportsMap = new Map<string, Report>();

  // 數據源管理
  async addDataSource(data: Omit<InsertDataSource, 'id'>): Promise<DataSource> {
    const id = `ds_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const dataSource: DataSource = {
      id,
      name: data.name,
      type: data.type,
      spreadsheetId: data.spreadsheetId,
      worksheetName: data.worksheetName ?? null,
      gid: data.gid ?? null,
      emailColumn: data.emailColumn,
      dateColumn: data.dateColumn ?? null,
      headers: [...data.headers] as string[],
      isActive: true,
      lastSyncAt: new Date(),
      createdAt: new Date(),
    };
    this.dataSourcesMap.set(id, dataSource);
    return dataSource;
  }

  async getDataSources(): Promise<DataSource[]> {
    return Array.from(this.dataSourcesMap.values()).filter(ds => ds.isActive);
  }

  async getDataSource(id: string): Promise<DataSource | null> {
    return this.dataSourcesMap.get(id) || null;
  }

  async updateDataSourceSync(id: string): Promise<void> {
    const dataSource = this.dataSourcesMap.get(id);
    if (dataSource) {
      dataSource.lastSyncAt = new Date();
      this.dataSourcesMap.set(id, dataSource);
    }
  }

  // 原始數據管理
  async addRawData(data: Omit<InsertRawData, 'id'>): Promise<RawData> {
    const id = `rd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const rawDataEntry: RawData = {
      id,
      dataSourceId: data.dataSourceId,
      email: data.email,
      rowData: data.rowData,
      extractedDate: data.extractedDate ?? null,
      lastUpdated: new Date(),
    };
    this.rawDataMap.set(id, rawDataEntry);
    return rawDataEntry;
  }

  async getRawDataBySource(dataSourceId: string): Promise<RawData[]> {
    return Array.from(this.rawDataMap.values())
      .filter(data => data.dataSourceId === dataSourceId);
  }

  async getRawDataByEmail(email: string): Promise<RawData[]> {
    return Array.from(this.rawDataMap.values())
      .filter(data => data.email === email);
  }

  async getRawDataByDateRange(dataSourceId: string, startDate: Date, endDate: Date): Promise<RawData[]> {
    return Array.from(this.rawDataMap.values())
      .filter(data =>
        data.dataSourceId === dataSourceId &&
        data.extractedDate &&
        data.extractedDate >= startDate &&
        data.extractedDate <= endDate
      );
  }

  async clearRawDataBySource(dataSourceId: string): Promise<void> {
    const toDelete: string[] = [];
    for (const [id, data] of Array.from(this.rawDataMap.entries())) {
      if (data.dataSourceId === dataSourceId) {
        toDelete.push(id);
      }
    }
    toDelete.forEach(id => this.rawDataMap.delete(id));
  }

  // 報表管理
  async addReport(data: Omit<InsertReport, 'id'>): Promise<Report> {
    const id = `rp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const report: Report = {
      id,
      type: data.type,
      reportDate: data.reportDate,
      data: {
        period: data.data.period,
        metrics: data.data.metrics,
        details: {
          classes: [...data.data.details.classes],
          purchases: [...data.data.details.purchases],
          deals: [...data.data.details.deals],
        },
      },
      aiInsights: data.aiInsights ?? null,
      userModifiedInsights: data.userModifiedInsights ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.reportsMap.set(id, report);
    return report;
  }

  async getReport(id: string): Promise<Report | null> {
    return this.reportsMap.get(id) || null;
  }

  async getReports(type?: string, limit = 10): Promise<Report[]> {
    const reports = Array.from(this.reportsMap.values());
    const filtered = type ? reports.filter(r => r.type === type) : reports;
    return filtered
      .sort((a, b) => {
        const timeA = a.createdAt ? a.createdAt.getTime() : 0;
        const timeB = b.createdAt ? b.createdAt.getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, limit);
  }

  async updateReportInsights(id: string, insights: string): Promise<Report | null> {
    const report = this.reportsMap.get(id);
    if (report) {
      report.userModifiedInsights = insights;
      report.updatedAt = new Date();
      this.reportsMap.set(id, report);
      return report;
    }
    return null;
  }

  // 統計查詢
  async getDataByPeriod(type: 'daily' | 'weekly', date: Date) {
    const startDate = new Date(date);
    const endDate = new Date(date);

    if (type === 'daily') {
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // 週報：從週一到週日
      const dayOfWeek = startDate.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDate.setDate(startDate.getDate() - daysFromMonday);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);
    }

    const dataSources = await this.getDataSources();
    const result = {
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      classes: [] as RawData[],
      purchases: [] as RawData[],
      consultations: [] as RawData[],
    };

    for (const dataSource of dataSources) {
      const data = await this.getRawDataByDateRange(dataSource.id, startDate, endDate);

      switch (dataSource.type) {
        case 'class_records':
          result.classes.push(...data);
          break;
        case 'purchase_records':
          result.purchases.push(...data);
          break;
        case 'consultation_records':
          result.consultations.push(...data);
          break;
      }
    }

    return result;
  }

  // 數據統計
  getDataStats() {
    return {
      dataSourcesCount: this.dataSourcesMap.size,
      rawDataCount: this.rawDataMap.size,
      reportsCount: this.reportsMap.size,
    };
  }

  // 清理所有數據（用於重置）
  clearAllData() {
    this.dataSourcesMap.clear();
    this.rawDataMap.clear();
    this.reportsMap.clear();
  }
}

export const simpleStorage = new SimpleStorage();