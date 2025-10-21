/**
 * 測試 ETL 的缺失欄位檢測功能
 *
 * 驗證新版 ETL pipeline 能正確檢測並回傳缺失欄位資訊
 */

import { describe, it, expect } from '@jest/globals';
import { extractFromSheets } from '../../server/services/etl/extract';
import { runETL } from '../../server/services/etl';
import type { Worksheet } from '../../shared/schema';

describe('ETL Missing Mappings Detection', () => {
  describe('Extract Phase', () => {
    it('應該檢測到缺失的必填欄位', () => {
      const worksheet: Worksheet = {
        id: 'test-1',
        worksheetName: 'Test Attendance',
        supabaseTable: 'trial_class_attendance',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        '姓名',
        'email',
        // 缺少：上課日期（必填）
        '授課老師',
        '備註',
      ];

      const dataRows = [
        ['張三', 'test@example.com', '王老師', '測試備註'],
      ];

      const result = extractFromSheets(worksheet, headers, dataRows);

      expect(result.missingMappings).toBeDefined();
      expect(result.missingMappings!.length).toBeGreaterThan(0);

      const requiredMissing = result.missingMappings!.filter(m => m.required);
      expect(requiredMissing.length).toBe(1);
      expect(requiredMissing[0].googleSheetColumn).toBe('上課日期');
      expect(requiredMissing[0].label).toBe('上課日期');
    });

    it('應該檢測到缺失的選填欄位', () => {
      const worksheet: Worksheet = {
        id: 'test-2',
        worksheetName: 'Test Attendance',
        supabaseTable: 'trial_class_attendance',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        '姓名',
        'email',
        '上課日期',
        '授課老師',
        // 缺少：是否已審核、未轉換原因、課程記錄、備註（選填）
      ];

      const dataRows = [
        ['張三', 'test@example.com', '2024-01-01', '王老師'],
      ];

      const result = extractFromSheets(worksheet, headers, dataRows);

      expect(result.missingMappings).toBeDefined();

      const optionalMissing = result.missingMappings!.filter(m => !m.required);
      expect(optionalMissing.length).toBeGreaterThan(0);

      // 檢查是否有備註欄位
      const notesMissing = optionalMissing.find(m => m.googleSheetColumn === '備註');
      expect(notesMissing).toBeDefined();
    });

    it('完整欄位時不應該有缺失', () => {
      const worksheet: Worksheet = {
        id: 'test-3',
        worksheetName: 'Test Attendance',
        supabaseTable: 'trial_class_attendance',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        '姓名',
        'email',
        '上課日期',
        '授課老師',
        '是否已審核',
        '未轉換原因',
        '課程記錄',
        '備註',
      ];

      const dataRows = [
        ['張三', 'test@example.com', '2024-01-01', '王老師', 'true', '', '', '測試'],
      ];

      const result = extractFromSheets(worksheet, headers, dataRows);

      expect(result.missingMappings).toBeUndefined();
    });

    it('應該正確處理帶空白的欄位名', () => {
      const worksheet: Worksheet = {
        id: 'test-4',
        worksheetName: 'Test Attendance',
        supabaseTable: 'trial_class_attendance',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        '  姓名  ',
        '  email  ',
        '  上課日期  ',
        '  授課老師  ',
      ];

      const dataRows = [
        ['張三', 'test@example.com', '2024-01-01', '王老師'],
      ];

      const result = extractFromSheets(worksheet, headers, dataRows);

      // 空白應該被正確處理，所以應該沒有必填欄位缺失
      const requiredMissing = result.missingMappings?.filter(m => m.required) || [];
      expect(requiredMissing.length).toBe(0);
    });
  });

  describe('Full ETL Pipeline', () => {
    it('應該在 ETLResult 中回傳 missingMappings', async () => {
      const worksheet: Worksheet = {
        id: 'test-5',
        worksheetName: 'Test Purchase',
        supabaseTable: 'trial_class_purchase',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        '姓名',
        'email',
        // 缺少：方案名稱（必填）、體驗課購買日期（必填）
      ];

      const dataRows = [
        ['張三', 'test@example.com'],
      ];

      const result = await runETL(worksheet, headers, dataRows);

      expect(result.missingMappings).toBeDefined();
      expect(result.missingMappings!.length).toBeGreaterThan(0);

      const requiredMissing = result.missingMappings!.filter(m => m.required);
      expect(requiredMissing.length).toBe(2); // 方案名稱 + 體驗課購買日期
    });

    it('應該在 warnings 中包含缺失欄位訊息', async () => {
      const worksheet: Worksheet = {
        id: 'test-6',
        worksheetName: 'Test EODs',
        supabaseTable: 'eods_for_closers',
        syncEnabled: true,
        spreadsheetId: 'test-spreadsheet',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const headers = [
        'Name',
        'Email',
        // 缺少：（諮詢）諮詢人員（必填）
      ];

      const dataRows = [
        ['張三', 'test@example.com'],
      ];

      const result = await runETL(worksheet, headers, dataRows);

      expect(result.warnings).toBeDefined();

      const missingFieldWarning = result.warnings.find(w => w.includes('缺少必填欄位'));
      expect(missingFieldWarning).toBeDefined();
      expect(missingFieldWarning).toContain('諮詢人員');
    });
  });
});
