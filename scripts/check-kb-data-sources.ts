/**
 * Check Student Knowledge Base Data Sources for 童義螢
 */

import * as dotenv from 'dotenv';
import { createPool } from '../server/services/pg-client.ts';

dotenv.config({ override: true });

async function checkKBDataSources() {
  const pool = createPool('session');

  try {
    console.log('📋 檢查童義螢的知識庫 data_sources...\n');

    const result = await pool.query(`
      SELECT
        student_email,
        student_name,
        data_sources
      FROM student_knowledge_base
      WHERE student_email IN ('fas0955581382@gamil.com', 'tong.yiying1023@gmail.com')
    `);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.student_name} (${row.student_email})`);
      console.log('   Data Sources:');

      const ds = row.data_sources || {};
      console.log(`   - trial_classes: ${(ds.trial_classes || []).length} 筆`);
      console.log(`   - eods_records: ${(ds.eods_records || []).length} 筆`);
      console.log(`   - ai_analyses: ${(ds.ai_analyses || []).length} 筆`);
      console.log(`   - purchases: ${(ds.purchases || []).length} 筆`);
      console.log(`   - chat_recaps: ${(ds.chat_recaps || []).length} 筆`);

      if (ds.chat_recaps && ds.chat_recaps.length > 0) {
        console.log(`     Chat Recaps IDs: ${JSON.stringify(ds.chat_recaps)}`);
      }

      console.log('');
    });

  } catch (error: any) {
    console.error('❌ 查詢失敗:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

checkKBDataSources().catch(console.error);
