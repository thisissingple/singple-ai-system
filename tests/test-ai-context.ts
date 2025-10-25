import 'dotenv/config';
import { getStudentFullContext } from '../server/services/student-knowledge-service';

async function testAIContext() {
  const email = 'ssaa.42407@gmail.com';

  console.log('📊 取得學員完整上下文...\n');

  const context = await getStudentFullContext(email);

  console.log('✅ 學員知識庫:');
  console.log(`   - 姓名: ${context.kb.student_name}`);
  console.log(`   - Email: ${context.kb.student_email}`);
  console.log(`   - 上課次數: ${context.kb.total_classes}`);
  console.log(`   - 諮詢次數: ${context.kb.total_consultations}\n`);

  console.log(`✅ 上課記錄: ${context.trialClasses.length} 筆`);
  context.trialClasses.forEach((c: any, i: number) => {
    console.log(`\n   第 ${i + 1} 堂課:`);
    console.log(`   - 日期: ${c.class_date}`);
    console.log(`   - 老師: ${c.teacher_name}`);
    console.log(`   - 有課堂對話記錄: ${c.class_transcript ? '✅ 有 (' + c.class_transcript.length + ' 字)' : '❌ 無'}`);

    if (c.class_transcript) {
      console.log(`   - 對話前 200 字: ${c.class_transcript.substring(0, 200)}...`);
    }
  });

  console.log(`\n✅ EODS 諮詢記錄: ${context.eodsRecords.length} 筆`);
  console.log(`✅ AI 分析記錄: ${context.aiAnalyses.length} 筆`);
  console.log(`✅ 購課記錄: ${context.purchases.length} 筆`);

  // Now test building context summary
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('測試 buildStudentContextSummary 函數輸出:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Import the service to access buildStudentContextSummary
  const aiService = await import('../server/services/ai-conversation-service');

  // We need to access the private function, so we'll recreate it here
  const { kb, trialClasses, eodsRecords, purchases } = context;

  let summary = `# 學員檔案：${kb.student_name} (${kb.student_email})\n\n`;

  // Basic stats
  summary += `## 基本統計\n`;
  summary += `- 總上課次數：${kb.total_classes} 堂\n`;
  summary += `- 總諮詢次數：${kb.total_consultations} 次\n\n`;

  // Recent classes with transcripts
  if (trialClasses.length > 0) {
    summary += `## 最近上課記錄（最近 3 堂）\n`;
    trialClasses.slice(-3).forEach((c: any, index: number) => {
      summary += `\n### 第 ${trialClasses.length - 2 + index} 堂課\n`;
      summary += `- 日期：${c.class_date}\n`;
      summary += `- 老師：${c.teacher_name}\n`;
      summary += `- 狀態：${c.no_conversion_reason || '進行中'}\n`;

      // Include class transcript if available
      if (c.class_transcript) {
        const transcript = c.class_transcript.length > 500
          ? c.class_transcript.substring(0, 500) + '\n... (對話太長，已截斷)'
          : c.class_transcript;
        summary += `\n**課堂對話記錄：**\n\`\`\`\n${transcript}\n\`\`\`\n`;
      }
    });
    summary += `\n`;
  }

  console.log(summary);

  process.exit(0);
}

testAIContext();
