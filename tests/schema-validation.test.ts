/**
 * Schema Validation Tests
 *
 * Purpose: Prevent schema drift by validating that transformer output
 * matches the authoritative schema definition in supabase-schema-authority.ts
 *
 * If this test fails, you must update BOTH:
 * 1. configs/supabase-schema-authority.ts (add to EXPECTED_INSERT_FIELDS)
 * 2. supabase/migrations/*.sql (add the column to the table)
 */

import { describe, it, expect } from 'vitest';
import { transformRowData } from '../configs/sheet-field-mappings';
import { EXPECTED_INSERT_FIELDS } from '../configs/supabase-schema-authority';

describe('Schema Validation - Transformer Output vs Authority Schema', () => {
  describe('trial_class_attendance', () => {
    it('should output exactly the fields defined in schema authority', () => {
      const mockRowData = {
        '姓名': '王小明',
        'email': 'test@example.com',
        '上課日期': '2025-10-01',
        '授課老師': '李老師',
      };

      const transformed = transformRowData(mockRowData, 'trial_class_attendance');

      // Add tracking fields that sync service adds
      const syncServiceFields = {
        source_worksheet_id: 'test-worksheet-id',
        origin_row_index: 0,
        synced_at: new Date().toISOString(),
      };

      // Add legacy fields that sync service sets to null
      const legacyFields = {
        teacher_id: null,
        sales_id: null,
        department_id: null,
        notes: null,
      };

      const fullRecord = { ...transformed, ...syncServiceFields, ...legacyFields };
      const actualKeys = Object.keys(fullRecord).sort();
      const expectedKeys = [...EXPECTED_INSERT_FIELDS.trial_class_attendance].sort();

      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should include raw_data with all original Google Sheets data', () => {
      const mockRowData = {
        '姓名': '王小明',
        'email': 'test@example.com',
        '額外欄位': '這是未來新增的欄位',
      };

      const transformed = transformRowData(mockRowData, 'trial_class_attendance');

      expect(transformed.raw_data).toBeDefined();
      expect(transformed.raw_data).toEqual(mockRowData);
      expect(transformed.raw_data['額外欄位']).toBe('這是未來新增的欄位');
    });
  });

  describe('trial_class_purchase', () => {
    it('should output exactly the fields defined in schema authority', () => {
      const mockRowData = {
        '姓名': '王小明',
        'email': 'test@example.com',
        '購買日期': '2025-10-01',
        '購買套餐': '基礎套餐',
        '備註': '測試備註',
      };

      const transformed = transformRowData(mockRowData, 'trial_class_purchase');

      const syncServiceFields = {
        source_worksheet_id: 'test-worksheet-id',
        origin_row_index: 0,
        synced_at: new Date().toISOString(),
      };

      const legacyFields = {
        teacher_id: null,
        sales_id: null,
        department_id: null,
        package_price: null,
      };

      const fullRecord = { ...transformed, ...syncServiceFields, ...legacyFields };
      const actualKeys = Object.keys(fullRecord).sort();
      const expectedKeys = [...EXPECTED_INSERT_FIELDS.trial_class_purchase].sort();

      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should include raw_data with all original Google Sheets data', () => {
      const mockRowData = {
        '姓名': '王小明',
        'email': 'test@example.com',
        '未來新欄位': '新資料',
      };

      const transformed = transformRowData(mockRowData, 'trial_class_purchase');

      expect(transformed.raw_data).toBeDefined();
      expect(transformed.raw_data).toEqual(mockRowData);
    });
  });

  describe('eods_for_closers', () => {
    it('should output exactly the fields defined in schema authority', () => {
      const mockRowData = {
        '學員姓名': '王小明',
        'email': 'test@example.com',
        '咨詢師': '張咨詢',
        '成交日期': '2025-10-01',
        '備註': '測試備註',
      };

      const transformed = transformRowData(mockRowData, 'eods_for_closers');

      const syncServiceFields = {
        source_worksheet_id: 'test-worksheet-id',
        origin_row_index: 0,
        synced_at: new Date().toISOString(),
      };

      const legacyFields = {
        closer_id: null,
        setter_id: null,
        department_id: null,
        report_date: null,
      };

      const fullRecord = { ...transformed, ...syncServiceFields, ...legacyFields };
      const actualKeys = Object.keys(fullRecord).sort();
      const expectedKeys = [...EXPECTED_INSERT_FIELDS.eods_for_closers].sort();

      expect(actualKeys).toEqual(expectedKeys);
    });

    it('should include raw_data with all original Google Sheets data', () => {
      const mockRowData = {
        '學員姓名': '王小明',
        'email': 'test@example.com',
        '未來欄位': '新增資料',
      };

      const transformed = transformRowData(mockRowData, 'eods_for_closers');

      expect(transformed.raw_data).toBeDefined();
      expect(transformed.raw_data).toEqual(mockRowData);
    });
  });

  describe('Field Count Validation', () => {
    it('trial_class_attendance should have exactly 12 insert fields', () => {
      expect(EXPECTED_INSERT_FIELDS.trial_class_attendance).toHaveLength(12);
    });

    it('trial_class_purchase should have exactly 13 insert fields', () => {
      expect(EXPECTED_INSERT_FIELDS.trial_class_purchase).toHaveLength(13);
    });

    it('eods_for_closers should have exactly 13 insert fields', () => {
      expect(EXPECTED_INSERT_FIELDS.eods_for_closers).toHaveLength(13);
    });
  });
});
