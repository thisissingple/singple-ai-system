/**
 * Trello Sync Scheduler Service
 *
 * 定時自動同步 Trello 看板的排程器
 * 支援用戶自訂同步時段，使用台灣時區
 */

import cron from 'node-cron';
import { queryDatabase } from './pg-client';
import { syncAllBoards } from './trello-sync-service';

// 台灣時區設定
const TIMEZONE = 'Asia/Taipei';

// 儲存所有排程任務
let scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

// 所有可選的時段（每小時一個選項）
export const ALL_TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
];

/**
 * 從資料庫取得目前的同步時段設定
 */
export async function getTrelloSyncSchedule(): Promise<string[]> {
  try {
    const result = await queryDatabase(
      `SELECT value FROM system_settings WHERE key = 'trello_sync_schedule'`
    );

    if (result.rows.length > 0 && result.rows[0].value) {
      const schedule = JSON.parse(result.rows[0].value);
      return Array.isArray(schedule) ? schedule : [];
    }

    // 預設時段
    return ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
  } catch (error) {
    console.error('❌ 讀取 Trello 同步排程失敗:', error);
    return [];
  }
}

/**
 * 更新同步時段設定到資料庫
 */
export async function updateTrelloSyncSchedule(schedule: string[]): Promise<void> {
  // 驗證時段格式
  const validSchedule = schedule.filter(time => ALL_TIME_SLOTS.includes(time));

  await queryDatabase(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ('trello_sync_schedule', $1, NOW())
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = NOW()`,
    [JSON.stringify(validSchedule)]
  );

  console.log(`✅ Trello 同步排程已更新: ${validSchedule.join(', ')}`);

  // 重新啟動排程器
  await restartScheduler();
}

/**
 * 啟動 Trello 同步排程器
 */
export async function startTrelloScheduler(): Promise<void> {
  // 先停止現有的排程
  stopTrelloScheduler();

  // 取得設定的時段
  const syncTimes = await getTrelloSyncSchedule();

  if (syncTimes.length === 0) {
    console.log('⚠️ Trello 同步排程未設定任何時段，排程器未啟動');
    return;
  }

  // 為每個時段建立 cron job
  syncTimes.forEach(time => {
    const [hour, minute] = time.split(':');
    const cronExpression = `${minute} ${hour} * * *`;

    const task = cron.schedule(
      cronExpression,
      async () => {
        const now = new Date().toLocaleString('zh-TW', { timeZone: TIMEZONE });
        console.log(`\n🔄 [Trello Scheduler ${time}] 開始同步... (${now})`);

        try {
          const result = await syncAllBoards();
          console.log(`✅ [Trello Scheduler ${time}] 同步完成:`, {
            synced: result.syncedCount,
            failed: result.failedCount,
          });
        } catch (error: any) {
          console.error(`❌ [Trello Scheduler ${time}] 同步失敗:`, error.message);
        }
      },
      {
        timezone: TIMEZONE,
      }
    );

    scheduledTasks.set(time, task);
  });

  console.log(`✅ Trello 同步排程器已啟動`);
  console.log(`   時區: ${TIMEZONE}`);
  console.log(`   時段: ${syncTimes.join(', ')}`);
}

/**
 * 停止 Trello 同步排程器
 */
export function stopTrelloScheduler(): void {
  if (scheduledTasks.size > 0) {
    scheduledTasks.forEach((task, time) => {
      task.stop();
    });
    scheduledTasks.clear();
    console.log('🛑 Trello 同步排程器已停止');
  }
}

/**
 * 重新啟動排程器（更新設定後使用）
 */
async function restartScheduler(): Promise<void> {
  stopTrelloScheduler();
  await startTrelloScheduler();
}

/**
 * 取得排程器狀態
 */
export function getSchedulerStatus(): {
  isRunning: boolean;
  activeTimeSlots: string[];
  timezone: string;
} {
  return {
    isRunning: scheduledTasks.size > 0,
    activeTimeSlots: Array.from(scheduledTasks.keys()).sort(),
    timezone: TIMEZONE,
  };
}

/**
 * 取得下一次同步時間
 */
export async function getNextSyncTime(): Promise<string | null> {
  const schedule = await getTrelloSyncSchedule();
  if (schedule.length === 0) return null;

  const now = new Date();
  const nowTW = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const currentMinutes = nowTW.getHours() * 60 + nowTW.getMinutes();

  // 找到今天剩餘的最近時段
  for (const time of schedule.sort()) {
    const [hour, minute] = time.split(':').map(Number);
    const slotMinutes = hour * 60 + minute;
    if (slotMinutes > currentMinutes) {
      return `今天 ${time}`;
    }
  }

  // 如果今天沒有剩餘時段，返回明天第一個時段
  const firstSlot = schedule.sort()[0];
  return `明天 ${firstSlot}`;
}

export default {
  ALL_TIME_SLOTS,
  getTrelloSyncSchedule,
  updateTrelloSyncSchedule,
  startTrelloScheduler,
  stopTrelloScheduler,
  getSchedulerStatus,
  getNextSyncTime,
};
