/**
 * Backfill Script: Sync All Students to Knowledge Base
 *
 * 用途：歷史資料回填 - 將所有現有學員建檔到 student_knowledge_base
 * 使用時機：
 * 1. 初次部署此功能時
 * 2. 發現有學員遺漏時
 * 3. 定期檢查資料完整性
 *
 * 執行方式：
 * npx tsx scripts/backfill-all-students.ts
 */

import { syncAllStudentsToKB } from '../server/services/student-knowledge-service';

async function main() {
  console.log('🚀 Starting student knowledge base backfill...\n');
  console.log('📊 This script will:');
  console.log('   1. Scan all student records from source tables');
  console.log('   2. Create missing student KB records');
  console.log('   3. Update existing student KB records');
  console.log('   4. Mark deleted students (if source records removed)\n');

  try {
    const startTime = Date.now();

    const result = await syncAllStudentsToKB();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Backfill completed successfully!\n');
    console.log('📈 Results:');
    console.log(`   - Total students found: ${result.totalFound}`);
    console.log(`   - New students created: ${result.newStudents}`);
    console.log(`   - Existing students updated: ${result.existingStudents}`);
    console.log(`   - Time taken: ${duration}s\n`);

    if (result.newStudents > 0) {
      console.log('✨ Created new student KB records for missing students');
    }

    if (result.existingStudents > 0) {
      console.log('🔄 Updated stats for existing student KB records');
    }

    if (result.totalFound === 0) {
      console.log('⚠️  No students found in source tables. This might indicate a data issue.');
    }

  } catch (error: any) {
    console.error('\n❌ Backfill failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  console.log('\n🎉 Backfill process complete!');
  process.exit(0);
}

// Run the script
main();
