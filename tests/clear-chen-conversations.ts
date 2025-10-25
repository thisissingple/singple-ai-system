import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function clearConversations() {
  const email = 'ssaa.42407@gmail.com';

  console.log('🗑️  清空陳冠霖的 AI 對話記錄...\n');

  // Check existing conversations
  const checkResult = await queryDatabase(`
    SELECT COUNT(*) as count
    FROM teacher_ai_conversations
    WHERE student_email = $1
  `, [email]);

  const count = parseInt(checkResult.rows[0].count);
  console.log(`📊 找到 ${count} 筆對話記錄`);

  if (count === 0) {
    console.log('✅ 沒有對話記錄需要清空\n');
    process.exit(0);
  }

  // Delete conversations
  const deleteResult = await queryDatabase(`
    DELETE FROM teacher_ai_conversations
    WHERE student_email = $1
    RETURNING id
  `, [email]);

  console.log(`✅ 已刪除 ${deleteResult.rows.length} 筆對話記錄\n`);

  // Also clear cached insights in student_knowledge_base
  const clearCacheResult = await queryDatabase(`
    UPDATE student_knowledge_base
    SET ai_pregenerated_insights = '{
      "painPointAnalysis": null,
      "conversionStrategy": null,
      "conversionProbability": null,
      "executionEvaluation": null,
      "nextSteps": null,
      "generatedAt": null
    }'::jsonb
    WHERE student_email = $1
    RETURNING student_name
  `, [email]);

  if (clearCacheResult.rows.length > 0) {
    console.log(`✅ 已清空 ${clearCacheResult.rows[0].student_name} 的預生成快取\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 清空完成！現在可以重新測試了');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔗 測試頁面：http://localhost:5001/teaching-quality/fb1dbdd0-283b-4a04-b8fd-b3e944375660\n');

  process.exit(0);
}

clearConversations();
