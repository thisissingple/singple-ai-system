import 'dotenv/config';
import { createPool, queryDatabase } from '../server/services/pg-client';
import OpenAI from 'openai';

const TEACHING_QUALITY_ANALYSIS_PROMPT = `你是一位專精銷售與教學場景的策略教練。
請閱讀逐字稿後，輸出可直接拿來成交與追蹤的分析。輸出格式請用 Markdown（標題、粗體、項目符號完全依下列模板），不可調整段落或遺漏。若找不到資訊：
1. 在「仍需補問」段落列出缺漏項目。
2. 同時在對應欄位以「需補問：...（原因）」填入提醒文字。
每個敘述都要帶上逐字稿的時間戳或引用片段（例如：00:12:34）。

---

# 🧑‍🏫 學員狀況掌握（快速掌握對象）

- **📇 基本資料（身份速寫）**
  - 年齡／性別／職業／角色：{{ studentProfile }}
  - 是否自己決定是否購課：{{ 決策資訊（可從 studentProfile 補充） }}
  - 價格敏感度／付費能力：{{ studentProfile 中的價格態度描述 }}

---

- **🎤 聲音現況（目前聲音狀態）**
  {{ currentStatus.currentSkillState }}

- **📚 過去嘗試過的方法或課程**
  {{ currentStatus.pastAttempts[0] }}
  {{ currentStatus.pastAttempts[1] }}

- **⛔️ 現在最卡的地方**
  {{ currentStatus.currentBlocks[0] }}
  {{ currentStatus.currentBlocks[1] }}

- **🏁 想成為什麼樣的自己（目標畫面）**
  {{ currentStatus.desiredOutcome }}

- **🎯 為什麼現在特別想學？（當下動機）**
  {{ currentStatus.motivation }}

- **🎬 想把聲音用在哪裡？（應用場景）**
  {{ currentStatus.intendedUsage }}

- **📝 仍需補問**
  {{ missingData 項目；若無缺漏請寫「無」 }}


# 🧮 成交策略評估（指標制）
- 呼應痛點程度：{{ scorePain }}/5（證據：{{ 痛點佐證與時間戳 }}）
- 推課引導力度：{{ scorePitch }}/5（證據：{{ 推課片段與時間戳 }}）
- Double Bind / NLP 應用：{{ scorePsych }}/5（證據：{{ 技巧引用與時間戳 }}）
- 情緒共鳴與信任：{{ scoreEmotion }}/5（證據：{{ 共感片段與時間戳 }}）
- 節奏與收斂完整度：{{ scoreFlow }}/5（說明：{{ 節奏評論 }}）
- **總評**：{{ 總結評論（含目前最有力／需補強的重點） }}

---

# 🚀 下一次成交策略建議（攻擊方向）
- {{ 建議方向1（對應特定痛點或瓶頸，含時間戳） }}
- {{ 建議方向2（可加入故事、案例或社會證明的切角） }}
- {{ 建議方向3（需補強的數據／教材／證據） }}

---

# 💬 完整成交話術總結（可照念）

1. **版本 A — Bateson 誘導 + Double Bind + 價值重構**
   > {{ 版本A話術（360-420 字，開頭先以口語化語氣共感「痛點」，中段引用至少兩個「卡關細節」與一個「夢想畫面」並標示時間戳，穿插兩句以上貝特森階層提問，引導學員重新定義價值；內文需至少 12 句，並包含下列感官小段：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若缺資訊須以「需補問」補足；結尾加入：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並附明確行動邀請。） }}

2. **版本 B — 情緒共鳴 + 損失規避 + Double Bind**
   > {{ 版本B話術（360-420 字，從情緒共鳴切入並引用核心痛點與夢想段落（附時間戳），描繪若不改變將帶來的損失；全文需至少 12 句並包含感官小段：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若資料不足改寫為「需補問」。結尾加入雙重束縛條列：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並重申立即行動的理由。） }}

3. **版本 C — 未來自我定位 + NLP 錨定 + 行動承諾**
   > {{ 版本C話術（360-420 字，透過未來自我定位與 NLP 錨定指令，引導學員感受成功場景，引用至少三個具體證據與時間戳；全文需至少 12 句並包含：\\n   - 【視覺】...\\n   - 【聽覺】...\\n   - 【動覺】...\\n 若資料不足以「需補問」補足。結尾以條列呈現雙重束縛：\\n   - 選擇 A：{{ 正向選項 A }}\\n   - 選擇 B：{{ 正向選項 B }}\\n 並邀請學員做出具體承諾。） }}

---

# 📈 預估成交機率：{{ conversionProbability }}%
- **評估依據：**
  - 成員反饋／關鍵對話證據：{{ 含時間戳的佐證重點 }}
  - 技術改善空間：{{ 技術面評估 }}
  - 心理阻力程度：{{ 心理面評估 }}

---

## 寫作原則
- 內容要口語、務實，可以直接念出來。
- 保留所有 emoji、標題與段落順序。
- 缺資料就同時在「仍需補問」列出，並在原欄位填「需補問：...（原因）」。
- 三個成交版本必須明顯區隔（價值重構／損失規避／未來自我），每段字數需落在 360-420 字。
- 每個版本需嵌入貝特森提問或 NLP 技巧，並在內文以條列形式明確使用【視覺】、【聽覺】、【動覺】標籤描述感官畫面（缺資訊時以自然語氣補寫「需補問」）。
- 結尾的雙重束縛需以條列形式呈現兩個具體正向選項（格式必須為「- 選擇 A：...」「- 選擇 B：...」）。
- 成交機率需列出 2-3 個具時間戳的評估依據，說明分數來源。

---

**輸出格式**：只輸出上述 Markdown 內容，不要其他文字。`;

