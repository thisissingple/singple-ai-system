/**
 * Google Sheets 2.0 系統完整測試
 *
 * 測試項目：
 * 1. 資料來源管理 (Sources)
 * 2. 工作表列表 (Worksheets)
 * 3. 欄位映射 (Mappings)
 * 4. 同步功能 (Sync)
 * 5. 同步日誌 (Logs)
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
  console.log('✓ Environment variables loaded from .env\n');
} catch (error) {
  console.warn('⚠️  Could not load .env file:', error);
}

import { queryDatabase } from '../server/services/pg-client';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message?: string;
  data?: any;
}

const results: TestResult[] = [];

function logTest(test: string, status: 'PASS' | 'FAIL' | 'SKIP', message?: string, data?: any) {
  results.push({ test, status, message, data });
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${emoji} ${test}${message ? ': ' + message : ''}`);
  if (data) {
    console.log('   Data:', JSON.stringify(data, null, 2));
  }
}

async function testDatabaseSchema() {
  console.log('\n📊 測試 1: 資料庫 Schema 檢查\n');
  console.log('='.repeat(60));

  try {
    // 檢查 google_sheets_sources 表
    const sourcesCheck = await queryDatabase(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'google_sheets_sources'
      ORDER BY ordinal_position
    `);

    if (sourcesCheck.rows.length > 0) {
      logTest('google_sheets_sources 表存在', 'PASS', `${sourcesCheck.rows.length} columns`);
      console.log('   Columns:', sourcesCheck.rows.map(r => r.column_name).join(', '));
    } else {
      logTest('google_sheets_sources 表存在', 'FAIL', '表不存在或無欄位');
      return false;
    }

    // 檢查 sheet_mappings 表
    const mappingsCheck = await queryDatabase(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sheet_mappings'
      ORDER BY ordinal_position
    `);

    if (mappingsCheck.rows.length > 0) {
      logTest('sheet_mappings 表存在', 'PASS', `${mappingsCheck.rows.length} columns`);
      console.log('   Columns:', mappingsCheck.rows.map(r => r.column_name).join(', '));
    } else {
      logTest('sheet_mappings 表存在', 'FAIL', '表不存在或無欄位');
      return false;
    }

    // 檢查 sync_logs 表
    const logsCheck = await queryDatabase(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'sync_logs'
      ORDER BY ordinal_position
    `);

    if (logsCheck.rows.length > 0) {
      logTest('sync_logs 表存在', 'PASS', `${logsCheck.rows.length} columns`);
      console.log('   Columns:', logsCheck.rows.map(r => r.column_name).join(', '));
    } else {
      logTest('sync_logs 表存在', 'FAIL', '表不存在或無欄位');
      return false;
    }

    return true;
  } catch (error: any) {
    logTest('資料庫 Schema 檢查', 'FAIL', error.message);
    return false;
  }
}

async function testDataSources() {
  console.log('\n📋 測試 2: Google Sheets 資料來源\n');
  console.log('='.repeat(60));

  try {
    // 查詢所有資料來源
    const sources = await queryDatabase('SELECT * FROM google_sheets_sources ORDER BY created_at DESC');

    logTest('查詢資料來源', 'PASS', `找到 ${sources.rows.length} 個資料來源`);

    if (sources.rows.length > 0) {
      console.log('\n資料來源列表:');
      sources.rows.forEach((source, index) => {
        console.log(`  ${index + 1}. ${source.name} (ID: ${source.id})`);
        console.log(`     Sheet ID: ${source.sheet_id}`);
        console.log(`     建立時間: ${source.created_at}`);
      });
      return sources.rows;
    } else {
      console.log('⚠️  目前沒有資料來源，請先在前端建立');
      return [];
    }
  } catch (error: any) {
    logTest('查詢資料來源', 'FAIL', error.message);
    return [];
  }
}

async function testMappings() {
  console.log('\n🗺️  測試 3: 欄位映射設定\n');
  console.log('='.repeat(60));

  try {
    // 查詢所有映射
    const mappings = await queryDatabase(`
      SELECT
        sm.*,
        gs.name as source_name,
        gs.sheet_id
      FROM sheet_mappings sm
      JOIN google_sheets_sources gs ON sm.source_id = gs.id
      ORDER BY sm.created_at DESC
    `);

    logTest('查詢欄位映射', 'PASS', `找到 ${mappings.rows.length} 個映射`);

    if (mappings.rows.length > 0) {
      console.log('\n映射列表:');
      mappings.rows.forEach((mapping, index) => {
        console.log(`\n  ${index + 1}. 映射 ID: ${mapping.id}`);
        console.log(`     來源: ${mapping.source_name}`);
        console.log(`     工作表: ${mapping.worksheet_name}`);
        console.log(`     目標表: ${mapping.target_table}`);
        console.log(`     啟用狀態: ${mapping.is_enabled ? '✅ 已啟用' : '❌ 未啟用'}`);
        console.log(`     欄位數量: ${mapping.field_mappings?.length || 0} 個`);

        if (mapping.field_mappings && mapping.field_mappings.length > 0) {
          console.log('     欄位映射:');
          mapping.field_mappings.slice(0, 3).forEach((fm: any) => {
            console.log(`       - ${fm.googleColumn} → ${fm.supabaseColumn}`);
          });
          if (mapping.field_mappings.length > 3) {
            console.log(`       ... 還有 ${mapping.field_mappings.length - 3} 個欄位`);
          }
        }
      });
      return mappings.rows;
    } else {
      console.log('⚠️  目前沒有映射設定，請先在前端建立');
      return [];
    }
  } catch (error: any) {
    logTest('查詢欄位映射', 'FAIL', error.message);
    return [];
  }
}

async function testSyncLogs() {
  console.log('\n📝 測試 4: 同步日誌\n');
  console.log('='.repeat(60));

  try {
    // 查詢最近的同步日誌
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
      LIMIT 10
    `);

    logTest('查詢同步日誌', 'PASS', `找到 ${logs.rows.length} 筆日誌`);

    if (logs.rows.length > 0) {
      console.log('\n最近 10 筆同步記錄:');
      logs.rows.forEach((log, index) => {
        const statusEmoji = log.status === 'success' ? '✅' : log.status === 'failed' ? '❌' : '🔄';
        console.log(`\n  ${index + 1}. ${statusEmoji} ${log.source_name} - ${log.worksheet_name}`);
        console.log(`     目標表: ${log.target_table}`);
        console.log(`     狀態: ${log.status}`);
        console.log(`     同步筆數: ${log.records_synced}`);
        console.log(`     時間: ${log.synced_at}`);
        if (log.error_message) {
          console.log(`     錯誤: ${log.error_message}`);
        }
      });

      // 統計
      const successCount = logs.rows.filter(l => l.status === 'success').length;
      const failedCount = logs.rows.filter(l => l.status === 'failed').length;
      const runningCount = logs.rows.filter(l => l.status === 'running').length;

      console.log('\n同步統計:');
      console.log(`  ✅ 成功: ${successCount}`);
      console.log(`  ❌ 失敗: ${failedCount}`);
      console.log(`  🔄 執行中: ${runningCount}`);
    } else {
      console.log('ℹ️  尚未執行過同步');
    }

    return logs.rows;
  } catch (error: any) {
    logTest('查詢同步日誌', 'FAIL', error.message);
    return [];
  }
}

async function testDataIntegrity() {
  console.log('\n🔍 測試 5: 資料完整性檢查\n');
  console.log('='.repeat(60));

  try {
    // 檢查是否有孤立的映射 (source 已被刪除)
    const orphanedMappings = await queryDatabase(`
      SELECT sm.*
      FROM sheet_mappings sm
      LEFT JOIN google_sheets_sources gs ON sm.source_id = gs.id
      WHERE gs.id IS NULL
    `);

    if (orphanedMappings.rows.length === 0) {
      logTest('孤立映射檢查', 'PASS', '無孤立映射');
    } else {
      logTest('孤立映射檢查', 'FAIL', `發現 ${orphanedMappings.rows.length} 個孤立映射`);
    }

    // 檢查是否有孤立的日誌 (mapping 已被刪除)
    const orphanedLogs = await queryDatabase(`
      SELECT sl.*
      FROM sync_logs sl
      LEFT JOIN sheet_mappings sm ON sl.mapping_id = sm.id
      WHERE sm.id IS NULL
    `);

    if (orphanedLogs.rows.length === 0) {
      logTest('孤立日誌檢查', 'PASS', '無孤立日誌');
    } else {
      logTest('孤立日誌檢查', 'FAIL', `發現 ${orphanedLogs.rows.length} 個孤立日誌`);
    }

    return true;
  } catch (error: any) {
    logTest('資料完整性檢查', 'FAIL', error.message);
    return false;
  }
}

async function testTargetTables() {
  console.log('\n📦 測試 6: 目標表資料檢查\n');
  console.log('='.repeat(60));

  try {
    // 查詢所有啟用的映射
    const mappings = await queryDatabase(`
      SELECT DISTINCT target_table
      FROM sheet_mappings
      WHERE is_enabled = true
    `);

    if (mappings.rows.length === 0) {
      logTest('目標表檢查', 'SKIP', '沒有啟用的映射');
      return;
    }

    console.log(`檢查 ${mappings.rows.length} 個目標表:\n`);

    for (const mapping of mappings.rows) {
      const tableName = mapping.target_table;

      try {
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
          logTest(`目標表: ${tableName}`, 'PASS', `${count.rows[0].count} 筆資料`);
        } else {
          logTest(`目標表: ${tableName}`, 'FAIL', '表不存在');
        }
      } catch (error: any) {
        logTest(`目標表: ${tableName}`, 'FAIL', error.message);
      }
    }
  } catch (error: any) {
    logTest('目標表檢查', 'FAIL', error.message);
  }
}

async function runAllTests() {
  console.log('🧪 Google Sheets 2.0 系統測試');
  console.log('='.repeat(60));
  console.log('開始時間:', new Date().toLocaleString('zh-TW'));
  console.log('='.repeat(60));

  // 執行所有測試
  const schemaOk = await testDatabaseSchema();
  if (!schemaOk) {
    console.log('\n❌ Schema 檢查失敗，終止測試');
    process.exit(1);
  }

  await testDataSources();
  await testMappings();
  await testSyncLogs();
  await testDataIntegrity();
  await testTargetTables();

  // 總結
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 測試總結\n');

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
      console.log(`  ❌ ${r.test}: ${r.message || '未知錯誤'}`);
    });
  }

  console.log('\n結束時間:', new Date().toLocaleString('zh-TW'));
  console.log('='.repeat(60));

  // 返回成功/失敗狀態
  return failCount === 0;
}

// 執行測試
runAllTests()
  .then(success => {
    if (success) {
      console.log('\n🎉 所有測試通過！');
      process.exit(0);
    } else {
      console.log('\n⚠️  部分測試失敗，請檢查上方錯誤訊息');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 測試執行失敗:', error);
    process.exit(1);
  });
