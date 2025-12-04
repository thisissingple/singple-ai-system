/**
 * 執行 Migration 093: 新增 Trello 同步排程設定
 */

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🚀 執行 Migration 093...');

    // 預設每兩小時同步（工作時段：08:00 ~ 22:00）
    const defaultSchedule = JSON.stringify([
      '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'
    ]);

    await pool.query(`
      INSERT INTO system_settings (key, value, updated_at)
      VALUES ('trello_sync_schedule', $1, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `, [defaultSchedule]);

    console.log('✅ 已新增 Trello 同步排程設定');
    console.log(`   預設時段: ${defaultSchedule}`);

    console.log('\n✅ Migration 093 完成！');
  } catch (error) {
    console.error('❌ Migration 失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
