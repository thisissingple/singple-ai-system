/**
 * 回滾 Migration 055 - 刪除錯誤新增的 no_show 欄位
 */
import dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client';

dotenv.config({ override: true });

async function rollback() {
  const pool = createPool();

  try {
    console.log('🔄 回滾 Migration 055...\n');

    // 刪除 no_show 欄位
    await pool.query('ALTER TABLE eods_for_closers DROP COLUMN IF EXISTS no_show;');
    console.log('✅ 已刪除 no_show 欄位');

    // 刪除相關索引
    await pool.query('DROP INDEX IF EXISTS idx_eods_for_closers_no_show;');
    await pool.query('DROP INDEX IF EXISTS idx_eods_for_closers_student_no_show;');
    console.log('✅ 已刪除相關索引');

    // 驗證
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'eods_for_closers'
      AND column_name = 'no_show';
    `);

    if (result.rows.length === 0) {
      console.log('\n✅ 回滾成功！no_show 欄位已完全刪除');
    } else {
      console.log('\n❌ 回滾失敗！no_show 欄位仍然存在');
    }

  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

rollback();
