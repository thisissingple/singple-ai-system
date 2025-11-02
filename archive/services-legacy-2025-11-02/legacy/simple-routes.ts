import type { Express } from "express";
import { createServer, type Server } from "http";
import { simpleSheetsService } from "./services/simple-sheets";
import { reportGenerator } from "./services/report-generator";
import { simpleStorage } from "./simple-storage";
import {
  dataSourceConfigSchema,
  generateReportSchema,
  updateInsightsSchema,
  type RawData,
} from "@shared/simple-schema";
import { z } from "zod";

export async function registerSimpleRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // ===== 數據源管理 API =====

  // 獲取所有數據源
  app.get('/api/data-sources', async (req, res) => {
    try {
      const dataSources = await simpleStorage.getDataSources();
      res.json({ success: true, data: dataSources });
    } catch (error) {
      console.error('Error fetching data sources:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 創建新數據源
  app.post('/api/data-sources', async (req, res) => {
    try {
      const config = dataSourceConfigSchema.parse(req.body);
      const dataSource = await simpleSheetsService.createDataSource(config);
      res.json({ success: true, data: dataSource });
    } catch (error: any) {
      console.error('Error creating data source:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ success: false, error: error.message || 'Failed to create data source' });
    }
  });

  // 同步特定數據源
  app.post('/api/data-sources/:id/sync', async (req, res) => {
    try {
      const dataSource = await simpleStorage.getDataSource(req.params.id);
      if (!dataSource) {
        return res.status(404).json({ success: false, error: 'Data source not found' });
      }

      const syncedCount = await simpleSheetsService.syncDataSource(dataSource);
      res.json({
        success: true,
        data: {
          message: 'Sync completed successfully',
          syncedRows: syncedCount
        }
      });
    } catch (error: any) {
      console.error('Error syncing data source:', error);
      res.status(500).json({ success: false, error: error.message || 'Sync failed' });
    }
  });

  // 同步所有數據源
  app.post('/api/data-sources/sync-all', async (req, res) => {
    try {
      await simpleSheetsService.syncAllDataSources();
      res.json({ success: true, data: { message: 'All data sources synced successfully' } });
    } catch (error: any) {
      console.error('Error syncing all data sources:', error);
      res.status(500).json({ success: false, error: error.message || 'Sync failed' });
    }
  });

  // ===== 報表生成 API =====

  // 生成報表
  app.post('/api/reports/generate', async (req, res) => {
    try {
      const request = generateReportSchema.parse(req.body);
      const report = await reportGenerator.generateReport(request);
      res.json({ success: true, data: report });
    } catch (error: any) {
      console.error('Error generating report:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ success: false, error: error.message || 'Failed to generate report' });
    }
  });

  // 獲取報表列表
  app.get('/api/reports', async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const limit = parseInt(req.query.limit as string) || 10;
      const reports = await reportGenerator.getReports(type, limit);
      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 獲取特定報表
  app.get('/api/reports/:id', async (req, res) => {
    try {
      const report = await reportGenerator.getReport(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }
      res.json({ success: true, data: report });
    } catch (error) {
      console.error('Error fetching report:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 更新報表 AI 建議
  app.put('/api/reports/:id/insights', async (req, res) => {
    try {
      const { insights } = updateInsightsSchema.parse({
        reportId: req.params.id,
        ...req.body
      });

      const updatedReport = await reportGenerator.updateReportInsights(req.params.id, insights);
      if (!updatedReport) {
        return res.status(404).json({ success: false, error: 'Report not found' });
      }

      res.json({ success: true, data: updatedReport });
    } catch (error: any) {
      console.error('Error updating report insights:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ success: false, error: 'Validation failed', details: error.errors });
      }
      res.status(400).json({ success: false, error: error.message || 'Failed to update insights' });
    }
  });

  // ===== 系統狀態 API =====

  // 獲取系統狀態
  app.get('/api/status', async (req, res) => {
    try {
      const dataSources = await simpleStorage.getDataSources();
      const stats = simpleStorage.getDataStats();

      res.json({
        success: true,
        data: {
          status: 'healthy',
          dataSourcesCount: dataSources.length,
          stats,
          dataSources: dataSources.map(ds => ({
            id: ds.id,
            name: ds.name,
            type: ds.type,
            isActive: ds.isActive,
            lastSyncAt: ds.lastSyncAt,
          })),
        }
      });
    } catch (error) {
      console.error('Error fetching status:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // 初始化測試數據源（一次性設置）
  app.post('/api/init-test-data', async (req, res) => {
    try {
      // 清除所有現有數據
      simpleStorage.clearAllData();

      // 創建三個測試數據源
      const dataSources = [
        {
          name: '體驗課上課記錄表',
          type: 'class_records' as const,
          spreadsheetId: '1FZffolNcXjkZ-14vA3NVRdN7czm8E6JjdkGidn38LgM',
          worksheetName: '體驗課上課記錄表',
          gid: '110563615',
          emailColumn: 'email',
          dateColumn: '上課日期',
        },
        {
          name: '體驗課購買記錄表',
          type: 'purchase_records' as const,
          spreadsheetId: '1FZffolNcXjkZ-14vA3NVRdN7czm8E6JjdkGidn38LgM',
          worksheetName: '體驗課購買記錄表',
          gid: '2079368421',
          emailColumn: 'email',
          dateColumn: '體驗課購買日期',
        },
        {
          name: 'EODs for Closers',
          type: 'consultation_records' as const,
          spreadsheetId: '1xPMeomC2w3P79jj7gs8RxHpdbRFBxWBcrRy_g3OkBXI',
          worksheetName: 'EODs for Closers',
          gid: '592978511',
          emailColumn: 'Email',
          dateColumn: '（諮詢）諮詢日期',
        },
      ];

      const createdDataSources = [];
      for (const config of dataSources) {
        try {
          const dataSource = await simpleSheetsService.createDataSource(config);
          createdDataSources.push(dataSource);
        } catch (error) {
          console.error(`Failed to create data source ${config.name}:`, error);
        }
      }

      res.json({
        success: true,
        data: {
          message: 'Test data sources initialized successfully',
          dataSources: createdDataSources,
        }
      });
    } catch (error: any) {
      console.error('Error initializing test data:', error);
      res.status(500).json({ success: false, error: error.message || 'Failed to initialize test data' });
    }
  });

  // ===== 開發用 API =====

  // 清除所有數據
  app.post('/api/dev/clear-data', async (req, res) => {
    try {
      simpleStorage.clearAllData();
      res.json({ success: true, data: { message: 'All data cleared successfully' } });
    } catch (error) {
      console.error('Error clearing data:', error);
      res.status(500).json({ success: false, error: 'Failed to clear data' });
    }
  });

  // 獲取原始數據（用於除錯）
  app.get('/api/dev/raw-data', async (req, res) => {
    try {
      const dataSourceId = req.query.dataSourceId as string;
      const email = req.query.email as string;

      let rawData: RawData[];
      if (dataSourceId) {
        rawData = await simpleStorage.getRawDataBySource(dataSourceId);
      } else if (email) {
        rawData = await simpleStorage.getRawDataByEmail(email);
      } else {
        rawData = []; // 避免返回所有數據
      }

      res.json({
        success: true,
        data: {
          count: rawData.length,
          items: rawData.slice(0, 100), // 限制返回數量
        }
      });
    } catch (error) {
      console.error('Error fetching raw data:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  console.log('Simple routes registered successfully');
  return httpServer;
}