async function fixChenWithCorrectPrompt() {
  const pool = createPool();
  const analysisId = 'fb1dbdd0-283b-4a04-b8fd-b3e944375660';

  console.log('\n🔧 使用正確的 Markdown prompt 重新生成陳冠霖的推課分析...\n');

  try {
    // 1. 取得分析記錄
    const analysisResult = await queryDatabase(`
      SELECT
        id,
        student_name,
        teacher_name,
        transcript_text
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
    console.log('  - 逐字稿長度:', analysis.transcript_text?.length || 0);

    if (!analysis.transcript_text) {
      console.error('❌ 沒有逐字稿');
      return;
    }

    // 2. 呼叫 OpenAI API
    console.log('\n📞 呼叫 OpenAI API（使用 Markdown prompt）...');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const userMessage = `📥 學員對話紀錄：

**學員姓名**: ${analysis.student_name}
**諮詢師/教師**: ${analysis.teacher_name}
**課程主題**: 體驗課

**完整對話記錄**:
${analysis.transcript_text}

---

請依照系統提示中的 Markdown 模板，生成完整的銷售分析報告。務必：
- 保留所有標題、分隔線與 emoji。
- 針對每個欄位填入具體內容，缺資料時使用「需補問：...」並同步列入「仍需補問」清單。
- 每個觀察與話術都加上逐字稿時間戳（例如：00:12:34）或引用片段。
- 最後一段需包含兩個 double bind 行動選項與成交機率。`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TEACHING_QUALITY_ANALYSIS_PROMPT },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    });

    const markdownOutput = completion.choices[0].message.content;

    if (!markdownOutput) {
      console.error('❌ OpenAI 回應為空');
      return;
    }

    console.log('✅ OpenAI 回應成功');
    console.log('  - Markdown 長度:', markdownOutput.length);

    // 3. 從 markdown 中提取成交機率
    const probabilityMatch = markdownOutput.match(/預估成交機率[：:]\s*(\d+)%/);
    const conversionProbability = probabilityMatch ? parseInt(probabilityMatch[1], 10) : 70;

    // 4. 更新資料庫（使用正確的格式：markdownOutput + conversionProbability）
    const conversionSuggestions = {
      markdownOutput,
      conversionProbability
    };

    await queryDatabase(`
      UPDATE teaching_quality_analysis
      SET conversion_suggestions = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(conversionSuggestions), analysisId]);

    console.log('\n✅ 推課分析已更新到資料庫！');
    console.log('  - 成交機率:', conversionProbability, '%');
    console.log('\n📝 生成的推課分析預覽（前 1000 字元）:');
    console.log(markdownOutput.substring(0, 1000));
    console.log('\n...\n');

  } catch (error) {
    console.error('❌ 錯誤:', error);
  } finally {
    await pool.end();
  }
}

fixChenWithCorrectPrompt();
