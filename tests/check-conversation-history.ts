import 'dotenv/config';
import { queryDatabase } from '../server/services/pg-client';

async function checkConversationHistory() {
  console.log('\n🔍 檢查 AI 對話記錄...\n');

  try {
    const studentEmail = 'ssaa.42407@gmail.com';

    const result = await queryDatabase(`
      SELECT
        id,
        teacher_id,
        question,
        answer,
        question_type,
        preset_question_key,
        is_cached,
        tokens_used,
        created_at
      FROM teacher_ai_conversations
      WHERE student_email = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [studentEmail]);

    console.log(`📊 找到 ${result.rows.length} 筆對話記錄\n`);

    result.rows.forEach((conv: any, index: number) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`對話 ${index + 1}：`);
      console.log(`老師 ID：${conv.teacher_id}`);
      console.log(`時間：${conv.created_at}`);
      console.log(`問題類型：${conv.question_type} ${conv.preset_question_key ? `(${conv.preset_question_key})` : ''}`);
      console.log(`是否使用快取：${conv.is_cached ? '✅ 是' : '❌ 否'}`);
      console.log(`使用 Token 數：${conv.tokens_used}`);
      console.log(`\n❓ 問題：${conv.question}`);
      console.log(`\n🤖 回答：`);
      console.log(conv.answer.substring(0, 500) + (conv.answer.length > 500 ? '...\n(回答太長，僅顯示前 500 字)' : ''));
      console.log('\n');
    });

    // 統計資訊
    if (result.rows.length > 0) {
      const totalTokens = result.rows.reduce((sum: number, row: any) => sum + (row.tokens_used || 0), 0);
      const cachedCount = result.rows.filter((row: any) => row.is_cached).length;

      console.log(`\n📈 統計資訊：`);
      console.log(`   - 總對話數：${result.rows.length}`);
      console.log(`   - 使用快取：${cachedCount} 次`);
      console.log(`   - 實際 API 呼叫：${result.rows.length - cachedCount} 次`);
      console.log(`   - 總 Token 使用：${totalTokens}`);

      // 估算成本（GPT-4o: $2.5/1M input tokens, $10/1M output tokens，簡化計算用 $5/1M）
      const estimatedCost = (totalTokens * 5) / 1000000;
      console.log(`   - 估算成本：約 $${estimatedCost.toFixed(4)} USD (≈ NT$${(estimatedCost * 31).toFixed(2)})`);
    }

  } catch (error: any) {
    console.error('❌ 錯誤:', error.message);
  }
}

checkConversationHistory();
