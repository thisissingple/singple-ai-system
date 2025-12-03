/**
 * 執行 Migration 092: 新增 plan_type 欄位
 */

import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
  });

  try {
    console.log('🚀 執行 Migration 092...');

    // 新增 plan_type 欄位
    await pool.query(`
      ALTER TABLE teacher_course_progress
      ADD COLUMN IF NOT EXISTS plan_type TEXT[] DEFAULT '{}'
    `);
    console.log('✅ 已新增 plan_type 欄位');

    // 新增索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_teacher_course_progress_plan_type
      ON teacher_course_progress USING GIN (plan_type)
    `);
    console.log('✅ 已建立 GIN 索引');

    // 新增欄位註解
    await pool.query(`
      COMMENT ON COLUMN teacher_course_progress.plan_type IS '學員方案類型（多選）: track(軌道), pivot(支點), breath(氣息)'
    `);
    console.log('✅ 已新增欄位註解');

    console.log('\n✅ Migration 092 完成！');
  } catch (error) {
    console.error('❌ Migration 失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
