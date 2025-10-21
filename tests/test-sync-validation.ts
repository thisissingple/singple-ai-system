/**
 * Google Sheets → Supabase 同步驗證腳本
 *
 * 功能：
 * 1. 執行一次完整同步
 * 2. 查詢 Supabase 驗證資料
 * 3. 檢查欄位對應是否正確
 * 4. 產生驗證報告
 */

// 載入環境變數
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envContent = readFileSync(join(process.cwd(), '.env'), 'utf-8');
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.log('✓ Environment variables loaded from .env\n');
} catch (error) {
  console.warn('⚠️  Could not load .env file:', error);
}

import { devSeedService } from '../server/services/dev-seed-service';
import { getSupabaseClient } from '../server/services/supabase-client';
import { SUPABASE_TABLES } from '../server/services/reporting/sheet-to-supabase-mapping';

interface ValidationResult {
  tableName: string;
  totalRows: number;
  sampleRecords: any[];
  fieldCoverage: {
    field: string;
    nonNullCount: number;
    percentage: number;
  }[];
  issues: string[];
}

async function validateTable(tableName: string): Promise<ValidationResult> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  const issues: string[] = [];

  // 1. 查詢總筆數
  const { data: allData, error: queryError } = await client
    .from(tableName)
    .select('*');

  if (queryError) {
    throw new Error(`Query failed: ${queryError.message}`);
  }

  const totalRows = allData?.length || 0;

  if (totalRows === 0) {
    issues.push('⚠️  Table is empty');
  }

  // 2. 取樣本資料（前 3 筆）
  const sampleRecords = allData?.slice(0, 3) || [];

  // 3. 計算欄位覆蓋率
  const fieldCoverage: { field: string; nonNullCount: number; percentage: number }[] = [];

  if (allData && allData.length > 0) {
    const firstRecord = allData[0];
    const fields = Object.keys(firstRecord).filter(k => !['id', 'created_at', 'updated_at', 'raw_data'].includes(k));

    for (const field of fields) {
      const nonNullCount = allData.filter(row => row[field] !== null && row[field] !== undefined && row[field] !== '').length;
      const percentage = (nonNullCount / totalRows) * 100;

      fieldCoverage.push({
        field,
        nonNullCount,
        percentage,
      });

      // 檢查重要欄位
      if (['student_email', 'student_name'].includes(field) && percentage < 80) {
        issues.push(`⚠️  Field "${field}" has low coverage: ${percentage.toFixed(1)}%`);
      }
    }
  }

  return {
    tableName,
    totalRows,
    sampleRecords,
    fieldCoverage: fieldCoverage.sort((a, b) => b.percentage - a.percentage),
    issues,
  };
}

async function runValidation() {
  console.log('🔍 Google Sheets → Supabase 同步驗證\n');
  console.log('='.repeat(60));

  try {
    // 步驟 1: 執行種子資料同步
    console.log('\n📥 Step 1: 執行資料同步...\n');

    const seedResult = await devSeedService.seedTotalReportData();

    console.log('同步結果：');
    console.log(`  ✓ Spreadsheets created: ${seedResult.spreadsheetsCreated}`);
    console.log(`  ✓ Worksheets created: ${seedResult.worksheetsCreated}`);
    console.log(`  ✓ Data rows (storage): ${seedResult.dataRowsInserted}`);
    console.log(`  ✓ Supabase available: ${seedResult.supabase}`);

    if (seedResult.supabase && seedResult.supabaseTables) {
      console.log('\nSupabase 同步詳情：');
      console.log(`  ✓ trial_class_attendance: ${seedResult.supabaseTables.trial_class_attendance} rows`);
      console.log(`  ✓ trial_class_purchase: ${seedResult.supabaseTables.trial_class_purchase} rows`);
      console.log(`  ✓ eods_for_closers: ${seedResult.supabaseTables.eods_for_closers} rows`);
      console.log(`  ✓ Total synced: ${seedResult.supabaseRowsInserted} rows`);
    } else {
      console.log('\n⚠️  Supabase 未啟用或同步失敗');
      if (seedResult.warnings) {
        seedResult.warnings.forEach(w => console.log(`  - ${w}`));
      }
      process.exit(1);
    }

    // 步驟 2: 驗證各表資料
    console.log('\n' + '='.repeat(60));
    console.log('\n🔍 Step 2: 驗證 Supabase 資料品質...\n');

    const tables = [
      SUPABASE_TABLES.TRIAL_CLASS_ATTENDANCE,
      SUPABASE_TABLES.TRIAL_CLASS_PURCHASE,
      SUPABASE_TABLES.EODS_FOR_CLOSERS,
    ];

    const validationResults: ValidationResult[] = [];

    for (const tableName of tables) {
      console.log(`\n📊 Validating: ${tableName}`);
      console.log('-'.repeat(60));

      const result = await validateTable(tableName);
      validationResults.push(result);

      console.log(`  Total rows: ${result.totalRows}`);

      // 顯示欄位覆蓋率
      console.log('\n  欄位覆蓋率：');
      result.fieldCoverage.forEach(fc => {
        const bar = '█'.repeat(Math.floor(fc.percentage / 5));
        const color = fc.percentage >= 80 ? '✓' : fc.percentage >= 50 ? '~' : '✗';
        console.log(`    ${color} ${fc.field.padEnd(25)} ${bar} ${fc.percentage.toFixed(1)}% (${fc.nonNullCount}/${result.totalRows})`);
      });

      // 顯示樣本資料
      if (result.sampleRecords.length > 0) {
        console.log('\n  樣本資料 (第 1 筆):');
        const sample = result.sampleRecords[0];
        const importantFields = [
          'student_name',
          'student_email',
          'teacher_name',
          'class_date',
          'purchase_date',
          'deal_date',
          'deal_amount',
          'status',
        ];

        importantFields.forEach(field => {
          if (sample[field] !== undefined && sample[field] !== null) {
            console.log(`    ${field.padEnd(20)}: ${sample[field]}`);
          }
        });
      }

      // 顯示問題
      if (result.issues.length > 0) {
        console.log('\n  ⚠️  Issues:');
        result.issues.forEach(issue => console.log(`    ${issue}`));
      } else {
        console.log('\n  ✓ No issues found');
      }
    }

    // 步驟 3: 總結
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 驗證總結\n');

    const totalRows = validationResults.reduce((sum, r) => sum + r.totalRows, 0);
    const totalIssues = validationResults.reduce((sum, r) => sum + r.issues.length, 0);

    console.log(`總資料筆數: ${totalRows}`);
    console.log(`總問題數: ${totalIssues}`);

    validationResults.forEach(r => {
      const status = r.issues.length === 0 ? '✓' : '⚠️';
      console.log(`  ${status} ${r.tableName}: ${r.totalRows} rows, ${r.issues.length} issues`);
    });

    if (totalIssues === 0) {
      console.log('\n🎉 驗證通過！所有資料欄位對應正確。');
    } else {
      console.log('\n⚠️  發現 ' + totalIssues + ' 個問題，請檢查上述詳情。');
    }

  } catch (error) {
    console.error('\n❌ 驗證失敗:', error);
    process.exit(1);
  }
}

// 執行驗證
runValidation().then(() => {
  console.log('\n✅ 驗證完成');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ 未預期錯誤:', error);
  process.exit(1);
});
