import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function regenerateChenAnalysisDirect() {
  const pool = createPool();
  const analysisId = 'fb1dbdd0-283b-4a04-b8fd-b3e944375660';

  console.log('\n🔄 直接重新生成陳冠霖的推課分析...\n');

  try {
    // 1. 取得分析記錄
    const analysisResult = await queryDatabase(`
      SELECT
        id,
        student_name,
        teacher_name,
        transcript_text,
        overall_score,
        strengths,
        weaknesses,
        suggestions,
        conversion_status
      FROM teaching_quality_analysis
      WHERE id = $1
    `, [analysisId]);

    if (analysisResult.rows.length === 0) {
      console.error('❌ 找不到分析記錄');
      return;
    }

    const analysis = analysisResult.rows[0];
    console.log('✅ 找到分析記錄');
    console.log('  - 學員:', analysis.student_name);
    console.log('  - 教師:', analysis.teacher_name);
    console.log('  - 評分:', analysis.overall_score);
    console.log('  - 逐字稿長度:', analysis.transcript_text?.length || 0);

    if (!analysis.transcript_text) {
      console.error('❌ 沒有逐字稿');
      return;
    }

    // 2. 準備 AI prompt
    const studentBackground = `學員${analysis.student_name}，跟${analysis.teacher_name}老師上課。`;

    const prompt = `你是 Singple 英文教育機構的資深推課顧問。請基於以下試聽課教學品質分析，為顧問團隊撰寫一份詳細的「推課戰略報告」。

## 教學品質分析結果

**學員**: ${analysis.student_name}
**教師**: ${analysis.teacher_name}
**教學評分**: ${analysis.overall_score}/100
**轉換狀態**: ${analysis.conversion_status === 'converted' ? '已轉高階' : '未轉換'}

**教學優勢**:
${Array.isArray(analysis.strengths) ? analysis.strengths.map((s: any, i: number) => `${i + 1}. ${s}`).join('\n') : analysis.strengths}

**教學劣勢**:
${Array.isArray(analysis.weaknesses) ? analysis.weaknesses.map((w: any, i: number) => `${i + 1}. ${w}`).join('\n') : analysis.weaknesses}

**改進建議**:
${Array.isArray(analysis.suggestions) ? analysis.suggestions.map((s: any, i: number) => `${i + 1}. ${s}`).join('\n') : analysis.suggestions}

## 課程逐字稿摘要

${analysis.transcript_text.substring(0, 2000)}...

## 學員背景資訊

${studentBackground}

---

請以 Markdown 格式撰寫「推課戰略報告」，包含以下部分：

# 📊 推課戰略報告：${analysis.student_name}

## 🎯 學員概況

[簡要總結學員的學習表現、需求、潛力]

## 💪 核心優勢（推課切入點）

[從教學優勢中，提煉出 3-5 個最有力的推課論點]

## ⚠️ 潛在顧慮（需要化解的點）

[從教學劣勢中，識別出學員或家長可能的猶豫點，並提供應對策略]

## 🎁 推薦課程方案

[基於分析結果，推薦最適合的高階課程方案，說明理由]

## 💬 推課話術建議

[提供 2-3 段具體的推課對話範例，包含：
1. 開場：如何帶入學員的優勢
2. 化解顧慮：如何處理潛在異議
3. 促成：如何自然引導到課程方案]

## 📈 預估轉換機率

[根據教學評分、學員表現，評估轉換機率：高/中/低，並說明理由]

## ✅ 行動清單

[列出顧問在推課前需要準備的 3-5 個具體行動項目]
`;

    console.log('\n📞 呼叫 OpenAI API...');

    // 3. 呼叫 OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: '你是 Singple 英文教育機構的資深推課顧問，擅長分析試聽課表現並制定精準的推課策略。請用繁體中文撰寫專業、實用的推課戰略報告。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000,
    });

    const markdownOutput = completion.choices[0].message.content;

    if (!markdownOutput) {
      console.error('❌ OpenAI 回應為空');
      return;
    }

    console.log('✅ OpenAI 回應成功');
    console.log('  - 內容長度:', markdownOutput.length);

    // 4. 更新資料庫
    await queryDatabase(`
      UPDATE teaching_quality_analysis
      SET conversion_suggestions = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify({ markdownOutput }), analysisId]);

    console.log('\n✅ 推課分析已更新到資料庫！');
    console.log('\n📝 生成的推課戰略報告預覽（前 500 字元）:');
    console.log(markdownOutput.substring(0, 500));
    console.log('\n...\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

regenerateChenAnalysisDirect();
