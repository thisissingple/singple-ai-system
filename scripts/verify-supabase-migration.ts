/**
 * Enhanced Supabase Migration Verification Script
 * 驗證所有資料已從 Neon 遷移到 Supabase，並測試實際寫入
 */

import { getSupabaseClient, isSupabaseAvailable, testSupabaseConnection } from '../server/services/supabase-client';
import { storage } from '../server/storage';

async function verify() {
  console.log('🔍 開始驗證 Supabase 遷移狀態...\n');

  const results = {
    passed: [] as string[],
    failed: [] as string[],
    warnings: [] as string[],
  };

  // 1. 檢查 Supabase Client 初始化
  console.log('1️⃣  檢查 Supabase Client...');
  if (isSupabaseAvailable()) {
    results.passed.push('✅ Supabase client 已成功初始化');
  } else {
    results.failed.push('❌ Supabase client 初始化失敗');
    console.log('\n❌ 錯誤：請檢查 .env 檔案中的 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
    printResults(results);
    process.exit(1);
  }

  // 2. 測試 Supabase 連線
  console.log('2️⃣  測試 Supabase 連線...');
  const connectionTest = await testSupabaseConnection();
  if (connectionTest.success) {
    results.passed.push('✅ Supabase 連線測試成功');
  } else {
    results.failed.push(`❌ Supabase 連線失敗: ${connectionTest.error}`);
  }

  // 3. 檢查必要的 tables 是否存在
  console.log('3️⃣  檢查資料表結構...');
  const client = getSupabaseClient();
  if (!client) {
    results.failed.push('❌ 無法取得 Supabase client');
    printResults(results);
    process.exit(1);
  }

  const requiredTables = [
    'users', 'sessions', 'roles', 'spreadsheets', 'worksheets', 'sheet_data',
    'google_oauth_tokens', 'sync_history',
    'trial_class_attendance', 'trial_class_purchase', 'eods_for_closers',
  ];

  for (const table of requiredTables) {
    try {
      // sessions 表用 sid 作為主鍵，其他用 id
      const primaryKey = table === 'sessions' ? 'sid' : 'id';
      const { error } = await client.from(table).select(primaryKey).limit(1);
      if (error) {
        results.failed.push(`❌ 資料表 ${table} 不存在或無法訪問: ${error.message}`);
      } else {
        results.passed.push(`✅ 資料表 ${table} 存在`);
      }
    } catch (e: any) {
      results.failed.push(`❌ 資料表 ${table} 檢查失敗: ${e.message}`);
    }
  }

  // 4. 測試 Storage 介面 - 實際 CRUD 操作
  console.log('4️⃣  測試 Storage 介面 (實際 CRUD)...');

  try {
    // 4.1 Test listSpreadsheets
    const spreadsheets = await storage.listSpreadsheets();
    results.passed.push(`✅ Storage.listSpreadsheets() 成功 (${spreadsheets.length} 個 spreadsheets)`);

    // 4.2 Test Spreadsheet CRUD
    try {
      const testSpreadsheet = await storage.createSpreadsheet({
        name: 'Test Migration Verify',
        spreadsheetId: 'test-' + Date.now(),
        range: 'A1:Z100',
      });

      if (testSpreadsheet && testSpreadsheet.id) {
        results.passed.push('✅ Storage.createSpreadsheet() 測試成功 - 寫入正常');

        // Update it
        const updated = await storage.updateSpreadsheet(testSpreadsheet.id, {
          name: 'Updated Test',
          rowCount: 42,
        });

        if (updated && updated.name === 'Updated Test' && updated.rowCount === 42) {
          results.passed.push('✅ Storage.updateSpreadsheet() 測試成功 - 更新正常');
        } else {
          const debugInfo = updated ? `name=${updated.name}, rowCount=${updated.rowCount}` : 'undefined';
          results.failed.push(`❌ Storage.updateSpreadsheet() 測試失敗 (${debugInfo})`);
        }

        // Clean up
        await storage.deleteSpreadsheet(testSpreadsheet.id);
        results.passed.push('✅ Storage.deleteSpreadsheet() 測試成功 - 刪除正常');
      }
    } catch (e: any) {
      results.failed.push(`❌ Storage Spreadsheet CRUD 測試失敗: ${e.message}`);
    }

  } catch (e: any) {
    results.failed.push(`❌ Storage 介面測試失敗: ${e.message}`);
  }

  // 5. 檢查 Neon 依賴
  console.log('5️⃣  檢查 Neon 依賴...');
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('supabase')) {
    results.warnings.push('⚠️  發現 DATABASE_URL 仍指向非 Supabase 資料庫');
  } else {
    results.passed.push('✅ 未發現 Neon 相關環境變數');
  }

  // 6. 檢查資料筆數
  console.log('6️⃣  檢查業務資料筆數...');
  try {
    const { count: attendanceCount } = await client.from('trial_class_attendance').select('*', { count: 'exact', head: true });
    const { count: purchaseCount } = await client.from('trial_class_purchase').select('*', { count: 'exact', head: true });
    const { count: dealsCount } = await client.from('eods_for_closers').select('*', { count: 'exact', head: true });

    results.passed.push(`✅ trial_class_attendance: ${attendanceCount || 0} 筆`);
    results.passed.push(`✅ trial_class_purchase: ${purchaseCount || 0} 筆`);
    results.passed.push(`✅ eods_for_closers: ${dealsCount || 0} 筆`);
  } catch (e: any) {
    results.warnings.push(`⚠️  無法讀取資料筆數: ${e.message}`);
  }

  // 7. Schema 驗證
  console.log('7️⃣  驗證 Schema...');
  try {
    const { data, error } = await client.from('spreadsheets').insert({
      name: 'Schema Test',
      spreadsheet_id: 'schema-test-' + Date.now(),
      range: 'A1:Z100',
      sync_status: 'pending',
    }).select().single();

    if (error) {
      results.failed.push(`❌ Schema 驗證失敗: ${error.message}`);
    } else if (data) {
      if (typeof data.id === 'string' && data.id.match(/^[0-9a-f-]{36}$/i)) {
        results.passed.push('✅ Schema: ID 使用 UUID');
      }
      if (data.spreadsheet_id) {
        results.passed.push('✅ Schema: snake_case 欄位正確');
      }
      await client.from('spreadsheets').delete().eq('id', data.id);
    }
  } catch (e: any) {
    results.failed.push(`❌ Schema 驗證失敗: ${e.message}`);
  }

  // 輸出結果
  printResults(results);

  // 最終判定
  if (results.failed.length === 0) {
    console.log('🎉 遷移驗證成功！\n');
    console.log('📝 下一步：');
    console.log('   1. 移除 .env 中的 DATABASE_URL');
    console.log('   2. 執行 Google Sheets 同步');
    console.log('   3. 測試應用程式所有功能');
    process.exit(0);
  } else {
    console.log('❌ 遷移驗證失敗\n');
    process.exit(1);
  }
}

function printResults(results: { passed: string[]; failed: string[]; warnings: string[] }) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 驗證結果');
  console.log('='.repeat(60));
  console.log(`✅ 通過: ${results.passed.length} 項`);
  console.log(`❌ 失敗: ${results.failed.length} 項`);
  console.log(`⚠️  警告: ${results.warnings.length} 項`);
  console.log('='.repeat(60) + '\n');

  if (results.failed.length > 0) {
    console.log('❌ 失敗項目：');
    results.failed.forEach(f => console.log(`   ${f}`));
    console.log('');
  }

  if (results.warnings.length > 0) {
    console.log('⚠️  警告項目：');
    results.warnings.forEach(w => console.log(`   ${w}`));
    console.log('');
  }
}

verify().catch(error => {
  console.error('驗證錯誤:', error);
  process.exit(1);
});
