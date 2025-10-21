/**
 * 同步服務測試 - 精簡版
 *
 * 測試重點：
 * 1. 欄位轉換正確性
 * 2. 必填欄位驗證
 * 3. raw_data 保留原始欄位
 */

import { describe, it, expect } from 'vitest';
import {
  transformRowData,
  validateRequiredFields,
  getRequiredFields,
  detectMissingMappings,
} from '../configs/sheet-field-mappings';

describe('Field Mapping & Transformation', () => {
  // ============================================
  // trial_class_attendance
  // ============================================
  describe('trial_class_attendance', () => {
    const tableName = 'trial_class_attendance';

    it('should transform valid row correctly', () => {
      const rowData = {
        '姓名': '王小明',
        'email': 'wang@example.com',
        '上課日期': '2025-10-01',
        '授課老師': '李老師',
        '是否已審核': 'true',
        '備註': '表現良好',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.student_name).toBe('王小明');
      expect(transformed.student_email).toBe('wang@example.com');
      expect(transformed.class_date).toBe('2025-10-01');
      expect(transformed.teacher_name).toBe('李老師');
      expect(transformed.is_reviewed).toBe(true);
      expect(transformed.notes).toBe('表現良好');
    });

    it('should preserve all original data in raw_data', () => {
      const rowData = {
        '姓名': '王小明',
        'email': 'wang@example.com',
        '上課日期': '2025-10-01',
        '授課老師': '李老師',
        '額外欄位': '未來新增的資料',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.raw_data).toEqual(rowData);
      expect(transformed.raw_data['額外欄位']).toBe('未來新增的資料');
    });

    it('should validate required fields', () => {
      const requiredFields = getRequiredFields(tableName);
      expect(requiredFields).toContain('student_name');
      expect(requiredFields).toContain('student_email');
      expect(requiredFields).toContain('class_date');
      expect(requiredFields).toContain('teacher_name');
    });

    it('should reject row with missing required fields', () => {
      const incomplete = {
        student_name: '王小明',
        // missing student_email
        class_date: '2025-10-01',
        teacher_name: '李老師',
      };

      const validation = validateRequiredFields(incomplete, tableName);

      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain('student_email');
    });

    it('should handle boolean transformation', () => {
      const testCases = [
        { input: 'true', expected: true },
        { input: 'false', expected: false },
        { input: '是', expected: true },
        { input: 'yes', expected: true },
        { input: 'no', expected: false },
      ];

      testCases.forEach(({ input, expected }) => {
        const rowData = {
          '姓名': '測試',
          'email': 'test@example.com',
          '上課日期': '2025-10-01',
          '授課老師': '老師',
          '是否已審核': input,
        };

        const transformed = transformRowData(rowData, tableName);
        expect(transformed.is_reviewed).toBe(expected);
      });
    });
  });

  // ============================================
  // trial_class_purchase
  // ============================================
  describe('trial_class_purchase', () => {
    const tableName = 'trial_class_purchase';

    it('should transform valid row correctly', () => {
      const rowData = {
        '姓名': '李小華',
        'email': 'lee@example.com',
        '方案名稱': '基礎方案',
        '體驗課購買日期': '2025-10-02',
        '方案價格': '15000',
        '年齡': '25',
        '職業': '工程師',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.student_name).toBe('李小華');
      expect(transformed.student_email).toBe('lee@example.com');
      expect(transformed.package_name).toBe('基礎方案');
      expect(transformed.purchase_date).toBe('2025-10-02');
      expect(transformed.package_price).toBe(15000);
      expect(transformed.age).toBe(25);
      expect(transformed.occupation).toBe('工程師');
    });

    it('should handle integer transformation', () => {
      const rowData = {
        '姓名': '測試',
        'email': 'test@example.com',
        '方案名稱': '測試方案',
        '體驗課購買日期': '2025-10-01',
        '方案價格': '30,000', // 含逗號
        '年齡': '28',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.package_price).toBe(30000); // 逗號被移除
      expect(transformed.age).toBe(28);
    });

    it('should preserve raw_data', () => {
      const rowData = {
        '姓名': '測試',
        'email': 'test@example.com',
        '方案名稱': '測試方案',
        '體驗課購買日期': '2025-10-01',
        '未來欄位': '新資料',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.raw_data).toEqual(rowData);
      expect(transformed.raw_data['未來欄位']).toBe('新資料');
    });
  });

  // ============================================
  // eods_for_closers
  // ============================================
  describe('eods_for_closers', () => {
    const tableName = 'eods_for_closers';

    it('should transform valid row correctly', () => {
      const rowData = {
        'Name': '陳小強',
        'Email': 'chen@example.com',
        '（諮詢）諮詢人員': '張咨詢',
        '（諮詢）成交日期': '2025-10-03',
        '諮詢日期': '2025-10-02',
        '電訪人員': '李電訪',
        '是否線上': 'true',
        '咨詢結果': '成交',
        '實際金額': '45000',
        '方案價格': '50000',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.student_name).toBe('陳小強');
      expect(transformed.student_email).toBe('chen@example.com');
      expect(transformed.closer_name).toBe('張咨詢');
      expect(transformed.deal_date).toBe('2025-10-03');
      expect(transformed.consultation_date).toBe('2025-10-02');
      expect(transformed.caller_name).toBe('李電訪');
      expect(transformed.is_online).toBe(true);
      expect(transformed.consultation_result).toBe('成交');
      expect(transformed.actual_amount).toBe(45000);
      expect(transformed.package_price).toBe(50000);
    });

    it('should validate required fields', () => {
      const requiredFields = getRequiredFields(tableName);
      expect(requiredFields).toContain('student_name');
      expect(requiredFields).toContain('student_email');
      expect(requiredFields).toContain('closer_name');
    });

    it('should preserve raw_data', () => {
      const rowData = {
        'Name': '測試',
        'Email': 'test@example.com',
        '（諮詢）諮詢人員': '咨詢師',
        '未來新欄位': '新資料',
      };

      const transformed = transformRowData(rowData, tableName);

      expect(transformed.raw_data).toEqual(rowData);
      expect(transformed.raw_data['未來新欄位']).toBe('新資料');
    });
  });

  // ============================================
  // Date Transformation
  // ============================================
  describe('Date Transformation', () => {
    it('should handle various date formats', () => {
      const tableName = 'trial_class_attendance';
      const testDates = [
        '2025-10-01',
        '2025/10/01',
        'October 1, 2025',
      ];

      testDates.forEach(dateStr => {
        const rowData = {
          '姓名': '測試',
          'email': 'test@example.com',
          '上課日期': dateStr,
          '授課老師': '老師',
        };

        const transformed = transformRowData(rowData, tableName);
        expect(transformed.class_date).toBe('2025-10-01');
      });
    });

    it('should return null for invalid dates', () => {
      const tableName = 'trial_class_attendance';
      const rowData = {
        '姓名': '測試',
        'email': 'test@example.com',
        '上課日期': 'invalid-date',
        '授課老師': '老師',
      };

      const transformed = transformRowData(rowData, tableName);
      expect(transformed.class_date).toBe(null);
    });
  });

  // ============================================
  // Empty/Null Handling
  // ============================================
  describe('Empty/Null Value Handling', () => {
    it('should handle empty strings', () => {
      const tableName = 'trial_class_attendance';
      const rowData = {
        '姓名': '測試',
        'email': 'test@example.com',
        '上課日期': '2025-10-01',
        '授課老師': '老師',
        '備註': '', // 空字串
      };

      const transformed = transformRowData(rowData, tableName);
      expect(transformed.notes).toBe(null);
    });

    it('should trim whitespace', () => {
      const tableName = 'trial_class_attendance';
      const rowData = {
        '姓名': '  王小明  ',
        'email': '  wang@example.com  ',
        '上課日期': '2025-10-01',
        '授課老師': '  李老師  ',
      };

      const transformed = transformRowData(rowData, tableName);
      expect(transformed.student_name).toBe('王小明');
      expect(transformed.student_email).toBe('wang@example.com');
      expect(transformed.teacher_name).toBe('李老師');
    });
  });

  // ============================================
  // Missing Field Detection
  // ============================================
  describe('Missing Field Detection', () => {
    it('should detect no missing mappings when all headers exist', () => {
      const tableName = 'trial_class_attendance';
      const headers = [
        '姓名',
        'email',
        '上課日期',
        '授課老師',
        '是否已審核',
        '未轉換原因',
        '備註',
      ];

      const missing = detectMissingMappings(headers, tableName);

      expect(missing).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const tableName = 'trial_class_attendance';
      const headers = [
        '姓名',
        'email',
        // 缺少：上課日期
        '授課老師',
        '備註',
      ];

      const missing = detectMissingMappings(headers, tableName);

      expect(missing.length).toBeGreaterThan(0);

      const missingClassDate = missing.find(m => m.supabaseColumn === 'class_date');
      expect(missingClassDate).toBeDefined();
      expect(missingClassDate?.googleSheetColumn).toBe('上課日期');
      expect(missingClassDate?.label).toBe('上課日期');
      expect(missingClassDate?.required).toBe(true);
    });

    it('should detect missing optional fields', () => {
      const tableName = 'trial_class_attendance';
      const headers = [
        '姓名',
        'email',
        '上課日期',
        '授課老師',
        // 缺少：是否已審核、未轉換原因、備註
      ];

      const missing = detectMissingMappings(headers, tableName);

      expect(missing.length).toBeGreaterThan(0);

      const missingReviewed = missing.find(m => m.supabaseColumn === 'is_reviewed');
      expect(missingReviewed).toBeDefined();
      expect(missingReviewed?.label).toBe('是否已審核');
      expect(missingReviewed?.required).toBe(false);
    });

    it('should handle headers with extra whitespace', () => {
      const tableName = 'trial_class_attendance';
      const headers = [
        '  姓名  ',
        '  email  ',
        '  上課日期  ',
        '  授課老師  ',
        '備註',
      ];

      const missing = detectMissingMappings(headers, tableName);

      // 應該正確處理空白，不會誤判為缺失
      const missingName = missing.find(m => m.supabaseColumn === 'student_name');
      expect(missingName).toBeUndefined();
    });

    it('should provide Chinese labels for all missing fields (trial_class_purchase)', () => {
      const tableName = 'trial_class_purchase';
      const headers = [
        '姓名',
        'email',
        // 缺少所有其他欄位
      ];

      const missing = detectMissingMappings(headers, tableName);

      expect(missing.length).toBeGreaterThan(0);

      // 檢查必填欄位有中文 label
      const missingPackageName = missing.find(m => m.supabaseColumn === 'package_name');
      expect(missingPackageName?.label).toBe('方案名稱');

      const missingPurchaseDate = missing.find(m => m.supabaseColumn === 'purchase_date');
      expect(missingPurchaseDate?.label).toBe('體驗課購買日期');
    });

    it('should provide Chinese labels for all missing fields (eods_for_closers)', () => {
      const tableName = 'eods_for_closers';
      const headers = [
        'Name',
        'Email',
        // 缺少所有其他欄位
      ];

      const missing = detectMissingMappings(headers, tableName);

      expect(missing.length).toBeGreaterThan(0);

      const missingCloserName = missing.find(m => m.supabaseColumn === 'closer_name');
      expect(missingCloserName?.label).toBe('諮詢人員');

      const missingDealDate = missing.find(m => m.supabaseColumn === 'deal_date');
      expect(missingDealDate?.label).toBe('成交日期');
    });

    it('should categorize missing fields by required/optional', () => {
      const tableName = 'trial_class_purchase';
      const headers = [
        '姓名',
        // 缺少所有其他欄位
      ];

      const missing = detectMissingMappings(headers, tableName);

      const requiredMissing = missing.filter(m => m.required);
      const optionalMissing = missing.filter(m => !m.required);

      expect(requiredMissing.length).toBeGreaterThan(0);
      expect(optionalMissing.length).toBeGreaterThan(0);

      // 必填欄位應包含
      expect(requiredMissing.some(m => m.supabaseColumn === 'student_email')).toBe(true);
      expect(requiredMissing.some(m => m.supabaseColumn === 'package_name')).toBe(true);
      expect(requiredMissing.some(m => m.supabaseColumn === 'purchase_date')).toBe(true);

      // 選填欄位應包含
      expect(optionalMissing.some(m => m.supabaseColumn === 'package_price')).toBe(true);
      expect(optionalMissing.some(m => m.supabaseColumn === 'age')).toBe(true);
    });
  });
});
