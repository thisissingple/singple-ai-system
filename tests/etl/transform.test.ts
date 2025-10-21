/**
 * Transform Module Tests
 */

import { describe, it, expect } from 'vitest';
import {
  transformData,
  getValidRecords,
  getInvalidRecords,
  standardizeRecords,
} from '../../server/services/etl/transform';
import { extractFromSheets } from '../../server/services/etl/extract';
import type { Worksheet } from '../../shared/schema';

describe('ETL Transform Module', () => {
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

  describe('transformData', () => {
    it('should transform valid data correctly', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [
        ['王小明', 'wang@example.com', '2025-10-01', '李老師'],
      ];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.validCount).toBe(1);
      expect(transformed.invalidCount).toBe(0);
      expect(transformed.records[0].isValid).toBe(true);
      expect(transformed.records[0].data.student_name).toBe('王小明');
      expect(transformed.records[0].data.student_email).toBe('wang@example.com');
      expect(transformed.records[0].data.class_date).toBe('2025-10-01');
      expect(transformed.records[0].data.teacher_name).toBe('李老師');
    });

    it('should add tracking fields when option is enabled', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [['王小明', 'wang@example.com', '2025-10-01', '李老師']];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted, { addTrackingFields: true });

      const record = transformed.records[0].data;
      expect(record.source_worksheet_id).toBe('worksheet-123');
      expect(record.origin_row_index).toBe(0);
      expect(record.synced_at).toBeDefined();
    });

    it('should add system fields when option is enabled', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [['王小明', 'wang@example.com', '2025-10-01', '李老師']];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted, { addSystemFields: true });

      const record = transformed.records[0].data;
      expect(record.teacher_id).toBe(null);
      expect(record.sales_id).toBe(null);
      expect(record.department_id).toBe(null);
    });

    it('should store all original data in raw_data', () => {
      const headers = ['姓名', 'email', '額外欄位'];
      const dataRows = [['王小明', 'wang@example.com', '這是未來新增的欄位']];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);

      const record = transformed.records[0].data;
      expect(record.raw_data).toBeDefined();
      expect(record.raw_data['姓名']).toBe('王小明');
      expect(record.raw_data['email']).toBe('wang@example.com');
      expect(record.raw_data['額外欄位']).toBe('這是未來新增的欄位');
    });

    it('should mark records as invalid when missing required fields', () => {
      const headers = ['姓名']; // Missing email
      const dataRows = [['王小明']];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.validCount).toBe(0);
      expect(transformed.invalidCount).toBe(1);
      expect(transformed.records[0].isValid).toBe(false);
      expect(transformed.records[0].validationErrors.length).toBeGreaterThan(0);
    });

    it('should mark records as invalid when student_email is empty', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [['王小明', '', '2025-10-01', '李老師']]; // Empty email

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted, { requireStudentEmail: true });

      expect(transformed.validCount).toBe(0);
      expect(transformed.invalidCount).toBe(1);
      expect(transformed.records[0].isValid).toBe(false);
    });

    it('should handle date transformation', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [
        ['王小明', 'wang@example.com', '2025-10-01', '李老師'],
        ['李小華', 'lee@example.com', 'invalid-date', '王老師'], // Invalid date
      ];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.records[0].data.class_date).toBe('2025-10-01');
      expect(transformed.records[1].data.class_date).toBe(null); // Invalid date becomes null
    });
  });

  describe('getValidRecords', () => {
    it('should return only valid records', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [
        ['王小明', 'wang@example.com', '2025-10-01', '李老師'],
        ['李小華', '', '2025-10-02', '王老師'], // Missing email (invalid)
      ];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);
      const validRecords = getValidRecords(transformed);

      expect(validRecords).toHaveLength(1);
      expect(validRecords[0].student_email).toBe('wang@example.com');
    });
  });

  describe('getInvalidRecords', () => {
    it('should return invalid records with error details', () => {
      const headers = ['姓名', 'email', '上課日期', '授課老師'];
      const dataRows = [
        ['王小明', 'wang@example.com', '2025-10-01', '李老師'],
        ['李小華', '', '2025-10-02', '王老師'], // Missing email
      ];

      const extracted = extractFromSheets(mockWorksheet, headers, dataRows);
      const transformed = transformData(extracted);
      const invalidRecords = getInvalidRecords(transformed);

      expect(invalidRecords).toHaveLength(1);
      expect(invalidRecords[0].rowIndex).toBe(1);
      expect(invalidRecords[0].errors.length).toBeGreaterThan(0);
    });
  });

  describe('standardizeRecords', () => {
    it('should ensure all records have the same keys', () => {
      const records = [
        { name: '王小明', email: 'wang@example.com' },
        { name: '李小華', email: 'lee@example.com', age: 25 }, // Extra field
      ];

      const standardized = standardizeRecords(records);

      expect(standardized).toHaveLength(2);
      expect(Object.keys(standardized[0]).sort()).toEqual(Object.keys(standardized[1]).sort());
      expect(standardized[0].age).toBe(null); // Missing field filled with null
    });

    it('should handle empty array', () => {
      const standardized = standardizeRecords([]);
      expect(standardized).toEqual([]);
    });
  });

  describe('Data Type Transformations', () => {
    const mockWorksheetPurchase: Worksheet = {
      ...mockWorksheet,
      supabaseTable: 'trial_class_purchase',
    };

    it('should transform integers correctly', () => {
      const headers = ['姓名', 'email', '方案名稱', '體驗課購買日期', '年齡', '已上體驗課堂數'];
      const dataRows = [
        ['王小明', 'wang@example.com', '基礎方案', '2025-10-01', '25', '5'],
      ];

      const extracted = extractFromSheets(mockWorksheetPurchase, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.records[0].data.age).toBe(25);
      expect(transformed.records[0].data.trial_classes_total).toBe(5);
    });

    it('should handle invalid integer values', () => {
      const headers = ['姓名', 'email', '方案名稱', '體驗課購買日期', '年齡'];
      const dataRows = [
        ['王小明', 'wang@example.com', '基礎方案', '2025-10-01', 'invalid'], // Invalid number
      ];

      const extracted = extractFromSheets(mockWorksheetPurchase, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.records[0].data.age).toBe(null);
    });
  });

  describe('EODs for Closers transformations', () => {
    const mockWorksheetEods: Worksheet = {
      ...mockWorksheet,
      supabaseTable: 'eods_for_closers',
    };

    it('should transform boolean fields correctly', () => {
      const headers = ['Name', 'Email', '（諮詢）諮詢人員', '是否線上'];
      const dataRows = [
        ['王小明', 'wang@example.com', '張咨詢', 'true'],
        ['李小華', 'lee@example.com', '李咨詢', 'false'],
        ['陳小強', 'chen@example.com', '陳咨詢', '是'],
      ];

      const extracted = extractFromSheets(mockWorksheetEods, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.records[0].data.is_online).toBe(true);
      expect(transformed.records[1].data.is_online).toBe(false);
      expect(transformed.records[2].data.is_online).toBe(true);
    });

    it('should transform monetary values correctly', () => {
      const headers = ['Name', 'Email', '（諮詢）諮詢人員', '方案價格', '實際金額'];
      const dataRows = [
        ['王小明', 'wang@example.com', '張咨詢', '50000', '45000'],
        ['李小華', 'lee@example.com', '李咨詢', '30,000', '28,000'], // With comma
      ];

      const extracted = extractFromSheets(mockWorksheetEods, headers, dataRows);
      const transformed = transformData(extracted);

      expect(transformed.records[0].data.package_price).toBe(50000);
      expect(transformed.records[0].data.actual_amount).toBe(45000);
      expect(transformed.records[1].data.package_price).toBe(30000); // Comma removed
      expect(transformed.records[1].data.actual_amount).toBe(28000);
    });
  });
});
