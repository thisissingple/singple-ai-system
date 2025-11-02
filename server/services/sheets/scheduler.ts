/**
 * Scheduler Service
 *
 * 定時自動同步排程器
 * 每天凌晨 2:00 自動同步所有啟用的映射
 */

import cron from 'node-cron';
import { SyncService } from './sync-service';
import { queryDatabase } from '../pg-client';

let scheduledTask: cron.ScheduledTask | null = null;
let googleCredentials: any = null;

/**
 * 啟動排程器
 */
export function startScheduler(credentials: any) {
  googleCredentials = credentials;

  // 每天凌晨 2:00 執行
  scheduledTask = cron.schedule('0 2 * * *', async () => {
    console.log('\n🔄 [Scheduler] Starting scheduled Google Sheets sync...');
    await syncAllEnabledMappings();
  });

  console.log('✅ Google Sheets sync scheduler started (runs daily at 2:00 AM)');
}

/**
 * 停止排程器
 */
export function stopScheduler() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('🛑 Google Sheets sync scheduler stopped');
  }
}

/**
 * 同步所有啟用的映射
 */
async function syncAllEnabledMappings() {
  try {
    const syncService = new SyncService(googleCredentials);

    // 取得所有啟用的映射
    const result = await queryDatabase(`
      SELECT id, worksheet_name
      FROM sheet_mappings
      WHERE is_enabled = true
    `);

    const mappings = result.rows;
    console.log(`📋 Found ${mappings.length} enabled mappings`);

    let successCount = 0;
    let failCount = 0;

    for (const mapping of mappings) {
      try {
        await syncService.syncMapping(mapping.id);
        successCount++;
        console.log(`✅ [${successCount}/${mappings.length}] Synced: ${mapping.worksheet_name}`);
      } catch (error: any) {
        failCount++;
        console.error(`❌ [${failCount}] Failed: ${mapping.worksheet_name}`, error.message);
      }
    }

    console.log(`\n📊 Sync Summary:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📋 Total: ${mappings.length}`);

  } catch (error: any) {
    console.error('❌ [Scheduler] Error:', error.message);
  }
}

/**
 * 手動觸發一次同步（用於測試）
 */
export async function runSyncNow(credentials: any) {
  googleCredentials = credentials;
  console.log('🔄 [Manual] Running sync now...');
  await syncAllEnabledMappings();
}
