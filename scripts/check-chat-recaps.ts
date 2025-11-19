/**
 * Check Consultation Chat Recaps for 童義螢
 */

import * as dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client.ts';

dotenv.config({ override: true });

async function checkChatRecaps() {
  const pool = createPool('session');

  try {
    // Check chat recaps table structure
    console.log('📋 檢查 consultation_chat_recaps 表格結構...\n');

    const structureResult = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name = 'consultation_chat_recaps'
      ORDER BY ordinal_position
    `);

    console.log('consultation_chat_recaps 欄位：');
    structureResult.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    // Check if童義螢 has any chat recaps
    console.log('\n📊 檢查童義螢的 chat recaps 記錄...\n');

    const recapsResult = await pool.query(`
      SELECT id, eod_id, student_email, student_name, generated_at, total_messages, total_questions
      FROM consultation_chat_recaps
      WHERE student_email IN ('fas0955581382@gamil.com', 'tong.yiying1023@gmail.com')
      ORDER BY generated_at DESC
    `);

    console.log(`找到 ${recapsResult.rows.length} 筆記錄：\n`);

    recapsResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   EOD: ${row.eod_id}`);
      console.log(`   學員: ${row.student_name} (${row.student_email})`);
      console.log(`   生成時間: ${row.generated_at}`);
      console.log(`   訊息數: ${row.total_messages}, 提問數: ${row.total_questions}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ 查詢失敗:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkChatRecaps().catch(console.error);
