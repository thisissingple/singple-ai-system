/**
 * Scheduler Service
 *
 * 定時自動同步排程器
 * 支援多個自訂時間點的同步排程
 */

import cron from 'node-cron';
import { SyncService } from './sync-service';
import { queryDatabase } from '../pg-client';

let scheduledTasks: Map<string, cron.ScheduledTask> = new Map();
let googleCredentials: any = null;

/**
 * 啟動排程器 - 支援多時間點
 */
export function startScheduler(credentials: any) {
  googleCredentials = credentials;

  // 取得所有獨特的同步時間點
  const syncTimes = getAllUniqueSyncTimes();

  // 為每個時間點建立一個 cron job
  syncTimes.forEach(time => {
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * *`;

    const task = cron.schedule(cronExpression, async () => {
      console.log(`\n🔄 [Scheduler ${time}] Starting scheduled Google Sheets sync...`);
      await syncMappingsAtTime(time);
    });

    scheduledTasks.set(time, task);
    console.log(`✅ Scheduled sync job for ${time}`);
  });

  console.log(`✅ Google Sheets sync scheduler started with ${syncTimes.length} time slots`);
}

/**
 * 取得所有獨特的同步時間點
 */
function getAllUniqueSyncTimes(): string[] {
  // 預設支援的時間點
  const commonTimes = ['00:00', '02:00', '06:00', '08:00', '12:00', '14:00', '18:00', '20:00'];
  return commonTimes;
}

/**
 * 停止排程器
 */
export function stopScheduler() {
  scheduledTasks.forEach((task, time) => {
    task.stop();
    console.log(`🛑 Stopped sync job for ${time}`);
  });
  scheduledTasks.clear();
  console.log('🛑 Google Sheets sync scheduler stopped');
}

/**
 * 同步指定時間點的所有映射
 */
async function syncMappingsAtTime(time: string) {
  try {
    const syncService = new SyncService(googleCredentials);

    // 取得該時間點需要同步的映射
    const result = await queryDatabase(`
      SELECT id, worksheet_name, sync_schedule
      FROM sheet_mappings
      WHERE is_enabled = true
      AND sync_schedule::jsonb ? $1
    `, [time]);

    const mappings = result.rows;
    console.log(`📋 [${time}] Found ${mappings.length} mappings to sync`);

    if (mappings.length === 0) {
      return;
    }

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

    console.log(`\n📊 [${time}] Sync Summary:`);
    console.log(`  ✅ Success: ${successCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    console.log(`  📋 Total: ${mappings.length}`);

  } catch (error: any) {
    console.error(`❌ [Scheduler ${time}] Error:`, error.message);
  }
}

/**
 * 同步所有啟用的映射（舊版相容）
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
