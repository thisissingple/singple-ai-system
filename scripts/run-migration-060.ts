import { createPool } from '../server/services/pg-client.ts';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ override: true });

async function runMigration060() {
  const pool = createPool('session');

  try {
    console.log('='.repeat(80));
    console.log('執行 Migration 060: 修正諮詢 AI 記錄級聯刪除問題');
    console.log('='.repeat(80));
    console.log('');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/060_fix_consultation_cascade_deletion.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration 檔案已讀取');
    console.log('🚀 開始執行 SQL...');
    console.log('');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✅ Migration 060 執行成功！');
    console.log('');
    console.log('📊 變更摘要：');
    console.log('  1. ✅ consultation_quality_analysis: FK 改為 ON DELETE SET NULL');
    console.log('  2. ✅ consultation_quality_analysis: 新增冗餘欄位（student_email, consultation_date_cached, consultant_email）');
    console.log('  3. ✅ consultation_quality_analysis: 建立複合唯一索引');
    console.log('  4. ✅ consultation_chat_recaps: FK 改為 ON DELETE SET NULL');
    console.log('  5. ✅ consultant_ai_conversations: FK 改為 ON DELETE SET NULL');
    console.log('  6. ✅ 建立自動填充觸發器');
    console.log('');
    console.log('🎉 現在 AI 記錄不會因為 Google Sheets 同步而被刪除了！');
    console.log('='.repeat(80));

  } catch (error: any) {
    console.error('❌ Migration 執行失敗:', error.message);
    console.error('');
    console.error('詳細錯誤:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration060().catch(console.error);
