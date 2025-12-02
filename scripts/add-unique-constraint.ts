/**
 * 為 trello_board_id 加上 UNIQUE 約束
 */
import { createPool } from '../server/services/pg-client';

async function addUniqueConstraint() {
  const pool = createPool();

  try {
    console.log('📋 為 trello_board_id 加上 UNIQUE 約束...');

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_course_progress_board_unique
      ON teacher_course_progress(trello_board_id)
    `);

    console.log('✅ UNIQUE 約束已建立');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ 執行失敗:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

addUniqueConstraint();
