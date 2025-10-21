/**
 * Extract Module Tests
 */

import { describe, it, expect } from 'vitest';
import { extractFromSheets, validateExtractedData } from '../../server/services/etl/extract';
import type { Worksheet } from '../../shared/schema';

describe('ETL Extract Module', () => {
  const mockWorksheet: Worksheet = {
    id: 'worksheet-123',
    spreadsheetId: 'spreadsheet-123',
    worksheetName: 'Test Sheet',
    gid: '0',
    isEnabled: true,
    range: 'A1:Z1000',
    headers: null,
    rowCount: 0,
    supabaseTable: 'trial_class_attendance',
    lastSyncAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('extractFromSheets', () => {
    it('should extract data with proper structure', () => {
      const headers = ['姓名', 'email', '上課日期'];
      const dataRows = [
        ['王小明', 'wang@example.com', '2025-10-01'],
        ['李小華', 'lee@example.com', '2025-10-02'],
      ];

      const result = extractFromSheets(mockWorksheet, headers, dataRows);

      expect(result.worksheet).toBe(mockWorksheet);
      expect(result.headers).toEqual(headers);
      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual({
        '姓名': '王小明',
        'email': 'wang@example.com',
        '上課日期': '2025-10-01',
      });
    });

    it('should skip empty rows when option is enabled', () => {
      const headers = ['姓名', 'email'];
      const dataRows = [
        ['王小明', 'wang@example.com'],
        ['', ''], // Empty row
        ['李小華', 'lee@example.com'],
      ];

      const result = extractFromSheets(mockWorksheet, headers, dataRows, {
        skipEmptyRows: true,
      });

      expect(result.totalRows).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it('should not skip empty rows when option is disabled', () => {
      const headers = ['姓名', 'email'];
      const dataRows = [
        ['王小明', 'wang@example.com'],
        ['', ''],
        ['李小華', 'lee@example.com'],
      ];

      const result = extractFromSheets(mockWorksheet, headers, dataRows, {
        skipEmptyRows: false,
      });

      expect(result.totalRows).toBe(3);
      expect(result.rows).toHaveLength(3);
    });

    it('should trim values when option is enabled', () => {
      const headers = ['姓名', 'email'];
      const dataRows = [
        ['  王小明  ', '  wang@example.com  '],
      ];

      const result = extractFromSheets(mockWorksheet, headers, dataRows, {
        trimValues: true,
      });

      expect(result.rows[0]['姓名']).toBe('王小明');
      expect(result.rows[0]['email']).toBe('wang@example.com');
    });

    it('should handle missing values in rows', () => {
      const headers = ['姓名', 'email', '上課日期'];
      const dataRows = [
        ['王小明'], // Missing email and date
      ];

      const result = extractFromSheets(mockWorksheet, headers, dataRows);

      expect(result.rows[0]).toEqual({
        '姓名': '王小明',
        'email': '',
        '上課日期': '',
      });
    });
  });

  describe('validateExtractedData', () => {
    it('should validate correct data structure', () => {
      const headers = ['姓名', 'email'];
      const dataRows = [['王小明', 'wang@example.com']];
      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);

      const validation = validateExtractedData(extracted);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing worksheet id', () => {
      const invalidWorksheet = { ...mockWorksheet, id: '' };
      const headers = ['姓名'];
      const dataRows = [['王小明']];
      const extracted = extractFromSheets(invalidWorksheet as any, headers, dataRows);

      const validation = validateExtractedData(extracted);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Invalid worksheet: missing id');
    });

    it('should detect missing headers', () => {
      const extracted = {
        worksheet: mockWorksheet,
        headers: [],
        rows: [],
        totalRows: 0,
        extractedAt: new Date(),
      };

      const validation = validateExtractedData(extracted);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('No headers found in extracted data');
    });
  });
});
