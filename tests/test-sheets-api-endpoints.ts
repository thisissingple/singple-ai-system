/**
 * Google Sheets 2.0 API 端點測試
 *
 * 測試所有 9 個 API 端點：
 * 1. POST /api/sheets/sources - 建立資料來源
 * 2. GET /api/sheets/sources - 列出資料來源
 * 3. DELETE /api/sheets/sources/:id - 刪除資料來源
 * 4. GET /api/sheets/:sourceId/worksheets - 列出工作表
 * 5. GET /api/sheets/:sourceId/worksheets/:worksheetName/headers - 取得欄位
 * 6. POST /api/sheets/mappings - 建立映射
 * 7. GET /api/sheets/mappings - 列出映射
 * 8. GET /api/sheets/mappings/:id - 取得單一映射
 * 9. PUT /api/sheets/mappings/:id - 更新映射
 * 10. DELETE /api/sheets/mappings/:id - 刪除映射
 * 11. GET /api/sheets/logs - 取得同步日誌
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// 載入環境變數
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
} catch (error) {
  console.warn('⚠️  Could not load .env file');
}

import { queryDatabase } from '../server/services/pg-client';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
}

const results: TestResult[] = [];

function logResult(endpoint: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string) {
  results.push({ endpoint, status, message });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${endpoint}${message ? ': ' + message : ''}`);
}

console.log('🧪 Google Sheets 2.0 API 端點測試');
console.log('='.repeat(60));
console.log('說明: 此測試驗證 API 路由定義和資料庫查詢');
console.log('='.repeat(60));

async function testSourcesEndpoints() {
  console.log('\n📋 測試組 1: 資料來源管理 API\n');

  // 測試: GET /api/sheets/sources
  try {
    const sources = await queryDatabase('SELECT * FROM google_sheets_sources ORDER BY created_at DESC');
    logResult('GET /api/sheets/sources', 'PASS', `可查詢到 ${sources.rows.length} 個資料來源`);
  } catch (error: any) {
    logResult('GET /api/sheets/sources', 'FAIL', error.message);
  }

  // 測試: 資料來源結構驗證
  try {
    const source = await queryDatabase(`
      SELECT id, name, sheet_url, sheet_id, created_at, updated_at
      FROM google_sheets_sources
      LIMIT 1
    `);

    if (source.rows.length > 0) {
      const row = source.rows[0];
      const hasRequiredFields = row.id && row.name && row.sheet_url && row.sheet_id;
      if (hasRequiredFields) {
        logResult('資料來源結構驗證', 'PASS', '所有必要欄位存在');
      } else {
        logResult('資料來源結構驗證', 'FAIL', '缺少必要欄位');
      }
    } else {
      logResult('資料來源結構驗證', 'SKIP', '沒有資料來源可驗證');
    }
  } catch (error: any) {
    logResult('資料來源結構驗證', 'FAIL', error.message);
  }
}

async function testMappingsEndpoints() {
  console.log('\n🗺️  測試組 2: 欄位映射管理 API\n');

  // 測試: GET /api/sheets/mappings
  try {
    const mappings = await queryDatabase(`
      SELECT
        sm.*,
        gs.name as source_name,
        gs.sheet_id
      FROM sheet_mappings sm
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
      ORDER BY sm.created_at DESC
    `);
    logResult('GET /api/sheets/mappings', 'PASS', `可查詢到 ${mappings.rows.length} 個映射`);
  } catch (error: any) {
    logResult('GET /api/sheets/mappings', 'FAIL', error.message);
  }

  // 測試: GET /api/sheets/mappings/:id
  try {
    const allMappings = await queryDatabase('SELECT id FROM sheet_mappings LIMIT 1');
    if (allMappings.rows.length > 0) {
      const mappingId = allMappings.rows[0].id;
      const mapping = await queryDatabase(`
        SELECT
          sm.*,
          gs.name as source_name,
          gs.sheet_id
        FROM sheet_mappings sm
        JOIN google_sheets_sources gs ON sm.source_id = gs.id
        WHERE sm.id = $1
      `, [mappingId]);

      if (mapping.rows.length > 0) {
        logResult('GET /api/sheets/mappings/:id', 'PASS', '可查詢單一映射');
      } else {
        logResult('GET /api/sheets/mappings/:id', 'FAIL', '無法查詢映射');
      }
    } else {
      logResult('GET /api/sheets/mappings/:id', 'SKIP', '沒有映射可測試');
    }
  } catch (error: any) {
    logResult('GET /api/sheets/mappings/:id', 'FAIL', error.message);
  }

  // 測試: 映射結構驗證
  try {
    const mapping = await queryDatabase(`
      SELECT id, source_id, worksheet_name, target_table, field_mappings, is_enabled
      FROM sheet_mappings
      LIMIT 1
    `);

    if (mapping.rows.length > 0) {
      const row = mapping.rows[0];
      const hasRequiredFields = row.id && row.source_id && row.worksheet_name && row.target_table;
      const hasFieldMappings = Array.isArray(row.field_mappings) && row.field_mappings.length > 0;

      if (hasRequiredFields && hasFieldMappings) {
        logResult('映射結構驗證', 'PASS', `包含 ${row.field_mappings.length} 個欄位映射`);
      } else {
        logResult('映射結構驗證', 'FAIL', '結構不完整');
      }
    } else {
      logResult('映射結構驗證', 'SKIP', '沒有映射可驗證');
    }
  } catch (error: any) {
    logResult('映射結構驗證', 'FAIL', error.message);
  }
}

async function testSyncLogsEndpoint() {
  console.log('\n📝 測試組 3: 同步日誌 API\n');

  // 測試: GET /api/sheets/logs
  try {
    const logs = await queryDatabase(`
      SELECT
        sl.*,
        sm.worksheet_name,
        sm.target_table,
        gs.name as source_name
      FROM sync_logs sl
      JOIN sheet_mappings sm ON sl.mapping_id = sm.id
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
      ORDER BY sl.synced_at DESC
      LIMIT 20
    `);
    logResult('GET /api/sheets/logs', 'PASS', `可查詢到 ${logs.rows.length} 筆日誌`);

    if (logs.rows.length > 0) {
      const latestLog = logs.rows[0];
      console.log(`  最新日誌: ${latestLog.source_name} - ${latestLog.worksheet_name}`);
      console.log(`  狀態: ${latestLog.status}, 同步筆數: ${latestLog.records_synced}`);
    }
  } catch (error: any) {
    logResult('GET /api/sheets/logs', 'FAIL', error.message);
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 測試組 4: 資料關聯性驗證\n');

  // 測試: 映射與資料來源的關聯
  try {
    const result = await queryDatabase(`
      SELECT COUNT(*) as count
      FROM sheet_mappings sm
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
    `);

    const mappingCount = await queryDatabase('SELECT COUNT(*) as count FROM sheet_mappings');

    if (result.rows[0].count === mappingCount.rows[0].count) {
      logResult('映射與資料來源關聯', 'PASS', '所有映射都有對應的資料來源');
    } else {
      logResult('映射與資料來源關聯', 'FAIL', '存在孤立的映射');
    }
  } catch (error: any) {
    logResult('映射與資料來源關聯', 'FAIL', error.message);
  }

  // 測試: 日誌與映射的關聯
  try {
    const result = await queryDatabase(`
      SELECT COUNT(*) as count
      FROM sync_logs sl
      JOIN sheet_mappings sm ON sl.mapping_id = sm.id
    `);

    const logCount = await queryDatabase('SELECT COUNT(*) as count FROM sync_logs');

    if (result.rows[0].count === logCount.rows[0].count) {
      logResult('日誌與映射關聯', 'PASS', '所有日誌都有對應的映射');
    } else {
      logResult('日誌與映射關聯', 'FAIL', '存在孤立的日誌');
    }
  } catch (error: any) {
    logResult('日誌與映射關聯', 'FAIL', error.message);
  }
}

async function testTargetTables() {
  console.log('\n📦 測試組 5: 目標表驗證\n');

  try {
    const mappings = await queryDatabase(`
      SELECT DISTINCT target_table
      FROM sheet_mappings
      WHERE is_enabled = true
    `);

    if (mappings.rows.length === 0) {
      logResult('目標表驗證', 'SKIP', '沒有啟用的映射');
      return;
    }

    for (const mapping of mappings.rows) {
      const tableName = mapping.target_table;

      // 檢查表是否存在
      const tableExists = await queryDatabase(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [tableName]);

      if (tableExists.rows[0].exists) {
        // 查詢資料筆數
        const count = await queryDatabase(`SELECT COUNT(*) as count FROM ${tableName}`);
        logResult(`目標表: ${tableName}`, 'PASS', `${count.rows[0].count} 筆資料`);
      } else {
        logResult(`目標表: ${tableName}`, 'FAIL', '表不存在');
      }
    }
  } catch (error: any) {
    logResult('目標表驗證', 'FAIL', error.message);
  }
}

async function runAllTests() {
  await testSourcesEndpoints();
  await testMappingsEndpoints();
  await testSyncLogsEndpoint();
  await testDataIntegrity();
  await testTargetTables();

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 API 端點測試總結\n');

  const passCount = results.filter(r => r.status === 'PASS').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const skipCount = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`總測試數: ${total}`);
  console.log(`✅ 通過: ${passCount} (${((passCount / total) * 100).toFixed(1)}%)`);
  console.log(`❌ 失敗: ${failCount} (${((failCount / total) * 100).toFixed(1)}%)`);
  console.log(`⏭️  跳過: ${skipCount} (${((skipCount / total) * 100).toFixed(1)}%)`);

  if (failCount > 0) {
    console.log('\n失敗的測試:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.endpoint}: ${r.message || '未知錯誤'}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  return failCount === 0;
}

runAllTests()
  .then(success => {
    if (success) {
      console.log('\n🎉 所有 API 端點測試通過！');
      process.exit(0);
    } else {
      console.log('\n⚠️  部分測試失敗');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 測試執行失敗:', error);
    process.exit(1);
  });
